// packages/ai/tools/agent/runtimeKeyDispatchGuard.ts
//
// startAgentRun 的 runtimeKey 是「这次 run 在哪执行」的硬承诺。schema 里写得很
// 明确（startAgentRunTool.ts 的 runtimeKey 描述）：填了就只在那个位置执行，
// key 非法 / 运行时未配置 / 机器离线时会显式报错，**不会悄悄改在本机执行**。
//
// CLI 本地派发通道（packages/cli/client/cliAgentRunToolExecutors.ts 的
// createCliStartAgentRunExecutor）把 runtimeKey **转发**给子 run。
// 「转发出去」不等于「宿主能兑现」，两者必须分开判定：
//   - `local`：子进程本来就在本机跑，恒可兑现；
//   - `docker` / `docker:<id>`：本机 CLI 有 sbx 云沙盒通道
//     （packages/cli/client/localDockerWorkload.ts），可兑现的前提是账户绑定
//     （NOLO_DOCKER_BINDINGS）与额度可核实；核实不了就在 run 开跑**前**显式
//     失败（fail-closed），绝不回落到宿主 cwd；
//   - `machine:<id>` / `instabox` / `gcp` / `server` / `runtime-v1:...`：本机通道
//     一个都兑现不了（本机没有对应执行后端），必须在**任何副作用之前**拒绝派发。
//
// 形态真值不在这里：只有 `./cliLocalRuntimeCapability` 一份（host × runtimeKey
// → fulfillable / acceptedByCliArgs）。本模块从它派生，不再自己写 docker 正则。
//
// ── F11 不变式（2026-10-18 改写，旧版只写在注释里且已过期）─────────────────
// 旧不变式「spawn argv 不得携带 --runtime-key」在 T6 之后**不再成立**：docker 必须
// 转发 key，否则子 run 会走服务端通道（那边没有本机 sbx 凭据）——「以为在沙盒」而实际
// 落在别处，正是要消灭的静默漂移。新的真实约束，由
// `assertCliLocalSpawnArgvInvariant` 机械断言：
//   1) 任何**非 docker** key 永不产生 spawn（抛错 → 零 spawn、零 run 记录）；
//   2) docker key 必须 `--runtime-key docker[:<id>]` 与 `--local` **成对出现**
//      （只带 key 会走服务端通道 = 刚踩过的坑）；
//   3) 允许完全不出现 `--runtime-key`（显式宿主执行 / 只读派发留宿主）。
//
// 保留语义：本函数必须在任何副作用之前调用；拒绝即零 spawn、零 run 记录。
// 服务端宿主不在这里重复判定（服务端才是授权/就绪状态的权威）。

import {
    assertCliLocalAllowlistMatchesCapabilityTable,
    isDockerRuntimeKey,
    resolveCliLocalRuntimeKeyCapability,
    type CliLocalExecutionTarget,
} from "./cliLocalRuntimeCapability";

/**
 * 能由 cli-local（本机宿主进程内 spawn 子 run）如实兑现的 runtimeKey 形态。
 * 真值在 `cliLocalRuntimeCapability.ts`；这里只是转发（保持既有 import 面）。
 */
export { CLI_LOCAL_FULFILLABLE_RUNTIME_KEYS } from "./cliLocalRuntimeCapability";

/**
 * 派发宿主：
 * - "cli-local"：本机宿主进程内 spawn 子 run（runtimeKey 已转发给子进程）。
 * - "server"：POST /api/agent/run，runtimeKey 由服务端解析并 fail-closed，
 *   这里不重复判定（服务端才是授权/就绪状态的权威）。
 */
export type AgentRunDispatchHost = "cli-local" | "server";

