import { getDockerBrowserQuota } from "../dockerBrowserQuota";
import type { DockerSandboxQuotaProvider } from "../dockerSandboxExecutionBackend";

export type DockerRuntimeEnv = Readonly<Record<string, string | undefined>>;

/** Lazy probe only: importing this module never queries a browser or registers readiness. */
export function createDockerQuotaProvider(deps: { env: DockerRuntimeEnv }): DockerSandboxQuotaProvider {
    return async () => {
        try {
            const browser = deps.env.DOCKER_BROWSER_TARGET === "firefox" ? "firefox" : "chrome";
            const result = await getDockerBrowserQuota({ browser });
            if (!result.ok) return { ok: false, reason: result.code || "quota_unverifiable" };
            return {
                ok: true,
                availableNanoUsd: result.availableToSpendNanoUsd,
                rateNanoUsd: result.mediumRuntimeRate?.rateNanoUsd ?? 77_780n,
                observedAt: result.observedAt,
            };
        } catch {
            return { ok: false, reason: "quota_fetch_failed" };
        }
    };
}
