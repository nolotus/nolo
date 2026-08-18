import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "verifyCliLocalBrokerConcurrency.ts");

function readSource() {
  expect(existsSync(scriptPath)).toBe(true);
  return readFileSync(scriptPath, "utf8");
}

describe("verifyCliLocalBrokerConcurrency source contract", () => {
  it("runs both doctor runtime and local agent run through the CLI entrypoint", () => {
    const source = readSource();

    expect(source).toContain('["doctor", "runtime"]');
    expect(source).toContain('"agent",');
    expect(source).toContain('"run",');
    expect(source).toContain('"--local"');
  });

  it("uses a temporary NOLO_HOME and verifies broker artifacts", () => {
    const source = readSource();

    expect(source).toContain("mkdtemp(");
    expect(source).toContain('authority-store-broker.json');
    expect(source).toContain('authority-store-broker.health.json');
    expect(source).toContain('metadata.endpoint.startsWith("tcp://")');
  });

  it("starts a local mock provider instead of depending on external APIs", () => {
    const source = readSource();

    expect(source).toContain("Bun.serve({");
    expect(source).toContain('content: "mock ok"');
    expect(source).toContain("customProviderUrl: args.providerUrl");
  });

  it("seeds the local agent through the broker-backed CLI runtime DB helper", () => {
    const source = readSource();

    expect(source).toContain("getDefaultCliLocalRuntimeDb");
    expect(source).toContain('db.put("agent-smoke"');
    expect(source).toContain("await db.close()");
  });

  it("seeds the local agent before doctor runtime checks in a fresh NOLO_HOME", () => {
    const source = readSource();
    const mainSource = source.slice(source.indexOf("async function main()"));

    expect(mainSource.indexOf("await seedLocalAgent({")).toBeGreaterThanOrEqual(0);
    expect(mainSource.indexOf("await seedLocalAgent({")).toBeLessThan(
      mainSource.indexOf("await verifyDoctorConcurrency(")
    );
  });

  it("kills the real broker owner before attached put and batch clients continue", () => {
    const source = readSource();

    expect(source).toContain('"--broker-owner-child"');
    expect(source).toContain('"--attached-client-child"');
    expect(source).toContain('"put"');
    expect(source).toContain('"batch"');
    expect(source.indexOf("await writeFile(ownerExit")).toBeLessThan(
      source.indexOf("await writeFile(clientsGo")
    );
    expect(source).toContain("ownerExitRecovery: true");
  });
});
