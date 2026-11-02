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
import { StringDecoder } from "string_decoder";
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

export type SecretPromptReader = (promptText?: string) => Promise<string>;

export interface RunSecretCommandOptions {
  broker?: CredentialBroker;
  stdin?: NodeJS.ReadableStream;
  stdinTimeoutMs?: number;
  stdinMaxBytes?: number;
  promptReader?: SecretPromptReader;
  stdout?: NodeJS.WritableStream;
}

export class PromptReadError extends Error {
  constructor(
    readonly i18nKey:
      | "secret.promptNonTtyNotSupported"
      | "secret.promptEmpty"
      | "secret.promptAborted"
      | "secret.promptReadError",
  ) {
    super(i18nKey);
  }
}

export async function defaultPromptReader(
  promptLabel?: string,
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WritableStream = process.stderr,
): Promise<string> {
  if (!Boolean((input as any)?.isTTY) || typeof (input as any)?.setRawMode !== "function") {
    throw new PromptReadError("secret.promptNonTtyNotSupported");
  }

  return new Promise<string>((resolve, reject) => {
    let wasRaw = false;
    try {
      wasRaw = Boolean((input as any).isRaw);
    } catch {
      // ignore
    }

    let settled = false;
    const chars: string[] = [];
    const decoder = new StringDecoder("utf8");

    const restoreTerminal = () => {
      try {
        if (typeof (input as any).setRawMode === "function") {
          (input as any).setRawMode(wasRaw);
        }
      } catch {
        // ignore
      }
      try {
        if (typeof (input as any).pause === "function") {
          (input as any).pause();
        }
      } catch {
        // ignore
      }
      (input as any).removeListener?.("data", onData);
      (input as any).removeListener?.("error", onError);
      (input as any).removeListener?.("end", onEnd);
      (input as any).removeListener?.("close", onClose);
    };

    const finish = (err?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      restoreTerminal();
      try {
        output.write("\n");
      } catch {
        // ignore
      }
      if (err) {
        reject(err);
      } else {
        resolve(value ?? "");
      }
    };

    const processChars = (str: string) => {
      for (const char of str) {
        if (char === "\u0003") {
          // Ctrl+C
          finish(new PromptReadError("secret.promptAborted"));
          return;
        }
        if (char === "\u0004") {
          // Ctrl+D (EOF)
          const val = chars.join("");
          if (val.length === 0) {
            finish(new PromptReadError("secret.promptAborted"));
          } else {
            finish(undefined, val);
          }
          return;
        }
        if (char === "\r" || char === "\n") {
          finish(undefined, chars.join(""));
          return;
        }
        if (char === "\u0008" || char === "\u007f") {
          // Backspace
          chars.pop();
          continue;
        }
        if (char >= " " || char === "\t") {
          chars.push(char);
        }
      }
    };

    const onData = (chunk: Buffer | string) => {
      if (settled) return;
      const str = typeof chunk === "string" ? chunk : decoder.write(chunk);
      processChars(str);
    };

    const onError = (_err?: unknown) => {
      if (settled) return;
      finish(new PromptReadError("secret.promptReadError"));
    };

    const onEnd = () => {
      if (settled) return;
      finish(new PromptReadError("secret.promptAborted"));
    };

    const onClose = () => {
      if (settled) return;
      finish(new PromptReadError("secret.promptAborted"));
    };

    try {
      if (promptLabel) {
        output.write(promptLabel);
      }
      (input as any).setRawMode(true);
      if (typeof (input as any).resume === "function") {
        (input as any).resume();
      }
      (input as any).on("data", onData);
      (input as any).on("error", onError);
      (input as any).on("end", onEnd);
      (input as any).on("close", onClose);
    } catch {
      finish(new PromptReadError("secret.promptReadError"));
    }
  });
}

class StdinReadError extends Error {
  constructor(
    readonly i18nKey:
      | "secret.stdinTooLarge"
      | "secret.stdinTimeout"
      | "secret.stdinReadError"
      | "secret.stdinEmpty"
      | "secret.stdinTtyNotSupported",
  ) {
    super(i18nKey);
  }
}

const DEFAULT_STDIN_TIMEOUT_MS = 10_000;
const DEFAULT_STDIN_MAX_BYTES = 64 * 1024; // 64 KiB

