/**
 * 「部署窗口内连接器重连中」的共享协议常量。
 *
 * 单一真源：服务端（ownerRequiredModelAdmission / connectorConnectionRegistry）
 * 与客户端（CLI owner proxy 重试闸门）必须对同一组字面量达成一致，否则
 * 「服务端说可重试、客户端不认」会退化成部署期硬失败。
 *
 * 依赖为零：core 包纯单测可直接引用，不引入 server/CLI 模块。
 */

/**
 * 部署窗口内「origin 设备尚未回连」的结构化错误码。
 *
 * 与 owner_origin_mismatch 的区别：
 * - owner_origin_mismatch：origin 绑定失败（真的不匹配）→ 403，不可重试；
 * - owner_origin_reconnecting：服务端正在排空（draining）时连接器尚未回连
 *   → 503 + retryable。
 */
export const OWNER_ORIGIN_RECONNECTING_CODE = "owner_origin_reconnecting";

/**
 * 服务端给客户端的重试提示（毫秒）。
 *
 * 取 10000ms（10s）——依据是「与改动前 403 有界重试的总等待对齐」，推导如下：
 *
 * 1. 改动前，同一场景走 403 owner_origin_mismatch 的有界重试：
 *    退避表 5s + 15s = 2 次等待 ≈ 20s 总等待。
 * 2. 改动后，同一场景走 503 + retryable:true，落进客户端的**通用 503 预算**：
 *    core 的 TRANSIENT_FETCH_MAX_ATTEMPTS = 3（CLI 侧
 *    OWNER_PROXY_GENERIC_MAX_ATTEMPTS 同为 3），即 3 次尝试 = **2 次等待**；
 *    每次等待的时长取响应体里的 retryAfterMs（core 的
 *    MAX_RETRY_DELAY_MS = 10_000，正好等于本值，不会被截断）。
 *    → 总等待 = 2 × 10s = 20s，与 403 路径的 20s 对齐。
 * 3. 为什么不是 1500ms：1500ms × 2 次等待 ≈ 3s，连接器回连慢于几秒时客户端
 *    会比改动前**更早放弃**（正是本机制要修的场景反而变差）。
 * 4. 预算形状不变：仍是通用的 3 次尝试，本常量只调「每次等多久」，
 *    **不引入任何新的长预算**（没有把 503 提升为 core_draining 的 30 次长预算）。
 * 5. 只在服务端排空（draining）期间启用这条 503 通道：重启后的重连空档由
 *    客户端既有的 403 有界重试（5s + 15s ≈ 20s）覆盖，不需要服务端宽限窗口，
 *    也不该把「真·origin 不匹配」当成临时故障。
 */
export const OWNER_ORIGIN_RECONNECTING_RETRY_AFTER_MS = 10_000;

/**
 * WebSocket 关闭码 1012 = Service Restart（RFC 6455 §7.4.1）。
 *
 * 用它而不是 1000/1001：1012 的语义就是「服务端正在重启」，客户端收到后
 * 应当立刻重连而不是等待超时——正是本机制的目的。
 */
export const CONNECTOR_RESTART_CLOSE_CODE = 1012;

/**
 * 关闭原因（会出现在 CLI 端的断连日志里，便于区分「部署重启」与「网络抖动」）。
 */
export const CONNECTOR_RESTART_CLOSE_REASON = "server_restart";
