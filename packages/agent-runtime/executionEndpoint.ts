// packages/agent-runtime/executionEndpoint.ts
//
// G1 + G2：**执行端点契约 + 能力标注**（路线图 §2.6）。
//
// 问题：调用方要判断「这个落点能不能跑 shell / 有没有浏览器连接器」，此前只能看
// `runtimeKey` 字符串或 `backendId` 名字猜。于是「macOS 本机能 shell 但没有沙盒」与
// 「Linux 本机能 shell 且有 bwrap」在类型上无法区分，技能市场也无法表达
// 「这个 skill 在哪些端可用」。
//
// 本文件只做两件事：
//   1. 定义四类端点（mobile / desktop-host / platform-server / third-party-sandbox）、
//      六种能力（shell / filesystem / browser-connector / long-running / gpu /
//      network-egress）与 `ExecutionEndpoint` 记录；
//   2. 提供**纯函数**把「端点种类 + 调用方探测到的事实」解成能力集合与隔离事实。
//
// 硬边界（据此评审，不必猜）：
//   - 本文件**不读环境**：不碰 `process.platform`、不读 env、不 import 任何 `node:`
//     模块。平台、bwrap 是否可用、executor 是否接线，全部由调用方作为**事实**传入
//     （`EndpointFacts`）。测试因此能在 Linux CI 上断言 macOS 行为。
//   - 本文件**不做路由**：prefer-local 路由（下一块）只消费这里产出的判定事实。
//   - 能力是两维的：`capabilities` 说「能不能做」，`shellIsolation` /
//     `unisolatedCapabilities` 说「做的时候有没有边界」。只有一维就会把 macOS 说成
//     「全能力」——那正是本块要消掉的谎。
//
// 能力语义（默认值都是**保守**的，宁可空白不编造）：
//   mobile               filesystem（仅应用沙盒目录）+ network-egress。
//                        **无 shell、无浏览器连接器**；长任务是 OS 不保证的，不声明。
//                        应用沙盒目录由 OS 强制执行，但本模块**不把它记作执行边界**：
//                        文件能力如实进 `unisolatedCapabilities`（方向保守，注解不夸大）。
//   desktop-host         shell + filesystem + long-running + network-egress。
//                        browser-connector / gpu **必须由调用方显式声明**
//                        （`browserConnectorAvailable` / `gpuAvailable`）：
//                        连接器存在性属于桌面运行时的运行时事实，发现层看不见就不能许愿。
//   platform-server      默认只有 long-running + network-egress；按 §2.6，当前线上
//                        执行器未接线（`execution_not_wired`），shell/filesystem 要等
//                        `executionWired: true`。浏览器连接器**永不**出现在这里：
//                        §2.1 已核实连接器只在桌面本地运行时替换实现，服务端拿到的是
//                        `chromeConnectorUnavailableFunc`。
//   third-party-sandbox  shell + filesystem + long-running + network-egress；gpu 需显式
//                        声明（免费档无 GPU）。浏览器连接器同样不出现：它终止在用户设备。

export const EXECUTION_ENDPOINT_KINDS = [
  "mobile",
  "desktop-host",
  "platform-server",
  "third-party-sandbox",
] as const;

export type ExecutionEndpointKind = (typeof EXECUTION_ENDPOINT_KINDS)[number];

export const ENDPOINT_CAPABILITIES = [
  "shell",
  "filesystem",
  "browser-connector",
  "long-running",
  "gpu",
  "network-egress",
] as const;

export type EndpointCapability = (typeof ENDPOINT_CAPABILITIES)[number];

/**
 * 隔离边界。§2.6 草案的 `"os-sandbox" | "namespace" | "vm"` 是一个子集：
 * 补 `"none"`（显式声明「没有边界」，而不是缺席）与 `"container"`（本机 docker 沙盒）。
 */
export type EndpointIsolationBoundary =
  | "none"
  | "os-sandbox"
  | "namespace"
  | "container"
  | "vm";

/** 宿主平台，只作为事实出现在入参里（本文件不读 `process.platform`）。 */
export type HostPlatform = "linux" | "darwin" | "win32" | "other";

export type ShellIsolationReason =
  /** Linux 本机：bwrap（user namespace + seccomp）接管 execShell。 */
  | "bwrap-namespace"
  /** 本机 docker 沙盒：工作区工具族整体进 container。 */
  | "container-workload"
  /** 第三方 microVM（instabox 等）。 */
  | "vm-boundary"
  /** 调用方直接给了边界事实，本文件不推断。 */
  | "declared"
  /** 该平台没有可用的隔离后端（当前 macOS / Windows 的真实状态，见 §2.7）。 */
  | "no-isolation-backend"
  /** 端点没有 shell 能力，谈隔离无意义（mobile / 未接线的 server）。 */
  | "no-shell-capability"
  /** 平台服务端执行器尚未接线（`execution_not_wired`）。 */
  | "execution-not-wired"
  /** 平台未知，不猜。 */
  | "unknown-platform";

export type ShellIsolationFact = {
  boundary: EndpointIsolationBoundary;
  reason: ShellIsolationReason;
  /** 人话：边界挡到哪、**挡不到**哪。 */
  note: string;
};

