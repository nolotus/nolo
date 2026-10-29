// packages/cli/agentFavoriteCommands.ts
//
// `nolo agent favorite` —— 收藏 / 取消收藏一个 agent。
//
// 收藏是**用户侧关系**，不是 agent 记录上的字段。服务端把关系写成三把 key：
//   fav-agent-key-{userId}-{agentKey}          正向：谁收藏了哪个 agent
//   fav-agent-key-by-agent-{agentKey}-{userId} 反向：某个 agent 被谁收藏
//   fav-agent-count-key-{agentKey}              聚合计数（agent.metrics.favoriteCount）
//
// 鉴权只看**当前登录用户 id**（RPC setFavorite 的 auth 走 Bearer token → userId），
// 与 agent key 的 keyOwner 无关。所以别人分享给我的 agent 也能收藏/取消收藏，
// 不需要对该 agent 有写权限——`nolo agent update` / `nolo agent delete` 才需要
// keyOwner（前者写 agent 记录，后者删记录）。
//
// 写入走服务端已有的 RPC（POST /rpc/setFavorite），与 web 端星标同一路径。
//
// **跨服务器**：收藏是集群级用户偏好。web 端用 setFavoriteAcrossServers 把同一次
// 收藏写到所有 remote servers；`nolo agent list` 读收藏时同样合并所有候选服务器
// （listFavoriteAgentIdsAcrossServers）。所以本命令也写全部候选服务器——只写一台的话，
// 另一台残留的旧关系会让 list 仍显示 isFavorite=true，撤销不生效。
// 部分失败只告警不失败（与 web 一致），全部失败才退出非 0。

import { toErrorMessage } from "core/errorMessage";
import { resolveCliAgentKeyInput } from "./agentAliases";
import {
  resolveAuthToken,
  resolveServerCandidates,
  resolveServerUrl,
  type EnvLike,
} from "./cliEnvHelpers";
import type { CliFetchImpl } from "./cliFetch";

type OutputLike = {
  write(chunk: string): unknown;
};

export type AgentFavoriteCommandDeps = {
  env?: EnvLike;
  output?: OutputLike;
  fetchImpl?: CliFetchImpl;
};

export type SetFavoriteResponse = {
  targetType?: string;
  targetKey?: string;
  isFavorite?: boolean;
  favoriteCount?: number;
};

export type SetFavoriteAttempt = {
  serverUrl: string;
  ok: boolean;
  response?: SetFavoriteResponse;
  error?: string;
};

function wantsHelp(args: string[]) {
  return args.includes("--help") || args.includes("-h");
}

function wantsJson(args: string[]) {
  return args.includes("--json");
}

/** 需要带值的 flag；其余 flag（--off / --json / --help）一律当布尔开关处理。 */
const VALUE_FLAGS = new Set(["--server-url", "--server"]);

/** 取位置参数（跳过 flag 及其值），与其它 agent 命令保持同一口径。 */
function positionalArgs(args: string[]) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg.startsWith("--")) {
      if (arg.includes("=")) continue;
      // 只有带值的 flag 才消费下一个 token；布尔 flag 不消费，
      // 否则 `agent favorite --off <key>` 会把 <key> 当成 --off 的值吞掉。
      if (VALUE_FLAGS.has(arg)) index += 1;
      continue;
    }
    values.push(arg);
  }
  return values;
}

export function writeAgentFavoriteHelp(output: OutputLike) {
  output.write(
    "Usage:\n" +
      "  nolo agent favorite <agent> [--off] [--json]\n" +
      "\n" +
      "Favorite an agent for the current user; --off removes the favorite.\n" +
      "Favorite is a per-user relation stored on the server, so an agent shared\n" +
      "with you can be favorited without write access to the agent record.\n" +
      "The change is synced to every server in the current candidate set, matching\n" +
      "the web UI and `nolo agent list`.\n" +
      "<agent> accepts an agent key (agent-<owner>-<id>), a known alias, or a web URL.\n",
  );
}

/**
 * 调用服务端 setFavorite RPC。幂等写入：重复收藏同一个 agent 不会叠加计数。
 * favoritedAt 由调用方统一生成，保证多服务器写下的收藏时间一致
 * （list 合并时按 favoritedAt 取最新）。
 */
