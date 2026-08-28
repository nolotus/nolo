import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileCredentialBroker } from "./fileCredentialBroker";
import {
  applyAgentSecretMigrationUpdates,
  buildAgentApiKeyCredentialRef,
  migrateAgentSecrets,
} from "./migrateAgentSecrets";

const tempHomes: string[] = [];

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), "nolo-migrate-secret-"));
  tempHomes.push(home);
  return home;
}

afterEach(() => {
  while (tempHomes.length > 0) {
    const home = tempHomes.pop();
    if (home) rmSync(home, { recursive: true, force: true });
  }
});

describe("migrateAgentSecrets", () => {
  test("two-phase happy path: put then strip apiKey", async () => {
    const broker = createFileCredentialBroker({ homeDir: makeHome() });
    const agent = {
      key: "agent-local-1",
      apiKey: "sk-raw-on-record",
    };

    const result = await migrateAgentSecrets({ agent, broker });
    expect(result.status).toBe("migrated");
    expect(result.phase).toBe("strip");
    expect(result.credentialRef).toBe(buildAgentApiKeyCredentialRef("agent-local-1"));
    expect(result.updates).toMatchObject({
      apiKey: null,
      credentialRef: "api-key:agent-local-1",
      apiKeyRef: "api-key:agent-local-1",
      credentialMigration: "done",
    });

    expect(await broker.get("api-key:agent-local-1")).toBe("sk-raw-on-record");

    const record: {
      id: string;
      apiKey?: string;
      name: string;
      credentialRef?: string;
      credentialMigration?: string;
    } = { id: "agent-local-1", apiKey: "sk-raw-on-record", name: "Demo" };
    const next = applyAgentSecretMigrationUpdates(record, result.updates);
    expect(next.apiKey).toBeUndefined();
    expect(next.credentialRef).toBe("api-key:agent-local-1");
    expect(next.credentialMigration).toBe("done");
    expect(next.name).toBe("Demo");
  });

  test("is crash-resumable when pending with raw key still present", async () => {
    const broker = createFileCredentialBroker({ homeDir: makeHome() });
    // Simulate crash after put but before strip: raw still on record + pending.
    await broker.put("api-key:agent-crash", "sk-already-put");

    const result = await migrateAgentSecrets({
      agent: {
        key: "agent-crash",
        apiKey: "sk-already-put",
        credentialRef: "api-key:agent-crash",
        credentialMigration: "pending",
      },
      broker,
    });

    expect(result.status).toBe("resumed-pending");
    expect(result.updates.apiKey).toBeNull();
    expect(result.updates.credentialMigration).toBe("done");
    expect(await broker.get("api-key:agent-crash")).toBe("sk-already-put");
  });

  test("resumes pending when raw already stripped but broker has secret", async () => {
    const broker = createFileCredentialBroker({ homeDir: makeHome() });
    await broker.put("api-key:agent-mid", "sk-mid");

    const result = await migrateAgentSecrets({
      agent: {
        key: "agent-mid",
        credentialRef: "api-key:agent-mid",
        credentialMigration: "pending",
      },
      broker,
    });

    expect(result.status).toBe("resumed-pending");
    expect(result.phase).toBe("complete");
    expect(result.updates.credentialMigration).toBe("done");
    expect(result.updates.apiKey).toBeUndefined();
  });

  test("noop when already done without raw secret", async () => {
    const broker = createFileCredentialBroker({ homeDir: makeHome() });
    const result = await migrateAgentSecrets({
      agent: {
        key: "agent-done",
        credentialRef: "api-key:agent-done",
        credentialMigration: "done",
      },
      broker,
    });
    expect(result.status).toBe("already-done");
    expect(result.updates).toEqual({});
  });

  test("preserves existing OAuth apiKeyRef when migrating metered key", async () => {
    const broker = createFileCredentialBroker({ homeDir: makeHome() });
    // Unusual but ensures we do not overwrite chatgpt OAuth ref with api-key:…
    const result = await migrateAgentSecrets({
      agent: {
        key: "agent-oauth-and-key",
        apiKey: "sk-extra",
        apiKeyRef: "chatgpt",
      },
      broker,
    });
    expect(result.updates.apiKeyRef).toBeUndefined();
    expect(result.updates.credentialRef).toBe("api-key:agent-oauth-and-key");
    expect(await broker.get("api-key:agent-oauth-and-key")).toBe("sk-extra");
  });
});
