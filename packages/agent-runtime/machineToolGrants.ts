// packages/agent-runtime/machineToolGrants.ts
//
// 机器工具授权（toolGrants）规范化的**单一真源**（M6-R 收成）。
//
// 背景：服务端握手解析（server/handlers/connector/connectorWebSocket.ts 的
// parseHandshakeToolGrants）与机器侧授权复核（cli/machineToolInvokeDispatch.ts）
// 历史上各有一份 normalize 实现。CLI 侧曾「无条件让最后一个原始条目覆盖」，导致
// 同一份配置两端裁定分裂——例如
//   {"agent-a":{"write":true}," agent-a ":{"shell":true}}
// 服务端保留 write:true（无效的 shell-only 条目不覆盖），机器侧却被后一个原始条目
// 覆盖成 shell-only 后拒绝 → 「服务端放行、机器侧拒绝」。本模块把规则钉死成一處，
// 两端都 import，保证跨端契约逐字一致。
//
// 只保留 write 维度：shell / execShell 已整个移出机器路由（正则/token 门不能当
// 任意 shell 的边界），上报的任何历史字段（shell 等）一律忽略，不产生任何能力。

/** 规范化后的机器工具授权：key = agentKey（已 trim），只认 write 维度。 */
export type MachineToolGrants = Record<string, { write?: boolean }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 规范化原始 toolGrants（unknown：可能是握手 JSON.parse 的产物，或 env 解析产物，
 * 或单测直接注入的对象）。规则逐条定死（跨端一致）：
 *
 * 1. key 先 trim；trim 后为空的 key 丢弃（空 key 永不匹配任何 agentKey）。
 * 2. 只认严格布尔 `write`：`shell` 等历史字段一律忽略，不产生任何能力；产出条目
 *    只含 `{ write }` 一个字段。
 * 3. 条目按「有效 write 布尔字段」判定是否参与覆盖：
 *    - 有效 = isRecord(entry) 且 typeof entry.write === "boolean"；
 *    - 无效条目（无 write 字段 / write 非布尔 / 空对象 / null / 非对象）被忽略，
 *      **不覆盖**已规范化的 key。
 * 4. trim 后碰撞时，最后一个**有效**条目胜出（循环内后写覆盖；无效条目跳过，故不会
 *    把先前的有效值抹掉）。
 *
 * 返回 undefined 表示无任何有效授权——registry / 机器侧按默认拒绝处理。
 */
export function normalizeMachineToolGrants(raw: unknown): MachineToolGrants | undefined {
  if (!isRecord(raw)) return undefined;
  const grants: MachineToolGrants = {};
  for (const [rawKey, rawEntry] of Object.entries(raw)) {
    const agentKey = rawKey.trim(); // 规则 1
    if (!agentKey) continue;
    if (!isRecord(rawEntry)) continue; // 规则 3：非对象条目无效，不覆盖
    if (typeof rawEntry.write !== "boolean") continue; // 规则 3：无严格布尔 write 无效，不覆盖
    grants[agentKey] = { write: rawEntry.write }; // 规则 2/4：只保留 write，最后有效者胜出
  }
  return Object.keys(grants).length > 0 ? grants : undefined;
}
