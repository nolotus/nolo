import { describe, expect, it } from "bun:test";
import {
  buildAgentRunRequest,
  recoverAgentResultFromSummary,
  parseRequiredAgentResult,
  requireReadyProvisionResult,
  requireRegistrationAgentRecord,
  shouldRetryForegroundAfterStaleBackgroundFailure,
  validateAgentResult,
  waitForDialogResult,
} from "./verifyExternalRegistrationWithAgent";

const targetUrl = "https://example.com/signup";

describe("verifyExternalRegistrationWithAgent", () => {
  it("builds a prompt that includes the prepare inbox stage", () => {
    const request = buildAgentRunRequest({
      agentKey: "agent-user1-alpha-test",
      targetUrl,
      background: false,
    });

    expect(request.userInput).toContain(
      "Use the staged workflow exactly: discover -> assess supportability -> prepare inbox -> register -> verify -> closeout."
    );
  });

  it("requires alias readiness before external registration can proceed", () => {
    expect(() =>
      requireReadyProvisionResult({
        agentId: "agent-user1-alpha-test",
        emailAddress: "pending@nolo.chat",
        readinessStatus: "failed_warmup",
        ingressReadyAt: null,
        lastWarmupAt: "2026-05-02T12:00:00.000Z",
        lastWarmupError: "probe timed out after 180s",
      })
    ).toThrow("Alias is not ingress-ready");
  });

  it("accepts a ready alias provision result", () => {
    expect(
      requireReadyProvisionResult({
        agentId: "agent-user1-alpha-test",
        emailAddress: "ready@nolo.chat",
        readinessStatus: "ready",
        ingressReadyAt: "2026-05-02T12:05:00.000Z",
        lastWarmupAt: "2026-05-02T12:04:57.000Z",
        lastWarmupError: null,
      })
    ).toMatchObject({
      emailAddress: "ready@nolo.chat",
      readinessStatus: "ready",
    });
  });

  it("waits for a terminal dialog status before accepting the agent result", async () => {
    const interimJson = JSON.stringify({
      targetUrl,
      resolvedSignupUrl: targetUrl,
      emailAddress: "temp@example.com",
      registrationId: "reg-temp",
      verified: true,
      failedStage: null,
      blockingReason: null,
    });
    const finalJson = JSON.stringify({
      targetUrl,
      resolvedSignupUrl: `${targetUrl}?from=final`,
      emailAddress: "final@example.com",
      registrationId: "reg-final",
      verified: true,
      failedStage: null,
      blockingReason: null,
    });
    const snapshots = [
      {
        meta: { status: "unknown" },
        msgs: [{ role: "assistant", content: interimJson }],
        resolvedBase: "https://alpha.example.com",
      },
      {
        meta: { status: "done" },
        msgs: [{ role: "assistant", content: finalJson }],
        resolvedBase: "https://alpha.example.com",
      },
    ];
    let readCount = 0;

    const result = await waitForDialogResult(
      {
        baseUrl: "https://alpha.example.com",
        authToken: "token",
        dialogKey: "dialog-user-1",
        dialogId: "dialog-1",
        timeoutMs: 1_000,
        pollMs: 1,
      },
      {
        readSnapshot: async () => snapshots[readCount++] as any,
        sleep: async () => {},
        now: () => readCount,
      }
    );

    expect(readCount).toBe(2);
    expect(result.status).toBe("done");
    expect(result.parsedResult).toEqual(JSON.parse(finalJson));
  });

  it("does not accept stale assistant JSON from a terminal failed dialog", async () => {
    const staleJson = JSON.stringify({
      targetUrl,
      resolvedSignupUrl: targetUrl,
      emailAddress: "stale@example.com",
      registrationId: "reg-stale",
      verified: true,
      failedStage: null,
      blockingReason: null,
    });

    const result = await waitForDialogResult(
      {
        baseUrl: "https://alpha.example.com",
        authToken: "token",
        dialogKey: "dialog-user-2",
        dialogId: "dialog-2",
        timeoutMs: 1_000,
        pollMs: 1,
      },
      {
        readSnapshot: async () =>
          ({
            meta: { status: "failed" },
            msgs: [{ role: "assistant", content: staleJson }],
            resolvedBase: "https://alpha.example.com",
          }) as any,
        sleep: async () => {},
        now: () => 0,
      }
    );

    expect(result.status).toBe("failed");
    expect(result.parsedResult).toBeNull();
  });

  it("reads the latest assistant JSON from newest-first dialog messages", async () => {
    const finalJson = JSON.stringify({
      targetUrl,
      resolvedSignupUrl: `${targetUrl}?final=1`,
      emailAddress: "latest@example.com",
      registrationId: "reg-latest",
      verified: true,
      failedStage: null,
      blockingReason: null,
    });

    const result = await waitForDialogResult(
      {
        baseUrl: "https://alpha.example.com",
        authToken: "token",
        dialogKey: "dialog-user-3",
        dialogId: "dialog-3",
        timeoutMs: 1_000,
        pollMs: 1,
      },
      {
        readSnapshot: async () =>
          ({
            meta: { status: "done" },
            msgs: [
              { role: "assistant", content: finalJson },
              { role: "tool", content: "{\"ok\":true}" },
              { role: "assistant", content: [{ type: "output_text", text: "thinking" }] },
              { role: "user", content: "start" },
            ],
            resolvedBase: "https://alpha.example.com",
          }) as any,
        sleep: async () => {},
        now: () => 0,
      }
    );

    expect(result.status).toBe("done");
    expect(result.parsedResult).toEqual(JSON.parse(finalJson));
  });

  it("recovers a completed dialog by requesting a foreground JSON summary on continueDialogId", async () => {
    const summaryJson = JSON.stringify({
      targetUrl,
      resolvedSignupUrl: `${targetUrl}?login`,
      emailAddress: "user@example.com",
      registrationId: null,
      verified: false,
      failedStage: "verify",
      blockingReason: "No verification email received after submit",
    });
    const apiCalls: any[] = [];

    const result = await recoverAgentResultFromSummary(
      {
        baseUrl: "https://alpha.example.com",
        authToken: "token",
        agentKey: "agent-user-1-registration",
        dialogId: "dialog-4",
        targetUrl,
      },
      {
        apiPost: async (url: string, body: Record<string, unknown>) => {
          apiCalls.push({ url, body });
          return {
            ok: true,
            status: 200,
            data: {
              dialogId: "dialog-4",
              content: summaryJson,
            },
          } as any;
        },
      }
    );

    expect(apiCalls).toEqual([
      {
        url: "https://alpha.example.com/api/agent/run",
        body: {
          agentKey: "agent-user-1-registration",
          continueDialogId: "dialog-4",
          userInput: expect.stringContaining("Reply with one JSON object only"),
          stream: false,
          background: false,
        },
      },
    ]);
    expect(result).toMatchObject({
      targetUrl,
      resolvedSignupUrl: `${targetUrl}?login`,
      emailAddress: "user@example.com",
      registrationId: null,
      verified: false,
      failedStage: "verify",
      blockingReason: "No verification email received after submit",
    });
  });

  it("rejects malformed field types instead of coercing them", () => {
    expect(() =>
      validateAgentResult(
        {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
          registrationId: "reg-1",
          verified: "true",
          failedStage: null,
          blockingReason: null,
        } as any,
        targetUrl
      )
    ).toThrow("Agent returned invalid verified");
  });

  it("rejects targetUrl mismatches from the agent payload", () => {
    expect(() =>
      validateAgentResult(
        {
          targetUrl: "https://evil.example.com/signup",
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
          registrationId: "reg-1",
          verified: true,
          failedStage: null,
          blockingReason: null,
        },
        targetUrl
      )
    ).toThrow("Agent returned targetUrl");
  });

  it("rejects non-string targetUrl values structurally", () => {
    expect(() =>
      validateAgentResult(
        {
          targetUrl: { href: targetUrl },
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
          registrationId: "reg-1",
          verified: true,
          failedStage: null,
          blockingReason: null,
        } as any,
        targetUrl
      )
    ).toThrow("Agent returned invalid targetUrl: expected string, got object");
  });

  it("rejects inconsistent failure metadata", () => {
    expect(() =>
      validateAgentResult(
        {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: null,
          registrationId: null,
          verified: false,
          failedStage: "verify",
          blockingReason: null,
        },
        targetUrl
      )
    ).toThrow("failedStage without blockingReason");
  });

  it("accepts legacy underscore failedStage values from the registration agent", () => {
    expect(
      validateAgentResult(
        {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
          registrationId: "reg-1",
          verified: false,
          failedStage: "assess_supportability",
          blockingReason: "Invisible anti-spam blocked the form.",
        },
        targetUrl
      )
    ).toMatchObject({
      verified: false,
      failedStage: "assess supportability",
      blockingReason: "Invisible anti-spam blocked the form.",
    });
  });

  it("rejects unverified results without actionable failure details", () => {
    expect(() =>
      validateAgentResult(
        {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: null,
          registrationId: null,
          verified: false,
          failedStage: null,
          blockingReason: null,
        },
        targetUrl
      )
    ).toThrow("verified=false without failedStage and blockingReason");
  });

  it("parses required JSON objects but rejects missing contract fields", () => {
    expect(
      parseRequiredAgentResult(
        JSON.stringify({
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
        })
      )
    ).toBeNull();
  });

  it("accepts optional probe evidence in the agent JSON contract", () => {
    const parsed = parseRequiredAgentResult(
      JSON.stringify({
        targetUrl,
        resolvedSignupUrl: targetUrl,
        emailAddress: "user@example.com",
        registrationId: "reg-1",
        verified: false,
        failedStage: "discover",
        blockingReason: "Probe showed no form",
        probe: { summary: "Probe indicates Turnstile is present", blockers: [{ kind: "turnstile" }] },
      })
    );
    expect(parsed).not.toBeNull();
    expect((parsed as any).probe).toBeTruthy();
  });

  it("preserves non-404 agent lookup failures", async () => {
    await expect(
      requireRegistrationAgentRecord(
        {
          baseUrl: "https://alpha.example.com",
          agentKey: "agent-user-1-registration",
          authToken: "token",
        },
        {
          readAgentRecord: async () => {
            throw new Error('read agent failed (401): {"error":"unauthorized"}');
          },
        }
      )
    ).rejects.toThrow('read agent failed (401): {"error":"unauthorized"}');
  });

  it("maps 404 agent lookup failures to a not-found message", async () => {
    await expect(
      requireRegistrationAgentRecord(
        {
          baseUrl: "https://alpha.example.com",
          agentKey: "agent-user-1-registration",
          authToken: "token",
        },
        {
          readAgentRecord: async () => {
            throw new Error('read agent failed (404): {"error":"not found"}');
          },
        }
      )
    ).rejects.toThrow(
      "Registration agent not found at agent-user-1-registration. Run bun ./scripts/createAgentEmailRegistrationTestAgent.ts first."
    );
  });

  it("builds the agent run request without retired runtimeProfile", () => {
    expect(
      buildAgentRunRequest({
        agentKey: "agent-user-1-registration",
        targetUrl,
      })
    ).toEqual({
      agentKey: "agent-user-1-registration",
      userInput: expect.stringContaining(targetUrl),
      stream: false,
      background: true,
    });
  });

  it("allows the verifier to force a foreground retry request", () => {
    expect(
      buildAgentRunRequest({
        agentKey: "agent-user-1-registration",
        targetUrl,
        background: false,
      })
    ).toEqual({
      agentKey: "agent-user-1-registration",
      userInput: expect.stringContaining(targetUrl),
      stream: false,
      background: false,
    });
  });

  it("retries in foreground only for stale background failures with zero runtime output", () => {
    expect(
      shouldRetryForegroundAfterStaleBackgroundFailure({
        status: "failed",
        meta: {
          runtimeCheckpoint: {
            errorMessage: "stale running dialog exceeded 10 minutes without completion",
            toolCallCount: 0,
            lastAssistantText: null,
            runtimeBinding: {
              executionMode: "background",
            },
          },
        },
      } as any)
    ).toBe(true);

    expect(
      shouldRetryForegroundAfterStaleBackgroundFailure({
        status: "failed",
        meta: {
          runtimeCheckpoint: {
            errorMessage: "stale running dialog exceeded 10 minutes without completion",
            toolCallCount: 0,
            lastAssistantText: "processing registration...",
            runtimeBinding: {
              executionMode: "background",
            },
          },
        },
      } as any)
    ).toBe(false);

    expect(
      shouldRetryForegroundAfterStaleBackgroundFailure({
        status: "failed",
        meta: {
          runtimeCheckpoint: {
            errorMessage: "stale running dialog exceeded 10 minutes without completion",
            toolCallCount: 1,
            lastAssistantText: null,
            runtimeBinding: {
              executionMode: "background",
            },
          },
        },
      } as any)
    ).toBe(false);
  });

  describe("classifyExternalRegistrationFailure", () => {
    it("classifies CAPTCHA blockers as unsupported-captcha", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "assess supportability",
          blockingReason: "Site requires CAPTCHA challenge before signup",
        })
      ).toBe("unsupported-captcha");

      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "register",
          blockingReason: "Registration form is blocked by reCAPTCHA",
        })
      ).toBe("unsupported-captcha");
    });

    it("classifies probe-backed Turnstile and Cloudflare blockers as unsupported-captcha", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      // Probe-backed Turnstile blocker should be classified as unsupported-captcha
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "discover",
          blockingReason: null,
          probe: { blockers: [{ kind: "turnstile", reason: "Turnstile gate on page load" }] },
        } as any)
      ).toBe("unsupported-captcha");

      // Probe-backed Cloudflare challenge
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "discover",
          blockingReason: null,
          probe: { blockers: [{ kind: "cloudflare-challenge", reason: "Cloudflare bot check" }] },
        } as any)
      ).toBe("unsupported-captcha");
    });

    it("classifies probe-backed captcha kind as unsupported-captcha", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "discover",
          blockingReason: null,
          probe: { blockers: [{ kind: "captcha", reason: "Basic captcha present" }] },
        } as any)
      ).toBe("unsupported-captcha");
    });

    it("classifies Cloudflare challenge and Turnstile blockers as unsupported-captcha", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "assess supportability",
          blockingReason: "Cloudflare challenge blocked the signup flow before the form loaded",
        })
      ).toBe("unsupported-captcha");

      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "register",
          blockingReason: "Form submission is gated behind Turnstile verification",
        })
      ).toBe("unsupported-captcha");
    });

    it("classifies no verification email + incorrect credentials as likely-anti-bot", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "verify",
          blockingReason:
            "No verification email received; attempted login returns incorrect username or password",
        })
      ).toBe("likely-anti-bot");

      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "verify",
          blockingReason:
            "Verification email not delivered, login attempt fails with invalid credentials error",
        })
      ).toBe("likely-anti-bot");
    });

    it("classifies OAuth requirements as unsupported-oauth", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "assess supportability",
          blockingReason: "Site only supports OAuth signup via Google or GitHub",
        })
      ).toBe("unsupported-oauth");
    });

    it("classifies phone requirements as unsupported-phone", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "assess supportability",
          blockingReason: "Phone number required for verification",
        })
      ).toBe("unsupported-phone");
    });

    it("classifies mail-not-received when verification email simply missing", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "verify",
          blockingReason: "No verification email received after 10 minutes",
        })
      ).toBe("mail-not-received");
    });

    it("classifies unsupported-other for other assess supportability failures", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: false,
          failedStage: "assess supportability",
          blockingReason: "Site requires enterprise invitation code",
        })
      ).toBe("unsupported-other");
    });

    it("returns verified for successful verification", async () => {
      const { classifyExternalRegistrationFailure } = await import(
        "./verifyExternalRegistrationWithAgent"
      );
      expect(
        classifyExternalRegistrationFailure({
          verified: true,
          failedStage: null,
          blockingReason: null,
        })
      ).toBe("verified");
    });
  });

  describe("runTargetAttempts", () => {
    it("rotates to the next target after an unsupported result and collects classifications", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
      ];

      const mockRunSingle = async (targetUrl: string) => {
        if (targetUrl === "https://a.example.com/signup") {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: null,
            registrationId: null,
            verified: false,
            failedStage: "assess supportability" as const,
            blockingReason: "Site requires CAPTCHA challenge",
          };
        } else {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: "user@example.com",
            registrationId: "reg-123",
            verified: true,
            failedStage: null,
            blockingReason: null,
          };
        }
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0]).toMatchObject({
        target: targets[0],
        classification: "unsupported-captcha",
        agentResult: expect.objectContaining({ verified: false }),
      });
      expect(result.attempts[1]).toMatchObject({
        target: targets[1],
        classification: "verified",
        agentResult: expect.objectContaining({ verified: true }),
      });
      expect(result.finalResult).toMatchObject({ verified: true });
    });

    it("stops early when a verified result is found", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
        { label: "Site C", url: "https://c.example.com/join", notes: "", priority: 30 },
      ];

      const mockRunSingle = async (targetUrl: string) => {
        if (targetUrl === "https://a.example.com/signup") {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: "user@example.com",
            registrationId: "reg-abc",
            verified: true,
            failedStage: null,
            blockingReason: null,
          };
        }
        throw new Error("Should not reach subsequent targets");
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(result.attempts).toHaveLength(1);
      expect(result.finalResult.verified).toBe(true);
    });

    it("collects all attempts when all targets fail", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
      ];

      const mockRunSingle = async (targetUrl: string) => {
        return {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: null,
          registrationId: null,
          verified: false,
          failedStage: "assess supportability" as const,
          blockingReason: `${targetUrl} requires OAuth`,
        };
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(result.attempts).toHaveLength(2);
      expect(result.attempts.every((a) => a.classification === "unsupported-oauth")).toBe(
        true
      );
      expect(result.finalResult.verified).toBe(false);
    });

    it("stops once a target returns an actionable non-unsupported classification", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
      ];

      const seenTargets: string[] = [];
      const mockRunSingle = async (targetUrl: string) => {
        seenTargets.push(targetUrl);
        if (targetUrl === "https://a.example.com/signup") {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: null,
            registrationId: null,
            verified: false,
            failedStage: "verify" as const,
            blockingReason:
              "No verification email received; attempted login returns incorrect username or password",
          };
        }

        throw new Error("Should stop after actionable classification");
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(seenTargets).toEqual(["https://a.example.com/signup"]);
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0]?.classification).toBe("likely-anti-bot");
      expect(result.finalResult).toMatchObject({
        targetUrl: "https://a.example.com/signup",
        verified: false,
      });
    });

    it("does not rotate after a generic register-stage failure", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
      ];

      const seenTargets: string[] = [];
      const mockRunSingle = async (targetUrl: string) => {
        seenTargets.push(targetUrl);
        if (targetUrl === "https://a.example.com/signup") {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: null,
            registrationId: null,
            verified: false,
            failedStage: "register" as const,
            blockingReason: "Temporary server error while submitting the signup form",
          };
        }

        throw new Error("Should preserve the first actionable register failure");
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(seenTargets).toEqual(["https://a.example.com/signup"]);
      expect(result.attempts).toHaveLength(1);
      expect(result.finalResult).toMatchObject({
        targetUrl: "https://a.example.com/signup",
        failedStage: "register",
        verified: false,
      });
    });

    it("rotates after an unsupported-other failure discovered before supportability assessment", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
      ];

      const seenTargets: string[] = [];
      const mockRunSingle = async (targetUrl: string) => {
        seenTargets.push(targetUrl);
        if (targetUrl === "https://a.example.com/signup") {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: null,
            registrationId: null,
            verified: false,
            failedStage: "discover" as const,
            blockingReason: "Site requires enterprise invitation code before the signup form",
          };
        }

        return {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
          registrationId: "reg-456",
          verified: true,
          failedStage: null,
          blockingReason: null,
        };
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(seenTargets).toEqual([
        "https://a.example.com/signup",
        "https://b.example.com/register",
      ]);
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0]?.classification).toBe("unsupported-other");
      expect(result.finalResult).toMatchObject({
        targetUrl: "https://b.example.com/register",
        verified: true,
      });
    });

    it("rotates after a Cloudflare blocker classified as unsupported-captcha", async () => {
      const { runTargetAttempts } = await import(
        "./verifyExternalRegistrationWithAgent"
      );

      const targets = [
        { label: "Site A", url: "https://a.example.com/signup", notes: "", priority: 10 },
        { label: "Site B", url: "https://b.example.com/register", notes: "", priority: 20 },
      ];

      const seenTargets: string[] = [];
      const mockRunSingle = async (targetUrl: string) => {
        seenTargets.push(targetUrl);
        if (targetUrl === "https://a.example.com/signup") {
          return {
            targetUrl,
            resolvedSignupUrl: targetUrl,
            emailAddress: null,
            registrationId: null,
            verified: false,
            failedStage: "register" as const,
            blockingReason: "Cloudflare challenge blocked account creation after submit",
          };
        }

        return {
          targetUrl,
          resolvedSignupUrl: targetUrl,
          emailAddress: "user@example.com",
          registrationId: "reg-789",
          verified: true,
          failedStage: null,
          blockingReason: null,
        };
      };

      const result = await runTargetAttempts({
        targets,
        runSingle: mockRunSingle,
      });

      expect(seenTargets).toEqual([
        "https://a.example.com/signup",
        "https://b.example.com/register",
      ]);
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0]?.classification).toBe("unsupported-captcha");
      expect(result.finalResult).toMatchObject({
        targetUrl: "https://b.example.com/register",
        verified: true,
      });
    });
  });
});
