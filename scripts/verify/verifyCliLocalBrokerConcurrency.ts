#!/usr/bin/env bun

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { getDefaultCliLocalRuntimeDb } from "../../packages/cli/localRuntimeAuthority";
import { probeCliAuthorityBrokerHealth } from "../../packages/cli/cliAuthorityBrokerHealth";

const REPO_ROOT = process.cwd();
const CLI_ENTRY = path.join(REPO_ROOT, "packages", "cli", "index.ts");
const SCRIPT_ENTRY = path.join(
  REPO_ROOT,
  "scripts",
  "verify",
  "verifyCliLocalBrokerConcurrency.ts"
);

type CliRunResult = {
  status: number;
  stdout: string;
  stderr: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function runCli(args: string[], env: Record<string, string>): Promise<CliRunResult> {
  const proc = Bun.spawn({
    cmd: [process.execPath, CLI_ENTRY, ...args],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
  });

  const [stdout, stderr, status] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { status, stdout, stderr };
}

function spawnVerifierChild(args: string[], env: Record<string, string>) {
  return Bun.spawn({
    cmd: [process.execPath, SCRIPT_ENTRY, ...args],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
  });
}

async function readChildResult(
  proc: ReturnType<typeof spawnVerifierChild>
): Promise<CliRunResult> {
  const [stdout, stderr, status] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { status, stdout, stderr };
}

async function waitForFile(filePath: string, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (!existsSync(filePath)) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`timed out waiting for ${filePath}`);
    }
    await Bun.sleep(20);
  }
}

async function runBrokerOwnerChild(args: string[]) {
  const [noloHome, readyPath, exitPath] = args;
  assert(noloHome && readyPath && exitPath, "broker owner child args missing");
  const db = await getDefaultCliLocalRuntimeDb({
    env: { NOLO_HOME: noloHome },
  });
  await db.put("owner-ready", { ok: true });
  await writeFile(readyPath, "ready\n");
  await waitForFile(exitPath);
  await db.close();
}

async function runAttachedClientChild(args: string[]) {
  const [operation, noloHome, readyPath, goPath] = args;
  assert(
    (operation === "put" || operation === "batch") &&
      noloHome &&
      readyPath &&
      goPath,
    "attached client child args missing"
  );
  const db = await getDefaultCliLocalRuntimeDb({
    env: { NOLO_HOME: noloHome },
  });
  assert(await db.get("owner-ready"), "attached client could not read owner seed");
  await writeFile(readyPath, "ready\n");
  await waitForFile(goPath);
  if (operation === "put") {
    await db.put("attached-put", { ok: true });
    assert(await db.get("attached-put"), "attached put was not persisted");
  } else {
    await db.batch([
      { type: "put", key: "attached-batch-a", value: { ok: true } },
      { type: "put", key: "attached-batch-b", value: { ok: true } },
    ]);
    assert(await db.get("attached-batch-b"), "attached batch was not persisted");
  }
  await db.close();
}

