import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tableSerializationSource = readFileSync(
  join(import.meta.dir, "tableSerialization.ts"),
  "utf-8"
);
const readToolSource = readFileSync(
  join(import.meta.dir, "../../../ai/tools/readTool.ts"),
  "utf-8"
);
const referenceContextSource = readFileSync(
  join(import.meta.dir, "../../../ai/context/buildReferenceContext.ts"),
  "utf-8"
);

describe("table serialization source contract", () => {
  it("reuses fetchAndCacheTableRows instead of scanning only local rows", () => {
    expect(tableSerializationSource).toContain('import { fetchAndCacheTableRows } from "../fetchAndCacheTableRows"');
    expect(tableSerializationSource).toContain("await fetchAndCacheTableRows({");
    expect(tableSerializationSource).not.toContain("rowKey.range(");
  });

  it("passes token and remote servers from read tool and reference context", () => {
    expect(readToolSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(referenceContextSource).toContain(
      'import { getRuntimeServerContext } from "database/runtimeServerContext"'
    );
    expect(readToolSource).toContain("getRuntimeServerContext(state)");
    expect(referenceContextSource).toContain("getRuntimeServerContext(state)");
    expect(readToolSource).toContain("return await fetchAndSerializeTable(tableMeta, db, {");
    expect(referenceContextSource).toContain("return await fetchAndSerializeTable(tableMeta, db, {");
  });
});
