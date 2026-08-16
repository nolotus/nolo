import { toErrorMessage } from "core/errorMessage";
import {
  createXReadFailure,
  type XPost,
  type XReadResult,
  type XThread,
} from "../types";
import { parseVisibleXPostText } from "../visibleTextParser";
import type { LocalBrowserReader } from "./localBrowser";

type CdpResponse = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message?: string };
};

export type RawCdpXReaderOptions = {
  endpoint: string;
  timeoutMs?: number;
};

export async function getBrowserWebSocketUrl(
  endpoint: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(`${endpoint.replace(/\/$/, "")}/json/version`);
  if (!response.ok) {
    throw new Error(`CDP version endpoint returned ${response.status}`);
  }

  const data = (await response.json()) as { webSocketDebuggerUrl?: string };
  if (!data.webSocketDebuggerUrl) {
    throw new Error("CDP version endpoint did not include webSocketDebuggerUrl");
  }

  return data.webSocketDebuggerUrl;
}

async function connectRawCdp(wsUrl: string, timeoutMs: number): Promise<WebSocket> {
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(
      () => reject(new Error(`CDP WebSocket open timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );

    ws.onopen = () => {
      clearTimeout(timeout);
      resolve(ws);
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("CDP WebSocket failed to open"));
    };
  });
}

export async function readVisibleTextOverRawCdp(args: {
  endpoint: string;
  url: string;
  timeoutMs?: number;
}): Promise<string> {
  const timeoutMs = args.timeoutMs ?? 15000;
  const ws = await connectRawCdp(
    await getBrowserWebSocketUrl(args.endpoint),
    timeoutMs,
  );
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve(value: CdpResponse): void; reject(error: Error): void }
  >();

  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as CdpResponse;
    if (typeof message.id !== "number") {
      return;
    }

    const waiter = pending.get(message.id);
    if (!waiter) {
      return;
    }
    pending.delete(message.id);

    if (message.error) {
      waiter.reject(new Error(message.error.message ?? "CDP command failed"));
    } else {
      waiter.resolve(message);
    }
  };

  function send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<CdpResponse> {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pending.set(id, {
        resolve(value) {
          clearTimeout(timeout);
          resolve(value);
        },
        reject(error) {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  try {
    const target = await send("Target.createTarget", { url: "about:blank" });
    const targetId = String(target.result?.targetId ?? "");
    const attached = await send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const sessionId = String(attached.result?.sessionId ?? "");

    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Page.navigate", { url: args.url }, sessionId);

    const deadline = Date.now() + timeoutMs;
    let lastText = "";
    let stableReads = 0;
    const targetHandle = /x\.com\/([^/]+)\/status\//.exec(args.url)?.[1];
    while (Date.now() <= deadline) {
      const evaluated = await send(
        "Runtime.evaluate",
        {
          expression: "document.body ? document.body.innerText : ''",
          returnByValue: true,
        },
        sessionId,
      );
      const result = evaluated.result?.result as { value?: unknown } | undefined;
      const text = typeof result?.value === "string" ? result.value : "";
      if (
        text.includes(`@${targetHandle}`) &&
        text.length === lastText.length &&
        text.length > 0
      ) {
        stableReads += 1;
      } else {
        stableReads = 0;
      }
      lastText = text;
      if ((!targetHandle && lastText) || stableReads >= 2) {
        return lastText;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return lastText;
  } finally {
    ws.close();
  }
}

export function createRawCdpXReader(
  options: RawCdpXReaderOptions,
): LocalBrowserReader {
  const timeoutMs = options.timeoutMs ?? 15000;

  return {
    async readVisiblePost(url: string): Promise<XReadResult<XPost>> {
      const fetchedAt = new Date().toISOString();
      try {
        const visibleText = await readVisibleTextOverRawCdp({
          endpoint: options.endpoint,
          url,
          timeoutMs,
        });
        return parseVisibleXPostText(visibleText, {
          url,
          fetchedAt,
        });
      } catch (error) {
        return createXReadFailure({
          code: "network_error",
          message: toErrorMessage(error),
          nextStep:
            "Start Chrome with --remote-debugging-port or check the raw CDP endpoint.",
          backend: "desktop_local_browser",
          fetchedAt,
        });
      }
    },
    async readVisibleThread(url: string): Promise<XReadResult<XThread>> {
      const postResult = await this.readVisiblePost(url);
      if (!postResult.ok) {
        return postResult;
      }

      return {
        ok: true,
        backend: "desktop_local_browser",
        fetchedAt: postResult.fetchedAt,
        data: {
          root: postResult.data,
          posts: [postResult.data],
          completeness: "single_post",
          missingReason: "unsupported_content",
        },
      };
    },
  };
}