async function verifyOwnerExitRecovery(noloHome: string) {
  const markerDir = await mkdtemp(path.join(tmpdir(), "verify-cli-broker-owner-exit-"));
  const ownerReady = path.join(markerDir, "owner-ready");
  const ownerExit = path.join(markerDir, "owner-exit");
  const putReady = path.join(markerDir, "put-ready");
  const batchReady = path.join(markerDir, "batch-ready");
  const clientsGo = path.join(markerDir, "clients-go");
  const env = { NOLO_HOME: noloHome };

  try {
    const owner = spawnVerifierChild(
      ["--broker-owner-child", noloHome, ownerReady, ownerExit],
      env
    );
    await waitForFile(ownerReady);

    const putClient = spawnVerifierChild(
      ["--attached-client-child", "put", noloHome, putReady, clientsGo],
      env
    );
    const batchClient = spawnVerifierChild(
      ["--attached-client-child", "batch", noloHome, batchReady, clientsGo],
      env
    );
    await Promise.all([waitForFile(putReady), waitForFile(batchReady)]);

    await writeFile(ownerExit, "exit\n");
    const ownerResult = await readChildResult(owner);
    assert(
      ownerResult.status === 0,
      `broker owner child failed\n${ownerResult.stdout}\n${ownerResult.stderr}`
    );

    await writeFile(clientsGo, "go\n");
    const [putResult, batchResult] = await Promise.all([
      readChildResult(putClient),
      readChildResult(batchClient),
    ]);
    assert(
      putResult.status === 0,
      `attached put client failed\n${putResult.stdout}\n${putResult.stderr}`
    );
    assert(
      batchResult.status === 0,
      `attached batch client failed\n${batchResult.stdout}\n${batchResult.stderr}`
    );
  } finally {
    await rm(markerDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function seedLocalAgent(args: {
  noloHome: string;
  providerUrl: string;
}) {
  const db = await getDefaultCliLocalRuntimeDb({
    env: { NOLO_HOME: args.noloHome },
  });
  try {
    await db.put("agent-smoke", {
      dbKey: "agent-smoke",
      id: "smoke",
      name: "Smoke",
      prompt: "Reply briefly.",
      model: "smoke-model",
      provider: "custom-openai-compatible",
      apiSource: "custom",
      customProviderUrl: args.providerUrl,
    });
  } finally {
    await db.close();
  }
}

async function verifyDoctorConcurrency(noloHome: string) {
  const env = {
    NOLO_HOME: noloHome,
    NOLO_LOCAL_AGENT_KEY: "agent-smoke",
    OPENAI_API_KEY: "sk-smoke",
  };
  const [first, second] = await Promise.all([
    runCli(["doctor", "runtime"], env),
    runCli(["doctor", "runtime"], env),
  ]);

  assert(first.status === 0, `first doctor runtime failed\n${first.stdout}\n${first.stderr}`);
  assert(second.status === 0, `second doctor runtime failed\n${second.stdout}\n${second.stderr}`);
  assert(first.stdout.includes("Authority driver: broker"), "first doctor runtime did not report broker");
  assert(second.stdout.includes("Authority driver: broker"), "second doctor runtime did not report broker");
  assert(first.stdout.includes("LevelDB: ok"), "first doctor runtime did not report LevelDB ok");
  assert(second.stdout.includes("LevelDB: ok"), "second doctor runtime did not report LevelDB ok");
}

async function verifyLocalRunConcurrency(args: {
  noloHome: string;
  providerUrl: string;
}) {
  const env = {
    NOLO_HOME: args.noloHome,
  };
  const [first, second] = await Promise.all([
    runCli([
      "agent",
      "run",
      "--agent",
      "agent-smoke",
      "--msg",
      "hello",
      "--local",
      "--no-stream",
    ], env),
    runCli([
      "agent",
      "run",
      "--agent",
      "agent-smoke",
      "--msg",
      "hello",
      "--local",
      "--no-stream",
    ], env),
  ]);

  assert(first.status === 0, `first local agent run failed\n${first.stdout}\n${first.stderr}`);
  assert(second.status === 0, `second local agent run failed\n${second.stdout}\n${second.stderr}`);
  assert(first.stdout.includes("mock ok"), `first local agent run missing mock reply\n${first.stdout}`);
  assert(second.stdout.includes("mock ok"), `second local agent run missing mock reply\n${second.stdout}`);
  assert(first.stdout.includes("[nolo] dialog "), "first local agent run missing dialog id");
  assert(second.stdout.includes("[nolo] dialog "), "second local agent run missing dialog id");
}

async function verifyBrokerArtifacts(noloHome: string) {
  const runDir = path.join(noloHome, "run");
  const metadataPath = path.join(runDir, "authority-store-broker.json");
  const healthPath = path.join(runDir, "authority-store-broker.health.json");

  assert(existsSync(metadataPath), `missing broker metadata: ${metadataPath}`);
  assert(existsSync(healthPath), `missing broker health: ${healthPath}`);

  const [metadataRaw, healthRaw] = await Promise.all([
    readFile(metadataPath, "utf8"),
    readFile(healthPath, "utf8"),
  ]);
  const metadata = JSON.parse(metadataRaw);
  const health = JSON.parse(healthRaw);

  assert(typeof metadata.endpoint === "string" && metadata.endpoint.startsWith("tcp://"), "broker metadata missing tcp endpoint");
  assert(health.ok === true, "broker health file did not report ok=true");
  const activeHealth = await probeCliAuthorityBrokerHealth({
    endpoint: metadata.endpoint,
    metadataPath,
    healthPath,
  });
  assert(
    activeHealth.ok,
    `broker active health failed: ${
      activeHealth.ok ? "" : activeHealth.error
    }`
  );
}

async function main() {
  const noloHome = await mkdtemp(path.join(tmpdir(), "verify-cli-local-broker-"));
  const ownerExitNoloHome = await mkdtemp(
    path.join(tmpdir(), "verify-cli-owner-exit-")
  );
  const port = 32000 + Math.floor(Math.random() * 1000);
  const providerUrl = `http://127.0.0.1:${port}/v1/chat/completions`;
  const server = Bun.serve({
    port,
    fetch() {
      return Response.json({
        choices: [{ message: { content: "mock ok" } }],
      });
    },
  });

  try {
    await verifyOwnerExitRecovery(ownerExitNoloHome);
    await seedLocalAgent({ noloHome, providerUrl });
    await verifyDoctorConcurrency(noloHome);
    await verifyLocalRunConcurrency({ noloHome, providerUrl });
    await verifyBrokerArtifacts(noloHome);
    console.log(JSON.stringify({
      ok: true,
      ownerExitRecovery: true,
      noloHome,
      providerUrl,
    }, null, 2));
  } finally {
    server.stop(true);
    await rm(noloHome, { recursive: true, force: true }).catch(() => undefined);
    await rm(ownerExitNoloHome, { recursive: true, force: true }).catch(
      () => undefined
    );
  }
}

if (import.meta.main) {
  const [mode, ...args] = process.argv.slice(2);
  const command =
    mode === "--broker-owner-child"
      ? runBrokerOwnerChild(args)
      : mode === "--attached-client-child"
        ? runAttachedClientChild(args)
        : main();
  command.catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
