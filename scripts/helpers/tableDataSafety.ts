export const TABLE_SCHEMA_WRITE_ACTIONS = new Set(["add-column"]);

export function isTableSchemaWriteAction(action: string): boolean {
  return TABLE_SCHEMA_WRITE_ACTIONS.has(action.trim());
}

export function tableSchemaWriteSafetyMessage(action: string): string {
  return [
    `Action "${action}" mutates table schema metadata and must be serialized per table.`,
    "Rerun with --schema-write-ok only after confirming no other agent/script is changing the same table schema.",
    "Server-side schema CAS/locking is not implemented yet; row-level writes do not need this flag.",
  ].join(" ");
}

export function assertTableSchemaWriteAllowed(input: {
  action: string;
  allowSchemaWrite: boolean;
}): void {
  if (!isTableSchemaWriteAction(input.action)) {
    return;
  }
  if (input.allowSchemaWrite) {
    return;
  }
  throw new Error(tableSchemaWriteSafetyMessage(input.action));
}
