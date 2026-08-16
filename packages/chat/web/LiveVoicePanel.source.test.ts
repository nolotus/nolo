import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panelSource = readFileSync(
  join(import.meta.dir, "LiveVoicePanel.tsx"),
  "utf8",
);

describe("LiveVoicePanel status handling (source)", () => {
  it("types status as the full LiveVoiceStatus enum", () => {
    expect(panelSource).toContain('"listening"');
    expect(panelSource).toContain('"thinking"');
    expect(panelSource).toContain('"speaking"');
    expect(panelSource).toContain('"connecting"');
    expect(panelSource).toContain('"disconnected"');
  });

  it("does not use the removed 'connected' status in useState type", () => {
    expect(panelSource).not.toMatch(
      /useState<[^>]*\bconnected\b/,
    );
  });

  it("treats listening, thinking, speaking as active states", () => {
    expect(panelSource).toContain("isActive");
    expect(panelSource).toMatch(
      /isActive\s*=\s*status\s*===\s*"listening"/,
    );
  });

  it("renders distinct labels for listening, thinking, speaking", () => {
    expect(panelSource).toContain('"liveVoice.listening"');
    expect(panelSource).toContain('"liveVoice.thinking"');
    expect(panelSource).toContain('"liveVoice.speaking"');
  });
});

describe("LiveVoicePanel auth (source)", () => {
  it("documents same-origin cookie auth (no explicit Authorization header)", () => {
    // The component should NOT set an Authorization header on the WebSocket —
    // it relies on the browser's nolo_auth_token cookie.
    // Check the actual code lines (not JSDoc comments) for no Bearer header.
    const codeLines = panelSource
      .split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"));
    const codeOnly = codeLines.join("\n");
    expect(codeOnly).not.toContain("Authorization");
    expect(codeOnly).not.toContain("Bearer");

    // Must document the cookie auth pattern in the comment
    expect(panelSource).toContain("nolo_auth_token");
  });

  it("opens WebSocket to same-origin (no cross-origin token needed)", () => {
    // Uses window.location.host — same-origin
    expect(panelSource).toContain("window.location.host");
  });
});

describe("LiveVoicePanel audio playback (source)", () => {
  it("has removed the audio playback TODO", () => {
    expect(panelSource).not.toContain("TODO: handle binary audio playback");
  });

  it("handles incoming audio events and supports pcm and wav", () => {
    expect(panelSource).toContain('msg.type === "audio"');
    expect(panelSource).toContain('"audio/pcm;rate=24000"');
    expect(panelSource).toContain('"audio/wav"');
    expect(panelSource).toContain("createBufferSource");
    expect(panelSource).toContain("decodeAudioData");
  });
});

describe("LiveVoicePanel error handling (source)", () => {
  it("handles server error events and surfaces the message", () => {
    expect(panelSource).toContain('msg.type === "error"');
    expect(panelSource).toContain("setErrorMessage");
    expect(panelSource).toContain('className="live-voice-error"');
  });

  it("logs websocket errors with agent and dialog context", () => {
    expect(panelSource).toContain("ws.onerror");
    expect(panelSource).toContain('"[LiveVoicePanel] WebSocket error"');
  });

  it("url-encodes agentId and dialogId query params", () => {
    expect(panelSource).toContain("encodeURIComponent(agentId)");
    expect(panelSource).toContain("encodeURIComponent(dialogId)");
  });
});
