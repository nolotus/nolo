/**
 * Give every test process its own `~/.nolo`.
 *
 * Unit tests here drive real CLI code paths — the TUI workspace loop, the local
 * runtime, the authority-store broker, the run registry — and those paths
 * persist to the user's home by design. Without isolation a test run writes the
 * developer's own machine: it pinned the saved agent selection in
 * `config.json`, opened (and LOCKed) the real LevelDB under `data/leveldb`, and
 * rewrote the broker endpoint in `run/`. Every one of those is a real bug that
 * only shows up later, in the developer's next interactive session.
 *
 * Every nolo path resolver honours `NOLO_HOME`, so pointing it at a fresh temp
 * dir isolates all of them at once. A test that pins `NOLO_HOME` itself still
 * wins — this only fills in the default.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!process.env.NOLO_HOME?.trim()) {
  const testHome = mkdtempSync(join(tmpdir(), "nolo-test-home-"));
  process.env.NOLO_HOME = testHome;
  process.on("exit", () => {
    try {
      rmSync(testHome, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup; a leftover temp dir must never fail a test run.
    }
  });
}
