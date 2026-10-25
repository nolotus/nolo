/**
 * Pure cross-platform cloud plugin specification registry.
 * Zero I/O, zero runtime dependencies: safe for Web, React Native, CLI, and Node/Bun.
 */

export type CloudPluginId = "docker" | "cloudflare" | "gcp" | "vultr" | "hetzner" | "digitalocean";

export type CloudPluginRuntimeKey = "docker" | "cf" | "gcp" | "vultr" | "hetzner" | "digitalocean";

export type CloudPluginCredentialMode =
  | "operator-binding"
  | "api-token"
  | "oauth-adc"
  | "oauth";

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
      description:
        "Cloudflare API token with container and worker execution privileges（若配置了 OAuth 客户端可改用 OAuth）。",
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

export const GCP_CLOUD_PLUGIN_SPEC: CloudPluginSpec = Object.freeze({
  id: "gcp",
  displayName: "Google Cloud",
  runtimeKey: "gcp",
  credentialMode: "oauth-adc",
  capabilities: Object.freeze({
    probe: true,
    execute: true,
  }),
  configFields: Object.freeze([
    Object.freeze({
      key: "projectId",
      label: "Project ID",
      description:
        "Target Google Cloud project ID for read-only probing and operations（由 CLI 导入自 gcloud ADC）。",
      required: true,
      secret: false,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "oauthClientId",
      label: "OAuth Client ID",
      description:
        "OAuth client ID from gcloud ADC（由 CLI 导入；不要直接粘贴 refresh token 到公网表单）。",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "oauthClientSecret",
      label: "OAuth Client Secret",
      description:
        "OAuth client secret from gcloud ADC（由 CLI 导入；不要直接粘贴 refresh token 到公网表单）。",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "refreshToken",
      label: "Refresh Token",
      description:
        "OAuth refresh token from gcloud ADC（由 CLI 导入；不要直接粘贴 refresh token 到公网表单）。",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "quotaProject",
      label: "Quota Project ID",
      description:
        "Optional Google Cloud quota project ID for billing attribution（由 CLI 导入自 gcloud ADC）。",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
  ]),
});

/**
 * VPS family: bearer-token providers that bill per running instance-hour.
 * Adding a sibling provider (Hetzner, DigitalOcean, ...) should be a data row
 * here plus a probe endpoint — not a new code path.
 */
export const VULTR_CLOUD_PLUGIN_SPEC: CloudPluginSpec = Object.freeze({
  id: "vultr",
  displayName: "Vultr",
  runtimeKey: "vultr",
  credentialMode: "api-token",
  capabilities: Object.freeze({
    probe: true,
    execute: true,
  }),
  configFields: Object.freeze([
    Object.freeze({
      key: "apiToken",
      label: "API Token",
      description:
        "Vultr personal access token (Bearer). Read-only probe lists instances; creating or deleting instances bills the account hourly.",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "region",
      label: "Region",
      description: "Default region id for new instances (for example ewr). Required only when creating.",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "plan",
      label: "Plan",
      description: "Default plan id for new instances. Billing is hourly while the instance runs.",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
  ]),
});

export const HETZNER_CLOUD_PLUGIN_SPEC: CloudPluginSpec = Object.freeze({
  id: "hetzner",
  displayName: "Hetzner Cloud",
  runtimeKey: "hetzner",
  credentialMode: "api-token",
  capabilities: Object.freeze({
    probe: true,
    execute: true,
  }),
  configFields: Object.freeze([
    Object.freeze({
      key: "apiToken",
      label: "API Token",
      description:
        "Hetzner Cloud API token (Bearer, read and write scopes). Read-only probe lists servers; running servers bill hourly.",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "location",
      label: "Location",
      description: "Default location for new servers (for example fsn1). Required only when creating.",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "serverType",
      label: "Server Type",
      description: "Default server type for new servers. Billing is hourly while the server runs.",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
  ]),
});

export const DIGITALOCEAN_CLOUD_PLUGIN_SPEC: CloudPluginSpec = Object.freeze({
  id: "digitalocean",
  displayName: "DigitalOcean",
  runtimeKey: "digitalocean",
  credentialMode: "api-token",
  capabilities: Object.freeze({
    probe: true,
    execute: true,
  }),
  configFields: Object.freeze([
    Object.freeze({
      key: "apiToken",
      label: "API Token",
      description:
        "DigitalOcean personal access token (Bearer). Read-only probe lists droplets; running droplets bill hourly.",
      required: true,
      secret: true,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "region",
      label: "Region",
      description: "Default region slug for new droplets (for example sfo3). Required only when creating.",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
    Object.freeze({
      key: "size",
      label: "Size",
      description: "Default droplet size slug. Billing is hourly while the droplet runs.",
      required: false,
      secret: false,
      operatorOnly: false,
    }),
  ]),
});

export const CLOUD_PLUGIN_SPECS: readonly CloudPluginSpec[] = Object.freeze([
  DOCKER_CLOUD_PLUGIN_SPEC,
  CLOUDFLARE_CLOUD_PLUGIN_SPEC,
  GCP_CLOUD_PLUGIN_SPEC,
  VULTR_CLOUD_PLUGIN_SPEC,
  HETZNER_CLOUD_PLUGIN_SPEC,
  DIGITALOCEAN_CLOUD_PLUGIN_SPEC,
]);

export const CLOUD_PLUGIN_REGISTRY: Readonly<Record<CloudPluginId, CloudPluginSpec>> = Object.freeze({
  docker: DOCKER_CLOUD_PLUGIN_SPEC,
  cloudflare: CLOUDFLARE_CLOUD_PLUGIN_SPEC,
  gcp: GCP_CLOUD_PLUGIN_SPEC,
  vultr: VULTR_CLOUD_PLUGIN_SPEC,
  hetzner: HETZNER_CLOUD_PLUGIN_SPEC,
  digitalocean: DIGITALOCEAN_CLOUD_PLUGIN_SPEC,
});

/**
 * Look up a cloud plugin specification by plugin id.
 * Returns undefined for unknown plugin ids.
 */
export function getCloudPluginSpec(id: string): CloudPluginSpec | undefined {
  if (id === "docker") return DOCKER_CLOUD_PLUGIN_SPEC;
  if (id === "cloudflare") return CLOUDFLARE_CLOUD_PLUGIN_SPEC;
  if (id === "gcp") return GCP_CLOUD_PLUGIN_SPEC;
  if (id === "vultr") return VULTR_CLOUD_PLUGIN_SPEC;
  if (id === "hetzner") return HETZNER_CLOUD_PLUGIN_SPEC;
  if (id === "digitalocean") return DIGITALOCEAN_CLOUD_PLUGIN_SPEC;
  return undefined;
}
