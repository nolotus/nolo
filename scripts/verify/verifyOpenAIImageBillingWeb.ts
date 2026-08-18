#!/usr/bin/env bun

import { chromium } from "playwright";

import {
  buildPlaywrightAuthBootstrap,
  installPlaywrightAuthBootstrap,
} from "../helpers/playwrightAuth";
import {
  createDialogForAgent,
  formatProbeResult,
  waitForTokenRecord,
} from "../helpers/dialogBillingProbe";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
} from "../helpers/authContext";

const baseUrl = (process.env.BASE_URL ?? "https://nolo.chat").replace(/\/+$/, "");
const agentKey = process.env.AGENT_KEY ?? "agent-pub-01IMGAGENT2A000000006NYUPN";
const minExpectedCost = Number(process.env.MIN_EXPECTED_COST ?? "0.32");
const expectedImageCount = Number(process.env.EXPECT_IMAGE_COUNT ?? "1");
const expectedModel = process.env.EXPECT_MODEL?.trim() || "gpt-5.6-terra";
const timeoutMs = Number(process.env.TIMEOUT_MS ?? "120000");
const prompt =
  process.env.PROMPT ??
  `web-billing-${Date.now()} 生成一张极简黑白圆形图标，只要1张图，不要解释文字。`;
const authToken = resolveAuthToken();
const userId = parseUserIdFromAuthToken(authToken);

if (!authToken) {
  throw new Error("Missing auth token. Set AUTH_TOKEN/AUTH or rely on scripts/testUtils.ts TOKEN.");
}
if (!userId) {
  throw new Error("Failed to parse userId from auth token.");
}

const bootstrap = buildPlaywrightAuthBootstrap(authToken, {
  currentServer: baseUrl,
  syncServers: [baseUrl],
});

const { dialogId, dialogKey, dialogUrl } = await createDialogForAgent({
  baseUrl,
  authToken,
  userId,
  agentKey,
  title: `Image Billing Probe ${Date.now()}`,
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await installPlaywrightAuthBootstrap(page, bootstrap);
  await page.goto(dialogUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  const input = page.locator(".message-input__textarea").first();
  await input.waitFor({ state: "visible", timeout: 30000 });
  await input.fill(prompt);
  await page.locator(".send-button.send-mode").first().click();
  await page.locator(".msg-image").last().waitFor({ state: "visible", timeout: timeoutMs });

  const tokenRecord = await waitForTokenRecord({
    baseUrl,
    authToken,
    userId,
    dialogId,
    timeoutMs,
  });

  if (expectedModel && tokenRecord.model !== expectedModel) {
    throw new Error(`expected model ${expectedModel}, got ${tokenRecord.model}`);
  }
  if (Number(tokenRecord.image_generation_count) !== expectedImageCount) {
    throw new Error(
      `expected image_generation_count=${expectedImageCount}, got ${tokenRecord.image_generation_count}`
    );
  }
  if (!(Number(tokenRecord.cost) >= minExpectedCost)) {
    throw new Error(`expected cost >= ${minExpectedCost}, got ${tokenRecord.cost}`);
  }

  console.log(
    JSON.stringify(
      formatProbeResult({
        baseUrl,
        agentKey,
        dialogId,
        dialogKey,
        tokenRecord,
      }),
      null,
      2
    )
  );
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}
