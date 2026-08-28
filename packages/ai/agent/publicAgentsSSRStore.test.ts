// 路径: ai/agent/publicAgentsSSRStore.test.ts
// 职责：验证 publicAgentsSSRStore 的 set/get/subscribe/reset 与 SSR override 优先级。
// 镜像 share/shareStore.test.ts；不在 React 外直接调用 useSSRPublicAgents hook。

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  getSSRPublicAgents,
  getSnapshot,
  registerPublicAgentsSSROverride,
  resetPublicAgentsSSRStoreForTests,
  setSSRPublicAgents,
  subscribe,
} from "./publicAgentsSSRStore";
import type { PublicAgentsSSRState } from "./publicAgentsSSRStore";
import type { Agent } from "app/types";

const sampleAgent: Agent = {
  id: "agent-pub-01JW0BJ8N6MCXNSEG4KF1JETM0",
  name: "Hello Agent",
  provider: "openai",
  model: "gpt-4o-mini",
  isPublic: true,
} as unknown as Agent;

const sampleAgent2: Agent = {
  id: "agent-pub-ssr",
  name: "SSR Agent",
  provider: "anthropic",
  model: "claude",
  isPublic: true,
} as unknown as Agent;

describe("publicAgentsSSRStore", () => {
  beforeEach(() => {
    resetPublicAgentsSSRStoreForTests();
  });

  afterEach(() => {
    resetPublicAgentsSSRStoreForTests();
  });

  it("starts empty and returns []", () => {
    expect(getSSRPublicAgents()).toEqual([]);
  });

  it("setSSRPublicAgents writes data and changes content snapshot", () => {
    const before = getSnapshot();
    setSSRPublicAgents([sampleAgent]);
    expect(getSnapshot()).not.toBe(before);
    expect(getSnapshot()).toContain("agent-pub-01JW0BJ8N6MCXNSEG4KF1JETM0");
    expect(getSSRPublicAgents()).toEqual([sampleAgent]);
  });

  it("setSSRPublicAgents coerces non-array data to []", () => {
    // @ts-expect-error 故意传非法值验证防御
    setSSRPublicAgents("not-an-array");
    expect(getSSRPublicAgents()).toEqual([]);
  });

  it("subscribe is notified on mutation and unsubscribes cleanly", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls += 1;
    });
    setSSRPublicAgents([sampleAgent]);
    expect(calls).toBe(1);
    unsub();
    setSSRPublicAgents([]);
    expect(calls).toBe(1);
  });

  it("resetPublicAgentsSSRStoreForTests clears state and changes snapshot", () => {
    setSSRPublicAgents([sampleAgent]);
    const before = getSnapshot();
    resetPublicAgentsSSRStoreForTests();
    expect(getSnapshot()).not.toBe(before);
    expect(getSSRPublicAgents()).toEqual([]);
  });

  it("SSR override wins over client state when registered and non-null", () => {
    setSSRPublicAgents([sampleAgent]);

    const ssrState: PublicAgentsSSRState = {
      loading: false,
      error: null,
      data: [sampleAgent2],
    };
    registerPublicAgentsSSROverride(() => ssrState);

    const got = getSSRPublicAgents();
    expect(got).toEqual([sampleAgent2]);
    expect(got[0]).toMatchObject({ id: "agent-pub-ssr" });
  });

  it("SSR override returning null falls back to client state", () => {
    setSSRPublicAgents([sampleAgent]);
    registerPublicAgentsSSROverride(() => null);
    expect(getSSRPublicAgents()).toEqual([sampleAgent]);
  });

  it("reset also clears the SSR override getter", () => {
    registerPublicAgentsSSROverride(() => ({
      loading: false,
      error: null,
      data: [sampleAgent2],
    }));
    expect(getSSRPublicAgents()).toEqual([sampleAgent2]);
    resetPublicAgentsSSRStoreForTests();
    // After reset the getter slot is null, so we fall back to empty client state.
    expect(getSSRPublicAgents()).toEqual([]);
  });
});