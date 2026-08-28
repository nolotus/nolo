import { describe, expect, test } from "bun:test";
import { parseVisibleXPostText } from "./visibleTextParser";

describe("parseVisibleXPostText", () => {
  test("extracts the first matching post body from visible X page text", () => {
    const result = parseVisibleXPostText(
      [
        "Home",
        "Karminski-牙医",
        "@karminski3",
        "DeepSeek thinking mode tool calls may require preserving reasoning_content even when it is an empty string.",
        "Translate post",
        "3 Replies",
        "12 Reposts",
      ].join("\n"),
      {
        url: "https://x.com/karminski3/status/2051832734533013575",
        fetchedAt: "2026-05-06T03:00:00.000Z",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    expect(result.data.id).toBe("2051832734533013575");
    expect(result.data.author).toEqual({
      handle: "karminski3",
      displayName: "Karminski-牙医",
    });
    expect(result.data.text).toContain("reasoning_content");
    expect(result.data.sourceBackend).toBe("desktop_local_browser");
  });

  test("returns parse_error when no handle is visible", () => {
    const result = parseVisibleXPostText("Something went wrong", {
      url: "https://x.com/karminski3/status/2051832734533013575",
      fetchedAt: "2026-05-06T03:00:00.000Z",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "parse_error",
      backend: "desktop_local_browser",
    });
  });

  test("stops before localized timestamp and engagement text", () => {
    const result = parseVisibleXPostText(
      [
        "帖子",
        "karminski-牙医",
        "@karminski3",
        "Google 刚刚发布了 Gemma 4系列模型的草稿专用模型!",
        "#gemma4 #qwen",
        "上午9:13 · 2026年5月6日",
        "·",
        "7,894",
        "查看",
        "6",
        "2",
        "64",
        "45",
      ].join("\n"),
      {
        url: "https://x.com/karminski3/status/2051832734533013575",
        fetchedAt: "2026-05-06T03:00:00.000Z",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }

    expect(result.data.text).toBe(
      "Google 刚刚发布了 Gemma 4系列模型的草稿专用模型!\n#gemma4 #qwen",
    );
  });
});
