/** Project V1: a navigable resource, not an execution workspace. */
export interface ProjectRecord {
  /** Stable opaque ID; do not derive from path, repo, Space or display name. */
  id: string;
  ownerUserId: string;
  name: string;
  /** Optional organization only; does not grant permissions or select agent cwd. */
  spaceId?: string | null;
  /** Repository metadata, never an implicit checkout instruction. */
  repoUrl?: string;
  createdAt: number;
  updatedAt: number;
  /** Enables future additive schema changes without rewriting V1 records. */
  schemaVersion: 1;
}

/** Local machine paths stay in device-local storage, not the shared Project record. */
export interface LocalProjectBinding {
  projectId: string;
  localPath: string;
}

export interface ProjectDialogLink {
  /** One optional Project per dialog in V1; no reverse index required initially. */
  projectId?: string | null;
}

const nonempty = (value: string) => value.trim().length > 0;

/** Pure shape validation, not an authorization or filesystem check. */
export function validateProjectRecord(record: ProjectRecord): string[] {
  const errors: string[] = [];
  if (!nonempty(record.id)) errors.push("id");
  if (!nonempty(record.ownerUserId)) errors.push("ownerUserId");
  if (!nonempty(record.name)) errors.push("name");
  if (record.schemaVersion !== 1) errors.push("schemaVersion");
  if (record.spaceId != null && !nonempty(record.spaceId)) errors.push("spaceId");
  if (record.repoUrl !== undefined && !nonempty(record.repoUrl)) errors.push("repoUrl");
  if (!Number.isFinite(record.createdAt) || !Number.isFinite(record.updatedAt) ||
      record.createdAt < 0 || record.updatedAt < record.createdAt) errors.push("timestamps");
  return errors;
}

/** Project membership is explicit; never inferred from Space. */
export function dialogBelongsToProject(
  link: ProjectDialogLink | null | undefined, projectId: string,
): boolean {
  return !!projectId && link?.projectId === projectId;
}