/**
 * 目标 agent 的 runtimeBinding 是否允许在本机派发（F3）。
 *
 * 守卫此前只看**显式 runtimeKey**：agent 配置里 `runtimeBinding.machineId` 指向
 * 别的机器时，本机照旧 spawn 一个子 run —— 绑定被静默忽略，正是「悄悄改在本机执行」
 * 的另一种形态。现在 binding 参与判定，且 fail-closed：
 *   - 无绑定 / 绑定 machineId 等于本机 machineId → 放行（本机就是绑定机）；
 *   - 绑定到别的机器，或本机 machineId 未知（无法证明这台就是绑定机）→ 拒绝。
 * 调用方负责把 binding 读出来传进来（`resolveAgentRuntimeBindingMachineId`），
 * 本函数保持无 IO、无副作用。
 */
export type CliLocalRuntimeBindingCheck = {
    /** 目标 agent 的 `runtimeBinding.machineId`（无绑定 → undefined / 空串）。 */
    bindingMachineId?: string | null;
    /** 本机 machineId。未知 → undefined（此时不许假装「就是本机」）。 */
    localMachineId?: string | null;
};

export function assertTargetAgentBindingDispatchable(input: {
    bindingMachineId?: string | null;
    localMachineId?: string | null;
}): void {
    const binding =
        typeof input.bindingMachineId === "string"
            ? input.bindingMachineId.trim()
            : "";
    if (!binding) return;
    const local =
        typeof input.localMachineId === "string"
            ? input.localMachineId.trim()
            : "";
    if (local && local === binding) return;
    throw new Error(
        `目标 agent 的 runtimeBinding.machineId="${binding}" 不是本机` +
            `${
                local
                    ? `（本机 machineId="${local}"）`
                    : `（本机 machineId 未知，无法证明这台机器就是绑定机）`
            }：CLI 本地派发通道只在本机 spawn 子 run，不能把绑定到别的机器的 run ` +
            `伪装成本机执行。已拒绝派发，未启动任何 run。` +
            `请在那台机器上执行 \`nolo agent run\`（或让该机器的 agent 进程接收派发），` +
            `或先解绑 / 改绑后再派发。`,
    );
}

/**
 * 把要转发给子进程的 docker runtimeKey 归一化成 **CLI 一定接受**的形式。
 *
 * 形态判定只用能力表（裸 `docker` 与 `docker:<runtimeId>` 是本机 sbx 通道自己
 * 兑现的两种短形式，不经服务端 parseRuntimeKey），所以归一化只需保证这两点：
 *   - 去掉首尾空白（`" docker  "` → `"docker"`）；
 *   - id 段去空白；`docker:`（id 为空）两侧都非法 → 抛可操作错误，
 *     **不静默丢弃**（静默丢弃就是本模块要防的那类事故）。
 */
export function normalizeRuntimeKeyForCliLocalDispatch(runtimeKey: string): string {
    const raw = runtimeKey.trim();
    if (raw === "docker") return "docker";
    if (raw.startsWith("docker:")) {
        const runtimeId = raw.slice("docker:".length).trim();
        if (runtimeId) return `docker:${runtimeId}`;
        throw new Error(
            `startAgentRun 的 runtimeKey="${runtimeKey}" 形态非法：` +
                `docker:<runtimeId> 的 runtimeId 不能为空。请改用 \`docker\`（本机 sbx 缺省运行时）` +
                `或 \`docker:<runtimeId>\`（listRuntimes 返回的 key）。已拒绝派发，未启动任何 run。`,
        );
    }
    return raw;
}

/**
 * 校验 request 的 runtimeKey 能否由该宿主兑现。
 *
 * @returns 归一化后的 runtimeKey（无该参数时 undefined）；cli-local 下的 docker
 *          形态已保证能被 CLI 参数校验接受
 * @throws 目标 agent 绑定到非本机 / 宿主无法兑现（或 key 形态不可转发）时抛错；
 *         调用方必须在任何副作用之前调用本函数，抛错即零副作用
 */
