import { callToolApi, getToolRequestContext } from "./toolApiClient";
import { getSessionSnapshotForState } from "identity/sessionSource";
import {
  PLUGIN_MANAGEMENT_SCHEMAS,
  managementFailure,
  parsePluginManagementInput,
  type PluginManagementToolName,
  type PluginManagementResult,
} from "../../agent-runtime/pluginManagementSpecs";

export const listPluginsFunctionSchema = PLUGIN_MANAGEMENT_SCHEMAS.listPlugins;
export const setPluginEnabledFunctionSchema = PLUGIN_MANAGEMENT_SCHEMAS.setPluginEnabled;
export const configurePluginFunctionSchema = PLUGIN_MANAGEMENT_SCHEMAS.configurePlugin;
export const diagnosePluginFunctionSchema = PLUGIN_MANAGEMENT_SCHEMAS.diagnosePlugin;

/** The aggregation owner supplies an authenticated service closure. No model-provided identity, token or service URL. */
export type PluginManagementToolContext = {
  pluginManagement?: { execute(tool: PluginManagementToolName, input: unknown): Promise<PluginManagementResult> };
};

export function createPluginManagementToolExecutors(context: PluginManagementToolContext) {
  const execute = (tool: PluginManagementToolName) => async (input: unknown) => {
    const parsed = parsePluginManagementInput(tool, input);
    let result: PluginManagementResult = parsed;
    if (parsed.ok) {
      try {
        result = context.pluginManagement
          ? await context.pluginManagement.execute(tool, parsed.value)
          : managementFailure("unavailable");
      } catch {
        result = managementFailure("unavailable");
      }
    }
    return { rawData: result, displayData: JSON.stringify(result) };
  };
  return {
    listPlugins: execute("listPlugins"),
    setPluginEnabled: execute("setPluginEnabled"),
    configurePlugin: execute("configurePlugin"),
    diagnosePlugin: execute("diagnosePlugin"),
  };
}

/** Default browser path uses the shared authenticated tool API, with session-bound response delivery. */
export async function executePluginManagementWebTool(tool: PluginManagementToolName, input: unknown, thunkApi: any) {
  const parsed = parsePluginManagementInput(tool, input);
  const result = (value: PluginManagementResult) => ({ rawData: value, displayData: JSON.stringify(value) });
  if (!parsed.ok) return result(parsed);

  let capturedState: unknown;
  let before: ReturnType<typeof getSessionSnapshotForState>;
  let request: ReturnType<typeof getToolRequestContext>;
  try {
    // Pin headers/target to the captured owning session; never rebind an in-flight call to a new login.
    capturedState = thunkApi.getState();
    before = getSessionSnapshotForState(capturedState);
    request = getToolRequestContext(thunkApi);
  } catch {
    return result(managementFailure("unavailable"));
  }

  if (!before?.activeAccountId || !before.activeToken || !request.token) {
    return result(managementFailure("authentication_required"));
  }

  const isCurrent = () => {
    try {
      const after = getSessionSnapshotForState(thunkApi.getState());
      const target = getToolRequestContext(thunkApi);
      return (
        after?.activeAccountId === before.activeAccountId &&
        after.activeToken === before.activeToken &&
        after.sessionGeneration === before.sessionGeneration &&
        target.baseUrl === request.baseUrl
      );
    } catch {
      return false;
    }
  };

  try {
    const response = await callToolApi<PluginManagementResult>(
      { ...thunkApi, getState: () => capturedState },
      "/api/plugins/manage",
      { tool, input: parsed.value },
      { withAuth: true },
    );
    if (!isCurrent()) return result(managementFailure("authentication_required"));
    return result(response);
  } catch {
    return result(managementFailure(isCurrent() ? "unavailable" : "authentication_required"));
  }
}
