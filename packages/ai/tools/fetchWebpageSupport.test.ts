import { describe, expect, it } from "bun:test";

import {
  detectExtractionIssue,
  parseLlmsFullSources,
  parseLlmsIndex,
  resolveDocsUrlFromEntries,
} from "./fetchWebpageSupport";

describe("fetchWebpageSupport", () => {
  it("parses llms.txt markdown links into canonical docs entries", () => {
    const entries = parseLlmsIndex(
      [
        "# OpenClaw",
        "",
        "## Docs",
        "- [Gateway Runbook](https://docs.openclaw.ai/gateway/index.md)",
        "- [Remote Access](https://docs.openclaw.ai/gateway/remote.md)",
      ].join("\n"),
      "https://docs.openclaw.ai/"
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      title: "Gateway Runbook",
      url: "https://docs.openclaw.ai/gateway/index.md",
      source: "llms.txt",
    });
  });

  it("parses llms-full.txt Source blocks into canonical docs entries", () => {
    const entries = parseLlmsFullSources(
      [
        "# Remote Access",
        "Source: https://docs.openclaw.ai/gateway/remote.md",
        "",
        "# Discord",
        "Source: https://docs.openclaw.ai/channels/discord.md",
      ].join("\n"),
      "https://docs.openclaw.ai/"
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]?.title).toBe("Remote Access");
    expect(entries[0]?.url).toBe("https://docs.openclaw.ai/gateway/remote.md");
  });

  it("resolves guessed gateway-runbook root to canonical gateway index", () => {
    const resolved = resolveDocsUrlFromEntries("https://docs.openclaw.ai/gateway-runbook", [
      {
        title: "Gateway Runbook",
        url: "https://docs.openclaw.ai/gateway/index.md",
        source: "llms.txt",
      },
      {
        title: "Remote Access",
        url: "https://docs.openclaw.ai/gateway/remote.md",
        source: "llms.txt",
      },
    ]);

    expect(resolved).toEqual({
      resolvedUrl: "https://docs.openclaw.ai/gateway/index.md",
      source: "llms.txt",
    });
  });

  it("resolves nested guessed remote doc path to canonical remote page", () => {
    const resolved = resolveDocsUrlFromEntries(
      "https://docs.openclaw.ai/gateway-runbook/gateway/remote",
      [
        {
          title: "Gateway Runbook",
          url: "https://docs.openclaw.ai/gateway/index.md",
          source: "llms.txt",
        },
        {
          title: "Remote Access",
          url: "https://docs.openclaw.ai/gateway/remote.md",
          source: "llms.txt",
        },
      ]
    );

    expect(resolved).toEqual({
      resolvedUrl: "https://docs.openclaw.ai/gateway/remote.md",
      source: "llms.txt",
    });
  });

  it("does not silently rewrite versioned docs paths to a different version", () => {
    const resolved = resolveDocsUrlFromEntries("https://docs.example.com/v2/intro", [
      {
        title: "Intro",
        url: "https://docs.example.com/v1/intro.md",
        source: "llms.txt",
      },
    ]);

    expect(resolved).toEqual({
      resolvedUrl: "https://docs.example.com/v2/intro",
      source: "original",
    });
  });

  it("flags empty extraction as a hard failure", () => {
    expect(
      detectExtractionIssue("", "https://docs.openclaw.ai/gateway/index.md")
    ).toMatchObject({
      code: "EMPTY_EXTRACTION",
    });
  });

  it("flags raw html shells as a hard failure", () => {
    expect(
      detectExtractionIssue(
        "<!DOCTYPE html><html id='__next_error__'></html>",
        "https://docs.openclaw.ai/gateway/index.md"
      )
    ).toMatchObject({
      code: "HTML_SHELL",
    });
  });
});