export function assertRuntimeKeyDispatchableByHost(
    input: {
        runtimeKey?: unknown;
        host: AgentRunDispatchHost;
    } & CliLocalRuntimeBindingCheck,
): string | undefined {
    if (input.host === "cli-local") {
        assertTargetAgentBindingDispatchable({
            ...(input.bindingMachineId !== undefined
                ? { bindingMachineId: input.bindingMachineId }
                : {}),
            ...(input.localMachineId !== undefined
                ? { localMachineId: input.localMachineId }
                : {}),
        });
    }

    const requested =
        typeof input.runtimeKey === "string" ? input.runtimeKey.trim() : "";
    if (!requested) return undefined;

    if (input.host === "server") return requested;

    if (requested === "docker" || requested.startsWith("docker:")) {
        // docker 可兑现（本机 sbx 云沙盒），但**绑定 + 配额**的核实不在这里：
        // 归一化后转发给子 run，由子 run 开跑前的 localDockerWorkload 闸门
        // fail-closed（核实不过 → run 开跑前显式失败，绝不落回宿主）。
        // `docker:`（id 为空）走同一入口 → 拿到「runtimeId 不能为空」的可操作提示，
        // 而不是笼统的「无法兑现」。
        return normalizeRuntimeKeyForCliLocalDispatch(requested);
    }
    const capability = resolveCliLocalRuntimeKeyCapability(requested);
    if (capability.fulfillableByCliLocal) return requested;

    throw new Error(
        `startAgentRun 的 runtimeKey="${requested}" 无法由 CLI 本地派发通道兑现：` +
            `该通道只能把 run 落到本机（local）、本机 sbx 云沙盒（docker / docker:<id>）或 Instabox 沙盒（instabox），` +
            `本机没有 ${requested} 对应的执行后端。已拒绝派发，未启动任何 run。` +
            `要真正在 ${requested} 执行：用 CLI 通道 ` +
            `\`nolo agent run --runtime-key ${requested} ...\`，或从能派发到该位置的宿主（服务端）发起。`,
    );
}

/** cli-local 派发计划：子 run 的实际执行面 + 为什么是它。 */
export type CliLocalSpawnDispatchPlan = {
    /** 要转发给子进程的 runtimeKey（undefined = 不转发，子 run 沿用自己默认落点）。 */
    runtimeKey?: string;
    /** 本机执行面。 */
    target: CliLocalExecutionTarget;
    reason:
        | "requested"
        | "requested-host-writes"
        | "default-docker-sandbox"
        | "read-only-host";
};

/**
 * F1：`runtimeKey: "local"` 的宿主写入确认语义（派发侧唯一文案）。
 *
 * `local` 既不是「默认位置」也不是「沙盒」：它意味着子 run 直接在**宿主文件系统**
 * 上读写代码（可能完全没有隔离）。因此它必须有显式确认（调用方声明
 * `allowHostWrites: true`）——省略 / 写错 / 笔误一律不落宿主。
 * 省略 runtimeKey 时的默认位置**有且只有一个例外**：`readOnly: true` 的只读派发仍在
 * 宿主执行（写不了文件，起沙盒是纯浪费）；其余写型派发默认进本机 docker 沙盒。未声明时本机通道**显式拒绝**（零 spawn、零 run 记录），既不回落
 * docker、也不静默落宿主。
 */
export const HOST_WRITES_CONFIRMATION_REQUIRED_MESSAGE =
    "runtimeKey 'local' 意味着子 run 直接在宿主文件系统上读写代码（无隔离）：必须由调用方显式声明 " +
    "allowHostWrites: true 才能派发。未声明时已拒绝派发（未启动任何 run）；要沙盒执行请省略 runtimeKey" +
    "（默认本机 docker 沙盒）或显式点名 docker / docker:<id>。";

/**
 * F1：宿主没有宿主执行器时（服务端 / 浏览器 run）的文案。
 *
 * 选择方案 A：`local` 由**宿主进程内的本地执行器**兑现（cli-local 通道 / 宿主注入的
 * `startHostAgentRun`）。服务端那条路**永远**不兑现 local（与
 * `server/handlers/agentRun/runtimeTarget.ts` 的 `local_target_unsupported` 同一政策），
 * 所以这里提前给出可操作文案，而不是把请求发出去再等 409。
 */
