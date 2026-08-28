import { isRecord } from "core/isRecord";

export type AgentCreationSpecReference = {
  dbKey: string;
  type?: string;
  title?: string;
};

export type AgentPublicGateConfig = {
  server?: string;
  minCases?: number;
  minMultiTurnCases?: number;
  minSourceGroundedCases?: number;
  minSafetyCases?: number;
  sourceGroundingSignals?: string[];
  safetySignals?: string[];
  forbiddenRecordText?: string[];
  requiredPromptText?: string[];
  requirePublicAlias?: boolean;
  requireNoPublicSecrets?: boolean;
  requireReferenceReadability?: boolean;
  forbidUnrelatedUserGlobalMemory?: boolean;
};

export type AgentCreationSpec = {
  name?: string;
  publicName?: string;
  server?: string;
  owner?: string;
  agent: string;
  references: AgentCreationSpecReference[];
  casesFile: string;
  promptPatch?: string;
  promptPatchFile?: string;
  category?: string;
  maxCases?: number;
  publicGate?: AgentPublicGateConfig;
};

export type AgentCreationSpecOverrides = {
  server?: string;
  owner?: string;
  agent?: string;
  casesFile?: string;
  token?: string;
  machineKey?: string;
  promptPatch?: string;
  promptPatchFile?: string;
  category?: string;
  maxCases?: number;
  writeWiring?: boolean;
  runLive?: boolean;
};

function validateOptionalString(errors: string[], spec: Record<string, unknown>, key: keyof AgentCreationSpec) {
  const value = spec[key];
  if (value !== undefined && typeof value !== "string") errors.push(`${key} must be a string when provided.`);
}

export function validateAgentCreationSpec(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["spec must be a JSON object."];

  validateOptionalString(errors, value, "name");
  validateOptionalString(errors, value, "publicName");
  validateOptionalString(errors, value, "server");
  validateOptionalString(errors, value, "owner");
  validateOptionalString(errors, value, "promptPatch");
  validateOptionalString(errors, value, "promptPatchFile");
  validateOptionalString(errors, value, "category");

  if (typeof value.agent !== "string" || value.agent.trim().length === 0) {
    errors.push("agent must be a non-empty string.");
  }
  if (typeof value.casesFile !== "string" || value.casesFile.trim().length === 0) {
    errors.push("casesFile must be a non-empty string.");
  }
  if (value.promptPatch && value.promptPatchFile) {
    errors.push("promptPatch and promptPatchFile are mutually exclusive.");
  }
  if (
    value.maxCases !== undefined &&
    value.maxCases !== null &&
    (typeof value.maxCases !== "number" ||
      !Number.isInteger(value.maxCases) ||
      value.maxCases <= 0)
  ) {
    errors.push("maxCases must be a positive integer when provided.");
  }

  if (!Array.isArray(value.references) || value.references.length === 0) {
    errors.push("references must contain at least one reference.");
  } else {
    value.references.forEach((reference, index) => {
      if (!isRecord(reference)) {
        errors.push(`references[${index}] must be an object.`);
        return;
      }
      if (typeof reference.dbKey !== "string" || reference.dbKey.trim().length === 0) {
        errors.push(`references[${index}].dbKey must be a non-empty string.`);
      }
      if (reference.type !== undefined && typeof reference.type !== "string") {
        errors.push(`references[${index}].type must be a string when provided.`);
      }
      if (reference.title !== undefined && typeof reference.title !== "string") {
        errors.push(`references[${index}].title must be a string when provided.`);
      }
    });
  }

  if (value.publicGate !== undefined) {
    if (!isRecord(value.publicGate)) {
      errors.push("publicGate must be an object when provided.");
    } else {
      const pg = value.publicGate as Record<string, unknown>;
      if (pg.server !== undefined && typeof pg.server !== "string") {
        errors.push("publicGate.server must be a string when provided.");
      }
      const intKeys = ["minCases", "minMultiTurnCases", "minSourceGroundedCases", "minSafetyCases"];
      for (const key of intKeys) {
        if (pg[key] !== undefined && (!Number.isInteger(pg[key]) || (pg[key] as number) < 0)) {
          errors.push(`publicGate.${key} must be a non-negative integer when provided.`);
        }
      }
      const boolKeys = ["requirePublicAlias", "requireNoPublicSecrets", "requireReferenceReadability", "forbidUnrelatedUserGlobalMemory"];
      for (const key of boolKeys) {
        if (pg[key] !== undefined && typeof pg[key] !== "boolean") {
          errors.push(`publicGate.${key} must be a boolean when provided.`);
        }
      }
      const stringArrayKeys = [
        "sourceGroundingSignals",
        "safetySignals",
        "forbiddenRecordText",
        "requiredPromptText",
      ];
      for (const key of stringArrayKeys) {
        if (pg[key] !== undefined) {
          if (!Array.isArray(pg[key]) || !(pg[key] as unknown[]).every((s) => typeof s === "string")) {
            errors.push(`publicGate.${key} must be an array of strings when provided.`);
          }
        }
      }
    }
  }

  return errors;
}

