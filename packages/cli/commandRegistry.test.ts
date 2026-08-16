import { describe, expect, mock, test } from "bun:test";

import {
  createCliRuntimeContext,
  renderHelpText,
  renderCommandGroupHelpText,
  resolveCommand,
  runResolvedCommand,
} from "./commandRegistry";

async function runCommandAndCaptureStdout(args: string[]) {
  const command = resolveCommand(args);
  const runScript = mock(async () => 0);
  const chunks: string[] = [];
  const ctx = createCliRuntimeContext({
    env: {} as NodeJS.ProcessEnv,
    scriptDir: "/tmp/scripts",
    entrypointPath: "/tmp/nolo",
    packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
  });
  const originalLog = console.log;
  console.log = (message?: unknown) => {
    chunks.push(String(message ?? ""));
  };
  try {
    const exitCode = await runResolvedCommand(command!, args, ctx, {
      runScript,
    });
    return { exitCode, output: chunks.join("\n"), runScript };
  } finally {
    console.log = originalLog;
  }
}

describe("cli command registry", () => {
  test("resolves nested commands", () => {
    const command = resolveCommand(["skill-doc", "delete", "--key", "page-1"]);
    expect(command?.kind).toBe("internal");
  });

  test("resolves skill create-doc alias", () => {
    const command = resolveCommand(["skill", "create-doc", "--title", "Demo"]);
    expect(command?.kind).toBe("internal");
  });

  test("keeps doc create commands on internal CLI implementations", () => {
    expect(resolveCommand(["doc", "create", "--title", "Demo"])?.kind).toBe("internal");
    expect(resolveCommand(["skill-doc", "create", "--title", "Demo", "--description", "x"])?.kind).toBe("internal");
    expect(resolveCommand(["skill", "create-doc", "--title", "Demo", "--description", "x"])?.kind).toBe("internal");
  });

  test("renders help with key groups", () => {
    const help = renderHelpText();
    expect(help).toContain("nolo — Agent-first terminal workspace");
    expect(help).toContain("  nolo");
    expect(help).toContain("nolo agent run frontend-implementer --msg");
    expect(help).toContain("agent create-custom");
    expect(help).toContain("doc create");
  });

  test("keeps agent read/update and chat on internal CLI implementations", () => {
    expect(resolveCommand(["agent", "list", "--json"])?.kind).toBe("internal");
    expect(resolveCommand(["agent", "read", "frontend-implementer"])?.kind).toBe("internal");
    expect(resolveCommand(["agent", "update", "frontend-implementer", "--model", "gpt-5.4"])?.kind).toBe("internal");
    expect(resolveCommand(["agent", "chat", "frontend-implementer", "--msg", "hi"])?.kind).toBe("internal");
    expect(resolveCommand(["run", "review this repository"])?.kind).toBe("internal");
    expect(resolveCommand(["chat", "--agent", "frontend-implementer", "--msg", "hi"])?.kind).toBe("internal");
  });
  test("resolves agent email provision on internal CLI", () => {
    expect(resolveCommand(["agent", "email", "provision", "--help"])?.kind).toBe(
      "internal"
    );
    expect(
      resolveCommand(["agent", "email", "create-and-provision", "--help"])?.path
    ).toEqual(["agent", "email", "create-and-provision"]);
  });

  test("resolves cloudflare auth on internal CLI", () => {
    expect(resolveCommand(["auth", "cloudflare", "--help"])?.kind).toBe("internal");
    expect(resolveCommand(["auth", "cloudflare"])?.path).toEqual(["auth", "cloudflare"]);
  });

  test("keeps dialog commands on internal CLI implementations", () => {
    expect(resolveCommand(["dialog", "list", "--json"])?.kind).toBe("internal");
    expect(resolveCommand(["dialog", "delete", "01ARZ3NDEKTSV4RRFFQ69G5FAV"])?.kind).toBe("internal");
    expect(resolveCommand(["dialog", "read", "01ARZ3NDEKTSV4RRFFQ69G5FAV"])?.kind).toBe("internal");
    expect(resolveCommand(["dialog", "query", "--subject-kind", "table-row", "--subject-id", "row-1"])?.kind).toBe("internal");
    expect(resolveCommand(["dialog", "status", "01ARZ3NDEKTSV4RRFFQ69G5FAV"])?.kind).toBe("internal");
  });

  test("resolves skill-documented CLI routes", () => {
    const routes = [
      ["dialog", "list", "--json"],
      ["dialog", "delete", "dialog-user-id"],
      ["dialog", "read", "dialog-user-id"],
      ["dialog", "query", "--subject-kind", "table-row", "--subject-id", "row-1"],
      ["dialog", "status", "dialog-user-id"],
      ["space", "list", "--json"],
      ["space", "create", "--name", "Client Space"],
      ["space", "invite", "--space", "space-id", "--member", "user-id"],
      ["space", "accept-invite", "--invite", "invite-token"],
      ["space", "read", "space-id"],
      ["agent", "list", "--json"],
      ["agent", "update", "--id", "agent-id"],
      ["agent", "unpublish", "--id", "agent-id"],
      ["agent", "delete", "--id", "agent-id"],
      ["agent", "doctor"],
      ["agent", "create-custom"],
      ["agent", "create-space"],
      ["agent", "setup-demo"],
      ["doc", "create", "--title", "Test"],
      ["skill-doc", "create", "--title", "Test"],
      ["skill-doc", "read", "page-id"],
      ["skill-doc", "update", "--key", "page-id"],
      ["table", "list"],
      ["table", "query", "--table", "meta-user-table"],
      ["table", "add-row", "--table", "meta-user-table"],
      ["table", "add-column", "--table", "meta-user-table"],
      ["table", "update-row", "--table", "meta-user-table"],
      ["table", "update-rows", "--table", "meta-user-table"],
      ["table", "delete-row", "--table", "meta-user-table"],
      ["table", "purge-rows", "--table", "meta-user-table"],
      ["table", "remove-row-fields", "--table", "meta-user-table"],
    ];

    for (const route of routes) {
      expect(resolveCommand(route)?.path).toEqual(route.slice(0, resolveCommand(route)?.path.length));
    }
  });

  test("registers table row commands as internal handlers", () => {
    const routes = [
      ["table", "add-row"],
      ["table", "add-rows"],
      ["table", "add-column"],
      ["table", "update-row"],
      ["table", "update-rows"],
      ["table", "delete-row"],
      ["table", "purge-rows"],
      ["table", "remove-row-fields"],
    ];
    for (const route of routes) {
      const command = resolveCommand([...route, "--table", "meta-user-table"]);
      expect(command?.kind).toBe("internal");
      expect(command?.handler).toBeDefined();
    }

    const deleteRows = resolveCommand(["table", "delete-rows", "--table", "meta-user-table"]);
    expect(deleteRows?.kind).toBe("internal");
    expect(deleteRows?.handler).toBeDefined();
  });

  test("routes top-level table help to a table command summary", async () => {
    const command = resolveCommand(["table", "--help"]);
    const runScript = mock(async () => 0);
    const chunks: string[] = [];
    const ctx = createCliRuntimeContext({
      env: {} as NodeJS.ProcessEnv,
      scriptDir: "/tmp/scripts",
      entrypointPath: "/tmp/nolo",
      packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
    });
    const originalLog = console.log;
    console.log = (message?: unknown) => {
      chunks.push(String(message ?? ""));
    };
    try {
      const exitCode = await runResolvedCommand(command!, ["table", "--help"], ctx, {
        runScript,
      });

      expect(exitCode).toBe(0);
      expect(runScript).not.toHaveBeenCalled();
      expect(chunks.join("\n")).toContain("nolo table query");
      expect(chunks.join("\n")).toContain("nolo table update-rows --table <tableId|metaKey> --updates <json-array>");
      expect(chunks.join("\n")).toContain("nolo table delete-rows --table <tableId|metaKey> (--row-ids <json-array> | --row-dbkeys <json-array> | --filters <json-object>)");
      expect(chunks.join("\n")).toContain("nolo table purge-rows --table <exact-meta-dbKey>");
      expect(chunks.join("\n")).toContain("nolo table remove-row-fields --table <exact-meta-dbKey>");
      expect(chunks.join("\n")).toContain("--row-dbkeys <json-array>");
      expect(chunks.join("\n")).toContain("nolo table meta");
    } finally {
      console.log = originalLog;
    }
  });

  test("keeps unknown table subcommands as command errors", async () => {
    const command = resolveCommand(["table", "definitely-not-a-command"]);
    const runScript = mock(async () => 0);
    const chunks: string[] = [];
    const ctx = createCliRuntimeContext({
      env: {} as NodeJS.ProcessEnv,
      scriptDir: "/tmp/scripts",
      entrypointPath: "/tmp/nolo",
      packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
    });
    const originalError = console.error;
    console.error = (message?: unknown) => {
      chunks.push(String(message ?? ""));
    };
    try {
      const exitCode = await runResolvedCommand(command!, ["table", "definitely-not-a-command"], ctx, {
        runScript,
      });

      expect(exitCode).toBe(1);
      expect(runScript).not.toHaveBeenCalled();
      expect(chunks.join("\n")).toContain("Unknown command: table definitely-not-a-command");
    } finally {
      console.error = originalError;
    }
  });

  test("dispatches script commands with fixed args through the shared router", async () => {
    const command = resolveCommand(["table", "meta", "--table", "meta-user-table"]);
    const runScript = mock(async () => 0);
    const ctx = createCliRuntimeContext({
      env: { NOLO_SERVER: "https://us.nolo.chat" } as NodeJS.ProcessEnv,
      scriptDir: "/tmp/scripts",
      entrypointPath: "/tmp/nolo",
      packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
    });

    const exitCode = await runResolvedCommand(command!, ["table", "meta", "--table", "meta-user-table"], ctx, {
      runScript,
    });

    expect(exitCode).toBe(0);
    expect(runScript).toHaveBeenCalledWith(
      "upsertTableMeta.ts",
      ["--table", "meta-user-table"],
      ctx.env
    );
  });

  test("dispatches internal commands through registered handlers without script bridging", async () => {
    const command = resolveCommand(["--help"]);
    const runScript = mock(async () => 0);
    const ctx = createCliRuntimeContext({
      env: {} as NodeJS.ProcessEnv,
      scriptDir: "/tmp/scripts",
      entrypointPath: "/tmp/nolo",
      packageInfo: { name: "nolo-cli", version: "0.0.0" } as any,
    });

    const exitCode = await runResolvedCommand(command!, ["--help"], ctx, {
      runScript,
    });

    expect(exitCode).toBe(0);
    expect(runScript).not.toHaveBeenCalled();
  });

  test("renders command group help from registered commands", () => {
    const agentHelp = renderCommandGroupHelpText("agent");
    expect(agentHelp).toContain("nolo agent commands");
    expect(agentHelp).toContain("nolo agent list");
    expect(agentHelp).toContain("nolo agent run");
    expect(agentHelp).toContain("nolo agent create-custom");
    expect(agentHelp).toContain("nolo agent delete");
    expect(agentHelp).toContain("nolo agent grant");
    expect(agentHelp).toContain("nolo agent grants");
    expect(agentHelp).toContain("nolo agent revoke-grant");

    const machineHelp = renderCommandGroupHelpText("machine");
    expect(machineHelp).toContain("nolo machine commands");
    expect(machineHelp).toContain("nolo machine status");
  });

  test("routes group --help and bare groups to command group help", async () => {
    for (const args of [
      ["agent"],
      ["agent", "--help"],
      ["agent", "-h"],
      ["machine"],
      ["machine", "--help"],
      ["machine", "-h"],
    ]) {
      const result = await runCommandAndCaptureStdout(args);
      expect(result.exitCode).toBe(0);
      expect(result.runScript).not.toHaveBeenCalled();
      expect(result.output).toContain(`nolo ${args[0]} commands`);
    }
  });

  test("keeps unknown group subcommands unresolved for the top-level unknown-command path", () => {
    expect(resolveCommand(["agent", "definitely-not-a-command"])).toBeUndefined();
    expect(resolveCommand(["machine", "definitely-not-a-command"])).toBeUndefined();
  });
});
