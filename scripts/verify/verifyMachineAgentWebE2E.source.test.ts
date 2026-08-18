import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const wrapperSource = readFileSync(join(import.meta.dir, "verifyMachineAgentWebE2E.ts"), "utf8");
const runnerSource = readFileSync(join(import.meta.dir, "verifyMachineAgentWebE2E.cjs"), "utf8");
const source = `${wrapperSource}\n${runnerSource}`;

describe("verifyMachineAgentWebE2E source contract", () => {
  it("drives the live browser user path through settings, create agent, agent details, and the created dialog", () => {
    expect(source).toContain("/setting/machines");
    expect(source).toContain("/create/agent");
    expect(source).toContain("desktop-machine");
    expect(source).toContain("createPrivateAgentKey");
    expect(source).toContain("message-input__textarea");
    expect(source).toContain("send-button.send-mode");
  });

  it("reuses the existing raw CDP probe bridge instead of adding a separate browser client", () => {
    expect(source).toContain("../probes/helpers/rawCdpClient.cjs");
    expect(source).toContain("openRawCdp");
    expect(source).toContain("readCdpVersion");
    expect(source).not.toContain("class RawCdpPage");
    expect(wrapperSource).toContain("Bun.spawn([\"node\"");
  });

  it("requires an explicit live flag and verifies machine-bound persisted agent data", () => {
    expect(source).toContain("RUN_MACHINE_AGENT_WEB_E2E");
    expect(source).toContain("runtimeBinding?.machineId");
    expect(source).toContain("connectorStatus");
    expect(source).toContain("copilot-cli");
  });

  it("selects the create button for the requested CLI provider instead of hardcoding Copilot", () => {
    expect(source).toContain("providerLabelPattern");
    expect(source).not.toContain("/Copilot/i.test");
  });

  it("guards against duplicate dialogs, lost messages, and legacy cli chat routing", () => {
    expect(source).toContain("assertPersistedDialogIntegrity");
    expect(source).toContain("assertMachineRunNetworkRouting");
    expect(source).toContain("/api/agent/run");
    expect(source).toContain("/api/cli/chat");
    expect(source).toContain("Unexpected persisted message roles");
    expect(source).toContain("Legacy /api/cli/chat request was observed");
  });
});
