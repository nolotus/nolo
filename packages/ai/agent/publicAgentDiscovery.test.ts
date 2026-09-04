import { describe, expect, it } from "bun:test";
import { fetchPublicAgentsForDiscovery } from "./publicAgentDiscovery";

describe("public agent discovery datasource", () => {
  it("uses the marketplace endpoint and preserves all returned records", async () => {
    let requested = "";
    const agents = Array.from({ length: 50 }, (_, i) => ({
      id: `p-${i + 1}`,
      dbKey: `agent-pub-p-${i + 1}`,
      isPublic: true,
    }));
    const result = await fetchPublicAgentsForDiscovery({
      serverBase: "https://nolo.test/",
      fetchImpl: async (input) => {
        requested = String(input);
        return new Response(JSON.stringify({ data: { data: agents } }), { status: 200 });
      },
    });
    expect(requested).toBe("https://nolo.test/rpc/getPublicAgents");
    expect(result).toHaveLength(50);
  });

  it("does not turn catalog failure into an empty success", async () => {
    await expect(fetchPublicAgentsForDiscovery({
      serverBase: "https://nolo.test",
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    })).rejects.toThrow("Public agent catalog request failed (503)");
  });
});
