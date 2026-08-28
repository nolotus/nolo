import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("publishNoloCli source contract", () => {
  test("gives agents a single publish entrypoint and verifies npm", () => {
    const source = readFileSync(join(import.meta.dir, "publishNoloCli.sh"), "utf8");

    expect(source).toContain("nolotus/nolo");
    expect(source).toContain("cli-publish.yml");
    expect(source).toContain("dist_tag=${CHANNEL}");
    expect(source).toContain("validate_version_alignment");
    expect(source).toContain('"$GH_BIN" run watch');
    expect(source).toContain("registry.npmjs.org/nolo-cli");
    expect(source).toContain("NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS:-180");
    expect(source).toContain('seq 1 "$max_attempts"');
    expect(source).not.toContain("verify_open_source_mirror");
    expect(source).toContain("Do not ask the user to run gh manually");
  });
});