/**
 * 调用方探测到的**事实**。全部可选，缺省即「不知道」→ 按保守值处理。
 * 这里刻意不接受「端点种类 → 平台」的推断：`desktop-host` 在 mac 还是 linux 上，
 * 只有探测方能回答。
 */
export type EndpointFacts = {
  /** 宿主平台。`desktop-host` 的隔离判定靠它。 */
  platform?: HostPlatform;
  /**
   * 调用方**已核实** shell 隔离后端可用（Linux bwrap / 已实现的 seatbelt / sbx 通道）。
   * 布尔事实，不是名字：本文件不认 "bwrap" 这类字符串。
   */
  shellIsolationAvailable?: boolean;
  /** 调用方直接声明的边界（优先于本文件的推断）。 */
  isolation?: EndpointIsolationBoundary;
  /** platform-server：执行器是否已接线。缺省 false（当前线上事实）。 */
  executionWired?: boolean;
  /** desktop-host：浏览器连接器可用（必须显式声明，见文件头）。 */
  browserConnectorAvailable?: boolean;
  /** 端点是否有 GPU（第三方 sandbox 档位 / 本机独显）。 */
  gpuAvailable?: boolean;
  /** 是否允许出网。缺省允许；`false` 表示硬性禁网。 */
  networkEgress?: boolean;
  /**
   * 额外授予（显式事实，例如部署方声明「本端可出网」）。只能在**本端点的合理集合**内
   * 放宽：与种类不相容的授予（mobile×shell、任一云/服务端×browser-connector）会被丢弃，
   * 否则 grants 就能把文件头里的「永不」翻过来。
   */
  capabilityGrants?: readonly EndpointCapability[];
  /** 显式撤销。**deny 永远赢**（在 grants 之后应用）。 */
  capabilityDenials?: readonly EndpointCapability[];
};

export type EndpointBillingOwner = "user" | "platform" | "third-party";

export type EndpointCredentialBoundary = "user-device" | "platform" | "third-party";

/**
 * §2.6 的 `ExecutionEndpoint`，补两处实现必需的事实：
 *   - `shellIsolation`：shell 的执行边界（macOS = `none` + `no-isolation-backend`）；
 *   - `unisolatedCapabilities`：哪些能力**不在**边界内执行（bwrap 只盖 shell，
 *     所以文件工具仍算无隔离）。
 */
export type ExecutionEndpoint = {
  id: string;
  kind: ExecutionEndpointKind;
  capabilities: ReadonlySet<EndpointCapability>;
  isolation: EndpointIsolationBoundary;
  shellIsolation: ShellIsolationFact;
  unisolatedCapabilities: ReadonlySet<EndpointCapability>;
  /**
   * 端点当前是否可达（liveness）。`undefined` = 调用方未声明；`false` = 端还在配置里
   * 但探测不过。`capabilities` 只回答「能不能做」，`available` 回答「这个端现在还活着」：
   * 两者分开存，但 `satisfiesRequiredCapabilities` 会把 `false` 当不可满足——死端
   * 满足不了任何需求。
   */
  available?: boolean;
  latency: { coldBootMs?: number; warmBootMs?: number };
  billing: { owner: EndpointBillingOwner };
  credentialBoundary: EndpointCredentialBoundary;
};

/** 端点种类 → 默认计费/凭据归属（§2.6 规则 3：计费主体跟随端点）。 */
function ownershipFor(kind: ExecutionEndpointKind): {
  billing: EndpointBillingOwner;
  credentialBoundary: EndpointCredentialBoundary;
} {
  switch (kind) {
    case "mobile":
      return { billing: "user", credentialBoundary: "user-device" };
    case "desktop-host":
      return { billing: "user", credentialBoundary: "user-device" };
    case "platform-server":
      return { billing: "platform", credentialBoundary: "platform" };
    case "third-party-sandbox":
      return { billing: "third-party", credentialBoundary: "third-party" };
  }
}

function baseCapabilities(
  kind: ExecutionEndpointKind,
  facts: EndpointFacts,
): EndpointCapability[] {
  const egress = facts.networkEgress !== false;
  switch (kind) {
    case "mobile": {
      // OS 沙盒只给应用目录 + 网络；shell 与浏览器连接器都不存在。
      const caps: EndpointCapability[] = ["filesystem"];
      if (egress) caps.push("network-egress");
      if (facts.gpuAvailable === true) caps.push("gpu");
      return caps;
    }
    case "desktop-host": {
      const caps: EndpointCapability[] = ["shell", "filesystem", "long-running"];
      if (egress) caps.push("network-egress");
      if (facts.browserConnectorAvailable === true) caps.push("browser-connector");
      if (facts.gpuAvailable === true) caps.push("gpu");
      return caps;
    }
    case "platform-server": {
      // 执行器未接线时没有 shell / 文件能力（§2.6：当前 `execution_not_wired`）。
      const caps: EndpointCapability[] = [];
      if (facts.executionWired === true) caps.push("shell", "filesystem");
      caps.push("long-running");
      if (egress) caps.push("network-egress");
      if (facts.gpuAvailable === true) caps.push("gpu");
      return caps;
    }
    case "third-party-sandbox": {
      const caps: EndpointCapability[] = ["shell", "filesystem", "long-running"];
      if (egress) caps.push("network-egress");
      if (facts.gpuAvailable === true) caps.push("gpu");
      return caps;
    }
  }
}

