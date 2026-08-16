import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "VoiceInputButton.tsx"),
  "utf-8"
);

describe("VoiceInputButton source contract", () => {
  it("默认 language 为 zh", () => {
    expect(source).toContain('language = "zh"');
  });

  it("language prop 有类型声明", () => {
    expect(source).toContain("language?: string");
  });

  it("请求体中包含 language 字段", () => {
    expect(source).toContain("language,");
  });

  it("优先尝试 Cloudflare 语音转写并回退到 whisper turbo", () => {
    expect(source).toContain('const TRANSCRIPTION_ENDPOINTS = ["/api/cf-speech-to-text", "/api/whisper-turbo"] as const;');
  });

  it("只在可回退的 Cloudflare 错误下才继续尝试备用转写", () => {
    expect(source).toContain("CF_FREE_BUDGET_EXCEEDED");
    expect(source).toContain("CF_NOT_CONFIGURED");
    expect(source).toContain("shouldRetryTranscriptionEndpoint");
  });

  it("本地页面优先请求当前 origin，而不是远端 currentServer", () => {
    expect(source).toContain("const serverOrigin = (locationOrigin || currentServer || \"\").replace(/\\/$/, \"\");");
  });

  it("language 在 useCallback 依赖数组中", () => {
    expect(source).toContain("currentServer, language, token,");
  });

  it("不硬编码 language 为 en", () => {
    expect(source).not.toContain('language = "en"');
  });

  it("icon-only control has explicit type=button and accessible name", () => {
    expect(source).toContain('type="button"');
    expect(source).toContain("aria-label={label}");
  });

  it("decorative mic/animation chrome is aria-hidden", () => {
    expect(source).toContain('<LuMic size={iconSize} aria-hidden="true" />');
    expect(source).toContain('<div className="voice-dots" aria-hidden="true">');
    expect(source).toContain('<div className="voice-bars" aria-hidden="true">');
  });
});
