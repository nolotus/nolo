// Table mutations require the server runtime.
// Read-only queryTableRows is intentionally excluded: local CLI executes it via
// noloWorkspaceTools, so auto mode should not skip local just because it appears
// in the private workspace tool set.
const SERVER_PLATFORM_TOOL_NAMES = new Set([
  "addTableRow",
  "addTableRows",
  "deleteTableRow",
  "deleteTableRows",
  "updateTableRow",
  "updateTableRows",
]);

export function findServerPlatformTools(toolNames?: string[]) {
  if (!Array.isArray(toolNames)) return [];
  return toolNames.filter((toolName) =>
    SERVER_PLATFORM_TOOL_NAMES.has(toolName),
  );
}

export function resolveServerPlatformToolNames(agentConfig: any) {
  return findServerPlatformTools([
    ...(Array.isArray(agentConfig?.toolNames) ? agentConfig.toolNames : []),
    ...(Array.isArray(agentConfig?.runtimeToolPolicy?.agentTools)
      ? agentConfig.runtimeToolPolicy.agentTools
      : []),
  ]);
}