/**
 * 与端点种类**不相容**的授予。grant 是「在同一端点内放宽」，不是「换一个端点」：
 * mobile 没有 shell 可执行；platform-server / third-party-sandbox 的浏览器连接器
 * 终止在用户设备（§2.1：服务端拿到的是 `chromeConnectorUnavailableFunc`）。
 * 这类 grant 只能说明部署配置写错了，一律丢弃（fail-closed），不静默生效。
 */
const CAPABILITIES_NEVER_GRANTED: Record<
  ExecutionEndpointKind,
  readonly EndpointCapability[]
> = {
  mobile: ["shell", "browser-connector"],
  "desktop-host": [],
  "platform-server": ["browser-connector"],
  "third-party-sandbox": ["browser-connector"],
};

function applyFactOverrides(
  kind: ExecutionEndpointKind,
  base: readonly EndpointCapability[],
  facts: EndpointFacts,
): Set<EndpointCapability> {
  const set = new Set<EndpointCapability>(base);
  const neverGranted = CAPABILITIES_NEVER_GRANTED[kind];
  for (const granted of facts.capabilityGrants ?? []) {
    if (neverGranted.includes(granted)) continue;
    set.add(granted);
  }
  // deny 在 grants 之后：显式撤销永远赢，否则「撤销」在默认授予面前是空话。
  for (const denied of facts.capabilityDenials ?? []) set.delete(denied);
  return set;
}

/**
 * 端点能力集合。纯函数：同输入同输出，不读全局状态。
 *
 * `facts` 缺省 = 「什么都不知道」，此时返回该端点的保守基线（不是全能力）。
 */
export function resolveEndpointCapabilities(
  kind: ExecutionEndpointKind,
  facts: EndpointFacts = {},
): ReadonlySet<EndpointCapability> {
  return applyFactOverrides(kind, baseCapabilities(kind, facts), facts);
}

const BWRAP_NOTE =
  "execShell 走 bwrap（user namespace + seccomp）；readFile/writeFile/editFile/glob/grep " +
  "仍在宿主执行——边界只覆盖 shell。";

const NO_BACKEND_NOTE =
  "本机没有可用的隔离后端（bwrap 仅 Linux 注册；seatbelt 只有类型声明无实现），" +
  "shell 与文件工具直接在宿主执行、**无边界**。强隔离需求必须改路由，不能落在本端。";

/**
 * shell 的执行边界。**这是「macOS 不是全能力」的唯一表达点**：
 * macOS 上 `shell` 能力为真（本机确实能跑 shell），但 `boundary` 必须是 `"none"` +
 * `reason: "no-isolation-backend"`，调用方据 `unisolatedCapabilities` 判断能不能接。
 */
export function resolveEndpointShellIsolation(
  kind: ExecutionEndpointKind,
  facts: EndpointFacts = {},
): ShellIsolationFact {
  if (facts.isolation) {
    return { boundary: facts.isolation, reason: "declared", note: "隔离边界由调用方声明。" };
  }

  const hasShell = resolveEndpointCapabilities(kind, facts).has("shell");
  if (!hasShell) {
    if (kind === "platform-server" && facts.executionWired !== true) {
      return {
        boundary: "none",
        reason: "execution-not-wired",
        note: "平台服务端当前没有执行器（execution_not_wired）：无 shell，也没有边界可谈。",
      };
    }
    if (kind === "mobile") {
      // 应用沙盒目录由 OS 强制，但本模块不建模 OS 应用沙盒（见文件头）：文件能力
      // 如实留在 `unisolatedCapabilities`，不冒充 os-sandbox 边界。
      return {
        boundary: "none",
        reason: "no-shell-capability",
        note:
          "移动端没有 shell；文件只落在应用沙盒目录内，但本模块不把 OS 应用沙盒记作执行边界，" +
          "因此按无边界报告（强隔离需求必须改路由）。",
      };
    }
    return {
      boundary: "none",
      reason: "no-shell-capability",
      note: "本端没有 shell 能力，隔离边界只覆盖文件（谈 shell 隔离无意义）。",
    };
  }

  switch (kind) {
    case "desktop-host": {
      if (facts.platform === "linux") {
        return facts.shellIsolationAvailable === true
          ? { boundary: "namespace", reason: "bwrap-namespace", note: BWRAP_NOTE }
          : { boundary: "none", reason: "no-isolation-backend", note: NO_BACKEND_NOTE };
      }
      if (facts.platform === "darwin" || facts.platform === "win32") {
        return { boundary: "none", reason: "no-isolation-backend", note: NO_BACKEND_NOTE };
      }
      // 平台未知：不猜成有隔离。
      return {
        boundary: "none",
        reason: "unknown-platform",
        note: "宿主平台未知，不假设有任何 shell 隔离后端；按无边界处理。",
      };
    }
    case "third-party-sandbox":
      return {
        boundary: "vm",
        reason: "vm-boundary",
        note: "shell/文件在 microVM 内（Firecracker 级边界），宿主与平台网络均不可达。",
      };
    case "platform-server":
      return {
        boundary: "container",
        reason: "container-workload",
        note: "执行器按任务起 container，工作区工具族整体在容器内。",
      };
    case "mobile":
      // mobile 不会走到这里（无 shell）；保留分支让 switch 穷尽。
      return { boundary: "none", reason: "no-shell-capability", note: "移动端无 shell。" };
  }
}

