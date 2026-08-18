import { asRecordOrEmpty } from "core/recordOrEmpty";

export type AgentDocWiringSeverity = "ok" | "warn" | "fail";

export type AgentDocReferenceSpec = {
  dbKey: string;
  title?: string;
  type?: "instruction" | "knowledge" | "page" | string;
};

export type AgentDocWiringCheck = {
  id: string;
  severity: AgentDocWiringSeverity;
  message: string;
  actual?: unknown;
  expected?: unknown;
};

export type AgentDocWiringInput = {
  server: string;
  ownerUserId: string;
  agentKey: string;
  references: AgentDocReferenceSpec[];
  promptPatch?: string;
  write: boolean;
  agent: any;
  docsByKey: Record<string, any | null | undefined>;
};

export type AgentDocWiringReport = {
  ok: boolean;
  write: boolean;
  server: string;
  ownerUserId: string;
  agentKey: string;
  expected: {
    referenceKeys: string[];
    readTools: string[];
  };
  checks: AgentDocWiringCheck[];
  summary: {
    ok: number;
    warn: number;
    fail: number;
  };
  patch?: Record<string, unknown>;
};

const READ_TOOLS = ["readDoc", "readSkillDoc"];

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function countBySeverity(checks: AgentDocWiringCheck[]) {
  return {
    ok: checks.filter((check) => check.severity === "ok").length,
    warn: checks.filter((check) => check.severity === "warn").length,
    fail: checks.filter((check) => check.severity === "fail").length,
  };
}

function refKey(ref: any) {
  return typeof ref?.dbKey === "string" ? ref.dbKey : "";
}

function uniqueReferences(refs: AgentDocReferenceSpec[]) {
  const seen = new Set<string>();
  const result: AgentDocReferenceSpec[] = [];
  for (const ref of refs) {
    const dbKey = ref.dbKey.trim();
    if (!dbKey || seen.has(dbKey)) continue;
    seen.add(dbKey);
    result.push({ ...ref, dbKey });
  }
  return result;
}

function hasReadableBody(record: any) {
  if (!record || typeof record !== "object") return false;
  if (typeof record.content === "string" && record.content.trim()) return true;
  if (typeof record.text === "string" && record.text.trim()) return true;
  if (Array.isArray(record.slateData) && record.slateData.length > 0) return true;
  return false;
}

function buildReference(ref: AgentDocReferenceSpec, doc: any) {
  return {
    dbKey: ref.dbKey,
    title: ref.title || doc?.title || ref.dbKey,
    type: ref.type || "knowledge",
  };
}

function buildAgentPatch(input: AgentDocWiringInput, references: AgentDocReferenceSpec[]) {
  const currentReferences = asArray(input.agent?.references);
  const currentRefKeys = new Set(currentReferences.map(refKey).filter(Boolean));
  const missingReferences = references
    .filter((ref) => !currentRefKeys.has(ref.dbKey))
    .map((ref) => buildReference(ref, input.docsByKey[ref.dbKey]));
  const prompt = String(input.agent?.prompt ?? "");
  const promptPatch = input.promptPatch?.trim() ?? "";
  const shouldAppendPromptPatch = Boolean(promptPatch && !prompt.includes(promptPatch));
  const tools = Array.from(new Set([...asArray(input.agent?.tools).map(String), ...READ_TOOLS]));

  return {
    ...input.agent,
    references: [...currentReferences, ...missingReferences],
    tools,
    prompt: shouldAppendPromptPatch
      ? `${prompt}${prompt ? "\n\n" : ""}${promptPatch}`
      : prompt,
    updatedAt: Date.now(),
    meta: {
      ...asRecordOrEmpty(input.agent?.meta),
      agentDocWiring: {
        verifiedAt: new Date().toISOString(),
        referenceKeys: references.map((ref) => ref.dbKey),
        previousReferenceKeys: currentReferences.map(refKey).filter(Boolean),
      },
    },
  };
}

