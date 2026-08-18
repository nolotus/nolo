// routePaths.ts
export enum CreateRoutePaths {
  CREATE = "create",
  CREATE_AGENT = "create/agent",
  /** Minimal local-first create: name + source only (not the full Agent form). */
  CREATE_LOCAL_AGENT = "create/local-agent",
}