async function readSecretFromStdinStream(
  stream: NodeJS.ReadableStream,
  timeoutMs: number = DEFAULT_STDIN_TIMEOUT_MS,
  maxBytes: number = DEFAULT_STDIN_MAX_BYTES,
): Promise<string> {
  if (Boolean((stream as any)?.isTTY)) {
    throw new StdinReadError("secret.stdinTtyNotSupported");
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let totalBytes = 0;
    const chunks: Buffer[] = [];

    const timer = setTimeout(() => {
      finish(new StdinReadError("secret.stdinTimeout"));
    }, timeoutMs);
    timer.unref?.();

    const onData = (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        finish(new StdinReadError("secret.stdinTooLarge"));
        return;
      }
      chunks.push(buf);
    };

    const onEnd = () => {
      if (settled) return;
      clearTimeout(timer);
      cleanup();
      settled = true;

      const raw = Buffer.concat(chunks).toString("utf8");
      let value = raw;
      if (value.endsWith("\r\n")) {
        value = value.slice(0, -2);
      } else if (value.endsWith("\n")) {
        value = value.slice(0, -1);
      }

      if (value.length === 0 || /^\s*$/.test(value)) {
        reject(new StdinReadError("secret.stdinEmpty"));
        return;
      }

      resolve(value);
    };

    const onError = () => {
      if (settled) return;
      finish(new StdinReadError("secret.stdinReadError"));
    };

    function finish(err: Error) {
      if (settled) return;
      clearTimeout(timer);
      cleanup();
      settled = true;
      try {
        (stream as any).destroy?.();
      } catch {
        // ignore
      }
      reject(err);
    }

    function cleanup() {
      stream.removeListener?.("data", onData as any);
      stream.removeListener?.("end", onEnd as any);
      stream.removeListener?.("error", onError as any);
    }

    stream.on("data", onData as any);
    stream.on("end", onEnd as any);
    stream.on("error", onError as any);

    if (typeof (stream as any).resume === "function") {
      (stream as any).resume();
    }
  });
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
        const stdinFlags = rest.filter((arg) => arg === "--stdin");
        const promptFlags = rest.filter((arg) => arg === "--prompt");

        if (stdinFlags.length > 1) {
          console.error(t("secret.stdinDuplicateFlag"));
          process.exitCode = 1;
          return;
        }

        if (promptFlags.length > 1) {
          console.error(t("secret.promptDuplicateFlag"));
          process.exitCode = 1;
          return;
        }

        if (stdinFlags.length > 0 && promptFlags.length > 0) {
          console.error(t("secret.cannotMixStdinAndPrompt"));
          process.exitCode = 1;
          return;
        }

        const isStdin = stdinFlags.length === 1;
        const isPrompt = promptFlags.length === 1;
        const nonFlagArgs = rest.filter((arg) => arg !== "--stdin" && arg !== "--prompt");

        if (isStdin) {
          if (nonFlagArgs.length === 0) {
            console.error(t("secret.setNameRequired"));
            process.exitCode = 1;
            return;
          }
          if (nonFlagArgs.length > 1) {
            console.error(t("secret.stdinMixedWithValue"));
            process.exitCode = 1;
            return;
          }
          const [name] = nonFlagArgs;
          let val: string;
          try {
            val = await readSecretFromStdinStream(
              options.stdin ?? process.stdin,
              options.stdinTimeoutMs ?? DEFAULT_STDIN_TIMEOUT_MS,
              options.stdinMaxBytes ?? DEFAULT_STDIN_MAX_BYTES,
            );
          } catch (err) {
            if (err instanceof StdinReadError) {
              console.error(t(err.i18nKey));
            } else {
              console.error(t("secret.stdinReadError"));
            }
            process.exitCode = 1;
            return;
          }

          let parsedVal: unknown;
          try {
            parsedVal = parseSecretValue(val);
          } catch (err) {
            console.error(t("secret.errorPrefix", (err as Error).message));
            process.exitCode = 1;
            return;
          }

          setSecret(name, parsedVal);
          console.log(t("secret.setSuccess", name));
          return;
        }

        if (isPrompt) {
          if (nonFlagArgs.length === 0) {
            console.error(t("secret.promptNameRequired"));
            process.exitCode = 1;
            return;
          }
          if (nonFlagArgs.length > 1) {
            console.error(t("secret.promptMixedWithValue"));
            process.exitCode = 1;
            return;
          }
          const [name] = nonFlagArgs;
          let rawInput: string;
          try {
            if (options.promptReader) {
              rawInput = await options.promptReader(t("secret.promptLabel", name));
            } else {
              rawInput = await defaultPromptReader(
                t("secret.promptLabel", name),
                (options.stdin as any) ?? process.stdin,
                (options.stdout as any) ?? process.stderr,
              );
            }
          } catch (err) {
            if (err instanceof PromptReadError) {
              console.error(t(err.i18nKey));
            } else {
              console.error(t("secret.promptReadError"));
            }
            process.exitCode = 1;
            return;
          }

          let val = rawInput;
          if (val.endsWith("\r\n")) {
            val = val.slice(0, -2);
          } else if (val.endsWith("\n")) {
            val = val.slice(0, -1);
          }

          if (val.length === 0 || /^\s*$/.test(val)) {
            console.error(t("secret.promptEmpty"));
            process.exitCode = 1;
            return;
          }

          let parsedVal: unknown;
          try {
            parsedVal = parseSecretValue(val);
          } catch (err) {
            console.error(t("secret.errorPrefix", (err as Error).message));
            process.exitCode = 1;
            return;
          }

          setSecret(name, parsedVal);
          console.log(t("secret.setSuccess", name));
          return;
        }

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
