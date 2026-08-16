import { asOptionalTrimmedString } from "core/optionalString";
import {
  dialogMatchesSubjectRef,
  extractDialogSubjectRefs,
  filterDialogsBySubjectRef,
  type SubjectRefDialogCandidate,
  type SubjectRefDialogMatch,
  type SubjectRefTarget,
} from "./subjectRefLookup";

export type StrictSubjectRefQueryResult = {
  ok: boolean;
  reason: "ok" | "empty_results" | "unmatched_results";
  target: SubjectRefTarget;
  returnedCount: number;
  matchedCount: number;
  unmatchedCount: number;
  matches: SubjectRefDialogMatch[];
  unmatchedDialogs: Array<{
    dialogId: string | null;
    dialogKey: string | null;
    subjectRefs: SubjectRefTarget[];
  }>;
};

function pickString(value: unknown): string | null {
  return asOptionalTrimmedString(value) ?? null;
}

function dialogIdFromKey(dbKey: string | null) {
  if (!dbKey) return null;
  const index = dbKey.lastIndexOf("-");
  return index >= 0 ? dbKey.slice(index + 1) : dbKey;
}

function summarizeUnmatchedDialog(dialog: SubjectRefDialogCandidate) {
  const dialogKey = pickString(dialog.dbKey);
  return {
    dialogId: pickString(dialog.dialogId) ?? pickString(dialog.id) ?? dialogIdFromKey(dialogKey),
    dialogKey,
    subjectRefs: extractDialogSubjectRefs(dialog),
  };
}

export function verifyStrictSubjectRefQueryResults(
  dialogs: SubjectRefDialogCandidate[],
  target: SubjectRefTarget,
  options: { allowEmpty?: boolean } = {}
): StrictSubjectRefQueryResult {
  const matches = filterDialogsBySubjectRef(dialogs, target);
  const unmatchedDialogs = dialogs
    .filter((dialog) => !dialogMatchesSubjectRef(dialog, target))
    .map(summarizeUnmatchedDialog);
  const emptyResults = dialogs.length === 0 && options.allowEmpty !== true;
  const reason =
    unmatchedDialogs.length > 0
      ? "unmatched_results"
      : emptyResults
        ? "empty_results"
        : "ok";

  return {
    ok: reason === "ok",
    reason,
    target,
    returnedCount: dialogs.length,
    matchedCount: matches.length,
    unmatchedCount: unmatchedDialogs.length,
    matches,
    unmatchedDialogs,
  };
}