/**
 * 哪些能力**不在**边界内执行。只覆盖受边界约束的三个族：shell / filesystem /
 * browser-connector（网络与 GPU 不是「包含关系」，不在本字段里表达）。
 *
 * 浏览器连接器一旦存在就必然在边界外：它驱动的是用户真实的 Chrome。
 */
export function resolveUnisolatedCapabilities(
  capabilities: ReadonlySet<EndpointCapability>,
  shellIsolation: ShellIsolationFact,
): ReadonlySet<EndpointCapability> {
  const out = new Set<EndpointCapability>();
  // container / vm 两种边界把工作区工具族整体包住；os-sandbox 包住文件但（移动端）没有 shell；
  // namespace 只包住 shell——所以 desktop-host + bwrap 的文件工具仍算无边界。
  const filesystemContained =
    shellIsolation.boundary === "container" ||
    shellIsolation.boundary === "vm" ||
    shellIsolation.boundary === "os-sandbox";

  if (capabilities.has("shell") && shellIsolation.boundary === "none") out.add("shell");
  if (capabilities.has("filesystem") && !filesystemContained) out.add("filesystem");
  if (capabilities.has("browser-connector")) out.add("browser-connector");
  return out;
}

/** 把种类 + 事实装配成一条端点记录（供路由/市场页消费）。 */
export function resolveExecutionEndpoint(args: {
  id: string;
  kind: ExecutionEndpointKind;
  facts?: EndpointFacts;
  /** 端点可达性（`available === false` = 探测不过）；缺省「未声明」。 */
  available?: boolean;
  latency?: { coldBootMs?: number; warmBootMs?: number };
}): ExecutionEndpoint {
  const facts = args.facts ?? {};
  const capabilities = resolveEndpointCapabilities(args.kind, facts);
  const shellIsolation = resolveEndpointShellIsolation(args.kind, facts);
  const ownership = ownershipFor(args.kind);
  return {
    id: args.id,
    kind: args.kind,
    capabilities,
    isolation: shellIsolation.boundary,
    shellIsolation,
    unisolatedCapabilities: resolveUnisolatedCapabilities(capabilities, shellIsolation),
    latency: { ...(args.latency ?? {}) },
    ...(args.available === undefined ? {} : { available: args.available }),
    billing: { owner: ownership.billing },
    credentialBoundary: ownership.credentialBoundary,
  };
}

export type CapabilitySatisfaction = {
  ok: boolean;
  /** 端点根本没有的能力。 */
  missing: readonly EndpointCapability[];
  /** 有，但没有边界（macOS 的 shell 会出现在这里）。 */
  unisolated: readonly EndpointCapability[];
  /** `requireIsolation` 为真，而端点**整体**没有边界（与 `required` 的内容无关）。 */
  isolationMissing: boolean;
  /** 端点自报不可用（`available === false`）：死端满足不了任何需求。 */
  unavailable: boolean;
};

/**
 * §2.6 规则 1 的实现：**能力可用性 = 端点能力 ∩ 需求**。
 * skill 的 `requires` 与路由的硬需求都走这里，不要各自写字符串比较。
 *
 * `requireIsolation` 为真时有两层：按能力（「有但无边界」不可用，macOS 的 shell 即此）
 * 与按端点（边界整体为 `none` 时任何需求都不满足）。只有第一层时，
 * `requireIsolation: true` + `required: ["gpu"]`（或空数组）能在完全无隔离的端点上通过——
 * 「要求隔离」就被绕过了，而不是被满足。
 */
export function satisfiesRequiredCapabilities(
  endpoint: ExecutionEndpoint,
  required: readonly EndpointCapability[],
  options: { requireIsolation?: boolean } = {},
): CapabilitySatisfaction {
  const missing: EndpointCapability[] = [];
  const unisolated: EndpointCapability[] = [];
  for (const capability of required) {
    if (!endpoint.capabilities.has(capability)) {
      missing.push(capability);
      continue;
    }
    if (options.requireIsolation === true && endpoint.unisolatedCapabilities.has(capability)) {
      unisolated.push(capability);
    }
  }
  const isolationMissing = options.requireIsolation === true && endpoint.isolation === "none";
  const unavailable = endpoint.available === false;
  return {
    ok: !unavailable && !isolationMissing && missing.length === 0 && unisolated.length === 0,
    missing,
    unisolated,
    isolationMissing,
    unavailable,
  };
}

