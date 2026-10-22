/** Operator-declared sbx account; authenticated caller binding is verified, sbx ownership is not. */
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import type { AgentRunGrant, ExecutionLease } from "../index";
import {
    DOCKER_SANDBOX_BACKEND_ID, createDockerSandboxExecutionBackend, defaultRunSbx,
    confirmDockerSandboxStopped, resolveMaxActiveSandboxesFromEnv,
    type DockerSandboxExecutionBackendDeps,
} from "../dockerSandboxExecutionBackend";
import { buildPrimaryExecutionTicket } from "./executionTicket";
import { createDockerToolChannel, dockerExecutionToolNames, type DockerWorkload } from "./toolRouting";
import type { DockerRuntimeEnv } from "./quotaProvider";

/** Trusted bootstrap channel, never exposed as a model-issued tool. */
export type DockerWorkloadRuntime = {
    exec(argv: readonly string[]): Promise<{ ok: boolean; stdout: string; exitCode: number | null }>;
    upload?(localPath: string, remotePath: string): Promise<{ ok: boolean; detail: string }>;
};
export function shQuote(value: string): string {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
export type DockerAccountBinding = {
    authorizedOwner: string;
    dockerAccount: string;
    /** Opaque operator-declared reference, never a credential. */
    credentialContextId: string;
};
export type DockerBindingDecision = { allowed: true; binding: DockerAccountBinding } | { allowed: false };
export function createTrustedDockerBindingAuthorizer(bindings: Iterable<DockerAccountBinding>):
    ((input: { authenticatedCaller: string; runId?: string }) => Promise<DockerBindingDecision>) & { isBound: (caller: string) => boolean } {
    const map = new Map<string, DockerAccountBinding>();
    for (const b of bindings) {
        if (!b?.authorizedOwner || !b.dockerAccount || !b.credentialContextId) continue;
        map.set(b.authorizedOwner, { authorizedOwner: b.authorizedOwner, dockerAccount: b.dockerAccount, credentialContextId: b.credentialContextId });
    }
    const authorizer = async ({ authenticatedCaller }: { authenticatedCaller: string; runId?: string }) => {
        const found = map.get(authenticatedCaller);
        if (!found) return { allowed: false as const };
        return { allowed: true as const, binding: { ...found } };
    };
    authorizer.isBound = (caller: string) => map.has(caller);
    return authorizer;
}
export function getTrustedDockerBindings(env: DockerRuntimeEnv): DockerAccountBinding[] {
    const raw = env.NOLO_DOCKER_BINDINGS;
    if (!raw) return [];
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
}
/** Pure factory: server test overrides deliberately remain in the compatibility wrapper. */
export function createDockerBindingAuthorizer(env: DockerRuntimeEnv) {
    return createTrustedDockerBindingAuthorizer(getTrustedDockerBindings(env));
}
export type DockerWorkloadLifecycleOptions = {
    topology: "single-host-shared-sqlite";
    journalPath: string;
    /** Supply the same env used by binding/resolver. Omission does not read process.env. */
    env?: DockerRuntimeEnv;
    authorize?: (input: { authenticatedCaller: string; runId: string }) => Promise<DockerBindingDecision>;
    resolveAccount: (binding: DockerAccountBinding) => DockerSandboxExecutionBackendDeps;
    isRunInactive?: (runId: string) => Promise<boolean>;
    maxActiveRunsPerAccount?: number;
    quotaVerify?: boolean;
    stopConfirm?: { attempts?: number; delayMs?: number };
};
export const DEFAULT_MAX_ACTIVE_RUNS_PER_ACCOUNT = 3;
type PendingRun = DockerAccountBinding & {
    runId: string; authenticatedCaller: string; sandbox: string;
    state: "cleanup_pending" | "active" | "released";
};
const PRE_CREATE_FAILURE_CODES: ReadonlySet<string> = new Set([
    "quota-unverifiable", "quota-insufficient", "concurrency-rejected", "quota-record-failed",
    "invalid-ticket", "lease-not-found", "lease-mismatch", "lease-released", "unsupported-request",
]);
function prepareMayHaveLeftSandbox(error: unknown): boolean {
    const err = error as { code?: unknown; cleanupPending?: unknown } | undefined;
    if (err?.cleanupPending === true) return true;
    const code = typeof err?.code === "string" ? err.code : undefined;
    if (code !== undefined && PRE_CREATE_FAILURE_CODES.has(code)) return false;
    return true;
}
export function resolveMaxActiveRunsPerAccount(requestedMax: number | undefined, env: DockerRuntimeEnv = {}): number {
    if (typeof requestedMax === "number" && Number.isInteger(requestedMax) && requestedMax > 0) return requestedMax;
    return resolveMaxActiveSandboxesFromEnv(env) ?? DEFAULT_MAX_ACTIVE_RUNS_PER_ACCOUNT;
}
export class DockerWorkloadLifecycle {
    private readonly db: Database;
    private readonly maxActiveRunsPerAccount: number;
    constructor(private readonly options: DockerWorkloadLifecycleOptions) {
        this.maxActiveRunsPerAccount = resolveMaxActiveRunsPerAccount(options.maxActiveRunsPerAccount, options.env ?? {});
        if (options.topology !== "single-host-shared-sqlite" || !isAbsolute(options.journalPath)) {
            throw new Error("docker_atomic_admission_not_configured");
        }
        this.db = new Database(options.journalPath, { create: true });
        this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
        this.db.exec(`CREATE TABLE IF NOT EXISTS docker_runs (
            runId TEXT PRIMARY KEY, authenticatedCaller TEXT NOT NULL,
            authorizedOwner TEXT NOT NULL, dockerAccount TEXT NOT NULL,
            credentialContextId TEXT NOT NULL, sandbox TEXT NOT NULL UNIQUE,
            state TEXT NOT NULL, cleanupPending INTEGER NOT NULL, createdAt INTEGER NOT NULL
        );
        DROP INDEX IF EXISTS docker_account_reservation;
        CREATE INDEX IF NOT EXISTS docker_runs_account_active ON docker_runs(dockerAccount, state);
        CREATE TABLE IF NOT EXISTS docker_authorization_audit (
            id TEXT PRIMARY KEY, runId TEXT NOT NULL, authenticatedCaller TEXT NOT NULL,
            authorizedOwner TEXT, dockerAccount TEXT, credentialContextId TEXT,
            authorizationResult TEXT NOT NULL, accountAttestation TEXT NOT NULL DEFAULT 'operator-declared',
            observedAt INTEGER NOT NULL
        );`);
    }
    /** BEGIN IMMEDIATE: cleanup_pending continues to occupy the account slot. */
    private admitRun(row: PendingRun): void {
        const admit = this.db.transaction((r: PendingRun) => {
            const { active } = this.db.query("SELECT COUNT(*) AS active FROM docker_runs WHERE dockerAccount=? AND state!='released'").get(r.dockerAccount) as { active: number };
            if (active >= this.maxActiveRunsPerAccount) throw new Error("docker_atomic_admission_rejected_account_limit");
            this.db.query("INSERT INTO docker_runs VALUES (?, ?, ?, ?, ?, ?, 'cleanup_pending', 1, ?)").run(
                r.runId, r.authenticatedCaller, r.authorizedOwner, r.dockerAccount, r.credentialContextId, r.sandbox, Date.now(),
            );
        });
        try { admit.immediate(row); }
        catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (message === "docker_atomic_admission_rejected_account_limit") throw error;
            throw new Error("docker_atomic_admission_rejected");
        }
    }
    close(): void { this.db.close(); }
    private audit(runId: string, caller: string, result: string, binding?: DockerAccountBinding): void {
        this.db.query(`INSERT INTO docker_authorization_audit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            randomUUID(), runId, caller, binding?.authorizedOwner ?? null,
            binding?.dockerAccount ?? null, binding?.credentialContextId ?? null, result, "operator-declared", Date.now(),
        );
    }
    private async stopAndConfirm(row: PendingRun): Promise<void> {
        const deps = this.options.resolveAccount(row);
        const runSbx = deps.runSbx ?? defaultRunSbx;
        this.db.query("UPDATE docker_runs SET state='cleanup_pending', cleanupPending=1 WHERE runId=? AND state!='released'").run(row.runId);
        try { await runSbx(["--cloud", "stop", row.sandbox], { timeoutMs: 10_000 }); } catch { /* listing decides */ }
        const stopConfirm = { attempts: 10, delayMs: 2_000, ...this.options.stopConfirm };
        if (!await confirmDockerSandboxStopped(runSbx, row.sandbox, 10_000, stopConfirm)) {
            throw new Error("docker_stop_unverified_cleanup_pending");
        }
        this.db.query("UPDATE docker_runs SET state='released', cleanupPending=0 WHERE runId=?").run(row.runId);
    }
    async recover(): Promise<{ released: string[]; pending: string[] }> {
        const rows = this.db.query("SELECT * FROM docker_runs WHERE state!='released'").all() as PendingRun[];
        const released: string[] = [], pending: string[] = [];
        for (const row of rows) {
            try {
                if (!await this.options.isRunInactive?.(row.runId)) { pending.push(row.runId); continue; }
                await this.stopAndConfirm(row);
                released.push(row.runId);
            } catch { pending.push(row.runId); }
        }
        return { released, pending };
    }
    async run<T>(input: {
        runId: string; authenticatedCaller: string; grant: AgentRunGrant; signal?: AbortSignal;
    }, body: (workload: DockerWorkload, runtime: DockerWorkloadRuntime) => Promise<T>): Promise<T> {
        const { runId, authenticatedCaller, grant, signal } = input;
        if (!runId || !authenticatedCaller) throw new Error("docker_authenticated_identity_required");
        let decision: DockerBindingDecision;
        try { decision = await this.options.authorize?.({ authenticatedCaller, runId }) ?? { allowed: false }; }
        catch { this.audit(runId, authenticatedCaller, "denied"); throw new Error("docker_account_binding_denied"); }
        const binding = decision.allowed ? decision.binding : undefined;
        if (!binding?.authorizedOwner || !binding.dockerAccount || !binding.credentialContextId) {
            this.audit(runId, authenticatedCaller, "denied"); throw new Error("docker_account_binding_denied");
        }
        if (binding.authorizedOwner !== authenticatedCaller) {
            this.audit(runId, authenticatedCaller, "denied", binding); throw new Error("docker_caller_mismatch");
        }
        this.audit(runId, authenticatedCaller, "allowed", binding);
        if (signal?.aborted) throw new Error("docker_run_cancelled");
        const ticket = buildPrimaryExecutionTicket(grant, "oneshot");
        if (ticket.callerUserId && ticket.callerUserId !== authenticatedCaller) {
            this.audit(runId, authenticatedCaller, "denied", binding); throw new Error("docker_caller_mismatch");
        }
        const deps = this.options.resolveAccount(binding);
        if (!deps.kvStore || !deps.quotaProvider) throw new Error("docker_account_backend_not_configured");
        if (deps.dockerAccount && deps.dockerAccount !== binding.dockerAccount) throw new Error("docker_quota_account_mismatch");
        if (deps.owner && deps.owner !== binding.authorizedOwner) throw new Error("docker_quota_owner_mismatch");
        const row: PendingRun = { ...binding, runId, authenticatedCaller, sandbox: `nolo-run-${randomUUID()}`, state: "cleanup_pending" };
        this.admitRun(row);
        let active = true;
        let inFlight: Promise<unknown> = Promise.resolve();
        let backend: ReturnType<typeof createDockerSandboxExecutionBackend> | undefined;
        let lease: Awaited<ReturnType<NonNullable<typeof backend>["prepare"]>> | undefined;
        let completed = false, bodyReached = false, mayHaveSandbox = false;
        let prepareFailureCode: string | undefined;
        try {
            backend = createDockerSandboxExecutionBackend({ ...deps, owner: binding.authorizedOwner,
                dockerAccount: binding.dockerAccount, sandboxName: row.sandbox,
                ...(typeof deps.quotaVerify === "boolean" ? { quotaVerify: deps.quotaVerify }
                    : typeof this.options.quotaVerify === "boolean" ? { quotaVerify: this.options.quotaVerify } : {}),
                maxActiveSandboxesPerAccount: deps.maxActiveSandboxesPerAccount
                    ?? resolveMaxActiveSandboxesFromEnv(this.options.env ?? {}) ?? this.maxActiveRunsPerAccount });
            try { lease = await backend.prepare(ticket); mayHaveSandbox = true; }
            catch (prepareError) {
                mayHaveSandbox = prepareMayHaveLeftSandbox(prepareError);
                prepareFailureCode = typeof (prepareError as any)?.code === "string" ? (prepareError as any).code : undefined;
                throw prepareError;
            }
            this.db.query("UPDATE docker_runs SET state='active' WHERE runId=?").run(runId);
            bodyReached = true;
            const boundBackend = backend, boundLease = lease;
            const workload: DockerWorkload = { kind: "docker", channel: createDockerToolChannel(grant, {
                supportedToolNames: [...dockerExecutionToolNames],
                execute: request => {
                    const job = inFlight.then(async () => {
                        if (!active || signal?.aborted || request.signal?.aborted) throw new Error("docker_run_not_active");
                        const argv = request.argv !== undefined && request.argv.length > 0 ? [...request.argv]
                            : request.command !== undefined ? ["bash", "-lc", request.cwd !== undefined
                                ? `cd ${shQuote(request.cwd)} && ${request.command}` : request.command] : undefined;
                        if (!argv) throw new Error("docker_request_missing_command");
                        const result = await boundBackend.execute(boundLease, { kind: "command", argv });
                        return JSON.stringify(result);
                    });
                    inFlight = job.catch(() => undefined);
                    return job;
                },
            }) };
            const runtime: DockerWorkloadRuntime = {
                exec: argv => {
                    const job = inFlight.then(async () => {
                        if (!active || signal?.aborted) throw new Error("docker_run_not_active");
                        const result = await boundBackend.execute(boundLease, { kind: "command", argv: [...argv] });
                        const output = (result as any)?.output;
                        const stdout = typeof output === "string" ? output : typeof output?.stdout === "string" ? output.stdout : "";
                        return { ok: (result as any)?.ok === true, stdout,
                            exitCode: typeof (result as any)?.exitCode === "number" ? (result as any).exitCode : null };
                    });
                    inFlight = job.catch(() => undefined);
                    return job;
                },
                upload: async (localPath, remotePath) => {
                    const sent = await (deps.runSbx ?? defaultRunSbx)(
                        ["--cloud", "cp", "-L", localPath, `${row.sandbox}:${remotePath}`], { timeoutMs: 10 * 60_000 });
                    if (sent.exitCode === 0) return { ok: true, detail: "copied" };
                    const stderr = String((sent as { stderr?: string }).stderr ?? "").slice(0, 200);
                    return { ok: false, detail: `sbx cp exit ${String(sent.exitCode)}${stderr ? `: ${stderr}` : ""}` };
                },
            };
            const result = await body(workload, runtime);
            completed = true;
            return result;
        } finally {
            active = false;
            await inFlight;
            if (mayHaveSandbox) {
                this.db.query("UPDATE docker_runs SET state='cleanup_pending' WHERE runId=?").run(runId);
                if (lease === undefined) {
                    this.audit(runId, authenticatedCaller, `cleanup-after-create-without-lease:${prepareFailureCode ?? "unknown"}`, binding);
                }
                const releaseTarget: ExecutionLease = lease ?? {
                    leaseId: row.sandbox, backendId: DOCKER_SANDBOX_BACKEND_ID,
                    ticketId: ticket.ticketId, grantId: ticket.grantId, createdAt: Date.now(),
                    readableRoots: [], writableRoots: [], metadata: { sandboxName: row.sandbox, leaseRecoveredBeforeHandoff: true },
                };
                if (backend) {
                    try { await backend.release(releaseTarget, signal?.aborted ? "cancelled" : completed ? "completed" : "failed"); }
                    catch { /* independently verify below; pending survives any failure */ }
                }
                try { await this.stopAndConfirm(row); }
                catch (cleanupError) {
                    const detail = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
                    this.audit(runId, authenticatedCaller, `cleanup_pending_unverified:${detail}`, binding);
                    console.warn(`[dockerWorkloadLifecycle] cleanup_pending run=${runId} sandbox=${row.sandbox}: ${detail}`);
                    // Preserve the original body failure; successful bodies cannot hide unconfirmed cleanup.
                    if (!bodyReached || completed) throw cleanupError;
                }
            } else {
                this.db.query("UPDATE docker_runs SET state='released', cleanupPending=0 WHERE runId=? AND state!='released'").run(runId);
                this.audit(runId, authenticatedCaller, `prepare-failed-released:${prepareFailureCode ?? "unknown"}`, binding);
            }
        }
    }
}
