import {
  getSecret,
  readSecretsForRead,
  setSecret,
  deleteSecret,
  resolveSecretEnvVars,
  SecretsFileCorruptedError,
} from "core/secretsStore";
import {
  getSecretBinding,
  readSecretBindingsForRead,
  setSecretBinding,
  deleteSecretBinding,
} from "core/secretBindings";
import { createFileCredentialBroker } from "../agent-runtime/fileCredentialBroker";
import type { CredentialBroker } from "../agent-runtime/credentialBroker";
import { spawn } from "child_process";

/** Values that JSON.parse would silently turn into a non-injectable scalar. */
function parseSecretValue(raw: string): unknown {
  const trimmed = raw.trim();
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksLikeJson) return raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("value starts with { or [ but is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("JSON values must be an object or an array, not a scalar");
  }
  return parsed;
}

export interface RunSecretCommandOptions {
  broker?: CredentialBroker;
}

export async function runSecretCommand(
  args: string[],
  options: RunSecretCommandOptions = {},
): Promise<void> {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(`用法:
  nolo secret list [--json]                列出已保存的 secret 名称（不显示值；--json 输出机器可读清单）
  nolo secret get <name>                   打印指定 secret 的值（供调试；Agent 不得读取）
  nolo secret set <name> <value|json>      设置 secret（字符串，或以 { / [ 开头的 JSON）
  nolo secret delete <name>                删除指定的 secret
  nolo secret run --with <names> -- <cmd>  安全注入 secret 环境变量并执行子命令
  nolo secret bind <alias> <ref> [--env <ENV_NAME>]  将受控凭据引用绑定到别名
  nolo secret list-bindings                列出已配置的 secret 别名绑定
  nolo secret unbind <alias>               解除指定的 secret 别名绑定
`);
    return;
  }

  try {
    switch (subcommand) {
      case "list": {
        const wantJson = rest.includes("--json");
        const read = readSecretsForRead();
        if (read.corrupted) {
          console.error(`错误: ${read.error.message}`);
          process.exitCode = 1;
          return;
        }
        const names = Object.keys(read.data).sort();
        if (wantJson) {
          // 机器可读清单：**只出名字与形态，永不出值**。
          // agent 用它回答「我们有没有相关凭据」，随后由平台侧解析注入。
          const secrets = names.map((name) => {
            const value = read.data[name];
            const kind =
              typeof value === "string"
                ? "string"
                : value !== null && typeof value === "object"
                  ? "json"
                  : "other";
            return { name, kind };
          });
          console.log(JSON.stringify({ count: secrets.length, secrets }, null, 2));
          return;
        }
        if (names.length === 0) {
          console.log("（当前未保存任何 secret）");
        } else {
          console.log("已配置的 secret 列表:");
          for (const name of names) console.log(`  - ${name}`);
        }
        return;
      }

      case "get": {
        const [name] = rest;
        if (!name) {
          console.error("错误: 请提供 secret 名称。例如: nolo secret get amo");
          process.exitCode = 1;
          return;
        }
        const read = readSecretsForRead();
        if (read.corrupted) {
          console.error(`错误: ${read.error.message}`);
          process.exitCode = 1;
          return;
        }
        const val = read.data[name];
        if (val === undefined) {
          console.error(`错误: 未找到名为 "${name}" 的 secret`);
          process.exitCode = 1;
          return;
        }
        console.log(typeof val === "object" ? JSON.stringify(val, null, 2) : String(val));
        return;
      }

      case "set": {
        const [name, ...valParts] = rest;
        if (!name) {
          console.error("错误: 请提供 secret 名称与值");
          process.exitCode = 1;
          return;
        }
        const rawVal = valParts.join(" ").trim();
        if (!rawVal) {
          console.error("错误: 请提供 secret 值");
          process.exitCode = 1;
          return;
        }
        setSecret(name, parseSecretValue(rawVal));
        console.log(`✅ 成功保存 secret: "${name}"（权限 0600）`);
        return;
      }

      case "delete":
      case "del":
      case "rm": {
        const [name] = rest;
        if (!name) {
          console.error("错误: 请提供要删除的 secret 名称");
          process.exitCode = 1;
          return;
        }
        console.log(
          deleteSecret(name) ? `✅ 成功删除 secret: "${name}"` : `未找到名为 "${name}" 的 secret，无需删除`,
        );
        return;
      }

      case "run":
      case "exec": {
        const doubleDashIdx = rest.indexOf("--");
        const beforeDash = doubleDashIdx >= 0 ? rest.slice(0, doubleDashIdx) : [];
        const cmdParts = doubleDashIdx >= 0 ? rest.slice(doubleDashIdx + 1) : rest;

        let withNames: string[] = [];
        for (let i = 0; i < beforeDash.length; i++) {
          if (beforeDash[i] === "--with" && beforeDash[i + 1]) {
            withNames = beforeDash[i + 1].split(",").map((s) => s.trim()).filter(Boolean);
            break;
          }
        }

        if (cmdParts.length === 0) {
          console.error("错误: 请提供要执行的命令。例如: nolo secret run --with amo -- bunx web-ext sign");
          process.exitCode = 1;
          return;
        }

        const injectedEnvs: Record<string, string> = {};
        const missing: string[] = [];
        for (const name of withNames) {
          // A typo in a multi-name list must not silently drop that credential:
          // collect unknown names and fail before spawning anything.
          if (getSecret(name) !== undefined) {
            Object.assign(injectedEnvs, resolveSecretEnvVars(name));
            continue;
          }

          const binding = getSecretBinding(name);
          if (binding) {
            const broker = options.broker ?? createFileCredentialBroker();
            const secretValue = await broker.get(binding.brokerRef);
            if (!secretValue) {
              console.error(
                `错误: 凭证引用 ${binding.brokerRef} 在本地保管库中不存在或未授权。`,
              );
              process.exitCode = 1;
              return;
            }
            injectedEnvs[binding.envName] = secretValue;
            continue;
          }

          missing.push(name);
        }
        if (missing.length > 0) {
          console.error(
            `错误: 未找到 secret: ${missing.join(", ")}。用 nolo secret list 核对已保存的名称。`,
          );
          process.exitCode = 1;
          return;
        }
        if (withNames.length > 0 && Object.keys(injectedEnvs).length === 0) {
          console.error(
            `错误: --with ${withNames.join(",")} 没有解析出任何环境变量（凭据无法映射成变量）。`,
          );
          process.exitCode = 1;
          return;
        }

        await new Promise<void>((resolvePromise) => {
          let settled = false;
          const finish = (code: number) => {
            if (settled) return;
            settled = true;
            process.exitCode = code;
            resolvePromise();
          };
          const child = spawn(cmdParts[0], cmdParts.slice(1), {
            stdio: "inherit",
            env: { ...process.env, ...injectedEnvs },
          });
          child.on("close", (code, signal) =>
            finish(signal ? 1 : (code ?? 1)),
          );
          child.on("error", (err) => {
            console.error(`执行命令失败: ${err.message}`);
            finish(1);
          });
        });
        return;
      }

      case "bind": {
        let envOption: string | undefined;
        const positional: string[] = [];

        for (let i = 0; i < rest.length; i++) {
          const arg = rest[i];
          if (arg === "--env") {
            if (i + 1 < rest.length) {
              envOption = rest[i + 1];
              i++;
            } else {
              console.error("错误: --env 需要指定环境变量名。例如: --env DEEPINFRA_API_KEY");
              process.exitCode = 1;
              return;
            }
          } else if (arg.startsWith("--env=")) {
            envOption = arg.slice("--env=".length);
          } else {
            positional.push(arg);
          }
        }

        const [alias, rawRef] = positional;
        if (!alias || !rawRef) {
          console.error(
            "错误: 请提供 alias 与凭据引用 (ref)。例如: nolo secret bind deepinfra_api_key vault-cred-xxx [--env DEEPINFRA_API_KEY]",
          );
          process.exitCode = 1;
          return;
        }

        let brokerRef = rawRef;
        if (brokerRef.startsWith("$nolo_cred:")) {
          brokerRef = brokerRef.slice("$nolo_cred:".length);
        }

        const envName =
          envOption !== undefined
            ? envOption
            : alias.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

        setSecretBinding({
          alias,
          brokerRef,
          envName,
        });

        console.log(`✅ 成功绑定 secret: "${alias}" -> ${brokerRef} (env: ${envName})`);
        return;
      }

      case "list-bindings":
      case "bindings": {
        const read = readSecretBindingsForRead();
        if (read.corrupted) {
          console.error(`错误: ${read.error.message}`);
          process.exitCode = 1;
          return;
        }
        const bindings = read.bindings;
        if (bindings.length === 0) {
          console.log("（当前未配置任何 secret 别名绑定）");
        } else {
          console.log("已配置的 secret 别名绑定列表:");
          for (const b of bindings) {
            console.log(`  - ${b.alias} -> ${b.brokerRef} (env: ${b.envName})`);
          }
        }
        return;
      }

      case "unbind": {
        const [alias] = rest;
        if (!alias) {
          console.error("错误: 请提供要解除绑定的别名 (alias)。例如: nolo secret unbind deepinfra_api_key");
          process.exitCode = 1;
          return;
        }
        console.log(
          deleteSecretBinding(alias)
            ? `✅ 成功解除 secret 绑定: "${alias}"`
            : `未找到名为 "${alias}" 的 secret 绑定，无需解除`,
        );
        return;
      }

      default:
        console.error(`未知子命令: ${subcommand}。运行 nolo secret --help 查看用法`);
        process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof SecretsFileCorruptedError) {
      console.error(`错误: ${error.message}`);
    } else {
      console.error(`错误: ${(error as Error).message}`);
    }
    process.exitCode = 1;
  }
}
