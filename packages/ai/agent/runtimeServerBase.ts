import { asOptionalTrimmedString } from "core/optionalString";

export const normalizeServerOrigin = (base: string): string | null => {
  try {
    return new URL(base).origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
};

export const extractAgentRuntimeServerBase = (agentRecord: any): string | null => {
  const candidates = [
    agentRecord?.delegation?.serverBase,
    agentRecord?.runtime?.serverBase,
    agentRecord?.runtimeServerBase,
  ];

  if (Array.isArray(agentRecord?.runtimes)) {
    const runtimes = agentRecord.runtimes
      .filter((runtime: any) => runtime && typeof runtime === "object")
      .slice()
      .sort((a: any, b: any) => {
        const priorityA =
          typeof a.priority === "number" ? a.priority : Number.MAX_SAFE_INTEGER;
        const priorityB =
          typeof b.priority === "number" ? b.priority : Number.MAX_SAFE_INTEGER;
        return priorityA - priorityB;
      });
    candidates.push(...runtimes.map((runtime: any) => runtime.serverBase));
  }

  for (const candidate of candidates) {
    const serverBase = asOptionalTrimmedString(candidate);
    if (serverBase) return serverBase;
  }

  return null;
};
