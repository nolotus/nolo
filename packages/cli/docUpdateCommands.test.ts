import { afterEach, describe, expect, mock, test } from "bun:test";

import { runDocUpdateCommand, runSkillDocUpdateCommand } from "./docUpdateCommands";

const originalFetch = globalThis.fetch;

const USER_ID = "0e95801d90";
const PAGE_ID = "01KX89SZ3450YH5R4RG0KP0AES";
const DB_KEY = `page-${USER_ID}-${PAGE_ID}`;

function tokenForUser(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  return `header.${payload}.sig`;
}

const SKILL_CONFIG_BODY = [
  "# UI Design Guidelines",
  "",
  "Follow the tokens.",
  "",
  "<!-- skill-config",
  "version: '0.1'",
  "kind: skill",
  "name: ui-design-guidelines",
  "description: Frontend design tokens and layout rules.",
  "triggerMode: recommended",
  "toolNames:",
  "  - readDoc",
  "-->",
].join("\n");

/**
 * A page that was created through `nolo doc create`: the skill-config block lives
 * in the body (so `--skill <dbKey>` mounting works) but record.meta was never
 * promoted, so every meta-reading path treats it as a plain page.
 */
function plainPageRecord(content: string, meta?: Record<string, unknown>) {
  return {
    id: PAGE_ID,
    dbKey: DB_KEY,
    type: "page",
    title: "UI Design Guidelines",
    spaceId: null,
    content,
    createdAt: 1700000000000,
    ...(meta ? { meta } : {}),
  };
}

