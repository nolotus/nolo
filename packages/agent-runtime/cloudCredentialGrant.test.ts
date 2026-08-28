import { describe, expect, mock, test } from "bun:test";

import {
  assertCloudGrantAllowed,
  CloudGrantDeniedError,
  CloudGrantNotImplementedError,
  createCloudCredentialGrant,
  isCloudGrantActive,
  uploadCloudCredentialGrant,
} from "./cloudCredentialGrant";

describe("cloudCredentialGrant", () => {
  test("assertCloudGrantAllowed defaults to deny without ToS", () => {
    expect(() =>
      assertCloudGrantAllowed({
        accountUserId: "user1",
        provider: "openai",
      })
    ).toThrow(CloudGrantDeniedError);

    expect(() =>
      assertCloudGrantAllowed({
        accountUserId: "user1",
        provider: "openai",
        tosAccepted: false,
      })
    ).toThrow(/Terms of Service/);
  });

  test("createCloudCredentialGrant requires ToS and never uploads", () => {
    expect(() =>
      createCloudCredentialGrant({
        accountUserId: "user1",
        provider: "openai",
      })
    ).toThrow(CloudGrantDeniedError);

    const grant = createCloudCredentialGrant({
      accountUserId: " user1 ",
      provider: " openai ",
      tosAccepted: true,
      now: () => 1_700_000_000_111,
    });

    expect(grant).toEqual({
      accountUserId: "user1",
      provider: "openai",
      status: "pending",
      tosAcceptedAt: 1_700_000_000_111,
    });
    expect(isCloudGrantActive(grant)).toBe(false);

    const active = createCloudCredentialGrant({
      accountUserId: "user1",
      provider: "openai",
      tosAcceptedAt: "2026-07-13T00:00:00.000Z",
      status: "active",
    });
    expect(isCloudGrantActive(active)).toBe(true);
  });

  test("uploadCloudCredentialGrant is a no-network stub", () => {
    const fetchImpl = mock(async () => {
      throw new Error("network must not be called");
    });

    const grant = createCloudCredentialGrant({
      accountUserId: "user1",
      provider: "openai",
      tosAcceptedAt: 100,
      status: "pending",
    });

    expect(() =>
      uploadCloudCredentialGrant({
        grant,
        credentialRef: "cred-ref-1",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).toThrow(CloudGrantNotImplementedError);

    expect(fetchImpl).toHaveBeenCalledTimes(0);
  });
});
