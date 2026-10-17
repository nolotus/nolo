/**
 * OpenCode Live Driver Executor
 *
 * Spawns and manages an on-demand OpenCode server instance over trusted loopback,
 * drives an execution session via SSE (/event), POST /session, and POST /session/{id}/prompt_async,
 * and streams incremental text and tool events with strict session isolation and process lifecycle cleanup.
 */

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { buildCliProcessEnv } from "../cliExecutor";
import type { CliExecuteOptions, CliExecuteResult } from "../cliExecutor";
import type { AgentRuntimeCompleteOptions } from "../../../agent-runtime/hostAdapter";

/**
 * Extended execution options for OpenCode driver.
 * Includes onToolEvent and toolEventRound (contract to align with cliExecutor updates in concurrent branch).
 */
export type OpenCodeExecuteOptions = CliExecuteOptions & {
  onChunk?: (text: string) => void;
  onToolEvent?: AgentRuntimeCompleteOptions["onToolEvent"];
  toolEventRound?: number;
};

/**
 * Process group termination helper.
 * Politely sends SIGTERM to process group, then direct process, with Windows taskkill fallback.
 */
function terminateProcessGroup(proc: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
  const pid = proc.pid;
  if (!pid || pid <= 0) return;
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, signal);
    } catch {
      // Group kill may fail if group is already empty
    }
  } else {
    try {
      const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.on("error", () => {});
      (killer as any).unref?.();
    } catch {
      // Best effort on windows
    }
  }
  try {
    proc.kill(signal);
  } catch {
    // Ignore already exited process
  }
}

/**
 * Process group termination with escalation.
 * Inspects process group survival without ignoring descendants if parent PID already exited.
 */
