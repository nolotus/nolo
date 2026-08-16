import { assertIsoTimestamp } from "./assertIsoTimestamp";
import type { ProviderCredentialStatus } from "./providerCredentialRegistry";

export type ProviderCredentialLifecycleEvent = {
  schemaVersion: 1;
  recordType: "provider_credential_lifecycle_event";
  credentialId: string;
  eventId: string;
  status: ProviderCredentialStatus;
  effectiveAt: string;
  createdAt: string;
  reason?: string;
  actorId?: string;
};

export const buildProviderCredentialLifecycleEventKey = (
  credentialId: string,
  eventId: string
) => `provider-credential-lifecycle-${credentialId}-event-${eventId}`;


export function createProviderCredentialLifecycleEvent({
  credentialId,
  eventId,
  status,
  effectiveAt,
  createdAt,
  reason,
  actorId,
}: {
  credentialId: string;
  eventId: string;
  status: ProviderCredentialStatus;
  effectiveAt: string;
  createdAt: string;
  reason?: string | null;
  actorId?: string | null;
}): ProviderCredentialLifecycleEvent {
  if (!credentialId.trim()) throw new Error("credentialId is required");
  if (!eventId.trim()) throw new Error("eventId is required");
  assertIsoTimestamp("effectiveAt", effectiveAt);
  assertIsoTimestamp("createdAt", createdAt);
  return {
    schemaVersion: 1,
    recordType: "provider_credential_lifecycle_event",
    credentialId: credentialId.trim(),
    eventId: eventId.trim(),
    status,
    effectiveAt,
    createdAt,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
    ...(actorId?.trim() ? { actorId: actorId.trim() } : {}),
  };
}
