import { describe, expect, test } from "bun:test";
import { parseStatusChangedFiles } from "./connectorRunArtifact";

describe("connector run artifacts", () => {
  test("parses git status --short paths without dropping tracked path characters", () => {
    expect(parseStatusChangedFiles([
      " M packages/daemon/index.ts",
      "M  packages/cli/index.ts",
      "?? tmp/generated.txt",
      "R  old/name.ts -> new/name.ts",
    ].join("\n"))).toEqual([
      "packages/daemon/index.ts",
      "packages/cli/index.ts",
      "tmp/generated.txt",
      "new/name.ts",
    ]);
  });
});