async function killProcessGroupEscalating(proc: ChildProcess, graceMs = 1200): Promise<void> {
  const pid = proc.pid;
  if (!pid || pid <= 0) return;

  terminateProcessGroup(proc, "SIGTERM");

  const start = Date.now();
  while (Date.now() - start < graceMs) {
    let alive = false;
    if (process.platform !== "win32") {
      try {
        process.kill(-pid, 0);
        alive = true;
      } catch {
        try {
          process.kill(pid, 0);
          alive = true;
        } catch {
          alive = false;
        }
      }
    } else {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }

    if (!alive) {
      return; // Exited cleanly
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  terminateProcessGroup(proc, "SIGKILL");
}

/**
 * Executes a prompt using OpenCode over its live HTTP/SSE service interface.
 */
export async function executeOpenCodeStreaming(
  prompt: string,
  options: OpenCodeExecuteOptions
): Promise<CliExecuteResult> {
  // 1. Image input verification - throw explicit unsupported error if images provided
  if (options.imageInputs && options.imageInputs.length > 0) {
    throw new Error("OpenCode executor does not support imageInputs (unsupported)");
  }

  const startTime = Date.now();
  const timeoutMs = options.timeout ?? 120_000;
  const deadline = startTime + timeoutMs;

  // Signal / abort handling before start
  if (options.signal?.aborted) {
    throw new DOMException("Execution was aborted before start", "AbortError");
  }

  if (timeoutMs <= 0 || deadline <= startTime) {
    throw new Error(`OpenCode timed out after ${timeoutMs}ms`);
  }

  // Unified internal AbortController bound to external signal and total deadline
  const internalAbortController = new AbortController();
  let abortReason: Error | DOMException | null = null;

  const onExternalAbort = () => {
    abortReason =
      (options.signal?.reason as any) ||
      new DOMException("OpenCode execution was aborted", "AbortError");
    internalAbortController.abort(abortReason);
  };

  if (options.signal) {
    options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const remainingTimeout = deadline - Date.now();
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  if (remainingTimeout <= 0) {
    abortReason = new Error(`OpenCode execution timed out after ${timeoutMs}ms`);
    internalAbortController.abort(abortReason);
  } else {
    deadlineTimer = setTimeout(() => {
      deadlineTimer = null;
      abortReason = new Error(`OpenCode execution timed out after ${timeoutMs}ms`);
      internalAbortController.abort(abortReason);
    }, remainingTimeout);
    (deadlineTimer as any)?.unref?.();
  }

  const getAbortError = (): Error | DOMException => {
    return (
      abortReason ||
      (internalAbortController.signal.reason as any) ||
      new DOMException("OpenCode execution was aborted", "AbortError")
    );
  };

  const env = buildCliProcessEnv(options.env as Record<string, string | undefined>);
  const binPath = options.env?.OPENCODE_BIN || process.env.OPENCODE_BIN || "opencode";
  const cwd = options.cwd || process.cwd();

  // 2. Spawn on-demand opencode serve on loopback with random port (--port 0)
  // Ensure spawned in its own process group (detached: true) for safe teardown
  const serveProc = spawn(
    binPath,
    ["serve", "--port", "0", "--hostname", "127.0.0.1"],
    {
      cwd,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let serverBaseUrl: string | null = null;
  let activeSessionId: string | null = null;
  let hasCleanedUp = false;

  const onProcExit = (code: number | null, sig: NodeJS.Signals | null) => {
    if (hasCleanedUp) return;
    const err = new Error(
      serverBaseUrl
        ? `OpenCode serve process exited prematurely (code: ${code}, signal: ${sig})`
        : `opencode serve exited before address detected (code: ${code}, signal: ${sig})`
    );
    if (!internalAbortController.signal.aborted) {
      abortReason = err;
      internalAbortController.abort(err);
    }
  };

  serveProc.on("exit", onProcExit);
  serveProc.on("error", (err) => {
    if (hasCleanedUp) return;
    const procErr = new Error(`Failed to spawn opencode serve: ${err.message}`);
    if (!internalAbortController.signal.aborted) {
      abortReason = procErr;
      internalAbortController.abort(procErr);
    }
  });

  const cleanup = async () => {
    if (hasCleanedUp) return;
    hasCleanedUp = true;

    // Abort internal controller if still active
    try {
      if (!internalAbortController.signal.aborted) {
        internalAbortController.abort();
      }
    } catch {
      // Ignore
    }

    // Attempt bounded abort for active session before process kill
    // Independent controller avoids canceled signal making cleanup fail
    if (activeSessionId && serverBaseUrl) {
      try {
        const cleanupAbortController = new AbortController();
        const abortTimeout = setTimeout(() => cleanupAbortController.abort(), 800);
        try {
          await fetch(`${serverBaseUrl}/session/${activeSessionId}/abort`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
            signal: cleanupAbortController.signal,
          });
        } finally {
          clearTimeout(abortTimeout);
        }
      } catch {
        // Ignore abort request failure during cleanup
      }
    }

    // Kill process group
    await killProcessGroupEscalating(serveProc);
  };

  try {
    // 3. Monitor startup and parse server loopback address
    const portPromise = new Promise<string>((resolve, reject) => {
      let buffer = "";

      const checkUrl = (chunk: Buffer | string) => {
        buffer += chunk.toString();
        // Strict loopback regex verification
        const match = buffer.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) {
          cleanupStartup();
          resolve(match[0]);
          return;
        }
        // Non-loopback check
        const nonLoopback = buffer.match(/http:\/\/(?!127\.0\.0\.1)[a-zA-Z0-9.-]+:\d+/);
        if (nonLoopback) {
          cleanupStartup();
          reject(new Error(`Rejected untrusted non-loopback OpenCode server url: ${nonLoopback[0]}`));
        }
      };

      const onAbort = () => {
        cleanupStartup();
        reject(getAbortError());
      };

      const cleanupStartup = () => {
        serveProc.stdout?.off("data", checkUrl);
        serveProc.stderr?.off("data", checkUrl);
        internalAbortController.signal.removeEventListener("abort", onAbort);
      };

      if (internalAbortController.signal.aborted) {
        cleanupStartup();
        reject(getAbortError());
        return;
      }

      serveProc.stdout?.on("data", checkUrl);
      serveProc.stderr?.on("data", checkUrl);
      internalAbortController.signal.addEventListener("abort", onAbort, { once: true });
    });

    serverBaseUrl = await portPromise;

    if (internalAbortController.signal.aborted || Date.now() > deadline) {
      throw getAbortError();
    }

    // 4. Connect to SSE /event first to confirm live connection
    const sseResponse = await fetch(`${serverBaseUrl}/event`, {
      method: "GET",
      headers: { Accept: "text/event-stream" },
      signal: internalAbortController.signal,
    }).catch((err) => {
      if (internalAbortController.signal.aborted) {
        throw getAbortError();
      }
      throw new Error(`Failed to connect to OpenCode SSE stream: ${err.message}`);
    });

    if (!sseResponse.ok || !sseResponse.body) {
      throw new Error(`OpenCode /event returned HTTP ${sseResponse.status}: ${sseResponse.statusText}`);
    }

    // 5. Create session via POST /session with explicit title
    let sessionModel: { id: string; providerID?: string; variant?: string } | undefined;
    let promptModel: { modelID: string; providerID?: string } | undefined;

    if (options.model) {
      const slashIndex = options.model.indexOf("/");
      if (slashIndex > 0) {
        const providerID = options.model.slice(0, slashIndex);
        const id = options.model.slice(slashIndex + 1);
        sessionModel = {
          id,
          providerID,
          ...(options.reasoningEffort ? { variant: options.reasoningEffort } : {}),
        };
        promptModel = { modelID: id, providerID };
      } else {
        sessionModel = {
          id: options.model,
          ...(options.reasoningEffort ? { variant: options.reasoningEffort } : {}),
        };
        promptModel = { modelID: options.model };
      }
    }

    const sessionTitle = `nolo-opencode-${randomUUID().slice(0, 8)}`;
    const createSessionResp = await fetch(`${serverBaseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: sessionTitle,
        ...(sessionModel ? { model: sessionModel } : {}),
      }),
      signal: internalAbortController.signal,
    }).catch((err) => {
      if (internalAbortController.signal.aborted) {
        throw getAbortError();
      }
      throw err;
    });

    if (!createSessionResp.ok) {
      const errText = await createSessionResp.text().catch(() => "");
      throw new Error(`Failed to create OpenCode session (HTTP ${createSessionResp.status}): ${errText}`);
    }

    const sessionData = (await createSessionResp.json()) as { id?: string };
    if (!sessionData.id) {
      throw new Error("OpenCode create session response did not return an id");
    }
    const sessionId = sessionData.id;
    activeSessionId = sessionId;

    // 6. Set up SSE consumer and event processing
    let fullText = "";
    let hasBeenBusy = false;
    let isCompleted = false;
    const seenPartTexts = new Map<string, string>();
    const emittedToolCalls = new Set<string>();
    const emittedToolResults = new Set<string>();
    const emittedToolErrors = new Set<string>();

    const streamPromise = new Promise<void>((resolve, reject) => {
      let buffer = "";
      const reader = sseResponse.body!.getReader();
      const decoder = new TextDecoder("utf-8");

      const markCompleted = () => {
        isCompleted = true;
        resolve();
      };

      const handleEventJson = (parsed: any) => {
        const type = parsed?.type;
        const properties = parsed?.properties || parsed?.data || {};

        // Strict session filtering: ignore events belonging to other sessions
        if (properties.sessionID && properties.sessionID !== sessionId) {
          return;
        }
        if (properties.part?.sessionID && properties.part.sessionID !== sessionId) {
          return;
        }
        if (parsed?.sessionID && parsed.sessionID !== sessionId) {
          return;
        }

        // Permission requests: unsupported permissions must explicitly error rather than hang
        if (type === "permission.asked" || type === "permission.v2.asked") {
          reject(new Error(`OpenCode requested unsupported permission: ${properties.permission || properties.action || properties.id || "unsupported"}`));
          return;
        }

        // Session error
        if (type === "session.error") {
          const errDetail = properties.error ? JSON.stringify(properties.error) : "Session error";
          reject(new Error(`OpenCode session error: ${errDetail}`));
          return;
        }

        // Status change
        if (type === "session.status") {
          const statusType = properties.status?.type;
          if (statusType === "busy") {
            hasBeenBusy = true;
          } else if (statusType === "idle") {
            // Distinguish initial idle from post-busy completion
            if (hasBeenBusy) {
              markCompleted();
              return;
            }
          }
        }

        // Session idle event
        if (type === "session.idle") {
          if (hasBeenBusy) {
            markCompleted();
            return;
          }
        }

        // Incremental text streaming
        if (type === "message.part.delta") {
          const field = properties.field;
          const delta = properties.delta;
          // Strictly exclude reasoning or non-text field deltas
          if (field === "text" && typeof delta === "string" && delta.length > 0) {
            hasBeenBusy = true;
            const partId = properties.partID || "default";
            const currentSeen = seenPartTexts.get(partId) || "";
            seenPartTexts.set(partId, currentSeen + delta);
            fullText += delta;
            options.onChunk?.(delta);
          }
          return;
        }

        // Tool & part updates
        if (type === "message.part.updated") {
          const part = properties.part;
          if (!part) return;

          // Tool call handling (sanitize payloads: omit argumentsPreview/content/raw error)
          if (part.type === "tool") {
            hasBeenBusy = true;
            const callId = part.callID || part.id || `tool-${randomUUID().slice(0, 6)}`;
            const toolName = part.tool || "unknown";
            const state = part.state;
            const round = options.toolEventRound ?? 1;

            if (state?.status === "pending" || state?.status === "running") {
              if (!emittedToolCalls.has(callId)) {
                emittedToolCalls.add(callId);
                options.onToolEvent?.({
                  type: "tool-call",
                  round,
                  toolCallId: callId,
                  toolName,
                  summary: `Tool call: ${toolName}`,
                  metadata: { source: "cli-external", cliProvider: "opencode" },
                });
              }
            } else if (state?.status === "completed") {
              if (!emittedToolResults.has(callId)) {
                emittedToolResults.add(callId);
                options.onToolEvent?.({
                  type: "tool-result",
                  round,
                  toolCallId: callId,
                  toolName,
                  summary: `Tool completed: ${toolName}`,
                  metadata: { source: "cli-external", cliProvider: "opencode" },
                });
              }
            } else if (state?.status === "error") {
              if (!emittedToolErrors.has(callId)) {
                emittedToolErrors.add(callId);
                options.onToolEvent?.({
                  type: "tool-error",
                  round,
                  toolCallId: callId,
                  toolName,
                  message: "Tool execution failed",
                  summary: `Tool error: ${toolName}`,
                  metadata: { source: "cli-external", cliProvider: "opencode" },
                });
              }
            }
          } else if (part.type === "text") {
            // Text part snapshot handling: supplement diff without duplicating deltas, tracked per partID
            hasBeenBusy = true;
            const partId = part.id || part.partID || "default";
            const fullPartText = typeof part.text === "string" ? part.text : "";
            const seen = seenPartTexts.get(partId) || "";

            if (fullPartText.length > seen.length) {
              const diff = fullPartText.slice(seen.length);
              if (diff.length > 0) {
                seenPartTexts.set(partId, seen + diff);
                fullText += diff;
                options.onChunk?.(diff);
              }
            }
          }
        }
      };

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (!isCompleted) {
                reject(new Error("OpenCode SSE stream disconnected prematurely (unexpected EOF)"));
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const payload = trimmed.slice(5).trim();
                if (payload === "[DONE]") {
                  markCompleted();
                  return;
                }
                let parsed: any;
                try {
                  parsed = JSON.parse(payload);
                } catch {
                  // Ignore invalid JSON lines in SSE stream
                  continue;
                }
                // Dispatched outside JSON.parse try/catch so callback exceptions propagate
                handleEventJson(parsed);
                if (isCompleted) {
                  return;
                }
              }
            }
          }
        } catch (err: any) {
          if (isCompleted) {
            return;
          }
          if (internalAbortController.signal.aborted) {
            reject(getAbortError());
            return;
          }
          if (err?.name === "AbortError") {
            reject(getAbortError());
            return;
          }
          reject(err);
        }
      };

      pump();
    });

    // 7. Dispatch prompt_async
    const promptPayload: Record<string, unknown> = {
      parts: [{ type: "text", text: prompt }],
      ...(promptModel ? { model: promptModel } : {}),
      ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
    };

    const promptResp = await fetch(`${serverBaseUrl}/session/${sessionId}/prompt_async`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promptPayload),
      signal: internalAbortController.signal,
    }).catch((err) => {
      if (internalAbortController.signal.aborted) {
        throw getAbortError();
      }
      throw err;
    });

    if (!promptResp.ok) {
      const errText = await promptResp.text().catch(() => "");
      throw new Error(`Failed to send prompt to OpenCode session (HTTP ${promptResp.status}): ${errText}`);
    }

    // 8. Wait for session stream completion or abort/deadline/process-exit
    let abortListener: (() => void) | null = null;
    const abortPromise = new Promise<never>((_, reject) => {
      if (internalAbortController.signal.aborted) {
        reject(getAbortError());
        return;
      }
      abortListener = () => reject(getAbortError());
      internalAbortController.signal.addEventListener("abort", abortListener, { once: true });
    });

    try {
      await Promise.race([streamPromise, abortPromise]);
    } finally {
      if (abortListener) {
        internalAbortController.signal.removeEventListener("abort", abortListener);
        abortListener = null;
      }
    }

    const elapsed = Date.now() - startTime;
    return {
      text: fullText,
      raw: fullText,
      elapsed,
    };
  } finally {
    if (deadlineTimer) {
      clearTimeout(deadlineTimer);
      deadlineTimer = null;
    }
    if (options.signal) {
      options.signal.removeEventListener("abort", onExternalAbort);
    }
    serveProc.off("exit", onProcExit);
    await cleanup();
  }
}
