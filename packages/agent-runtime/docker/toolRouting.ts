import type { AgentRunGrant } from "../runGrant";
import type { ExecutionTicket } from "../executionBackend";
import { isDestructiveShellCommand } from "./destructiveShellPolicy";
import { buildPrimaryExecutionTicket } from "./executionTicket";
import {
    buildToolInvocation,
    parseToolOutput,
} from "./sandboxWorkspaceHelper";

/** Docker sandbox allowed tools: bounded shell execution + container-local file ops. */
export const dockerExecutionToolNames = [
    "execShell",
    "readFile",
    "writeFile",
    "editFile",
    "globFiles",
    "grepFiles",
] as const;

export type DockerExecutionToolName = (typeof dockerExecutionToolNames)[number];

export type DockerExecutionRequest = {
    ticket: ExecutionTicket;
    command?: string;
    kind?: "command";
    argv?: readonly string[];
    cwd?: string;
    signal?: AbortSignal;
};

export interface DockerExecutionBackend {
    readonly supportedToolNames: readonly string[];
    execute(request: DockerExecutionRequest): Promise<string>;
}

export type DockerToolChannel = (
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
) => Promise<string>;

export type DockerWorkload = {
    kind: "docker";
    /** Server-created only; never taken from model arguments. Absent means not ready. */
    channel?: DockerToolChannel;
};

const deny = (error: string) => JSON.stringify({ ok: false, error, workloadLocation: "docker" });

type DockerBackendEnvelope = {
    ok?: unknown;
    exitCode?: unknown;
    error?: unknown;
    output?: unknown;
};

/** Model-facing diagnostics contain only stable codes, never backend text.
 * A zero exit status is not a command failure: contradictory or incomplete
 * success envelopes are invalid; explicit rejection remains a rejection.
 */
function describeDockerBackendFailure(record: DockerBackendEnvelope): string {
    if (record.exitCode === 0) {
        return record.ok === false ? "docker_backend_rejected" : "docker_backend_invalid_envelope";
    }
    if (typeof record.error === "string" && record.error) return "docker_backend_rejected";
    if (record.exitCode === 127) return "docker_helper_not_found";
    if (record.exitCode === 126) return "docker_helper_not_executable";
    if (typeof record.exitCode === "number" && Number.isSafeInteger(record.exitCode) && record.exitCode !== 0) {
        return `docker_tool_exit_code:${record.exitCode}`;
    }
    return record.ok === false ? "docker_backend_rejected" : "docker_backend_invalid_envelope";
}

/** Bind authority once, outside model input. P2 must provide a sandbox-bound backend.
 * ExecutionTicket.target still describes grant provenance, NOT workload placement.
 * No host executor or nullable result exists in this contract.
 */
export function createDockerToolChannel(
    runGrant: AgentRunGrant,
    backend?: DockerExecutionBackend,
): DockerToolChannel {
    const ticket = buildPrimaryExecutionTicket(runGrant, "oneshot");
    return async (toolName, args, signal) => {
        if (!dockerExecutionToolNames.includes(toolName as DockerExecutionToolName)) {
            return deny("docker_tool_not_supported");
        }
        if (!ticket.toolNames.includes(toolName)) {
            return deny("docker_tool_not_authorized");
        }

        if (toolName === "execShell") {
            if (!ticket.shellAllowed) {
                return deny("docker_tool_not_authorized");
            }
            // Interactive/session semantics need lifecycle support; never forward them.
            if (Object.keys(args).some(key => !["command", "cwd"].includes(key)) ||
                typeof args.command !== "string" || !args.command.trim() ||
                (args.cwd !== undefined && typeof args.cwd !== "string")) {
                return deny("docker_tool_arguments_not_supported");
            }
            // P1 does not carry confirmation authority; destructive commands fail closed.
            if (isDestructiveShellCommand({ command: args.command })) return deny("docker_destructive_command_not_supported");
            if (signal?.aborted) return deny("docker_execution_aborted");
            if (!backend) return deny("docker_execution_not_ready");
            if (!backend.supportedToolNames.includes(toolName)) return deny("docker_backend_tool_not_supported");
            try {
                // A backend cannot mutate authority retained for subsequent calls.
                return await backend.execute({
                    ticket: structuredClone(ticket),
                    command: args.command,
                    ...(typeof args.cwd === "string" ? { cwd: args.cwd } : {}),
                    ...(signal ? { signal } : {}),
                });
            } catch {
                return deny("docker_execution_failed");
            }
        }

        // File tools: readFile, writeFile, editFile, globFiles, grepFiles
        const invocation = buildToolInvocation(toolName, args);
        if (!invocation.ok) {
            return deny(invocation.error);
        }
        if (signal?.aborted) return deny("docker_execution_aborted");
        if (!backend) return deny("docker_execution_not_ready");
        if (!backend.supportedToolNames.includes(toolName)) return deny("docker_backend_tool_not_supported");

        try {
            const rawResult = await backend.execute({
                ticket: structuredClone(ticket),
                kind: "command",
                argv: invocation.argv,
                command: invocation.argv.join(" "),
                ...(signal ? { signal } : {}),
            });
            // Backend result is either an ExecutionResult envelope or raw
            // stdout. Only an explicit success envelope is unwrapped; every
            // other JSON object is a terminal failure and is never read as
            // stdout (that used to turn failures into successes).
            let stdout = rawResult;
            let parsedRaw: unknown;
            try {
                parsedRaw = JSON.parse(rawResult);
            } catch {
                parsedRaw = undefined; // plain stdout, parseToolOutput validates it
            }
            if (parsedRaw !== undefined && typeof parsedRaw === "object" && parsedRaw !== null && !Array.isArray(parsedRaw)) {
                const record = parsedRaw as Record<string, unknown>;
                const envelope = record.output;
                if (typeof envelope === "object" && envelope !== null && !Array.isArray(envelope)) {
                    const stdoutField = (envelope as Record<string, unknown>).stdout;
                    if (record.ok !== true || record.exitCode !== 0 || typeof stdoutField !== "string") {
                        return deny(describeDockerBackendFailure(record));
                    }
                    stdout = stdoutField;
                } else if (record.ok === false) {
                    return deny(describeDockerBackendFailure(record));
                } else if (typeof record.ok !== "boolean") {
                    return deny("invalid_helper_output");
                }
            }
            const output = parseToolOutput(stdout);
            if (!output.ok) {
                return deny(output.error);
            }
            const payload = typeof output.value === "object" && output.value !== null
                ? { ok: true, ...output.value, value: output.value, workloadLocation: "docker" }
                : { ok: true, value: output.value, workloadLocation: "docker" };
            return JSON.stringify(payload);
        } catch {
            return deny("docker_execution_failed");
        }
    };
}

/** null means non-Docker ONLY. Even a missing/broken channel is terminal.
 * Until a platform-tool split is explicitly audited, Docker runs conservatively
 * reject ALL tools outside the allowlist, including platform tools.
 */
export async function executeDockerWorkloadTool(
    workload: DockerWorkload | undefined,
    toolName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
): Promise<string | null> {
    if (workload?.kind !== "docker") return null;
    if (!dockerExecutionToolNames.includes(toolName as DockerExecutionToolName)) return deny("docker_tool_not_supported");
    if (!workload.channel) return deny("docker_execution_not_ready");
    try {
        // DockerToolChannel guarantees Promise<string>; no unreachable type guard.
        return await workload.channel(toolName, args, signal);
    } catch {
        return deny("docker_execution_failed");
    }
}
