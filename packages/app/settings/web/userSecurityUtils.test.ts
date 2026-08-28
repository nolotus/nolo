import { describe, expect, test } from "bun:test";

import { buildRecentAccessFlags } from "./userSecurityUtils";

describe("buildRecentAccessFlags", () => {
  test("marks the newest occurrence of a device/ip pair as new", () => {
    expect(
      buildRecentAccessFlags([
        {
          timestamp: 300,
          source: "token",
          ip: "1.1.1.*",
          device: "Mac · Chrome",
        },
        {
          timestamp: 200,
          source: "login",
          ip: "2.2.2.*",
          device: "iPhone · Safari",
        },
        {
          timestamp: 100,
          source: "token",
          ip: "1.1.1.*",
          device: "Mac · Chrome",
        },
      ])
    ).toEqual([
      {
        timestamp: 300,
        source: "token",
        ip: "1.1.1.*",
        device: "Mac · Chrome",
        isNew: true,
      },
      {
        timestamp: 200,
        source: "login",
        ip: "2.2.2.*",
        device: "iPhone · Safari",
        isNew: true,
      },
      {
        timestamp: 100,
        source: "token",
        ip: "1.1.1.*",
        device: "Mac · Chrome",
        isNew: false,
      },
    ]);
  });
});