export const HOST_EXECUTOR_UNAVAILABLE_MESSAGE =
    "runtimeKey 'local'（在宿主文件系统上执行）在当前宿主没有可用的宿主执行器：服务端 / 浏览器 run " +
    "兑现不了它（服务端从不兑现 local，见 local_target_unsupported）。请在宿主进程内派发" +
    "（CLI 通道支持 runtimeKey=local + allowHostWrites: true），或改用已连接的机器" +
    "（runtimeKey: machine:<machineId>），或省略 runtimeKey 落本机 docker 沙盒。";

/**
 * 派发政策（已定，2026-10-18）：
 *   1. 派发的子 run 默认落 **docker 沙盒**（本机 sbx）：不传 runtimeKey 时也默认
 *      `docker`。历史几百次「子 Agent 相对路径写进主 worktree」的事故全部发生在
 *      默认宿主路径上。
 *   2. **只读型**派发（调用方声明 readOnly）留在宿主执行：它写不了文件，起沙盒是
 *      纯浪费。
 *   3. 显式 runtimeKey 一律以它为计划；不可兑现即由守卫抛错（不回落宿主）。
 *   4. 交互式 `nolo agent run`（用户自己在终端敲）不走这里：本机执行是正当用法，
 *      但必须**显式**（`--local` / `--runtime-key`），不能是「忘了传参」的默认结果。
 */
export function resolveCliLocalSpawnDispatch(
    input: {
        runtimeKey?: unknown;
        readOnly?: boolean;
        /**
         * 调用方对「在**宿主文件系统**上写代码」的显式确认。只有
         * `runtimeKey: "local"` 需要它（docker 沙盒 / 省略 key / 只读派发都不需要）；
         * 缺失即显式拒绝，绝不回落宿主也不回落 docker。
         */
        allowHostWrites?: unknown;
    } & CliLocalRuntimeBindingCheck,
): CliLocalSpawnDispatchPlan {
    const requested = assertRuntimeKeyDispatchableByHost({
        ...input,
        host: "cli-local",
    });
    if (requested) {
        const capability = resolveCliLocalRuntimeKeyCapability(requested);
        const target: CliLocalExecutionTarget =
            capability.target ?? (isDockerRuntimeKey(requested) ? "docker-sandbox" : "host");
        if (target === "host" && input.allowHostWrites !== true) {
            // 点名了宿主执行却没确认写入权利：派发前显式失败（零 spawn）。
            throw new Error(HOST_WRITES_CONFIRMATION_REQUIRED_MESSAGE);
        }
        return {
            runtimeKey: requested,
            target,
            reason: target === "host" ? "requested-host-writes" : "requested",
        };
    }
    if (input.readOnly === true) {
        return { target: "host", reason: "read-only-host" };
    }
    return {
        runtimeKey: "docker",
        target: "docker-sandbox",
        reason: "default-docker-sandbox",
    };
}

/** F11 不变式 3：允许完全不出现 `--runtime-key` 的两种正当理由。 */
export const CLI_LOCAL_HOST_ONLY_DISPATCH_REASONS = [
    "read-only-host",
] as const;

/**
 * 机械断言 spawn argv 的派发不变式（F11）。成对/极性错误在这里就炸，
 * 不靠注释和人工 review：
 *   - 非 docker 的 `--runtime-key <key>` → 抛错（本机通道兑现不了它，
 *     出现即代表「以为转发成功了」的静默漂移；非 docker 一律不得 spawn）；
 *   - docker key 没有配对的 `--local` → 抛错（只带 key 会走服务端通道）；
 *   - 重复 `--runtime-key` / `--runtime-key` 缺少取值 → 抛错。
 */
