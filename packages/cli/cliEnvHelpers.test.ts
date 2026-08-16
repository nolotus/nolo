import { describe, expect, test } from "bun:test";

import {
  resolveAuthToken,
  resolveDeleteServerCandidates,
  resolveServerCandidates,
  resolveServerUrl,
} from "./cliEnvHelpers";

describe("cliEnvHelpers", () => {
  test("resolveAuthToken prefers explicit CLI args over environment defaults", () => {
    expect(
      resolveAuthToken(["--token", "arg-token"], {
        AUTH_TOKEN: "env-token",
      }),
    ).toBe("arg-token");
  });

  test("resolveServerUrl prefers explicit CLI args over environment defaults", () => {
    expect(
      resolveServerUrl(["--server", "https://args-first.example///"], {
        NOLO_SERVER: "https://env.example/",
      }),
    ).toBe("https://args-first.example");
  });

  test("resolveDeleteServerCandidates includes cluster peers and local dev origin", () => {
    expect(
      resolveDeleteServerCandidates(
        ["--server", "http://127.0.0.1:38123"],
        { NOLO_SERVER: "https://nolo.chat" },
      ),
    ).toEqual([
      "http://127.0.0.1:38123",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  test("resolveServerCandidates keeps CLI args ahead of preferred and env candidates", () => {
    expect(
      resolveServerCandidates(
        ["--server", "https://args-first.example///"],
        {
          NOLO_SERVER: "https://env.example/",
          BASE_URL: "https://base.example/",
        },
        "https://preferred.example/",
      ).slice(0, 3),
    ).toEqual([
      "https://args-first.example",
      "https://preferred.example",
      "https://env.example",
    ]);
  });
});