/** 便捷判定：调用方最常问的那一句。 */
export function endpointSupports(
  endpoint: ExecutionEndpoint,
  capability: EndpointCapability,
): boolean {
  return endpoint.capabilities.has(capability);
}

// ---------------------------------------------------------------------------
// G3 + G4 的契约对：**能力（requiresCapabilities）+ 策略（executionPolicy）**
// ---------------------------------------------------------------------------
//
// 为什么需要第二个维度（本块要修的真问题）：能力只说「这个端能不能跑 shell」，
// 不说「这次跑在不在边界里」。macOS desktop-host 有 `shell`、`shellIsolation.boundary`
// 却是 `"none"`——纯能力判定会把「不可信第三方脚本要求隔离跑 shell」判成满足，
// 最终在宿主裸跑，只靠一条终端告警兜底。
//
// 所以 skill 除了 `requiresCapabilities`，还必须声明 `executionPolicy`：
//   host-trusted      确实需要操作用户宿主环境（git 提交 / 读写本地项目）。
//                     调用方必须**显式授权**（`hostTrustAuthorized: true`），否则不放行。
//   isolated-strictly 计算型 / 不可信脚本。端点 `shellIsolation.boundary` 必须是
//                     `namespace | container | vm`；不满足就是**不具备资格**——
//                     不降级、不告警后放行，也不回退本地裸跑。
//
// 策略是**一等声明**，不是 capability：capability 回答「能不能」，策略回答
// 「允不允在这个边界里做」。
//
// **没有缺省策略。** 两个入口以前对「不传策略」给出相反结论（路由整段跳过守卫，
// 选择函数却把它当成 `host-trusted` 并要求授权），于是那条「缺省 = 既有行为」的
// 注释描述的是一个在安全路径上永远不生效的常量。现在：
//   - `selectEndpointForExecutionPolicy`：`policy` 必填。它只回答「哪个端点满足某个
//     策略」，「没有策略」不在它的回答范围内；漏传按 `execution-policy-undeclared` 拒绝，
//     绝不替调用方猜成 `host-trusted`。
//   - `resolveExecutionTarget`：允许不传，但那是**显式命名**的
//     `UNGOVERNED_EXECUTION_POLICY`（遗留的无守卫能力路由），并且不允许承载
//     untrusted 来源（见 `sourceTrust`）。

export const EXECUTION_POLICIES = ["host-trusted", "isolated-strictly"] as const;

export type ExecutionPolicy = (typeof EXECUTION_POLICIES)[number];

/**
 * 「没有策略」的显式枚举值。它**不是**安全默认值，也不带来任何执行保证：它表示
 * 调用方没有声明策略，路由按既有能力/尺寸逻辑走（可回退宿主裸跑）。
 *
 * 为什么不用 `undefined` 表达：`undefined` 同时承载「决定不设策略」与「忘了传」，
 * 两者在类型和审计里都分不开——那正是「没人决定」的缺口。给了名字，缺口就变成一个
 * 有名字的决定，且能被断言（未声明策略 + untrusted 来源 → 拒绝）。
 */
export const UNGOVERNED_EXECUTION_POLICY = "ungoverned-legacy" as const;

/** 路由入口接受的声明：真策略，或显式承认「本次不设策略」。 */
export type ExecutionPolicyDeclaration =
  | ExecutionPolicy
  | typeof UNGOVERNED_EXECUTION_POLICY;

/**
 * 任务来源：**三态**，不是两态。
 *   owner      用户自己的项目 / 本机脚本；
 *   untrusted  第三方 / 市场脚本（清单本身不可信）：只允许 `isolated-strictly`；
 *   unknown    调用方没声明来源（缺省）。
 *
 * 为什么 `"unknown"` 必须是一个独立状态：可选字段 `sourceTrust?: ...` 漏传时，
 * `sourceTrust === "untrusted"` 只是「假」，于是「没人证明它可信」被静默读成
 * 「它可信」——漏传一个字段就等于自授权，且审计里与真的 owner 分不开。
 * 有了 `"unknown"`，判定处可以 fail-closed（见表里的 `source-trust-undeclared`），
 * 审计输出也能如实写出「未声明」。
 */
export type ExecutionSourceTrust = "owner" | "untrusted" | "unknown";

/**
 * 能承载 `isolated-strictly` 的边界。刻意排除两种：
 *   - `"none"`       macOS / Windows 无隔离后端，进程直接跑在宿主（本块要拦的那一类）；
 *   - `"os-sandbox"` 应用级沙盒只约束文件目录，不约束 shell（且 mobile 没有 shell）。
 */
export const ISOLATING_BOUNDARIES = ["namespace", "container", "vm"] as const;

export type IsolatingBoundary = (typeof ISOLATING_BOUNDARIES)[number];

/** 唯一的边界判定入口：不要在各处写 `boundary === "namespace" || ...` 的散装比较。 */
export function isIsolatingBoundary(
  boundary: EndpointIsolationBoundary | undefined,
): boundary is IsolatingBoundary {
  return boundary !== undefined && (ISOLATING_BOUNDARIES as readonly string[]).includes(boundary);
}

