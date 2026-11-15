import { runDialogReadCommand } from "../dialogCommands";
import { runCliCommandWithSyncDrain } from "./cliExitSync";
import { exitCliAfterOutputDrain } from "./cliOutputDrain";
const mode = process.argv[2];
const content = "完整输出🌿".repeat(180_000);
const auth = `${Buffer.from(JSON.stringify({ userId: "output-test" })).toString("base64")}.sig`;
await runCliCommandWithSyncDrain(() => runDialogReadCommand([
  "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  ...(mode.startsWith("budget") ? ["--max-response-chars", mode === "budget65k" ? "65000" : "8000"] : []),
], {
  env: { AUTH_TOKEN: auth },
  readLocalDialog: async () => ({ meta: { title: "output regression", status: "done" }, msgs: mode === "budget65k"
    ? Array.from({ length: 40 }, () => ({ role: "assistant", content: "中".repeat(1800) }))
    : [{ role: "assistant", content }] }),
  fetchImpl: async () => { throw new Error("Unexpected HTTP"); },
}), { exit: exitCliAfterOutputDrain, output: process.stderr });
