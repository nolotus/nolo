import type { CommandEntry } from "./cliCommandTypes";
import { createEnvCommand } from "./cliCommandFactories";

export function getDialogInternalCommandEntries(): CommandEntry[] {
  return [
    createEnvCommand(["dialog", "search"], "Search dialog messages across dialogs", async (args, deps) => {
      const { runDialogSearchCommand } = await import("./dialogCommands");
      return runDialogSearchCommand(args, deps);
    }),
    createEnvCommand(["dialog", "list"], "List dialogs (default --limit 50; --all/--limit 0 full; --jsonl streams)", async (args, deps) => {
      const { runDialogListCommand } = await import("./dialogCommands");
      return runDialogListCommand(args, deps);
    }),
    createEnvCommand(["dialog", "delete"], "Delete one or more dialogs", async (args, deps) => {
      const { runDialogDeleteCommand } = await import("./dialogCommands");
      return runDialogDeleteCommand(args, deps);
    }),
    createEnvCommand(["dialog", "query"], "Query dialogs by subject refs (default --limit 50; --all full; --jsonl streams)", async (args, deps) => {
      const { runDialogQueryCommand } = await import("./dialogCommands");
      return runDialogQueryCommand(args, deps);
    }),
    createEnvCommand(["dialog", "read"], "Read a dialog", async (args, deps) => {
      const { runDialogReadCommand } = await import("./dialogCommands");
      return runDialogReadCommand(args, deps);
    }),
    createEnvCommand(["dialog", "notify"], "Deliver a notification into a live CLI dialog's existing queue (--message/--file, --idempotency-key; --status for the receipt)", async (args, deps) => {
      const { runDialogNotifyCommand } = await import("./dialogNotifyCommand");
      return runDialogNotifyCommand(args, deps);
    }),
    createEnvCommand(["dialog", "status"], "Read compact dialog status", async (args, deps) => {
      const { runDialogStatusCommand } = await import("./dialogCommands");
      return runDialogStatusCommand(args, deps);
    }),
    createEnvCommand(["dialog", "trace"], "Trace one dialog: messages, token usage and subagent runs (--json)", async (args, deps) => {
      const { runDialogTraceCommand } = await import("./dialogTraceCommand");
      return runDialogTraceCommand(args, deps);
    }),
  ];
}