function mockServer(record: Record<string, unknown> | null) {
  const writes: Array<{ url: string; body: any }> = [];
  globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url);
    if (href.includes("/api/v1/db/read/")) {
      // Only the page key resolves to the fixture; other reads (e.g. the space
      // record during attachment) return an empty record.
      const body = href.includes(DB_KEY) ? (record ?? {}) : {};
      return new Response(JSON.stringify(body), {
        status: record ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    writes.push({ url: href, body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as any;
  return writes;
}

const baseArgs = ["--key", DB_KEY, "--server", "https://nolo.chat"];
const deps = { env: { AUTH_TOKEN: tokenForUser(USER_ID) } as NodeJS.ProcessEnv };

describe("doc update cli commands", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("promotes a plain page whose body already carries a skill-config block", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    const exitCode = await runSkillDocUpdateCommand(baseArgs, deps);

    expect(exitCode).toBe(0);
    expect(writes).toHaveLength(1);

    const record = writes[0]?.body.data;
    expect(writes[0]?.body.customKey).toBe(DB_KEY);
    // dbKey is preserved: other skills hard-code this reference.
    expect(record.dbKey).toBe(DB_KEY);
    expect(record.id).toBe(PAGE_ID);
    // The whole point: meta is now promoted, so skillReferenceSummary /
    // referenceRuntime stop skipping this page.
    expect(record.meta.kind).toBe("skill");
    expect(record.meta.skillConfig.name).toBe("ui-design-guidelines");
    expect(record.meta.skillConfig.description).toBe(
      "Frontend design tokens and layout rules."
    );
    expect(record.meta.skillConfig.triggerMode).toBe("recommended");
    expect(record.meta.skillConfig.toolNames).toEqual(["readDoc"]);
    // Body prose survives and the block is re-emitted in canonical form.
    expect(record.content).toContain("Follow the tokens.");
    expect(record.content).toContain("skill-config");
    // Exactly one block: the hand-written one was stripped before rebuilding.
    expect(record.content.match(/<!-- skill-config/g)).toHaveLength(1);
  });

  test("promotion keeps the existing title when --title is omitted", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    await runSkillDocUpdateCommand(baseArgs, deps);

    expect(writes[0]?.body.data.title).toBe("UI Design Guidelines");
  });

  test("an explicit --title renames both the page title and the skill name", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    await runSkillDocUpdateCommand([...baseArgs, "--title", "ui-guidelines-v2"], deps);

    expect(writes[0]?.body.data.title).toBe("ui-guidelines-v2");
    expect(writes[0]?.body.data.meta.skillConfig.name).toBe("ui-guidelines-v2");
  });

  test("--name renames the skill identity without touching the page title", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    await runSkillDocUpdateCommand([...baseArgs, "--name", "ui-guidelines"], deps);

    expect(writes[0]?.body.data.title).toBe("UI Design Guidelines");
    expect(writes[0]?.body.data.meta.skillConfig.name).toBe("ui-guidelines");
  });

  test("--name wins over --title so a doc can get a readable title safely", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    await runSkillDocUpdateCommand(
      [...baseArgs, "--title", "UI 设计与信息密度规范", "--name", "ui-design-guidelines"],
      deps
    );

    const record = writes[0]?.body.data;
    expect(record.title).toBe("UI 设计与信息密度规范");
    // The identity other docs reference stays put.
    expect(record.meta.skillConfig.name).toBe("ui-design-guidelines");
  });

  test("--name rejects an empty value instead of clearing the identity", async () => {
    mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    const error = await runSkillDocUpdateCommand([...baseArgs, "--name", "  "], deps).catch(
      (e) => e
    );
    expect(String(error)).toMatch(/--name cannot be empty/);
  });

  test("promotion can be previewed with --dry-run without writing", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    const exitCode = await runSkillDocUpdateCommand([...baseArgs, "--dry-run"], deps);

    expect(exitCode).toBe(0);
    expect(writes).toHaveLength(0);
  });

  test("refuses to promote a page with no skill-config block", async () => {
    mockServer(plainPageRecord("Just an ordinary page."));

    const error = await runSkillDocUpdateCommand(baseArgs, deps).catch((e) => e);
    expect(String(error)).toMatch(/no valid skill-config block/);
  });

  test("refuses to promote a page whose skill-config block is invalid", async () => {
    // `name` present but `description` missing -> normalizeSkillConfig returns undefined.
    const body = [
      "Body",
      "",
      "<!-- skill-config",
      "version: '0.1'",
      "kind: skill",
      "name: broken-skill",
      "-->",
    ].join("\n");
    mockServer(plainPageRecord(body));

    const error = await runSkillDocUpdateCommand(baseArgs, deps).catch((e) => e);
    expect(String(error)).toMatch(/no valid skill-config block/);
  });

  test("doc update still edits a plain page and leaves meta alone", async () => {
    const writes = mockServer(plainPageRecord("Old body."));

    const exitCode = await runDocUpdateCommand([...baseArgs, "--body", "New body."], deps);

    expect(exitCode).toBe(0);
    expect(writes[0]?.body.data.title).toBe("UI Design Guidelines");
    expect(writes[0]?.body.data.content).toBe("New body.");
    expect(writes[0]?.body.data.meta).toBeUndefined();
  });

  test("promotion preserves eval-config and workflow-config blocks", async () => {
    const body = [
      SKILL_CONFIG_BODY,
      "",
      "<!-- eval-config",
      "version: '0.1'",
      "cases:",
      "  - input: Make the button primary",
      "    expectedSignals:",
      "      - token",
      "-->",
    ].join("\n");
    const writes = mockServer(plainPageRecord(body));

    await runSkillDocUpdateCommand(baseArgs, deps);

    const record = writes[0]?.body.data;
    // The block is stripped from the body before rebuilding, so it only survives
    // if it is explicitly handed back to buildSkillPageRecord.
    expect(record.content).toContain("eval-config");
    expect(record.meta.evalConfig.cases[0].input).toBe("Make the button primary");
  });

  test("promoting a page in a space stamps the space entry with a skill summary", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    await runSkillDocUpdateCommand([...baseArgs, "--space", "space-1"], deps);

    // Without a skillSummary on the space entry the skill stays undiscoverable
    // from the space, which would make the promotion only half-complete.
    const spaceWrite = writes.find((w) => w.body.data?.contents);
    expect(spaceWrite).toBeDefined();
    const entry = spaceWrite!.body.data.contents[DB_KEY];
    expect(entry.title).toBe("UI Design Guidelines");
    expect(entry.skillSummary).toBeTruthy();
  });

  test("multi-target sync writes the promoted record to every target", async () => {
    const writes = mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    await runSkillDocUpdateCommand(
      ["--key", DB_KEY, "--sync", "https://a.example,https://b.example"],
      deps
    );

    const hosts = writes.map((w) => new URL(w.url).host).sort();
    expect(hosts).toEqual(["a.example", "b.example"]);
    for (const write of writes) {
      expect(write.body.data.meta.kind).toBe("skill");
    }
  });

  test("doc update refuses a page whose body declares a skill", async () => {
    // Without this guard `--body` would overwrite the skill-config block and
    // silently demote a mountable skill back to a plain page.
    mockServer(plainPageRecord(SKILL_CONFIG_BODY));

    const error = await runDocUpdateCommand(
      [...baseArgs, "--body", "clobbered"],
      deps
    ).catch((e) => e);
    expect(String(error)).toMatch(/Target page is a skill doc/);
  });

  test("doc update still refuses a page already promoted in meta", async () => {
    mockServer(
      plainPageRecord(SKILL_CONFIG_BODY, {
        kind: "skill",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          name: "ui-design-guidelines",
          description: "Frontend design tokens and layout rules.",
        },
      })
    );

    const error = await runDocUpdateCommand([...baseArgs, "--body", "x"], deps).catch(
      (e) => e
    );
    expect(String(error)).toMatch(/Target page is a skill doc/);
  });

  test("skill-doc update is idempotent once the page is promoted", async () => {
    const writes = mockServer(
      plainPageRecord(SKILL_CONFIG_BODY, {
        kind: "skill",
        skillConfig: {
          version: "0.1",
          kind: "skill",
          name: "ui-design-guidelines",
          description: "Frontend design tokens and layout rules.",
        },
      })
    );

    const exitCode = await runSkillDocUpdateCommand(baseArgs, deps);

    expect(exitCode).toBe(0);
    expect(writes[0]?.body.data.meta.kind).toBe("skill");
    expect(writes[0]?.body.data.content.match(/<!-- skill-config/g)).toHaveLength(1);
  });
});
