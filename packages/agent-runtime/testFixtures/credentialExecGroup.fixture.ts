// Isolated by the test's Linux subreaper; no credential store or provider access.
import { connect } from "node:net";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { strict as assert } from "node:assert";
import { startCredentialExecBroker, probeCredentialExecGroup } from "../credentialExecBroker";

const mode = process.argv[2];
const failing = mode?.startsWith("fail-") ?? false;
const realKill = process.kill;
const root = await mkdtemp(join(tmpdir(), "nolo-broker-group-"));
const parentFile = join(root, "parent");
const childFile = join(root, "child");
const releaseFile = join(root, "release");
const socketPath = join(root, "broker.sock");
const broker = await startCredentialExecBroker({ socketPath, token: "fixture", resolve: async () => ({}) });
const childCode = `
  const { writeFileSync } = require("node:fs");
  setInterval(() => {}, 1000);
  writeFileSync(${JSON.stringify(childFile)}, String(process.pid));
`;
const parentCode = `
  const { spawn } = require("node:child_process");
  const { writeFileSync, existsSync } = require("node:fs");
  const timer = setInterval(() => {
    if ((${JSON.stringify(mode)} === "parent-gone" || ${JSON.stringify(mode)} === "parent-closed") && existsSync(${JSON.stringify(releaseFile)})) process.exit(0);
  }, 5);
  spawn(process.execPath, ["-e", ${JSON.stringify(childCode)}], { stdio: ${JSON.stringify(mode === "parent-gone" ? "inherit" : "ignore")} });
  writeFileSync(${JSON.stringify(parentFile)}, String(process.pid));
`;
const socket = connect(socketPath);
socket.on("error", () => {});
await new Promise<void>((resolve) => socket.once("connect", resolve));
socket.write(JSON.stringify({ kind: "exec", ref: "fixture", token: "fixture", argv: [process.execPath, "-e", parentCode] }) + "\n");
socket.resume();
const identity = async (pid: number) => {
  const raw = await readFile(`/proc/${pid}/stat`, "utf8");
  const fields = raw.slice(raw.lastIndexOf(")") + 2).trim().split(/\s+/);
  return { pid, state: fields[0], ppid: Number(fields[1]), pgid: Number(fields[2]), start: fields[19] };
};
let pgid = 0;
let child = 0;
try {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    pgid = Number(await readFile(parentFile, "utf8").catch(() => "0"));
    child = Number(await readFile(childFile, "utf8").catch(() => "0"));
    if (pgid && child) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert(pgid > 0 && child > 0, "both members ready");
  const before = [await identity(pgid), await identity(child)];
  assert(before.every((entry) => entry.pgid === pgid && entry.start), "owned same group identities");
  assert(before.every((entry) => ["R", "S", "D"].includes(entry.state!)), "both executable before shutdown");
  console.log("OWNED_READY", JSON.stringify(before));
  if (mode === "parent-gone" || mode === "parent-closed") {
    await writeFile(releaseFile, "release");
    // Release only after both identities have been observed, never after a time delay.
    const deadline = Date.now() + 3000;
    let observed = false;
    while (Date.now() < deadline) {
      try { await identity(pgid); } catch { observed = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    assert(observed, "direct parent gone");
    if (mode === "parent-closed") {
      // No inherited pipes: close has fired and must not abandon the group.
      const deadline = Date.now() + 1500;
      while (Date.now() < deadline && probeCredentialExecGroup(pgid) === "alive") {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      assert.equal(probeCredentialExecGroup(pgid), "gone", "leader close must reap remaining group");
      console.log("PARENT_CLOSE_GROUP_REAPED", pgid);
    } else {
      // This window intentionally depends on inherited stdout/stderr holding the
      // direct child's close event open; it is not a broker timing guarantee.
      // parent-closed separately covers descendants without inherited pipes.
      const survivor = await identity(child);
      assert(["R", "S", "D"].includes(survivor.state!), "descendant executable after direct parent gone");
      assert.equal(survivor.start, before[1]!.start);
      assert.equal(survivor.pgid, pgid);
      console.log("PARENT_GONE_BOUNDARY", JSON.stringify(survivor));
    }
  }
  if (failing) {
    // Isolated fixture-local seam: only observe this task's verified group.
    // Real SIGKILL remains unchanged; no public broker injection capability.
    process.kill = ((pid: number, signal?: NodeJS.Signals | number) => {
      if (pid === -pgid && signal === 0) {
        if (mode === "fail-unknown") throw Object.assign(new Error("fixture probe denied"), { code: "EPERM" });
        return true;
      }
      return realKill(pid, signal);
    }) as typeof process.kill;
    await assert.rejects(broker.close(), (error: unknown) => {
      assert(error instanceof AggregateError);
      assert.equal(error.message, "process_group_reap_failed");
      assert(error.errors.length > 0);
      const expected = mode === "fail-unknown" ? "process_group_state_unknown" : "process_group_reap_timeout";
      assert(error.errors.some((entry) => entry instanceof Error && entry.message === expected));
      console.log("CLOSE_REJECTED_AGGREGATE", expected, error.errors.length);
      return true;
    });
  } else {
    await broker.close();
    assert.equal(probeCredentialExecGroup(pgid), "gone");
    assert.throws(() => process.kill(-pgid, 0), (error: unknown) => (error as NodeJS.ErrnoException).code === "ESRCH");
    console.log("CLOSE_CONFIRMED_ESRCH", pgid);
  }
} finally {
  process.kill = realKill;
  if (failing) await broker.close().catch((error: unknown) => {
    assert(error instanceof AggregateError && error.message === "process_group_reap_failed");
  });
  else await broker.close();
  socket.destroy();
  // Retain fixture files as evidence; no deletion or unrelated PID signalling.
}
