import { describe, expect, it, mock } from "bun:test";

import {
  buildEmailRoutingPolicy,
  createCloudflareApiToken,
  findCloudflareZoneIdByName,
  generateCloudflareEmailRoutingToken,
  listCloudflarePermissionGroups,
  runCloudflareOAuthLogin,
} from "./cloudflare";

describe("runCloudflareOAuthLogin", () => {
  it("completes the browser PKCE flow and returns a credential", async () => {
    mock.module("../callback-server", () => ({
      startCallbackServer: async () => ({
        waitForCode: async () => ({ code: "auth-code-123" }),
        close: async () => {},
      }),
    }));
    mock.module("../pkce", () => ({
      generatePkcePair: async () => ({
        verifier: "verifier-abc",
        challenge: "challenge-xyz",
        method: "S256" as const,
      }),
    }));

    const mockFetch = async (url: string, init: RequestInit) => {
      if (url === "https://dash.cloudflare.com/oauth2/token") {
        const body = new URLSearchParams(init.body as string);
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("client_id")).toBe("test-client-id");
        expect(body.get("code")).toBe("auth-code-123");
        expect(body.get("code_verifier")).toBe("verifier-abc");
        return new Response(
          JSON.stringify({
            access_token: "access-123",
            refresh_token: "refresh-123",
            expires_in: 3600,
            scope: "account:read zone:read",
            id_token: "id-123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    const logs: string[] = [];
    const credential = await runCloudflareOAuthLogin({
      clientId: "test-client-id",
      scope: "account:read zone:read",
      fetchImpl: mockFetch as any,
      output: { log: (msg: string) => logs.push(msg) } as any,
      error: console,
      openBrowser: async () => true,
    });

    expect(credential.provider).toBe("cloudflare");
    expect(credential.accessToken).toBe("access-123");
    expect(credential.refreshToken).toBe("refresh-123");
    expect(credential.scope).toBe("account:read zone:read");
    expect(credential.idToken).toBe("id-123");
    expect(typeof credential.expiresAt).toBe("number");
    expect(logs.some((l) => l.includes("Open the following URL"))).toBe(true);

    mock.restore();
  });

  it("throws when client id is missing", async () => {
    await expect(
      runCloudflareOAuthLogin({
        output: console,
        error: console,
      })
    ).rejects.toThrow("Cloudflare OAuth client ID is required");
  });
});

describe("cloudflare API token generation", () => {
  it("creates API token from OAuth access token", async () => {
    const mockFetch = async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.cloudflare.com/client/v4/user/tokens");
      const body = JSON.parse(init.body as string);
      expect(body.name).toBe("nolo-email-routing-token");
      expect(body.policies).toHaveLength(1);
      expect(init.headers).toMatchObject({
        Authorization: "Bearer oauth-access-token",
      });
      return new Response(
        JSON.stringify({
          success: true,
          result: { value: "created-token-secret" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const token = await createCloudflareApiToken({
      name: "nolo-email-routing-token",
      policies: [
        {
          effect: "allow",
          resources: {
            "com.cloudflare.api.account": "*",
            "com.cloudflare.api.zone": "zone-123",
          },
          permission_groups: [{ id: "perm-email-routing" }],
        },
      ],
      accessToken: "oauth-access-token",
      fetchImpl: mockFetch as any,
    });

    expect(token).toBe("created-token-secret");
  });

  it("throws when API token creation fails", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          success: false,
          errors: [{ message: "permission denied" }],
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );

    await expect(
      createCloudflareApiToken({
        name: "test",
        policies: [],
        accessToken: "token",
        fetchImpl: mockFetch as any,
      })
    ).rejects.toThrow("Cloudflare API token creation failed: 403");
  });

  it("throws when created token value is missing", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({ success: true, result: {} }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    await expect(
      createCloudflareApiToken({
        name: "test",
        policies: [],
        accessToken: "token",
        fetchImpl: mockFetch as any,
      })
    ).rejects.toThrow("did not contain a token value");
  });

  it("lists permission groups", async () => {
    const mockFetch = async (url: string) => {
      expect(url).toBe(
        "https://api.cloudflare.com/client/v4/user/tokens/permission_groups"
      );
      return new Response(
        JSON.stringify({
          success: true,
          result: [
            {
              id: "perm-1",
              name: "Email Routing Edit",
              permissions: ["zone:email_routing:edit"],
            },
            {
              id: "perm-2",
              name: "Zone Read",
              permissions: ["zone:read"],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const groups = await listCloudflarePermissionGroups(
      "oauth-token",
      mockFetch as any
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("perm-1");
    expect(groups[0].name).toBe("Email Routing Edit");
  });

  it("builds email routing policy with resolved permission ids", () => {
    const policy = buildEmailRoutingPolicy("zone-123", ["perm-1"]);
    expect(policy.effect).toBe("allow");
    expect(policy.resources["com.cloudflare.api.zone"]).toBe("zone-123");
    expect(policy.permission_groups).toEqual([{ id: "perm-1" }]);
  });

  it("throws when building email routing policy without permission ids", () => {
    expect(() => buildEmailRoutingPolicy("zone-123", [])).toThrow(
      "Email routing permission group IDs are required"
    );
  });

  it("looks up zone id by name", async () => {
    const mockFetch = async (url: string) => {
      expect(url).toBe(
        "https://api.cloudflare.com/client/v4/zones?name=nolo.chat"
      );
      return new Response(
        JSON.stringify({
          success: true,
          result: [
            { id: "zone-abc", name: "nolo.chat" },
            { id: "zone-other", name: "other.com" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const zoneId = await findCloudflareZoneIdByName(
      "oauth-token",
      "nolo.chat",
      mockFetch as any
    );
    expect(zoneId).toBe("zone-abc");
  });

  it("returns null when zone is not found", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({ success: true, result: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    const zoneId = await findCloudflareZoneIdByName(
      "oauth-token",
      "missing.com",
      mockFetch as any
    );
    expect(zoneId).toBeNull();
  });

  it("generates an email routing token for a zone", async () => {
    const mockFetch = async (url: string, init: RequestInit) => {
      if (url === "https://api.cloudflare.com/client/v4/zones?name=nolo.chat") {
        return new Response(
          JSON.stringify({
            success: true,
            result: [{ id: "zone-abc", name: "nolo.chat" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (
        url ===
        "https://api.cloudflare.com/client/v4/user/tokens/permission_groups"
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            result: [
              {
                id: "perm-email-routing",
                name: "Email Routing Edit",
                permissions: ["zone:email_routing:edit"],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "https://api.cloudflare.com/client/v4/user/tokens") {
        const body = JSON.parse(init.body as string);
        expect(body.name).toBe("nolo-email-routing-nolo.chat");
        expect(body.policies[0].permission_groups).toEqual([
          { id: "perm-email-routing" },
        ]);
        return new Response(
          JSON.stringify({
            success: true,
            result: { value: "generated-token-secret" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    const result = await generateCloudflareEmailRoutingToken({
      accessToken: "oauth-token",
      zoneName: "nolo.chat",
      tokenName: "nolo-email-routing-nolo.chat",
      fetchImpl: mockFetch as any,
    });

    expect(result.zoneId).toBe("zone-abc");
    expect(result.token).toBe("generated-token-secret");
  });
});
