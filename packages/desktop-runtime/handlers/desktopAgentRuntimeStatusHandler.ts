import { toErrorMessage } from "core/errorMessage";
import {
  buildDesktopAgentRuntimeReadiness,
  type DesktopAgentRuntimeReadinessStatus,
} from "./desktopAgentRuntimeReadiness";
import {
  readDesktopProviderRuntimeSnapshot,
  type DesktopProviderRuntimeSnapshot,
} from "./desktopLlamaRuntimeHandler";
import type { DesktopAgentRuntimeEnv } from "./desktopAgentRuntimeHostCapabilities";

export type { DesktopAgentRuntimeReadinessStatus } from "./desktopAgentRuntimeReadiness";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

export async function buildDesktopAgentRuntimeReadinessStatus(args: {
  env?: DesktopAgentRuntimeEnv;
  readDesktopProviderRuntimeSnapshot?: () => Promise<DesktopProviderRuntimeSnapshot>;
} = {}): Promise<DesktopAgentRuntimeReadinessStatus> {
  const env = args.env ?? process.env;
  const providerRuntimeSnapshot = await (
    args.readDesktopProviderRuntimeSnapshot ?? readDesktopProviderRuntimeSnapshot
  )();
  return buildDesktopAgentRuntimeReadiness({
    env,
    providerRuntimeSnapshot,
  });
}

export async function handleDesktopAgentRuntimeStatusGet(
  _req: Request,
  deps: {
    env?: DesktopAgentRuntimeEnv;
    readDesktopProviderRuntimeSnapshot?: () => Promise<DesktopProviderRuntimeSnapshot>;
  } = {}
) {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return new Response(JSON.stringify({ error: "Desktop runtime only" }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  try {
    return new Response(JSON.stringify(await buildDesktopAgentRuntimeReadinessStatus({
      env,
      readDesktopProviderRuntimeSnapshot: deps.readDesktopProviderRuntimeSnapshot,
    })), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: toErrorMessage(error),
    }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
