// 文件路径: database/fileSharding.ts

import { chooseServersByKey } from "./fileRing";

/** File-scoped replica placement — same ring selection as chooseServersByKey. */
const chooseServersForFile = chooseServersByKey;

/**
 * 当前“切片”策略参数：
 *
 * - REPLICA_COUNT = 3:
 *   在 ring 中尽量挑 3 台不同的服务器存副本。
 *
 * - REQUIRED_SHARDS = 2:
 *   语义上表示：只要有 2 份副本可用就能工作（当前是完整副本，所以任意一份都能用）。
 *
 * 将来如果要上真正的纠删码（2-of-3），可以保留这两个名字，
 * 只是把 encode/decode 的实现替换掉即可。
 */
export const REPLICA_COUNT = 3;
export const REQUIRED_SHARDS = 2;

/**
 * 基于 hash ring 选择本次写入要用的服务器列表。
 *
 * 要求：
 * - 优先根据 fileId 在 allServers 上做 ring 选择 REPLICA_COUNT 个；
 * - 无论 ring 如何选择，currentServer 必须包含在结果中（保证当前前端指向的服务器上总有一份）。
 *
 * 说明：
 * - 现在每个 server 存的是完整文件，将来可以改成“每个 server 存一个 shard blob”，
 *   但对 upload 调用方来说只是「发给这些 servers」这一点不变。
 */
export const planReplicaServersForFile = (
    allServers: string[],
    currentServer: string | null | undefined,
    fileId: string
): string[] => {
    const uniqueServers = Array.from(new Set(allServers)).filter(Boolean);
    if (!uniqueServers.length) return [];

    const fromRing = chooseServersForFile(uniqueServers, fileId, REPLICA_COUNT);
    const set = new Set(fromRing);

    if (currentServer && uniqueServers.includes(currentServer)) {
        set.add(currentServer);
    }

    return Array.from(set);
};

/**
 * 预留：将来真正做 2-of-3 纠删码时在这里实现。
 *
 * encode:
 *   接收完整 File/Blob，返回若干 shard（索引 + blob），
 *   上层再根据 shardIndex + planReplicaServersForFile 决定各 shard 分布。
 *
 * decode:
 *   接收至少 REQUIRED_SHARDS 份 shard，重建完整 Blob。
 */

// export async function encodeToShards(
//   file: File | Blob
// ): Promise<Array<{ shardIndex: number; blob: Blob }>> {
//   // TODO: 将来在这里实现真正的 2-of-3 切片编码
// }

// export async function decodeFromShards(
//   shards: Array<{ shardIndex: number; blob: Blob }>
// ): Promise<Blob> {
//   // TODO: 将来在这里实现解码逻辑
// }