export function buildAgentDocWiringReport(input: AgentDocWiringInput): AgentDocWiringReport {
  const references = uniqueReferences(input.references);
  const expectedRefKeys = references.map((ref) => ref.dbKey);
  const checks: AgentDocWiringCheck[] = [];
  const currentReferences = asArray(input.agent?.references);
  const currentRefKeys = currentReferences.map(refKey).filter(Boolean);
  const tools = asArray(input.agent?.tools).map(String);
  const prompt = String(input.agent?.prompt ?? "");
  const promptPatch = input.promptPatch?.trim() ?? "";

  checks.push(input.agent
    ? { id: "agent.exists", severity: "ok", message: "Agent record is readable." }
    : { id: "agent.exists", severity: "fail", message: "Agent record is missing or unreadable." });

  checks.push(references.length > 0
    ? { id: "references.input", severity: "ok", message: "At least one reference was provided.", actual: expectedRefKeys }
    : { id: "references.input", severity: "fail", message: "Provide at least one --ref <dbKey>:<type>." });

  for (const ref of references) {
    const doc = input.docsByKey[ref.dbKey];
    checks.push(doc
      ? { id: `doc.exists.${ref.dbKey}`, severity: "ok", message: "Referenced doc is readable.", actual: ref.dbKey }
      : { id: `doc.exists.${ref.dbKey}`, severity: "fail", message: "Referenced doc is missing or unreadable.", expected: ref.dbKey });
    if (doc) {
      checks.push(hasReadableBody(doc)
        ? { id: `doc.body.${ref.dbKey}`, severity: "ok", message: "Referenced doc has readable content.", actual: ref.dbKey }
        : { id: `doc.body.${ref.dbKey}`, severity: "warn", message: "Referenced doc has no obvious content/text/slateData body.", actual: ref.dbKey });
    }
  }

  if (input.agent) {
    checks.push(expectedRefKeys.every((key) => currentRefKeys.includes(key))
      ? { id: "agent.references.required", severity: "ok", message: "Agent references include all requested docs.", actual: currentRefKeys }
      : { id: "agent.references.required", severity: "fail", message: "Agent references are missing one or more requested docs.", actual: currentRefKeys, expected: expectedRefKeys });

    const missingReadTools = READ_TOOLS.filter((tool) => !tools.includes(tool));
    checks.push(missingReadTools.length === 0
      ? { id: "agent.tools.read", severity: "ok", message: "Agent has doc-reading tools.", actual: tools }
      : tools.some((tool) => READ_TOOLS.includes(tool))
        ? { id: "agent.tools.read", severity: "warn", message: "Agent has a doc-reading tool, but the wiring script will add the missing standard read tool.", actual: tools, expected: READ_TOOLS }
        : { id: "agent.tools.read", severity: "fail", message: "Agent needs readDoc/readSkillDoc to use doc references reliably.", actual: tools, expected: READ_TOOLS });

    if (promptPatch) {
      checks.push(prompt.includes(promptPatch)
        ? { id: "agent.promptPatch", severity: "ok", message: "Prompt already contains the requested prompt patch." }
        : { id: "agent.promptPatch", severity: "warn", message: "Prompt does not contain the requested prompt patch; write mode will append it." });
    }
  }

  const summary = countBySeverity(checks);
  const canPatch = Boolean(input.agent) && references.length > 0 && references.every((ref) => input.docsByKey[ref.dbKey]);
  const patchNeeded = checks.some((check) =>
    check.id.startsWith("agent.") && check.severity !== "ok"
  );
  const patch = canPatch && patchNeeded ? buildAgentPatch(input, references) : undefined;

  return {
    ok: summary.fail === 0,
    write: input.write,
    server: input.server,
    ownerUserId: input.ownerUserId,
    agentKey: input.agentKey,
    expected: {
      referenceKeys: expectedRefKeys,
      readTools: READ_TOOLS,
    },
    checks,
    summary,
    ...(patch ? { patch } : {}),
  };
}
