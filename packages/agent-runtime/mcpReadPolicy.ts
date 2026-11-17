import type { McpConnectionWrite } from "./mcpConnectionSpecs";
/** Only host-authenticated management may install this policy; annotations grant nothing. */
export function permitsMcpRead(connection: Pick<McpConnectionWrite, "allowedToolNames" | "readPolicies">, name: string, args?: Record<string, unknown>): boolean {
 if (!connection.allowedToolNames?.includes(name)) return false;
 const policy = connection.readPolicies?.find(p => p.toolName === name);
 if (!policy) return false;
 if (!args) return true;
 if (Object.entries(policy.arguments).some(([key, values]) => values.length > 0 && !Object.hasOwn(args, key))) return false;
 return Object.entries(args).every(([key, value]) => Object.hasOwn(policy.arguments, key) &&
   (policy.arguments[key]!.length === 0 || policy.arguments[key]!.some(allowed => JSON.stringify(allowed) === JSON.stringify(value))));
}