/**
 * 拒绝原因码：稳定、可断言、可直接展示。调用方不要用 `reason` 字符串做前缀匹配。
 */
export type ExecutionPolicyRefusalCode =
  /** 端探测不过（`available === false`）：死端承载不了任何策略。 */
  | "endpoint-unavailable"
  /** 能力缺失（与策略无关的那一维）。 */
  | "capability-missing"
  /** 能力有，但不在边界内执行（bwrap 只盖 shell，所以文件工具仍算裸跑）。 */
  | "capability-not-isolated"
  /** `isolated-strictly`，而端点的 shell 边界是 `"none"`（macOS / Windows 裸机）。 */
  | "isolation-boundary-none"
  /** `isolated-strictly`，而端点的边界不是 `namespace | container | vm`（如 os-sandbox）。 */
  | "isolation-boundary-insufficient"
  /**
   * `isolated-strictly` 但调用方没声明 `requiresCapabilities`（或声明为空）：
   * 边界合格也证不出「所需能力都在边界内」，按不满足处理（fail-closed）。
   */
  | "strict-policy-requires-capability-declaration"
  /** 调用方没有声明 `executionPolicy`（未声明 ≠ host-trusted）：不选端、不放行。 */
  | "execution-policy-undeclared"
  /** `host-trusted` 但没有拿到调用方的显式授权标记。 */
  | "host-trusted-unauthorized"
  /**
   * 来源是 `untrusted`，却声明了 `host-trusted`：两者是自相矛盾的一对，
   * 直接拒绝。`hostTrustAuthorized` 不参与这个判定——授权是 owner 本人跨信任边界的
   * 决定，不能被不可信清单自己提供的字段满足。
   */
  | "untrusted-requires-isolation"
  /** 没声明来源（`unknown`）却要进宿主：未声明 ≠ owner，fail-closed。 */
  | "source-trust-undeclared"
  /** 候选没有端点标注：无从证明边界，按不满足处理（fail-closed）。 */
  | "endpoint-facts-missing"
  /** 整批候选里没有合格的隔离端点：拒绝执行，不回退宿主。 */
  | "no-isolated-endpoint-available"
  /** 整批候选里没有合格端点（非隔离策略下的统称）。 */
  | "no-eligible-endpoint";

export type ExecutionPolicyVerdict = {
  eligible: boolean;
  policy: ExecutionPolicy;
  /** 端点的 shell 执行边界（写进审计/日志，`"none"` 也要如实出现）。 */
  boundary?: EndpointIsolationBoundary;
  /** 不合格时的稳定原因码；合格时缺席。 */
  refusalCode?: ExecutionPolicyRefusalCode;
  /** 人可读的一句，只用于日志/工件，不参与判断。 */
  reason: string;
};

/**
 * G3 规则：**策略 + 能力**联合判定单个端点是否具备承载资格。
 *
 * 判定顺序固定（先能力、后边界、再授权），因为调用方最需要知道的是「差在哪一维」：
 *   1. 端可达？（`endpoint-unavailable`）
 *   2. 能力齐？（`capability-missing`）
 *   3. `isolated-strictly`：边界是否 `namespace | container | vm`？
 *      （`isolation-boundary-none` / `isolation-boundary-insufficient`）
 *   4. `isolated-strictly`：`required` 是否**声明了**？（`strict-policy-requires-capability-declaration`）
 *      —— 空声明下第 5 步是空真命题，硬约束会退化成「清单的诚实度」。
 *   5. `isolated-strictly`：所需能力是否都在边界内？（`capability-not-isolated`）
 *   6. `host-trusted`：来源可信吗？（`untrusted-requires-isolation` / `source-trust-undeclared`）
 *      —— 来源这一维**先于**授权：不可信清单不能靠「顺手也把 hostTrustAuthorized 传成 true」
 *      把自己送到宿主上；`unknown`（没声明来源）同样不通过，否则漏传等于自授权。
 *   7. `host-trusted`：调用方是否显式授权？（`host-trusted-unauthorized`）
 *
 * `host-trusted` **不**要求边界（那正是它的语义：要在用户宿主上动东西），但仍走
 * 既有能力判定——本函数没有改变 `satisfiesRequiredCapabilities` 的任何行为。
 */