async function callSetFavorite(args: {
  serverUrl: string;
  authToken: string;
  fetchImpl: CliFetchImpl;
  agentKey: string;
  isFavorite: boolean;
  favoritedAt: number;
}): Promise<SetFavoriteResponse> {
  const url = `${args.serverUrl.replace(/\/$/, "")}/rpc/setFavorite`;
  const res = await args.fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.authToken}`,
    },
    body: JSON.stringify({
      targetType: "agent",
      targetKey: args.agentKey,
      isFavorite: args.isFavorite,
      favoritedAt: args.favoritedAt,
    }),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const code = payload?.code ? ` [${payload.code}]` : "";
    const message =
      payload?.message || `setFavorite request failed (${res.status})`;
    throw new Error(`${message}${code}`);
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("setFavorite returned an invalid response");
  }
  return payload as SetFavoriteResponse;
}

/**
 * 把收藏状态写到全部候选服务器。部分失败不阻断（与 web 端语义一致），
 * 全部失败才把错误抛给调用方。
 */
export async function setFavoriteAcrossServers(args: {
  serverUrls: string[];
  authToken: string;
  fetchImpl: CliFetchImpl;
  agentKey: string;
  isFavorite: boolean;
  favoritedAt: number;
}): Promise<SetFavoriteAttempt[]> {
  const settled = await Promise.allSettled(
    args.serverUrls.map((serverUrl) =>
      callSetFavorite({
        serverUrl,
        authToken: args.authToken,
        fetchImpl: args.fetchImpl,
        agentKey: args.agentKey,
        isFavorite: args.isFavorite,
        favoritedAt: args.favoritedAt,
      }),
    ),
  );
  return settled.map((result, index) =>
    result.status === "fulfilled"
      ? {
          serverUrl: args.serverUrls[index]!,
          ok: true,
          response: result.value,
        }
      : {
          serverUrl: args.serverUrls[index]!,
          ok: false,
          error: toErrorMessage(result.reason),
        },
  );
}

export async function runAgentFavoriteCommand(
  args: string[],
  deps: AgentFavoriteCommandDeps = {},
) {
  const env = deps.env ?? process.env;
  const output = deps.output ?? process.stdout;

  if (wantsHelp(args)) {
    writeAgentFavoriteHelp(output);
    return 0;
  }

  const authToken = resolveAuthToken(args, env);
  if (!authToken) {
    output.write(
      "[nolo] agent favorite requires an auth token. Run `nolo login` or set AUTH_TOKEN.\n",
    );
    return 1;
  }

  const raw = positionalArgs(args)[0];
  if (!raw) {
    output.write("[nolo] agent key is required.\n");
    writeAgentFavoriteHelp(output);
    return 1;
  }
  const agentKey = resolveCliAgentKeyInput(raw);
  const isFavorite = !args.includes("--off");
  const primaryServerUrl = resolveServerUrl(args, env);
  const serverUrls = resolveServerCandidates(args, env, primaryServerUrl);

  try {
    const attempts = await setFavoriteAcrossServers({
      serverUrls,
      authToken,
      fetchImpl: deps.fetchImpl ?? fetch,
      agentKey,
      isFavorite,
      // 同一批写入共享同一个收藏时间戳：list 合并多服务器时按 favoritedAt 取最新，
      // 各自取 Date.now() 会让各服务器时间错开毫秒级。
      favoritedAt: Date.now(),
    });

    const failures = attempts.filter((attempt) => !attempt.ok);
    if (failures.length === attempts.length) {
      output.write(
        `[nolo] agent favorite failed on all ${attempts.length} server(s): ` +
          `${failures.map((f) => `${f.serverUrl} (${f.error})`).join(", ")}\n`,
      );
      return 1;
    }

    if (wantsJson(args)) {
      output.write(
        `${JSON.stringify(
          {
            targetType: "agent",
            targetKey: agentKey,
            isFavorite,
            favoritedAt: attempts[0]?.response?.favoritedAt ?? null,
            servers: attempts,
          },
          null,
          2,
        )}\n`,
      );
      return 0;
    }

    const primary =
      attempts.find((attempt) => attempt.serverUrl === primaryServerUrl) ??
      attempts.find((attempt) => attempt.ok);
    const count = primary?.response?.favoriteCount;
    const state = isFavorite ? "Favorited" : "Unfavorited";
    const countText = typeof count === "number" ? ` (favorites: ${count})` : "";
    output.write(`${state} ${agentKey}${countText}\n`);
    if (failures.length > 0) {
      output.write(
        `[nolo] warning: ${failures.length} of ${attempts.length} server(s) failed: ` +
          `${failures.map((f) => `${f.serverUrl} (${f.error})`).join(", ")}\n`,
      );
    }
    return 0;
  } catch (error) {
    output.write(`[nolo] agent favorite failed: ${toErrorMessage(error)}\n`);
    return 1;
  }
}
