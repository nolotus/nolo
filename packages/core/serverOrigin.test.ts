import { describe, expect, it } from "bun:test";
import { normalizeServerOrigin } from "./serverOrigin";

describe("normalizeServerOrigin pure seam", () => {
  it("rejects non-strings as empty", () => {
    expect(normalizeServerOrigin(undefined)).toBe("");
    expect(normalizeServerOrigin(null)).toBe("");
    expect(normalizeServerOrigin(0)).toBe("");
    expect(normalizeServerOrigin(1)).toBe("");
    expect(normalizeServerOrigin(true)).toBe("");
    expect(normalizeServerOrigin({})).toBe("");
    expect(normalizeServerOrigin([])).toBe("");
  });

  it("trims and drops blank strings", () => {
    expect(normalizeServerOrigin("")).toBe("");
    expect(normalizeServerOrigin("   ")).toBe("");
    expect(normalizeServerOrigin("\t\n")).toBe("");
  });

  it("strips trailing slashes after trim", () => {
    expect(normalizeServerOrigin("https://nolo.chat")).toBe("https://nolo.chat");
    expect(normalizeServerOrigin("https://nolo.chat/")).toBe("https://nolo.chat");
    expect(normalizeServerOrigin("https://nolo.chat///")).toBe("https://nolo.chat");
    expect(normalizeServerOrigin("  https://nolo.chat/  ")).toBe(
      "https://nolo.chat",
    );
  });

  it("preserves path segments that are not only trailing slashes", () => {
    expect(normalizeServerOrigin("https://nolo.chat/api/")).toBe(
      "https://nolo.chat/api",
    );
    expect(normalizeServerOrigin("http://127.0.0.1:38123")).toBe(
      "http://127.0.0.1:38123",
    );
  });

  it("pins residual UI / payments / runtime origin shapes", () => {
    // CLI authorize / advanced settings / desktop machines serverBase
    expect(normalizeServerOrigin("https://us.nolo.chat/")).toBe(
      "https://us.nolo.chat",
    );
    expect(normalizeServerOrigin(undefined) || "https://nolo.chat").toBe(
      "https://nolo.chat",
    );
    // fetchOwnedApps current vs record origin equality
    expect(normalizeServerOrigin("https://nolo.chat///")).toBe(
      normalizeServerOrigin("  https://nolo.chat  "),
    );
    // waffo public / API base URLs
    expect(normalizeServerOrigin("https://api.waffo.example/v1/")).toBe(
      "https://api.waffo.example/v1",
    );
    // platform chat provider serverUrls entries
    expect(normalizeServerOrigin("https://us.nolo.chat")).toBe(
      "https://us.nolo.chat",
    );
  });

  it("pins residual CLI / database / share origin shapes", () => {
    // cliEnvHelpers / machine / agent-run env bases
    expect(
      normalizeServerOrigin("https://args-first.example///") ||
        "https://nolo.chat",
    ).toBe("https://args-first.example");
    expect(
      normalizeServerOrigin(
        ((globalThis as any).__undef ?? "https://nolo.chat") as string,
      ),
    ).toBe("https://nolo.chat");
    // database actions known-origin fallback + share read candidates
    expect(normalizeServerOrigin("https://alpha.example.com/")).toBe(
      "https://alpha.example.com",
    );
    expect(normalizeServerOrigin("  https://beta.example.com///  ")).toBe(
      "https://beta.example.com",
    );
  });

  it("pins residual scripts/probes origin shapes", () => {
    // scripts/helpers/serverBases normalizeBaseUrl + LOCAL_BASE override
    expect(normalizeServerOrigin("http://127.0.0.1:38123/")).toBe(
      "http://127.0.0.1:38123",
    );
    expect(normalizeServerOrigin("  http://127.0.0.1:39041///  ")).toBe(
      "http://127.0.0.1:39041",
    );
    // REMOTE_BASES comma-split entries (us/main)
    expect(normalizeServerOrigin("https://us.nolo.chat/")).toBe(
      "https://us.nolo.chat",
    );
    expect(normalizeServerOrigin("https://nolo.chat///")).toBe(
      "https://nolo.chat",
    );
    // blank env entries drop out before filter(Boolean)
    expect(normalizeServerOrigin("   ")).toBe("");
  });

  it("pins residual verify/nolo-ci/audit origin shapes", () => {
    // verifyWebHostedExecRuntime / email-registration / external-registration
    // normalizeBaseUrl + nolo-ci releaseControlApi + auditPlatformAgents
    expect(normalizeServerOrigin("https://alpha-a.nolo.chat/")).toBe(
      "https://alpha-a.nolo.chat",
    );
    expect(
      normalizeServerOrigin("  https://alpha.nolo.chat///  ") ||
        "https://nolo.chat",
    ).toBe("https://alpha.nolo.chat");
    expect(normalizeServerOrigin("http://127.0.0.1:39041/")).toBe(
      "http://127.0.0.1:39041",
    );
    expect(normalizeServerOrigin("https://us.nolo.chat///")).toBe(
      "https://us.nolo.chat",
    );
  });

  it("pins residual packages authority / desktop / local origin shapes", () => {
    // userPreference / userAuthorityRegistry / settingNormalizers (then https?:// gate)
    expect(normalizeServerOrigin("https://self.example.com/")).toBe(
      "https://self.example.com",
    );
    expect(normalizeServerOrigin("  https://home.example.com///  ")).toBe(
      "https://home.example.com",
    );
    // database/config known-origin parse-fallback + local/cluster checks
    expect(normalizeServerOrigin("not-a-url///")).toBe("not-a-url");
    expect(normalizeServerOrigin("http://127.0.0.1:38123/")).toBe(
      "http://127.0.0.1:38123",
    );
    // desktop localConnector env / profile / default bases
    expect(
      normalizeServerOrigin("https://agent.nolo.chat/") || "https://nolo.chat",
    ).toBe("https://agent.nolo.chat");
    expect(normalizeServerOrigin(((globalThis as any).__undef ?? "https://us.nolo.chat") as string)).toBe(
      "https://us.nolo.chat",
    );
    // localOrigins.normalizeOrigin thin wrapper
    expect(normalizeServerOrigin(" http://127.0.0.1:38123/ ")).toBe(
      "http://127.0.0.1:38123",
    );
  });
});
