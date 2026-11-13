import { basename } from "node:path";
import { isRecord } from "core/isRecord";

/** A reading view, never a mutation of the evidence file. Preserve physical lines. */
export function projectRunResultRead(
  path: string,
  content: string,
  raw = false,
): { content: string; projected: boolean } {
  const unchanged = { content, projected: false };
  if (raw || !basename(path).endsWith(".result.md") || !content.startsWith("---\n")) return unchanged;
  const end = content.indexOf("\n---\n", 4);
  if (end < 0) return unchanged;
  const header = content.slice(0, end).split("\n");
  const runLine = header.find(line => line.startsWith("runId: "));
  const index = header.findIndex(line => line.startsWith("acceptance: "));
  if (!runLine || index < 0) return unchanged;
  try {
    const runId: unknown = JSON.parse(runLine.slice(7));
    if (typeof runId !== "string" || basename(path) !== `${runId}.result.md`) return unchanged;
    const encoded: unknown = JSON.parse(header[index]!.slice(12));
    if (typeof encoded !== "string") return unchanged;
    const acceptance: unknown = JSON.parse(encoded);
    if (!isRecord(acceptance) || acceptance.schemaVersion !== 1 || acceptance.source !== "local-runtime"
      || !isRecord(acceptance.checks) || !Array.isArray(acceptance.checks.observations)) return unchanged;
    const { observations, ...checks } = acceptance.checks;
    let exitZero = 0;
    let exitNonzero = 0;
    let exitUnknown = 0;
    for (const observation of observations) {
      const code = isRecord(observation) ? observation.exitCode : undefined;
      if (code === 0) exitZero++;
      else if (typeof code === "number" && Number.isInteger(code)) exitNonzero++;
      else exitUnknown++;
    }
    const projected = { ...acceptance, checks: { ...checks, observationSummary: {
      count: observations.length, exitZero, exitNonzero, exitUnknown,
      evidence: "#/acceptance/checks/observations",
      readOriginal: "readFile with raw:true (force:true if already read)",
      limitation: "Exit counts are observations, not version-bound test or review approval.",
    } } };
    const line = `acceptance: ${JSON.stringify(JSON.stringify(projected))}`;
    if (line.length >= header[index]!.length) return unchanged;
    header[index] = line;
    return { content: header.join("\n") + content.slice(end), projected: true };
  } catch {
    // Unsupported or malformed evidence must remain inspectable, not be hidden.
    return unchanged;
  }
}
