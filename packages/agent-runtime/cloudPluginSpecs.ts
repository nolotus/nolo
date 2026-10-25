/**
 * Pure cross-platform cloud plugin specification registry.
 * Zero I/O, zero runtime dependencies: safe for Web, React Native, CLI, and Node/Bun.
 */

export type CloudPluginId = "docker" | "cloudflare";

export type CloudPluginRuntimeKey = "docker" | "cf";

export type CloudPluginCredentialMode = "operator-binding" | "api-token";

export type CloudPluginCapabilities = {
  readonly probe: boolean;
  readonly execute: boolean;
};

export type CloudPluginConfigField = {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly required: boolean;
  readonly secret: boolean;
  /**
   * If true, this field is operator-managed and host-bound.
   * Untrusted end users are prohibited from supplying this field directly
   * (e.g. preventing callers from forging authorized owners via raw bindings).
   */
  readonly operatorOnly: boolean;
  readonly envVar?: string;
};

export type CloudPluginSpec = {
  readonly id: CloudPluginId;
  readonly displayName: string;
  readonly runtimeKey: CloudPluginRuntimeKey;
  readonly credentialMode: CloudPluginCredentialMode;
  /**
   * Declares support for probing and execution features.
   * Note: Capability support does not equal runtime readiness.
   */
  readonly capabilities: CloudPluginCapabilities;
  readonly configFields: readonly CloudPluginConfigField[];
};

export const DOCKER_CLOUD_PLUGIN_SPEC: CloudPluginSpec = Object.freeze({
  id: "docker",
  displayName: "Docker",
  runtimeKey: "docker",
  credentialMode: "operator-binding",
  capabilities: Object.freeze({
    probe: true,
    execute: true,
  }),
  configFields: Object.freeze([
    Object.freeze({
      key: "operatorBindings",
      label: "Operator Bindings",
      description:
        "Operator-managed Docker account bindings (e.g. NOLO_DOCKER_BINDINGS). Must not be user-configurable to prevent forging authorized owners.",
      required: true,
      secret: true,
      operatorOnly: true,
      envVar: "NOLO_DOCKER_BINDINGS",
    }),
  ]),
});

export const CLOUDFLARE_CLOUD_PLUGIN_SPEC: CloudPluginSpec = Object.freeze({
  id: "cloudflare",
  displayName: "Cloudflare",
  runtimeKey: "cf",
  credentialMode: "api-token",
  capabilities: Object.freeze({
    probe: true,
    execute: true,
  }),
  configFields: Object.freeze([
    Object.freeze({
      key: "accountId",
      label: "Account ID",
      description: "Cloudflare account identifier.",
      required: true,
      secret: false,
      operatorOnly: false,
      envVar: "CLOUDFLARE_ACCOUNT_ID",
    }),
    Object.freeze({
      key: "apiToken",
      label: "API Token",
      description: "Cloudflare API token with container and worker execution privileges.",
      required: true,
      secret: true,
      operatorOnly: false,
      envVar: "CLOUDFLARE_API_TOKEN",
    }),
    Object.freeze({
      key: "execHeaders",
      label: "Exec Endpoint Auth Headers",
      description: "Authentication headers required by the /exec endpoint for secure execution.",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
  ]),
});

export const CLOUD_PLUGIN_SPECS: readonly CloudPluginSpec[] = Object.freeze([
  DOCKER_CLOUD_PLUGIN_SPEC,
  CLOUDFLARE_CLOUD_PLUGIN_SPEC,
]);

export const CLOUD_PLUGIN_REGISTRY: Readonly<Record<CloudPluginId, CloudPluginSpec>> = Object.freeze({
  docker: DOCKER_CLOUD_PLUGIN_SPEC,
  cloudflare: CLOUDFLARE_CLOUD_PLUGIN_SPEC,
});

/**
 * Look up a cloud plugin specification by plugin id.
 * Returns undefined for unknown plugin ids.
 */
export function getCloudPluginSpec(id: string): CloudPluginSpec | undefined {
  if (id === "docker") return DOCKER_CLOUD_PLUGIN_SPEC;
  if (id === "cloudflare") return CLOUDFLARE_CLOUD_PLUGIN_SPEC;
  return undefined;
}
