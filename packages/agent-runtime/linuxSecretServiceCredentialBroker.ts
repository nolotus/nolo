/**
 * Linux Secret Service-backed CredentialBroker（`secret-tool` / libsecret）。
 *
 * 与 macOS Keychain broker 同一契约、同一安全纪律，差异只在命令形态：
 * - 每个 credential ref 对应一条 Secret Service item；属性对
 *   `nolo-credential=<ref>` 定位，ref 只是不透明标识，可以出现在 argv。
 * - **密文只走 stdin**（`secret-tool store` 从 stdin 读 secret），永不进 argv；
 *   提交前有一道 argv 自检，密文意外出现在参数里直接拒绝。
 * - 读取只发生在本模块的受控实现里；`has` 只判退出码，不返回明文。
 * - 硬失败只抛 `credential_broker_<op>_failed`，不带 ref / 密文 / stderr。
 * - **没有任何明文文件回退**：Secret Service 不可用时失败，而不是降级落盘。
 *
 * 说明：`secret-tool` 没有「只看元数据」的子命令，因此 `has` 也走 lookup，
 * 但只取退出码并丢弃 stdout，不把明文交出去。
 */

import { spawn } from "node:child_process";

import { asTrimmedString } from "core/trimmedString";
import {
  assertCredentialRef,
  type CredentialBroker,
  type CredentialRef,
} from "./credentialBroker";

/** 属性名（item 通过 `nolo-credential=<ref>` 定位）。 */
export const LINUX_SECRET_SERVICE_ATTRIBUTE = "nolo-credential";

/** `secret-tool` 在「没有匹配项」时的退出码（lookup / clear 共用）。 */
export const SECRET_TOOL_NO_MATCH_EXIT = 1;

/**
 * `secret-tool` 用同一个退出码 1 同时表示「没有这条」和「连不上 Secret Service」。
 * 只有 stderr 为空时才当成真未命中；D-Bus/后端故障会往 stderr 写原因，必须按
 * 硬失败处理 —— 否则后端坏了会被误当成「库里没有」，让上层回退到旧明文副本。
 */
const isGenuineNoMatch = (result: SecretToolRunnerResult): boolean =>
  result.exitCode === SECRET_TOOL_NO_MATCH_EXIT && result.stderr.trim() === "";

const DEFAULT_SECRET_TOOL_BIN = "secret-tool";

export type SecretToolRunnerResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/**
 * 可注入的 `secret-tool` 运行器。
 * 调用方禁止把密文放进 `args`；密文一律通过 `stdin`。
 */
export type SecretToolRunner = (input: {
  args: string[];
  stdin?: string;
}) => Promise<SecretToolRunnerResult>;

export type CreateLinuxSecretServiceCredentialBrokerOptions = {
  /** 注入运行器（测试用）。默认 spawn `secret-tool`。 */
  runner?: SecretToolRunner;
  /** 覆盖二进制路径（诊断用）。 */
  secretToolBin?: string;
  /** 覆盖属性名（测试用）。 */
  attribute?: string;
};

function safeCredentialRef(ref: CredentialRef): string {
  try {
    return assertCredentialRef(ref);
  } catch {
    throw new Error("invalid_ref");
  }
}

function brokerFailure(op: string): never {
  // 不附带 ref / 密文 / stderr —— 错误文案本身不能成为泄露通道。
  throw new Error(`credential_broker_${op}_failed`);
}

/**
 * 默认运行器：`spawn` `secret-tool`，密文写入 stdin，永不回显。
 * spawn 失败（二进制不存在、无 D-Bus 会话）统一归一为 exitCode -1，
 * 由调用方按「硬失败」处理。
 */