export function satisfiesExecutionPolicy(
  endpoint: ExecutionEndpoint,
  policy: ExecutionPolicy,
  options: {
    /** skill 声明的 `requiresCapabilities`。 */
    required?: readonly EndpointCapability[];
    /** 调用方对 `host-trusted` 的显式授权。缺省 = 未授权。 */
    hostTrustAuthorized?: boolean;
    /**
     * 任务来源。缺省 = `"unknown"`（未声明）：`host-trusted` 下不通过（fail-closed），
     * `isolated-strictly` 下与隔离判定无关。
     */
    sourceTrust?: ExecutionSourceTrust;
  } = {},
): ExecutionPolicyVerdict {
  const required = options.required ?? [];
  const boundary = endpoint.shellIsolation.boundary;
  const strict = policy === "isolated-strictly";

  if (endpoint.available === false) {
    return {
      eligible: false,
      policy,
      boundary,
      refusalCode: "endpoint-unavailable",
      reason: `端点 ${endpoint.id} 探测不可达（available=false），不能承载任何执行策略。`,
    };
  }

  const satisfaction = satisfiesRequiredCapabilities(endpoint, required);
  if (!satisfaction.ok) {
    const detail = [
      satisfaction.missing.length > 0 ? `missing=[${satisfaction.missing.join(",")}]` : "",
      satisfaction.unisolated.length > 0
        ? `unisolated=[${satisfaction.unisolated.join(",")}]`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      eligible: false,
      policy,
      boundary,
      refusalCode: "capability-missing",
      reason: `端点 ${endpoint.id} 能力不满足（${detail}）。`,
    };
  }

  if (strict) {
    if (boundary === "none") {
      return {
        eligible: false,
        policy,
        boundary,
        refusalCode: "isolation-boundary-none",
        reason: `端点 ${endpoint.id} 的 shell 边界是 none（${endpoint.shellIsolation.reason}）：`
          + `isolated-strictly 不允许在本端执行，不回退宿主裸跑。`,
      };
    }
    if (!isIsolatingBoundary(boundary)) {
      return {
        eligible: false,
        policy,
        boundary,
        refusalCode: "isolation-boundary-insufficient",
        reason: `端点 ${endpoint.id} 的边界是 ${boundary}，`
          + `不是 ${ISOLATING_BOUNDARIES.join("/")}：隔离强度不足以承载 isolated-strictly。`,
      };
    }
    // 边界存在 ≠ 所需能力都在边界内：bwrap（namespace）只把 shell 放进去，
    // 文件工具仍在宿主。要求严格隔离的 skill 不能在这种端上「部分隔离」地跑。
    //
    // 但这条检查的强度完全取决于 `required` 的诚实度：`required` 为空时它是个空真命题，
    // 一个只写 `executionPolicy` 不写 `requiresCapabilities` 的清单会「部分隔离」跑过去。
    //
    // 所以这里区分两种「空」，它们语义不同：
    //   - **没传** `options.required`：有歧义（忘了写 vs 确实不需要）→ fail-closed。
    //   - **显式传 `[]`**：无歧义，就是「我不需要任何被建模的端点能力」（纯推理、
    //     或只是想让不可信清单也拿一层边界）→ 放行。全拒会给这类 skill 一条死路，
    //     逼它谎报一个 `shell`，那反而是在教调用方撒谎。
    if (options.required === undefined) {
      return {
        eligible: false,
        policy,
        boundary,
        refusalCode: "strict-policy-requires-capability-declaration",
        reason: `端点 ${endpoint.id} 的边界（${boundary}）合格，但调用方未声明 requiresCapabilities：`
          + `isolated-strictly 证不出「所需能力都在边界内」，按不满足处理。`
          + `请声明实际需要的能力（如 shell）；确实不需要任何能力时显式传 []。`,
      };
    }
    if (required.length === 0) {
      return {
        eligible: true,
        policy,
        boundary,
        reason: `端点 ${endpoint.id} 在 ${boundary} 边界内承载 isolated-strictly；`
          + `清单显式声明不需要任何端点能力（requiresCapabilities=[]）。`,
      };
    }
    const escaped = required.filter((capability) => endpoint.unisolatedCapabilities.has(capability));
    if (escaped.length > 0) {
      return {
        eligible: false,
        policy,
        boundary,
        refusalCode: "capability-not-isolated",
        reason: `端点 ${endpoint.id} 的边界（${boundary}）不覆盖 [${escaped.join(",")}]，`
          + `这些能力会在边界外执行。`,
      };
    }
    return {
      eligible: true,
      policy,
      boundary,
      reason: `端点 ${endpoint.id} 在 ${boundary} 边界内承载 isolated-strictly。`,
    };
  }

  // ---- 来源这一维先于授权 ----------------------------------------------------
  // 老实现只在「未声明策略」那条分支上看来源，于是
  // `{sourceTrust:"untrusted", executionPolicy:"host-trusted", hostTrustAuthorized:true}`
  // 三个字段凑齐就能进宿主裸跑——而 marketplace 清单正是攻击者可控的那一侧。
  // 这里不把 `hostTrustAuthorized` 当作可以覆盖来源的凭据：授权是 owner 本人跨信任
  // 边界的决定，不可信清单自己写下的 `true` 不构成它。
  if (options.sourceTrust === "untrusted") {
    return {
      eligible: false,
      policy,
      boundary,
      refusalCode: "untrusted-requires-isolation",
      reason: `端点 ${endpoint.id} 不能承载 untrusted 来源的 host-trusted 执行：`
        + `不可信来源只允许 isolated-strictly，授权标记不能替代来源可信。`,
    };
  }
  // 未声明来源（缺省）≠ owner：漏传一个字段不该等于自授权。
  if (options.sourceTrust !== "owner") {
    return {
      eligible: false,
      policy,
      boundary,
      refusalCode: "source-trust-undeclared",
      reason: `端点 ${endpoint.id} 需要宿主执行，但调用方未声明来源（sourceTrust 缺省 = unknown）：`
        + `未声明 ≠ owner，只有来源被判为 owner 才允许 host-trusted。`,
    };
  }

  if (options.hostTrustAuthorized !== true) {
    return {
      eligible: false,
      policy,
      boundary,
      refusalCode: "host-trusted-unauthorized",
      reason: `端点 ${endpoint.id} 需要宿主执行，但调用方未显式授权（hostTrustAuthorized !== true）。`,
    };
  }

  return {
    eligible: true,
    policy,
    boundary,
    reason: `端点 ${endpoint.id} 以 host-trusted 策略执行（调用方已授权），shell 边界=${boundary}。`,
  };
}

