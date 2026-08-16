import { describe, expect, it } from "bun:test";

import { findPotentialSecrets } from "./secretScan";

describe("secretScan", () => {
  it("detects common credential-like config lines", () => {
    const findings = findPotentialSecrets(`
proxies:
  - name: node
    password: "abcdef1234567890"
MySnell = snell, example.com, 8388, psk=supersecretvalue, version=4
`);

    expect(findings.map((finding) => finding.label)).toEqual(["password", "psk"]);
    expect(findings[0].line).toBe(4);
  });

  it("does not flag short ordinary labels", () => {
    expect(findPotentialSecrets("description: token bucket config")).toEqual([]);
  });
});
