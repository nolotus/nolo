import { describe, expect, test } from "bun:test";

import {
  DEFAULT_EXTERNAL_REGISTRATION_TARGETS,
  resolveExternalRegistrationTargets,
} from "./externalRegistrationTargets";

describe("externalRegistrationTargets", () => {
  test("resolveExternalRegistrationTargets returns sorted default targets", () => {
    expect(resolveExternalRegistrationTargets({}).map((target) => target.label)).toEqual([
      "Imitate Email",
      "Try Discourse Demo",
      "NodeBB Community",
    ]);
  });

  test("resolveExternalRegistrationTargets preserves an explicit target path without adding a trailing slash", () => {
    expect(
      resolveExternalRegistrationTargets({ explicitTargetUrl: "example.com/signup" }).map(
        (target) => target.url,
      ),
    ).toEqual(["https://example.com/signup"]);
  });

  test("default target catalog starts with the easiest email-first control target", () => {
    expect(DEFAULT_EXTERNAL_REGISTRATION_TARGETS[0]).toEqual({
      label: "Imitate Email",
      notes: "Low-friction email-first signup with optional social login, good for proving the base external registration loop before harder targets",
      priority: 10,
      url: "https://imitate.email/signup",
    });
  });
});
