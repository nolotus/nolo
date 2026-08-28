import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expectNoRetiredTaskOrchestrationTerms } from "../helpers/retiredTaskOrchestrationTerms";

describe("verifyExistingTaskThreadLoop source contract", () => {
  test("does not silently local-filter broad subjectRef query results", () => {
    const source = readFileSync(join(import.meta.dir, "verifyExistingTaskThreadLoop.ts"), "utf8");

    expect(source).toContain("queryDbRecords");
    expect(source).toContain("subjectRef:");
    expect(source).toContain("verifyStrictSubjectRefQueryResults");
    expect(source).toContain("subjectQueryStrictness");
    expect(source).toContain("--allow-broad-subject-query");
    expect(source).toContain("process.exitCode = 1");
    expect(source).not.toContain("filterDialogsBySubjectRef");
    expect(source).not.toContain("--scan-subject-dialogs");
    expect(source).not.toContain("--subject-scan-limit");
    expect(source).not.toContain("legacy/debug probe");
    expect(source).not.toContain("reads recent dialog");
    expectNoRetiredTaskOrchestrationTerms(source);
  });
});