export function assertCliLocalSpawnArgvInvariant(
    argv: readonly string[],
    context = "cli-local spawn argv",
): void {
    const indexes: number[] = [];
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === "--runtime-key") indexes.push(i);
    }
    if (indexes.length === 0) return;
    if (indexes.length > 1) {
        throw new Error(
            `${context} 出现了 ${indexes.length} 次 --runtime-key：派发落点必须唯一。argv=${JSON.stringify(argv)}`,
        );
    }
    const value = argv[indexes[0] + 1];
    if (typeof value !== "string" || !value.trim() || value.startsWith("--")) {
        throw new Error(
            `${context} 的 --runtime-key 缺少取值。argv=${JSON.stringify(argv)}`,
        );
    }
    const capability = resolveCliLocalRuntimeKeyCapability(value);
    if (!capability.fulfillableByCliLocal) {
        throw new Error(
            `${context} 携带了 cli-local 无法兑现的 --runtime-key "${value}"：本机只有 local（宿主）与` +
                ` docker（本机 sbx 沙盒）可兑现，其余 key 永不 spawn（要么在本机兑现，要么显式失败）。` +
                `argv=${JSON.stringify(argv)}`,
        );
    }
    if ((isDockerRuntimeKey(value) || value === "instabox") && !argv.includes("--local")) {
        throw new Error(
            `${context} 携带 --runtime-key ${value} 却没有配对的 --local：只带 key 会让子 run 走` +
                `服务端通道（那边没有本机沙盒凭据），于是「以为在沙盒」而实际落在别处。argv=${JSON.stringify(argv)}`,
        );
    }
    // 宿主执行同样成对：CLI 子进程见到 `--runtime-key local` 而没有
    // `--allow-host-writes` 会当场退出（零 run、只留一行确认提示），
    // 而派发侧已经抛过「未确认写入」——两个守卫不能只活一个。
    // 2026-10-18 实测：派发侧放行、argv 没带确认 → 子 run 秒级 orphaned。
    // 与 CLI 侧精确对齐：agentRunCommand 是 `parsed.runtimeKey.trim() === "local"`，
    // 这里也必须 trim —— 否则 argv 里带空白的 " local " 会绕过授权检查（不变式
    // 存在的意义就是兜住「别的路径拼了带空格的 argv」）。
    if (value.trim() === "local" && !argv.includes("--allow-host-writes")) {
        throw new Error(
            `${context} 携带 --runtime-key ${value} 却没有配对的 --allow-host-writes：` +
                `宿主执行会在子进程启动时被拒绝（零 run）。argv=${JSON.stringify(argv)}`,
        );
    }
}

/**
 * 把派发计划翻译成子进程 argv 片段（**唯一**产出 `--runtime-key` 的地方），
 * 并在返回值前跑不变式断言。
 *
 * `--local` 只与 docker 成对出现：docker 表示「在本机 sbx 沙盒里执行」，
 * 必须显式告诉子 run「走本机通道」。
 */
export function buildCliLocalRuntimeForwardArgs(
    dispatch: CliLocalSpawnDispatchPlan,
): string[] {
    const args: string[] = [];
    if (dispatch.runtimeKey) {
        args.push("--runtime-key", dispatch.runtimeKey);
        if (isDockerRuntimeKey(dispatch.runtimeKey) || dispatch.runtimeKey === "instabox") args.push("--local");
        // 宿主写入（runtimeKey=local）在 CLI 侧是**成对**要求：agentRunCommand
        // 见到 --runtime-key local 却没有 --allow-host-writes 会直接退出（零 run），
        // 2026-10-18 实测表现为子 run 秒级 orphaned、日志只有那句确认提示。
        // 派发侧已在 resolveCliLocalSpawnDispatch 里校验过 allowHostWrites，
        // 这里的转发是同一确认的兑现，不是第二次授权。
        if (dispatch.target === "host") args.push("--allow-host-writes");
    }
    assertCliLocalSpawnArgvInvariant(args, `startAgentRun 派发（${dispatch.reason}）`);
    return args;
}

// 模块加载即校验 allowlist 与能力表不自洽（漂移 → 启动即炸，而不是上线后静默错误）。
assertCliLocalAllowlistMatchesCapabilityTable();
