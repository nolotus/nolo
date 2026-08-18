import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = readFileSync(join(import.meta.dir, "read.ts"), "utf8");
const readAndWaitSource = readFileSync(
  join(import.meta.dir, "readAndWait.ts"),
  "utf8"
);

describe("read path source contract", () => {
  it("passes the defined isRemoteDataNewer helper into replacement checks", () => {
    expect(readSource).toContain("isRemoteNewer: isRemoteDataNewer");
    expect(readAndWaitSource).toContain("isRemoteNewer: isRemoteDataNewer");
    expect(readSource).not.toContain("isRemoteNewer,\n");
    expect(readAndWaitSource).not.toContain("isRemoteNewer,\n");
  });
});
