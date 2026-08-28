type SharedObjectKind =
  | "dialog"
  | "subject-ref"
  | "table-row"
  | "agent-automation"
  | "doc"
  | "artifact"
  | "deploy"
  | "billing";

type WriteClassificationInput = {
  objectKind: SharedObjectKind;
  tableId?: string;
  field?: string;
};

type WriteClassification = {
  allowed: boolean;
  reason: "evidence-write" | "contract-bound-shared-state" | "restricted-shared-state";
};

// Shared tables whose writes must follow the contract. Today this is the
// canonical task board table id; new replicas should add their dbKey here.
const SHARED_TABLE_IDS: Record<string, true> = {
  "01KWSK4Q4TESXQ06SW39JN2TTJ": true,
};

export function classifySharedObjectWrite(input: WriteClassificationInput): WriteClassification {
  if (input.objectKind === "dialog" || input.objectKind === "subject-ref") {
    return { allowed: true, reason: "evidence-write" };
  }

  if (
    input.objectKind === "table-row" &&
    typeof input.tableId === "string" &&
    SHARED_TABLE_IDS[input.tableId]
  ) {
    return { allowed: true, reason: "contract-bound-shared-state" };
  }

  if (input.objectKind === "deploy" || input.objectKind === "billing") {
    return { allowed: false, reason: "restricted-shared-state" };
  }

  return { allowed: true, reason: "contract-bound-shared-state" };
}