export function createDefaultSecretToolRunner(
  secretToolBin: string = DEFAULT_SECRET_TOOL_BIN,
  timeoutMs = 15_000,
): SecretToolRunner {
  return (input) =>
    new Promise<SecretToolRunnerResult>((resolve) => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: SecretToolRunnerResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(secretToolBin, input.args, {
          stdio: ["pipe", "pipe", "pipe"],
          detached: process.platform !== "win32",
        });
      } catch {
        finish({ exitCode: -1, stdout: "", stderr: "" });
        return;
      }

      timer = setTimeout(() => {
        try {
          if (process.platform !== "win32" && child.pid !== undefined) {
            try {
              process.kill(-child.pid, "SIGKILL");
              return;
            } catch {
              // Fall back to killing the child directly.
            }
          }
          child.kill("SIGKILL");
        } catch {
          // The child may have already exited.
        } finally {
          finish({ exitCode: -1, stdout: "", stderr: "" });
        }
      }, timeoutMs);

      child.stdout?.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr?.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", () => {
        finish({ exitCode: -1, stdout: "", stderr: "" });
      });
      child.on("close", (code) => {
        finish({
          exitCode: typeof code === "number" ? code : -1,
          stdout,
          stderr,
        });
      });

      // The process can exit before consuming the pipe (EPIPE).
      child.stdin?.on("error", () => {});
      child.stdin?.end(input.stdin);
    });
}

/**
 * Linux Secret Service CredentialBroker。
 * 接口与 `createFileCredentialBroker` / Keychain broker 完全一致（get/put/delete/has）。
 */
export function createLinuxSecretServiceCredentialBroker(
  options: CreateLinuxSecretServiceCredentialBrokerOptions = {},
): CredentialBroker {
  const runner =
    options.runner ?? createDefaultSecretToolRunner(options.secretToolBin);
  const attribute = options.attribute ?? LINUX_SECRET_SERVICE_ATTRIBUTE;

  const attrArgs = (ref: string): string[] => [attribute, ref];

  /** 内部 lookup：返回 { exitCode, stdout }，由调用方决定是否取明文。 */
  const lookup = async (ref: string): Promise<SecretToolRunnerResult> => {
    try {
      return await runner({ args: ["lookup", ...attrArgs(ref)] });
    } catch {
      brokerFailure("get");
    }
  };

  return {
    async get(ref) {
      const safeRef = safeCredentialRef(ref);
      const result = await lookup(safeRef);
      if (isGenuineNoMatch(result)) return null;
      if (result.exitCode !== 0) brokerFailure("get");
      // lookup 只打印密文本身；去掉一个结尾换行。
      const secret = result.stdout.replace(/\n$/, "");
      return secret.length > 0 ? secret : null;
    },

    async put(ref, secret) {
      const safeRef = safeCredentialRef(ref);
      const value = asTrimmedString(secret);
      if (!value) {
        throw new Error("Cannot store an empty credential secret.");
      }
      // 防御性自检：密文绝不能出现在 argv（多行密文也会破坏 stdin 约定）。
      const args = [
        "store",
        `--label=nolo-credential:${safeRef}`,
        ...attrArgs(safeRef),
      ];
      if (value.includes("\n") || args.some((arg) => arg.includes(value))) {
        brokerFailure("put");
      }
      let result: SecretToolRunnerResult;
      try {
        result = await runner({ args, stdin: value });
      } catch {
        brokerFailure("put");
      }
      if (result.exitCode !== 0) brokerFailure("put");
    },

    async delete(ref) {
      const safeRef = safeCredentialRef(ref);
      let result: SecretToolRunnerResult;
      try {
        result = await runner({ args: ["clear", ...attrArgs(safeRef)] });
      } catch {
        brokerFailure("delete");
      }
      // 没有匹配项视为幂等成功。
      if (result.exitCode === 0 || isGenuineNoMatch(result)) {
        return;
      }
      brokerFailure("delete");
    },

    async has(ref) {
      const safeRef = safeCredentialRef(ref);
      const result = await lookup(safeRef);
      if (isGenuineNoMatch(result)) return false;
      if (result.exitCode !== 0) brokerFailure("has");
      // 只判存在性：不返回、不缓存、不记录 stdout。
      return true;
    },
  };
}