export type ExecutionPolicyEndpointSelection = {
  ok: boolean;
  /** 本次判定用的策略；`ok === false` 且调用方漏传策略时缺席（不替它猜）。 */
  policy?: ExecutionPolicy;
  /** 选中的端点（`ok === false` 时缺席）。 */
  endpoint?: ExecutionEndpoint;
  boundary?: EndpointIsolationBoundary;
  refusalCode?: ExecutionPolicyRefusalCode;
  reason: string;
  /** 每个被拒候选的原因码：拒绝要给得出「为什么是它不行」。 */
  rejected: readonly { endpointId: string; refusalCode: ExecutionPolicyRefusalCode; reason: string }[];
};

/**
 * G4：在一批候选端点里挑出**具备资格**的那一个（按传入顺序，调用方决定优先序；
 * 这里不掺 boot 时间、内存这类启发式——那些属于已有路由层）。
 *
 * 硬约束：`isolated-strictly` 一个都不合格时返回 `ok: false` +
 * `no-isolated-endpoint-available`。**没有**「降级到本地宿主」这个分支，
 * 也没有「告警后放行」——这是本函数的全部意义。
 */
export function selectEndpointForExecutionPolicy(args: {
  /**
   * 必填：本函数只回答「哪个端点满足**某个**策略」，「没有策略」不在它的回答范围内。
   * 漏传（JS 调用方）按 `execution-policy-undeclared` 拒绝——不猜 `host-trusted`。
   */
  policy: ExecutionPolicy;
  endpoints: readonly ExecutionEndpoint[];
  /** skill 声明的 `requiresCapabilities`。缺省（未传）在 isolated-strictly 下按不满足处理；
   * 显式 `[]` 表示「确实不需要任何端点能力」，放行。 */
  required?: readonly EndpointCapability[];
  /** 调用方对 `host-trusted` 的显式授权。缺省 = 未授权。 */
  hostTrustAuthorized?: boolean;
  /** 任务来源。缺省 = `"unknown"`：`host-trusted` 下不通过（见 `source-trust-undeclared`）。 */
  sourceTrust?: ExecutionSourceTrust;
}): ExecutionPolicyEndpointSelection {
  // 类型层已必填；这里兜住没有类型检查的 JS 调用方：没有策略就不许选端。
  const policy = (args as { policy?: ExecutionPolicy }).policy;
  if (policy === undefined) {
    return {
      ok: false,
      refusalCode: "execution-policy-undeclared",
      reason:
        "调用方没有声明 executionPolicy：本函数不替调用方猜策略（未声明 ≠ host-trusted），拒绝选端。",
      rejected: [],
    };
  }
  const rejected: { endpointId: string; refusalCode: ExecutionPolicyRefusalCode; reason: string }[] = [];

  for (const endpoint of args.endpoints) {
    const verdict = satisfiesExecutionPolicy(endpoint, policy, {
      // `required` 必须原样透传：`undefined`（未声明，fail-closed）与 `[]`
      // （显式声明不需要能力）在严格隔离下语义不同，不能在这里被 `?? []` 抹平。
      ...(args.required === undefined ? {} : { required: args.required }),
      ...(args.hostTrustAuthorized === undefined
        ? {}
        : { hostTrustAuthorized: args.hostTrustAuthorized }),
      ...(args.sourceTrust === undefined ? {} : { sourceTrust: args.sourceTrust }),
    });
    if (verdict.eligible) {
      return {
        ok: true,
        policy,
        endpoint,
        boundary: endpoint.shellIsolation.boundary,
        reason: verdict.reason,
        rejected,
      };
    }
    rejected.push({
      endpointId: endpoint.id,
      // 上面 eligible=false 一定带 refusalCode。
      refusalCode: verdict.refusalCode ?? "no-eligible-endpoint",
      reason: verdict.reason,
    });
  }

  const distinct = new Set(rejected.map((entry) => entry.refusalCode));
  const refusalCode: ExecutionPolicyRefusalCode =
    policy === "isolated-strictly"
      ? "no-isolated-endpoint-available"
      : distinct.size === 1
        ? [...distinct][0]!
        : "no-eligible-endpoint";
  const detail = rejected.length === 0
    ? "没有候选端点"
    : rejected.map((entry) => `${entry.endpointId}:${entry.refusalCode}`).join(", ");
  return {
    ok: false,
    policy,
    refusalCode,
    reason: `没有任何端点满足 executionPolicy=${policy}（${detail}）：拒绝执行，不回退本地裸跑。`,
    rejected,
  };
}
