import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("settings machines route source", () => {
  test("registers machines settings page and nav item for web and desktop", () => {
    const config = readFileSync(join(root, "packages/app/settings/config.ts"), "utf8");
    const routes = readFileSync(join(root, "packages/app/settings/routes.tsx"), "utf8");
    const nav = readFileSync(join(root, "packages/app/settings/navItems.ts"), "utf8");

    expect(config).toContain('SETTING_MACHINES: "machines"');
    expect(routes).toContain('const DesktopMachines = lazy(() => import("./web/DesktopMachines"))');
    expect(routes).toContain("SettingRoutePaths.SETTING_MACHINES");
    expect(nav).toContain("settings.nav.machines");
    expect(nav).toContain("LuLaptop");
    expect(nav.indexOf("settings.nav.machines")).toBeLessThan(nav.indexOf("if (isDesktopApp)"));
  });

  test("requires login and keeps the connect command single-step", () => {
    const desktopMachines = readFileSync(join(root, "packages/app/settings/web/DesktopMachines.tsx"), "utf8");

    expect(desktopMachines).toContain('to="/login"');
    expect(desktopMachines).toContain("/api/machines/install.ps1");
    expect(desktopMachines).toContain("/api/machines/install.sh");
    expect(desktopMachines).toContain("installNoloCli");
    expect(desktopMachines).toContain("settings.machines.connectCommand.cliDesc");
    expect(desktopMachines).toContain('`${args.serverBase}/api/machines/install.ps1`.replace(/\'/g, "\'\'")');
    expect(desktopMachines).toContain('args.serverBase.replace(/\'/g, "\'\'")');
    expect(desktopMachines).toContain('args.apiKey.replace(/\'/g, "\'\'")');
    expect(desktopMachines).toContain('curl -fsSL "${args.serverBase}/api/machines/install.sh"');
    expect(desktopMachines).toContain('--server-url "${args.serverBase}" --machine-key "${args.apiKey}"');
    expect(desktopMachines).not.toContain("/api/machines/agents");
    expect(desktopMachines).not.toContain("raw.githubusercontent.com");
    expect(desktopMachines).not.toContain("settings.machines.createCommand");
    expect(desktopMachines).toContain("connectCommandError");
    expect(desktopMachines).toContain("settings.machines.commandEmpty");
    expect(desktopMachines).toContain("isDesktop && response.status === 401");
    expect(desktopMachines).toContain("if (isDesktop) {");
    expect(desktopMachines).not.toContain("if (!currentToken || machineApiKey || creatingToken) return;");
  });

  test("desktop settings can silently start the local connector from signed-in auth", () => {
    const desktopMachines = readFileSync(join(root, "packages/app/settings/web/DesktopMachines.tsx"), "utf8");
    const desktopRoutes = readFileSync(
      join(root, "packages/desktop-runtime/desktopRuntimeRoutes.ts"),
      "utf8",
    );
    const app = readFileSync(join(root, "packages/app/web/App.tsx"), "utf8");

    expect(desktopMachines).toContain("getIsDesktopApp");
    expect(desktopMachines).toContain("startDesktopLocalConnectorFromSession");
    expect(desktopMachines).toContain("desktopConnectorState");
    expect(desktopMachines).toContain("重试");
    expect(app).toContain("useDesktopLocalConnectorAutostart();");
    expect(desktopRoutes).toContain("/api/desktop/local-connector/start");
    expect(desktopRoutes).not.toContain("/api/desktop/agent-runtime/status");
    expect(desktopRoutes).toContain("/api/desktop/agent-runtime/turn");
    expect(desktopRoutes).not.toContain("/api/desktop/local-runtime/status");
  });

  test("external reader actions use the local desktop origin in desktop mode", () => {
    const desktopMachines = readFileSync(join(root, "packages/app/settings/web/DesktopMachines.tsx"), "utf8");

    expect(desktopMachines).toContain("const externalReaderServerBase = useMemo");
    expect(desktopMachines).toContain('if (isDesktop && typeof window !== "undefined")');
    expect(desktopMachines).toContain("return window.location.origin");
    expect(desktopMachines).toContain('serverBase={externalReaderServerBase}');
    expect(desktopMachines).toContain("installNoloCli({");
    expect(desktopMachines).toContain("serverBase,");
  });

  test("keeps agent creation out of the machine API layer", () => {
    const routes = readFileSync(join(root, "packages/server/routes.ts"), "utf8");
    const machineHandlers = readFileSync(join(root, "packages/server/handlers/machines/machineHandlers.ts"), "utf8");

    expect(routes).not.toContain("/api/machines/agents");
    expect(machineHandlers).not.toContain("handleMachineAgentCreate");
  });

  test("keeps the connected machine card product-facing", () => {
    const desktopMachines = readFileSync(join(root, "packages/app/settings/web/DesktopMachines.tsx"), "utf8");

    expect(desktopMachines).toContain("desktop-machine__agents");
    expect(desktopMachines).toContain("desktop-machine-agent--available");
    expect(desktopMachines).toContain("settings.machines.noCliHint");
    expect(desktopMachines).toContain('provider: "gemini"');
    expect(desktopMachines).toContain('key: "gemini-cli"');
    expect(desktopMachines).toContain('provider: "qoder"');
    expect(desktopMachines).toContain('key: "qoder-cli"');
    expect(desktopMachines).toContain("settings.machines.readyForTasks");
    expect(desktopMachines).toContain("/api/machines/${encodeURIComponent(machine.machineId)}");
    expect(desktopMachines).toContain("settings.machines.disconnect");
    expect(desktopMachines).not.toContain("ws:{machine.connectorStatus");
    expect(desktopMachines).not.toContain("<span>{machine.machineId}</span>");
  });
});
