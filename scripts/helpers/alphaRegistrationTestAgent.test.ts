import { describe, expect, it } from "bun:test";
import { buildAlphaRegistrationTestPrompt } from "./alphaRegistrationTestAgent";

describe("alphaRegistrationTestAgent prompt", () => {
  it("includes anti-bot preflight signals", () => {
    const prompt = buildAlphaRegistrationTestPrompt("https://us.nolo.chat");
    expect(prompt).toContain("Cloudflare");
    expect(prompt).toContain("CAPTCHA");
    expect(prompt).toContain("不要在支持性不明确时继续 provision 邮箱");
  });

  it("includes human-style interaction rhythm rules", () => {
    const prompt = buildAlphaRegistrationTestPrompt("https://us.nolo.chat");
    expect(prompt).toContain("逐字段填写");
    expect(prompt).toContain("关键动作之间短暂停顿");
    expect(prompt).toContain("提交前再读一次关键区域");
  });

  it("describes silent anti-bot rejection separately from mail delivery failure", () => {
    const prompt = buildAlphaRegistrationTestPrompt("https://us.nolo.chat");
    expect(prompt).toContain("表单看似成功");
    expect(prompt).toContain("账号实际未创建");
    expect(prompt).toContain("likely anti-bot");
  });

  it("enforces probe-first discover and single lightweight interaction re-probe in assess", () => {
    const prompt = buildAlphaRegistrationTestPrompt("https://us.nolo.chat");
    const discoverStart = prompt.indexOf("1. discover：");
    const assessStart = prompt.indexOf("2. assess supportability：");
    expect(discoverStart).toBeGreaterThanOrEqual(0);
    expect(assessStart).toBeGreaterThan(discoverStart);

    const discover = prompt.slice(discoverStart, assessStart);
    const registerStart = prompt.indexOf("3. register：", assessStart);
    const assessEnd = registerStart === -1 ? prompt.length : registerStart;
    const assess = prompt.slice(assessStart, assessEnd);

    // discover should probe first and allow supplementary browser_readContent, but NOT allow the lightweight-interaction fallback
    expect(discover).toContain("browser_probePage");
    expect(discover).toContain("browser_readContent");
    expect(discover).not.toContain("只允许一次轻交互");

    // assess should be the only place that allows the one lightweight interaction followed by a re-probe
    expect(assess).toContain("唯一允许进行一次轻交互");
  });
});
