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
import { t } from "./i18n";

/** Values that JSON.parse would silently turn into a non-injectable scalar. */
function parseSecretValue(raw: string): unknown {
  const trimmed = raw.trim();
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!looksLikeJson) return raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(t("secret.jsonInvalid"));
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(t("secret.jsonScalar"));
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
    console.log(t("secret.help"));
    return;
  }

  try {
    switch (subcommand) {
      case "list": {
        const wantJson = rest.includes("--json");
        const read = readSecretsForRead();
        if (read.corrupted) {
          console.error(t("secret.errorPrefix", read.error.message));
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
          console.log(t("secret.listEmpty"));
        } else {
          console.log(t("secret.listHeader"));
          for (const name of names) console.log(`  - ${name}`);
        }
        return;
      }

      case "get": {
        const [name] = rest;
        if (!name) {
          console.error(t("secret.getNameRequired"));
          process.exitCode = 1;
          return;
        }
        const read = readSecretsForRead();
        if (read.corrupted) {
          console.error(t("secret.errorPrefix", read.error.message));
          process.exitCode = 1;
          return;
        }
        const val = read.data[name];
        if (val === undefined) {
          console.error(t("secret.getNotFound", name));
          process.exitCode = 1;
          return;
        }
        console.log(typeof val === "object" ? JSON.stringify(val, null, 2) : String(val));
        return;
      }

      case "set": {
        const [name, ...valParts] = rest;
        if (!name) {
          console.error(t("secret.setNameAndValueRequired"));
          process.exitCode = 1;
          return;
        }
        const rawVal = valParts.join(" ").trim();
        if (!rawVal) {
          console.error(t("secret.setValueRequired"));
          process.exitCode = 1;
          return;
        }
        setSecret(name, parseSecretValue(rawVal));
        console.log(t("secret.setSuccess", name));
        return;
      }

      case "delete":
      case "del":
      case "rm": {
        const [name] = rest;
        if (!name) {
          console.error(t("secret.deleteNameRequired"));
          process.exitCode = 1;
          return;
        }
        console.log(
          deleteSecret(name)
            ? t("secret.deleteSuccess", name)
            : t("secret.deleteNotFound", name),
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
          console.error(t("secret.runCmdRequired"));
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
              console.error(t("secret.runMissingBrokerRef", binding.brokerRef));
              process.exitCode = 1;
              return;
            }
            injectedEnvs[binding.envName] = secretValue;
            continue;
          }

          missing.push(name);
        }
        if (missing.length > 0) {
          console.error(t("secret.runMissingSecrets", missing.join(", ")));
          process.exitCode = 1;
          return;
        }
        if (withNames.length > 0 && Object.keys(injectedEnvs).length === 0) {
          console.error(t("secret.runNoInjectedEnvs", withNames.join(",")));
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
            console.error(t("secret.runCommandFailed", err.message));
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
              console.error(t("secret.bindEnvValueRequired"));
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
          console.error(t("secret.bindArgsRequired"));
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

        console.log(t("secret.bindSuccess", alias, brokerRef, envName));
        return;
      }

      case "list-bindings":
      case "bindings": {
        const read = readSecretBindingsForRead();
        if (read.corrupted) {
          console.error(t("secret.errorPrefix", read.error.message));
          process.exitCode = 1;
          return;
        }
        const bindings = read.bindings;
        if (bindings.length === 0) {
          console.log(t("secret.bindingsEmpty"));
        } else {
          console.log(t("secret.bindingsHeader"));
          for (const b of bindings) {
            console.log(`  - ${b.alias} -> ${b.brokerRef} (env: ${b.envName})`);
          }
        }
        return;
      }

      case "unbind": {
        const [alias] = rest;
        if (!alias) {
          console.error(t("secret.unbindAliasRequired"));
          process.exitCode = 1;
          return;
        }
        console.log(
          deleteSecretBinding(alias)
            ? t("secret.unbindSuccess", alias)
            : t("secret.unbindNotFound", alias),
        );
        return;
      }

      default:
        console.error(t("secret.unknownSubcommand", subcommand));
        process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof SecretsFileCorruptedError) {
      console.error(t("secret.errorPrefix", error.message));
    } else {
      console.error(t("secret.errorPrefix", (error as Error).message));
    }
    process.exitCode = 1;
  }
}
