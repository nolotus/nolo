import { describe, expect, it } from "bun:test";

import { buildShareReadServerCandidates } from "./shareReadResolver";

describe("buildShareReadServerCandidates", () => {
  it("adds the whole nolo cluster when any configured server is in-cluster", () => {
    expect(
      buildShareReadServerCandidates({
        currentOrigin: "https://nolo.chat",
      })
    ).toEqual(["https://nolo.chat", "https://us.nolo.chat"]);
  });

  it("keeps current origin first and de-duplicates normalized servers", () => {
    expect(
      buildShareReadServerCandidates({
        currentOrigin: "https://us.nolo.chat/",
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat", "https://nolo.chat/"],
        originServer: "https://us.nolo.chat",
      })
    ).toEqual(["https://us.nolo.chat", "https://nolo.chat"]);
  });

  it("does not inject nolo cluster peers for unrelated custom origins", () => {
    expect(
      buildShareReadServerCandidates({
        currentOrigin: "https://alpha.example.com",
        syncServers: ["https://beta.example.com"],
      })
    ).toEqual(["https://alpha.example.com", "https://beta.example.com"]);
  });
});
