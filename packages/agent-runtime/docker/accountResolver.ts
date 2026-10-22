import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
    FileDockerQuotaKvStore,
    type DockerQuotaKvStore,
} from "../dockerQuotaStore";
import {
    defaultRunSbx, resolveMaxActiveSandboxesFromEnv,
    type SbxCommandFn, type DockerSandboxQuotaProvider, type DockerSandboxExecutionBackendDeps,
} from "../dockerSandboxExecutionBackend";
import type { DockerAccountBinding } from "./workloadLifecycle";
import { createDockerQuotaProvider, type DockerRuntimeEnv } from "./quotaProvider";

export class DockerAccountResolutionError extends Error {
    readonly code: string;
    constructor(code: string, message?: string) {
        super(message ? `${code}: ${message}` : code);
        this.name = "DockerAccountResolutionError";
        this.code = code;
    }
}

export type DockerAccountResolverDeps = {
    env: DockerRuntimeEnv;
    /** sbx credential context is operator-declared, not verified by the resolver. */
    runSbx?: SbxCommandFn;
    quotaProvider?: DockerSandboxQuotaProvider;
    kvStore?: DockerQuotaKvStore;
    providerDockerAccount?: string;
};

/** No profile/global-env fallback: callers needing profile storage must inject kvStore. */
function createEnvQuotaStore(env: DockerRuntimeEnv): DockerQuotaKvStore {
    const mode = env.DOCKER_QUOTA_STORAGE || "auto";
    if (mode !== "local" && mode !== "remote" && mode !== "auto") {
        throw new DockerAccountResolutionError("docker_quota_storage_invalid");
    }
    const serverUrl = (env.NOLO_SERVER || env.BASE_URL || "").trim();
    const authToken = (env.AUTH_TOKEN || env.AUTH || "").trim();
    if (mode === "remote" && (!serverUrl || !authToken)) {
        throw new DockerAccountResolutionError("docker_quota_remote_not_configured");
    }
    if (mode !== "local" && serverUrl && authToken) {
        // Existing Remote store reads ambient profiles even with explicit credentials.
        // Do not silently import another environment's storage context.
        throw new DockerAccountResolutionError("docker_quota_remote_store_injection_required");
    }
    return new FileDockerQuotaKvStore(join(env.NOLO_HOME || resolve(homedir(), ".nolo"), "docker-quota.json"));
}

export function createDockerAccountResolver(deps: DockerAccountResolverDeps):
    (binding: DockerAccountBinding) => DockerSandboxExecutionBackendDeps {
    const env = deps.env;
    return binding => {
        if (!binding?.authorizedOwner || !binding.dockerAccount || !binding.credentialContextId) {
            throw new DockerAccountResolutionError("docker_binding_invalid", "Missing required Docker account binding fields");
        }
        const expected = deps.providerDockerAccount ?? env.DOCKER_ACCOUNT;
        if ((expected && expected !== binding.dockerAccount) ||
            (env.DOCKER_ACCOUNT && env.DOCKER_ACCOUNT !== binding.dockerAccount)) {
            throw new DockerAccountResolutionError("docker_quota_account_mismatch");
        }
        const probe = deps.quotaProvider ?? createDockerQuotaProvider({ env });
        return {
            runSbx: deps.runSbx ?? defaultRunSbx,
            kvStore: deps.kvStore ?? createEnvQuotaStore(env),
            quotaProvider: async () => {
                if (env.DOCKER_ACCOUNT && env.DOCKER_ACCOUNT !== binding.dockerAccount) {
                    return { ok: false, reason: "docker_quota_account_mismatch" };
                }
                return probe();
            },
            owner: binding.authorizedOwner,
            dockerAccount: binding.dockerAccount,
            maxOutputChars: 40_000,
            maxActiveSandboxesPerAccount: resolveMaxActiveSandboxesFromEnv(env) ?? undefined,
        };
    };
}
