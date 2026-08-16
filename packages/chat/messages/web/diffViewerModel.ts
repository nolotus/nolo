export type DiffPart = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

export type DiffRowKind = "context" | "added" | "removed";

export type DiffRow = {
  id: string;
  kind: DiffRowKind;
  content: string;
  oldLine: number | null;
  newLine: number | null;
};

export function buildDiffRows(parts: DiffPart[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLine = 1;
  let newLine = 1;

  parts.forEach((part, partIndex) => {
    const kind: DiffRowKind = part.added
      ? "added"
      : part.removed
        ? "removed"
        : "context";
    const lines = part.value.split("\n");

    lines.forEach((line, lineIndex) => {
      if (lineIndex === lines.length - 1 && line === "") return;

      const row: DiffRow = {
        id: `${partIndex}-${lineIndex}`,
        kind,
        content: line,
        oldLine: kind === "added" ? null : oldLine,
        newLine: kind === "removed" ? null : newLine,
      };

      rows.push(row);

      if (kind !== "added") oldLine += 1;
      if (kind !== "removed") newLine += 1;
    });
  });

  return rows;
}

export function summarizeDiffRows(rows: DiffRow[]) {
  let added = 0;
  let removed = 0;

  for (const row of rows) {
    if (row.kind === "added") added += 1;
    if (row.kind === "removed") removed += 1;
  }

  return { added, removed };
}
