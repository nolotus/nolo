export type TableDataOutputMode = "full" | "raw" | "items" | "jsonl";

export function parseTableDataOutputMode(raw?: string): TableDataOutputMode {
  const value = raw?.trim();
  if (!value) return "full";
  if (value === "json") return "raw";
  if (value === "full" || value === "raw" || value === "items" || value === "jsonl") {
    return value;
  }
  throw new Error(`--output 只支持 full, raw, items, json, jsonl；收到：${value}`);
}

function getItems(result: unknown): unknown[] | undefined {
  if (!result || typeof result !== "object") return undefined;
  const items = (result as any).items;
  return Array.isArray(items) ? items : undefined;
}

export function formatTableDataOutput(input: {
  envelope: Record<string, unknown>;
  result: unknown;
  mode: TableDataOutputMode;
}): string {
  if (input.mode === "full") {
    return JSON.stringify(input.envelope, null, 2);
  }
  if (input.mode === "raw") {
    return JSON.stringify(input.result, null, 2);
  }

  const items = getItems(input.result);
  const value = items ?? input.result;
  if (input.mode === "items") {
    return JSON.stringify(value, null, 2);
  }
  if (!Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return value.map((item) => JSON.stringify(item)).join("\n");
}
