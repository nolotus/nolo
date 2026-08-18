export type RuntimeSupervisorKind = "llama";

export type DelegatedRuntimeCommand = {
  kind: RuntimeSupervisorKind;
  delegatedArgs: string[];
  delegatedEnv: Record<string, string>;
};

const GENERIC_TO_LLAMA_ENV: Array<[string, string]> = [
  ["MODEL_RUNTIME_BIN", "LLAMA_SERVER_BIN"],
  ["MODEL_RUNTIME_MODEL_PATH", "LLAMA_MODEL_PATH"],
  ["MODEL_RUNTIME_CWD", "LLAMA_SERVER_CWD"],
  ["MODEL_RUNTIME_HOST", "LLAMA_SERVER_HOST"],
  ["MODEL_RUNTIME_PORT", "LLAMA_SERVER_PORT"],
  ["MODEL_RUNTIME_HEALTH_PATH", "LLAMA_SERVER_HEALTH_PATH"],
  ["MODEL_RUNTIME_MODELS_PATH", "LLAMA_SERVER_MODELS_PATH"],
  ["MODEL_RUNTIME_STARTUP_TIMEOUT_SECONDS", "LLAMA_SERVER_STARTUP_TIMEOUT_SECONDS"],
  ["MODEL_RUNTIME_POLL_SECONDS", "LLAMA_SERVER_POLL_SECONDS"],
  ["MODEL_RUNTIME_ARGS_JSON", "LLAMA_SERVER_ARGS_JSON"],
];

function resolveRuntimeKind(args: string[], env: NodeJS.ProcessEnv): RuntimeSupervisorKind {
  const kindFlagIndex = args.findIndex((value) => value === "--kind");
  const rawKind =
    (kindFlagIndex >= 0 ? args[kindFlagIndex + 1] : undefined) ??
    env.MODEL_RUNTIME_KIND ??
    "llama";
  const normalizedKind = String(rawKind).trim().toLowerCase();

  if (normalizedKind === "llama" || normalizedKind === "llama-server" || normalizedKind === "openai-local") {
    return "llama";
  }

  throw new Error(`Unsupported model runtime kind: ${rawKind}`);
}

export function buildDelegatedRuntimeCommand(
  rawArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
): DelegatedRuntimeCommand {
  const kind = resolveRuntimeKind(rawArgs, env);
  const delegatedEnv: Record<string, string> = {};
  for (const [genericKey, llamaKey] of GENERIC_TO_LLAMA_ENV) {
    const value = env[genericKey];
    if (typeof value === "string" && value.trim()) {
      delegatedEnv[llamaKey] = value;
    }
  }

  const delegatedArgs: string[] = [];
  for (let index = 0; index < rawArgs.length; index += 1) {
    const current = rawArgs[index];
    if (!current) continue;
    if (current === "--kind") {
      index += 1;
      continue;
    }
    if (current === "--runtime-arg") {
      delegatedArgs.push("--llama-arg");
      continue;
    }
    delegatedArgs.push(current);
  }

  return {
    kind,
    delegatedArgs,
    delegatedEnv,
  };
}