export function parseAgentCreationSpec(value: unknown): AgentCreationSpec {
  const errors = validateAgentCreationSpec(value);
  if (errors.length > 0) throw new Error(`Invalid agent creation spec:\n${errors.join("\n")}`);
  return value as AgentCreationSpec;
}

export function referenceToClosedLoopArg(reference: AgentCreationSpecReference): string {
  const dbKey = reference.dbKey.trim();
  const type = reference.type?.trim();
  return type ? `${dbKey}:${type}` : dbKey;
}

function addOptionalArg(args: string[], flag: string, value: string | undefined) {
  if (value) args.push(flag, value);
}

function resolveNumberOverride(specValue: number | undefined, overrideValue: number | undefined) {
  return overrideValue ?? specValue;
}

export function buildClosedLoopArgsFromSpec(
  spec: AgentCreationSpec,
  overrides: AgentCreationSpecOverrides = {},
): string[] {
  const promptPatch = overrides.promptPatch ?? spec.promptPatch;
  const promptPatchFile = overrides.promptPatchFile ?? spec.promptPatchFile;
  if (promptPatch && promptPatchFile) {
    throw new Error("promptPatch and promptPatchFile are mutually exclusive.");
  }

  const args = [
    "./scripts/verify/verifyAgentCreationClosedLoop.ts",
    "--agent",
    overrides.agent ?? spec.agent,
    "--cases-file",
    overrides.casesFile ?? spec.casesFile,
  ];

  for (const reference of spec.references) {
    args.push("--ref", referenceToClosedLoopArg(reference));
  }

  addOptionalArg(args, "--server", overrides.server ?? spec.server);
  addOptionalArg(args, "--owner", overrides.owner ?? spec.owner);
  addOptionalArg(args, "--token", overrides.token);
  addOptionalArg(args, "--machine-key", overrides.machineKey);
  addOptionalArg(args, "--prompt-patch", promptPatch);
  addOptionalArg(args, "--prompt-patch-file", promptPatchFile);
  addOptionalArg(args, "--category", overrides.category ?? spec.category);

  const maxCases = resolveNumberOverride(spec.maxCases, overrides.maxCases);
  if (maxCases !== undefined) args.push("--max-cases", String(maxCases));
  if (overrides.writeWiring) args.push("--write-wiring");
  if (overrides.runLive) args.push("--run-live");

  return args;
}

export function redactClosedLoopArgs(args: string[]): string[] {
  const redacted = [...args];
  for (let index = 0; index < redacted.length; index += 1) {
    if (redacted[index] === "--token" && redacted[index + 1]) {
      redacted[index + 1] = "[redacted]";
      index += 1;
    }
  }
  return redacted;
}
