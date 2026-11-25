import { spawn, type ChildProcess } from "node:child_process";
import { dirname, isAbsolute, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { getHostRuntimeExecutable } from "./agentRunProtocol";
import { isCompiledBinary, resolveCliEntrypointPath } from "./cliEnvHelpers";
import { getLogger } from "./diagnostics";
import { loadCliAuthorityBrokerTls } from "./cliAuthorityBrokerTls";
import {
  getOrCreateCliAuthorityBrokerServer,
  type CliAuthorityBrokerServerOptions,
} from "../database-engine/cliAuthorityBrokerServer";
import { createLevelAuthorityStore } from "../database-engine/levelAuthorityStore";
import { createCliAuthorityBrokerSocketInvoker } from "../database-engine/cliAuthorityBrokerClient";

type BrokerProcessOptions = Pick<CliAuthorityBrokerServerOptions, "endpoint" | "dbPath" | "metadataPath" | "healthPath">;
// Set by the test preload, never inferred from a user's NOLO_HOME path.
const testOwnedBroker = () => process.env.NOLO_TEST_AUTHORITY_BROKER_LIFETIME === "1";

function stopOnParentExit(stop: () => void): void {
  // An unread pipe retains EOF even if the parent exits during startup.
  process.stdin.once("end", stop);
  process.stdin.once("error", stop);
  process.stdin.resume();
}

type StartupFailure = { message: string; code?: string; ownerPid?: number; cause?: StartupFailure };

function describeFailure(error: unknown, depth = 0): StartupFailure {
  if (!(error instanceof Error)) return { message: String(error) };
  const { message, code, ownerPid, cause } = error as Error & { code?: unknown; ownerPid?: unknown };
  return {
    message,
    ...(typeof code === "string" ? { code } : {}),
    ...(typeof ownerPid === "number" ? { ownerPid } : {}),
    ...(cause !== undefined && depth < 4 ? { cause: describeFailure(cause, depth + 1) } : {}),
  };
}

export async function startCliAuthorityBrokerProcess(options: BrokerProcessOptions): Promise<void> {
  const child = await launchBroker(options, true);
  child.unref();
}

async function launchBroker(options: BrokerProcessOptions, detached: boolean): Promise<ChildProcess> {
  const { endpoint, dbPath, metadataPath, healthPath } = options;
  if (!dbPath || !metadataPath || !healthPath) throw new Error("Missing authority broker paths");
  const entrypoint = isCompiledBinary() ? [] : [resolveCliEntrypointPath(import.meta.url)];
  const { PATH, HOME, USERPROFILE, LOCALAPPDATA, SystemRoot, TMPDIR, TEMP, TMP } = process.env;
  const testOwned = testOwnedBroker();
  const child = spawn(getHostRuntimeExecutable(), [
    ...entrypoint, detached ? "__authority-broker-supervise" : "__authority-broker",
    endpoint, resolve(dbPath), resolve(metadataPath), resolve(healthPath),
    ...(detached ? [] : [String(process.pid)]),
  ], {
    detached,
    windowsHide: true,
    // Only tests hold a lifetime pipe. Production deliberately outlives its launcher.
    stdio: [testOwned ? "pipe" : "ignore", "pipe", "ignore"],
    env: {
      PATH, HOME, USERPROFILE, LOCALAPPDATA, SystemRoot, TMPDIR, TEMP, TMP,
      NOLO_HOME: dirname(dirname(resolve(dbPath))),
      ...(testOwned ? { NOLO_TEST_AUTHORITY_BROKER_LIFETIME: "1" } : {}),
    },
  });
  // A crashed child can close its read end before a graceful shutdown request.
  child.stdin?.on("error", () => {});
  const output = child.stdout!;
  try {
    await new Promise<void>((resolve, reject) => {
      let response = "";
      const timer = setTimeout(() => reject(new Error(`Authority broker startup timed out at ${endpoint}`)), 30_000);
      const done = (error?: Error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      child.once("error", done);
      child.once("exit", (_code, signal) => {
        if (signal) done(new Error(`Authority broker exited during startup (${signal})`));
        // A normal exit can arrive before stdout has delivered a structured error.
      });
      output.once("error", done);
      output.once("end", () => done(new Error("Authority broker exited before reporting readiness")));
      output.setEncoding("utf8");
      output.on("data", (chunk: string) => {
        response += chunk;
        if (response.length > 64 * 1024) return done(new Error("Oversized authority broker startup response"));
        const newline = response.indexOf("\n");
        if (newline < 0) return;
        try {
          const result = JSON.parse(response.slice(0, newline)) as { ok: boolean; error?: StartupFailure };
          if (result.ok === true) done();
          else if (result.error) done(Object.assign(new Error(result.error.message), result.error));
          else done(new Error("Invalid authority broker startup response"));
        } catch {
          done(new Error("Invalid authority broker startup response"));
        }
      });
    });
    return child;
  } catch (error) {
    child.stdin?.end();
    child.unref();
    throw error;
  } finally {
    output.destroy();
  }
}

export async function superviseCliAuthorityBrokerProcess(args: string[]): Promise<void> {
  const [endpoint, dbPath, metadataPath, healthPath] = args;
  const options = { endpoint: endpoint ?? "", dbPath, metadataPath, healthPath };
  const logger = getLogger("cli.authorityBroker");
  const stop = new AbortController();
  const requestStop = () => stop.abort();
  process.once("SIGTERM", requestStop);
  process.once("SIGINT", requestStop);
  if (testOwnedBroker()) stopOnParentExit(requestStop);
  process.stdout.on("error", () => {});
  let ready = false;
  try {
    if (!metadataPath) throw new Error("Missing authority broker metadata path");
    const tls = await loadCliAuthorityBrokerTls(metadataPath);
    while (!stop.signal.aborted) {
      const child = await launchBroker(options, false);
      logger.info("Authority broker worker ready", { endpoint, workerPid: child.pid, supervisorPid: process.pid });
      if (!ready) {
        process.stdout.write('{"ok":true}\n');
        ready = true;
      }
      const workerExit = new AbortController();
      const exited = child.exitCode !== null || child.signalCode !== null
        ? Promise.resolve(workerExit.abort())
        : new Promise<void>((resolve) => child.once("exit", () => {
          workerExit.abort();
          resolve();
        }));
      const workerRunning = AbortSignal.any([workerExit.signal, stop.signal]);
      const invoke = createCliAuthorityBrokerSocketInvoker({ endpoint: options.endpoint, timeoutMs: 2_000, tls });
      let failures = 0;
      while (!workerRunning.aborted && failures < 3) {
        await delay(5_000, undefined, { signal: workerRunning }).catch(() => {});
        if (workerRunning.aborted) break;
        try {
          const health = await invoke({ type: "get", key: "cli-authority-broker-health" });
          failures = health.ok && health.result.type === "get" ? 0 : failures + 1;
        } catch (error) {
          failures += 1;
          logger.warn("Authority broker storage probe failed", error, { endpoint, workerPid: child.pid, failures });
        }
      }
      invoke.close?.();
      if (child.exitCode === null && child.signalCode === null) {
        if (!stop.signal.aborted) logger.warn("Restarting unresponsive authority broker worker", { endpoint, workerPid: child.pid });
        if (child.stdin) child.stdin.end();
        else child.kill("SIGTERM");
        const killed = await Promise.race([exited.then(() => true), delay(5_000, false, { ref: false })]);
        if (!killed) {
          child.kill("SIGKILL");
          await exited;
        }
      }
      // Only this supervisor's own worker is ever signalled. Wait for it to
      // exit before the next worker attempts to acquire database ownership.
      if (!stop.signal.aborted) await delay(1_000);
    }
  } catch (error) {
    process.exitCode = 1;
    const failure = JSON.stringify({ ok: false, error: describeFailure(error) });
    if (!ready) process.stdout.write(`${failure}\n`);
    logger.error("Authority broker supervisor stopped", error, { endpoint, ready });
  } finally {
    process.off("SIGTERM", requestStop);
    process.off("SIGINT", requestStop);
    if (testOwnedBroker()) process.stdin.destroy();
  }
}

/** Foreground worker. It can also run under an OS service supervisor. */
export async function runCliAuthorityBrokerProcess(args: string[]): Promise<void> {
  const [endpoint, dbPath, metadataPath, healthPath, supervisor] = args;
  process.stdout.on("error", () => {}); // The initiating client may have exited.
  try {
    if ((args.length !== 4 && args.length !== 5) || ![dbPath, metadataPath, healthPath].every(isAbsolute)) {
      throw new Error("Expected authority broker endpoint and absolute database, metadata and health paths");
    }
    if (!/^tcp:\/\/127\.0\.0\.1:[0-9]+$/.test(endpoint!)) {
      throw new Error("Authority broker must listen on IPv4 loopback");
    }
    const broker = await getOrCreateCliAuthorityBrokerServer({
      endpoint: endpoint!, dbPath: dbPath!, metadataPath, healthPath, keepProcessAlive: true,
      tls: await loadCliAuthorityBrokerTls(metadataPath!),
      ...(supervisor === String(process.ppid) ? { supervisorPid: process.ppid } : {}),
      createStore: () => createLevelAuthorityStore(dbPath!),
    });
    const close = () => {
      if (testOwnedBroker()) process.stdin.destroy();
      void broker.close().catch((error) => {
        getLogger("cli.authorityBroker").error("Authority broker worker shutdown failed", error);
        process.exit(1);
      });
    };
    process.once("SIGTERM", close);
    process.once("SIGINT", close);
    if (testOwnedBroker()) stopOnParentExit(close);
    process.stdout.write('{"ok":true}\n');
  } catch (error) {
    process.exitCode = 1;
    process.stdout.write(`${JSON.stringify({ ok: false, error: describeFailure(error) })}\n`);
  }
}
