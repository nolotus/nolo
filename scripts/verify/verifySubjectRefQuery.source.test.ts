import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expectNoRetiredTaskOrchestrationTerms } from "../helpers/retiredTaskOrchestrationTerms";

describe("verifySubjectRefQuery source contract", () => {
  test("uses indexed query output as the strict evidence boundary", () => {
    const source = readFileSync(join(import.meta.dir, "verifySubjectRefQuery.ts"), "utf8");

    expect(source).toContain("queryDbRecords");
    expect(source).toContain("subjectRef:");
    expect(source).toContain("verifyStrictSubjectRefQueryResults");
    expect(source).not.toContain("filterDialogsBySubjectRef");
    expect(source).not.toContain("activityRefs");
    expect(source).not.toContain("latestActivityRef");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
