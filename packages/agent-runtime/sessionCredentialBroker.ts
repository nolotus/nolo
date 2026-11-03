/**
 * 会话内存凭据 broker（最后一层回退，仅当严格 OS 安全区不可用时启用）。
 *
 * 契约：
 * - 只在**进程内存**里保存明文，进程退出即释放；
 * - 不落盘、不进 argv、不进日志、不进 agent 记录或远端；
 * - 每次 `createSessionMemoryCredentialBroker()` 都是**独立实例**（模拟"重启后为空"）；
 * - 应用侧共用 `getSharedSessionCredentialBroker()` 的进程级单例。
 *
 * 为什么需要它：没有钥匙串的环境里，如果严格安全区写失败就让「贴 key」退化成
 * [REDACTED]，原本能用的功能就废了；写明文文件又是明确禁止的。会话内存是唯一
 * 既不破坏可用性、又不落盘的落点——代价是重启后需重新提供。
 */

import { assertCredentialRef, type CredentialBroker, type CredentialRef } from "./credentialBroker";

export type SessionMemoryCredentialBroker = CredentialBroker & {
  /** 仅供测试/诊断：内存里的条目数（不导出内容）。 */
  size(): number;
};

export function createSessionMemoryCredentialBroker(): SessionMemoryCredentialBroker {
  const store = new Map<string, string>();
  return {
    get(ref: CredentialRef) {
      return store.get(assertCredentialRef(ref)) ?? null;
    },
    put(ref: CredentialRef, secret: string) {
      const safe = assertCredentialRef(ref);
      const value = typeof secret === "string" ? secret.trim() : "";
      if (!value) throw new Error("Cannot store an empty credential secret.");
      store.set(safe, value);
    },
    delete(ref: CredentialRef) {
      store.delete(assertCredentialRef(ref));
    },
    has(ref: CredentialRef) {
      return store.has(assertCredentialRef(ref));
    },
    size() {
      return store.size;
    },
  };
}

let sharedSessionBroker: SessionMemoryCredentialBroker | undefined;

/** 进程级共享实例：入路隔离写入与同进程内的取用必须命中同一份内存。 */
export function getSharedSessionCredentialBroker(): SessionMemoryCredentialBroker {
  if (!sharedSessionBroker) sharedSessionBroker = createSessionMemoryCredentialBroker();
  return sharedSessionBroker;
}

/** 测试用：清空共享实例（不用于生产路径）。 */
export function resetSharedSessionCredentialBrokerForTests(): void {
  sharedSessionBroker = undefined;
}
