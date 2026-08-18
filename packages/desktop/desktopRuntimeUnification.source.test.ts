import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));

const DESKTOP_ENTRY_SOURCE = readFileSync(
  join(THIS_DIR, "src/bun/index.ts"),
  "utf8"
);
const SERVER_TURN_SERVICE_SOURCE = readFileSync(
  join(THIS_DIR, "../server/handlers/desktopAgentRuntimeTurnService.ts"),
  "utf8"
);
const STREAM_AGENT_SOURCE = readFileSync(
  join(THIS_DIR, "../ai/agent/streamAgentChatTurn.ts"),
  "utf8"
);
const MESSAGE_SLICE_SOURCE = readFileSync(
  join(THIS_DIR, "../chat/messages/messageSlice.ts"),
  "utf8"
);

describe("desktop runtime message lifecycle contract", () => {
  it("messageStreamEnd is the canonical completion action across all runtimes", () => {
    // messageStreamEnd must be defined in the message slice
    expect(MESSAGE_SLICE_SOURCE).toContain("messageStreamEnd");
    // It must be an async thunk (not a plain reducer)
    expect(MESSAGE_SLICE_SOURCE).toContain("messageStreamEnd: create.asyncThunk");
  });

  it("messageStreamEnd sets isStreaming to false", () => {
    // The fulfilled handler must set isStreaming: false
    expect(MESSAGE_SLICE_SOURCE).toContain("isStreaming: false");
  });

  it("desktop local runtime dispatches messageStreamEnd after completion", () => {
    // The streamAgentChatTurn handler must dispatch messageStreamEnd for desktop builtin agents
    expect(STREAM_AGENT_SOURCE).toContain("messageStreamEnd");
    // It must be dispatched with the correct payload shape
    expect(STREAM_AGENT_SOURCE).toContain("finalContentBuffer");
    expect(STREAM_AGENT_SOURCE).toContain("totalUsage");
  });

  it("desktop entry does not directly dispatch message lifecycle actions", () => {
    // The desktop entry should not contain Redux dispatch calls
    // (those belong in the web UI layer)
    expect(DESKTOP_ENTRY_SOURCE).not.toContain("dispatch(messageStreaming");
    expect(DESKTOP_ENTRY_SOURCE).not.toContain("dispatch(messageStreamEnd");
  });

  it("server turn service does not directly dispatch message lifecycle actions", () => {
    // The server turn service should not contain Redux dispatch calls
    // (those belong in the web UI layer via streamAgentChatTurn)
    expect(SERVER_TURN_SERVICE_SOURCE).not.toContain("dispatch(messageStreaming");
    expect(SERVER_TURN_SERVICE_SOURCE).not.toContain("dispatch(messageStreamEnd");
  });
});

describe("desktop runtime tool surface contract", () => {
  it("desktop runtime exposes local workspace tools", () => {
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("createLocalWorkspaceToolExecutors");
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("buildLocalWorkspaceToolset");
  });

  it("desktop runtime exposes nolo workspace CLI tools", () => {
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("buildNoloWorkspaceCliToolExecutors");
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("buildNoloWorkspaceOpenAiTools");
  });

  it("desktop runtime uses the shared entrypoint for CLI tool executors", () => {
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("resolveDesktopRuntimeEntrypoint");
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("cliEntrypoint");
  });

  it("desktop runtime tool executors are bounded by policy", () => {
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("executeLocalToolWithPolicy");
    expect(SERVER_TURN_SERVICE_SOURCE).toContain("resolveCurrentRunRuntimeToolPolicy");
  });
});

describe("desktop runtime platform consistency contract", () => {
  it("desktop runtime paths are cross-platform", () => {
    const runtimePathsSource = readFileSync(
      join(THIS_DIR, "src/bun/runtimePaths.ts"),
      "utf8"
    );
    // Must handle all three platforms
    expect(runtimePathsSource).toContain("win32");
    expect(runtimePathsSource).toContain("darwin");
    // Must use platform-specific path APIs
    expect(runtimePathsSource).toContain("win32");
    expect(runtimePathsSource).toContain("posix");
  });

  it("desktop entry handles Win32 DPI awareness", () => {
    expect(DESKTOP_ENTRY_SOURCE).toContain("SetProcessDpiAwareness");
    expect(DESKTOP_ENTRY_SOURCE).toContain('process.platform === "win32"');
  });

  it("desktop entry uses child process for Win32 production server", () => {
    // Win32 production spawns server as child process
    expect(DESKTOP_ENTRY_SOURCE).toContain("NOLO_DESKTOP_SERVER_CHILD");
    expect(DESKTOP_ENTRY_SOURCE).toContain("serverChild = spawn(");
  });

  it("desktop connector resolves server URL cross-platform", () => {
    const connectorSource = readFileSync(
      join(THIS_DIR, "src/bun/localConnector.ts"),
      "utf8"
    );
    expect(connectorSource).toContain("resolveDesktopConnectorServerUrl");
    // Must handle different environments
    expect(connectorSource).toContain("NOLO_SERVER");
    expect(connectorSource).toContain("nolo.chat");
  });
});
