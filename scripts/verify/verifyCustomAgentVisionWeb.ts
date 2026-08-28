#!/usr/bin/env bun

import { chromium, firefox, webkit, type BrowserType, type Page } from "playwright";
import { PNG } from "pngjs";
import { parsePositiveFiniteNumberOrFallback } from "core/positiveFiniteNumberOrFallback";
import { extractCustomId } from "../../packages/core/prefix";
import { LOCAL_SERVER_ORIGIN } from "../helpers/serverBases";
import { apiPost } from "../helpers/apiHelpers";
import { resolveAuthToken, parseUserIdFromAuthToken } from "../helpers/authContext";
import {
  buildPlaywrightAuthBootstrap,
  installPlaywrightAuthBootstrap,
} from "../helpers/playwrightAuth";
import { launchBrowserProbe, probeHeadless } from "../probes/helpers/playwrightLaunch";

const BASE_URL = (process.env.BASE_URL ?? LOCAL_SERVER_ORIGIN).replace(/\/+$/, "");
const AUTH_TOKEN = resolveAuthToken();
const USER_ID = parseUserIdFromAuthToken(AUTH_TOKEN);
const BROWSER = (process.env.BROWSER ?? "chrome").trim().toLowerCase();
const HEADLESS = probeHeadless(false);
const CUSTOM_VISION_DEFAULT_SPACE_ID = "01KKY77TT0DA9NY7TNW3R7255N";
const SPACE_ID = (process.env.CUSTOM_VISION_SPACE_ID ?? CUSTOM_VISION_DEFAULT_SPACE_ID).trim();
const TIMEOUT_MS = parsePositiveFiniteNumberOrFallback(
  process.env.CUSTOM_VISION_TIMEOUT_MS,
  180_000,
);

const DEFAULT_CUSTOM_VISION_AGENT_KEY =
  "fullstack";
const CUSTOM_VISION_AGENT_KEY =
  process.env.CUSTOM_VISION_AGENT_KEY?.trim() || DEFAULT_CUSTOM_VISION_AGENT_KEY;
const CUSTOM_VISION_EXISTING_DIALOG =
  process.env.CUSTOM_VISION_EXISTING_DIALOG?.trim() || "";

type AgentRunResponse = {
  dialogId?: string;
  dialogKey?: string;
  content?: string;
};

type DialogMessage = {
  role?: string;
  content?: any;
  id?: string;
  dbKey?: string;
};

function getBrowserType(): BrowserType {
  if (BROWSER === "firefox") return firefox;
  if (BROWSER === "webkit") return webkit;
  return chromium;
}

function normalizeDialogKey(input: string) {
  if (!input) return "";
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const tail = new URL(input).pathname.split("/").filter(Boolean).at(-1) ?? "";
    return decodeURIComponent(tail);
  }
  if (input.startsWith("dialog-")) return input;
  if (!USER_ID) throw new Error("Cannot normalize bare dialog id without USER_ID.");
  return `dialog-${USER_ID}-${input}`;
}

function buildVisionFixturePng() {
  const png = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = 230;
      png.data[idx + 1] = 24;
      png.data[idx + 2] = 24;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function collectStrings(value: unknown, out: string[] = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

function hasImagePart(message: DialogMessage) {
  if (!Array.isArray(message.content)) return false;
  return message.content.some(
    (part: any) =>
      part?.type === "image_url" &&
      typeof part?.image_url?.url === "string" &&
      part.image_url.url.includes("/api/v1/db/file/content/"),
  );
}

function hasDurableInlineImagePayload(message: DialogMessage) {
  if (!Array.isArray(message.content)) return false;
  return message.content.some((part: any) => {
    const url = part?.image_url?.url;
    return (
      (typeof url === "string" && url.startsWith("data:image")) ||
      typeof part?.original_data_url === "string" ||
      typeof part?.google_native?.inlineData?.data === "string"
    );
  });
}

function messageIdentity(message: DialogMessage, index: number) {
  if (message.id) return `id:${message.id}`;
  if (message.dbKey) return `dbKey:${message.dbKey}`;
  return `fallback:${index}:${message.role ?? ""}:${JSON.stringify(message.content ?? "").slice(0, 200)}`;
}

function assertVisionReply(text: string) {
  const normalized = text.toLowerCase();
  const seesRed = /红色|红|red/i.test(text);
  const seesSquare = /方块|正方形|色块|square|block|rectangle/i.test(text);
  const seesRedSquare =
    (seesRed && seesSquare) ||
    /红.{0,8}(方块|正方形|色块)/.test(text) ||
    /red.{0,20}(square|block|rectangle)/i.test(text) ||
    /(square|block|rectangle).{0,20}red/i.test(text);
  const refusesVision =
    /无法.*(看到|识别|查看)|不能.*(看到|识别|查看)|看不到|not.*see|cannot.*see|can't.*see/i.test(
      normalized,
    );

  if (!seesRedSquare || refusesVision) {
    throw new Error(
      `Custom vision probe failed: expected assistant to identify the uploaded image as red square / 红色方块, got: ${text.slice(0, 500)}`,
    );
  }
}

async function readDialogMessages(dialogId: string): Promise<DialogMessage[]> {
  const response = await fetch(`${BASE_URL}/rpc/getConvMsgs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dialogId, limit: 80 }),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Failed to read dialog messages (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function createProbeDialog() {
  const response = await apiPost<AgentRunResponse>(
    `${BASE_URL}/api/agent/run`,
    {
      agentKey: CUSTOM_VISION_AGENT_KEY,
      userInput: `custom-agent-vision-bootstrap ${Date.now().toString(36)} 只回复 ready`,
      stream: false,
      runtimeContext: {
        surface: "verify-script",
        host: "local-shell",
        runtime: "bun",
        entrypoint: "scripts/verify/verifyCustomAgentVisionWeb.ts",
        capabilities: ["text-io", "vision-probe"],
      },
      ...(SPACE_ID ? { spaceId: SPACE_ID } : {}),
    },
    AUTH_TOKEN,
    { timeoutMs: TIMEOUT_MS },
  );

  if (!response.ok || !response.data?.dialogId) {
    throw new Error(
      `Failed to create probe dialog (${response.status}): ${JSON.stringify(response.data)}`,
    );
  }

  return response.data.dialogKey || `dialog-${USER_ID}-${response.data.dialogId}`;
}

async function uploadAndAsk(page: Page, dialogId: string, dialogUrl: string) {
  const beforeMessages = await readDialogMessages(dialogId);
  const beforeMessageIds = new Set(
    beforeMessages.map((message, index) => messageIdentity(message, index)),
  );
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: `custom-vision-red-square-${Date.now().toString(36)}.png`,
      mimeType: "image/png",
      buffer: buildVisionFixturePng(),
    },
  ]);

  await page.waitForFunction(
    () => document.querySelectorAll(".attachments-preview .image-item").length >= 1,
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForFunction(
    () =>
      !document.querySelector(".message-input--processing") &&
      !document.querySelector(".send-button.send-mode:disabled"),
    undefined,
    { timeout: 60_000 },
  );

  const prompt =
    "custom-agent-vision-upload-identify 请识别我上传的图片。图片内容是一个 red square / 红色方块。请只回答你看到的主要颜色和形状。";
  await page.locator(".message-input__textarea").first().fill(prompt);
  await page.waitForFunction(
    () => !document.querySelector(".send-button.send-mode:disabled"),
    undefined,
    { timeout: 60_000 },
  );
  await page.locator(".message-input__textarea").first().press("Enter");

  const deadline = Date.now() + TIMEOUT_MS;
  let sawPersistedUserImage = false;
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const localVisionBlock = bodyText.includes("当前 Agent 不支持图片输入");
    if (localVisionBlock) {
      throw new Error("Custom vision probe failed: localVisionBlock=true");
    }

    const messages = await readDialogMessages(dialogId);
    const newMessages = messages.filter(
      (message, index) => !beforeMessageIds.has(messageIdentity(message, index)),
    );
    sawPersistedUserImage ||= newMessages.some(
      (message) => message.role === "user" && hasImagePart(message),
    );
    const latestAssistantText = [...newMessages]
      .reverse()
      .filter((message) => message.role === "assistant")
      .flatMap((message) => collectStrings(message.content))
      .join("\n")
      .trim();

    if (latestAssistantText) {
      if (/\[API Error\]|<\d{3}>|InternalError\.|InvalidParameter/i.test(latestAssistantText)) {
        throw new Error(`Custom vision probe failed with provider API error: ${latestAssistantText.slice(0, 500)}`);
      }
      const userImagePersisted = newMessages.some(
        (message) => message.role === "user" && hasImagePart(message),
      );
      if (!userImagePersisted) {
        throw new Error(
          `Custom vision probe failed: uploaded image was not persisted as image_url. dialogUrl=${dialogUrl}`,
        );
      }
      const hasInlineImagePayload = newMessages.some(hasDurableInlineImagePayload);
      if (hasInlineImagePayload) {
        throw new Error(
          `Custom vision probe failed: persisted image message still contains inline image payload. dialogUrl=${dialogUrl}`,
        );
      }
      assertVisionReply(latestAssistantText);
      return {
        assistantText: latestAssistantText,
        messageCount: messages.length,
        localVisionBlock,
        userImagePersisted,
      };
    }

    await Bun.sleep(2_000);
  }

  throw new Error(
    `Timed out waiting for custom vision reply after ${TIMEOUT_MS}ms. userImagePersisted=${sawPersistedUserImage} dialogUrl=${dialogUrl}`,
  );
}

async function main() {
  if (!AUTH_TOKEN) {
    throw new Error("Missing auth token. Set AUTH_TOKEN (or AUTH / BENCHMARK_AUTH_TOKEN).");
  }
  if (!USER_ID) {
    throw new Error("Failed to parse USER_ID from auth token.");
  }

  const dialogKey = normalizeDialogKey(CUSTOM_VISION_EXISTING_DIALOG) || await createProbeDialog();
  const dialogId = extractCustomId(dialogKey);
  const dialogUrl = `${BASE_URL}/space/${SPACE_ID}/${dialogKey}`;

  const browser = await launchBrowserProbe(getBrowserType(), {
    headless: HEADLESS,
    ...(BROWSER === "chrome" ? { channel: "chrome" } : {}),
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    await installPlaywrightAuthBootstrap(
      page,
      buildPlaywrightAuthBootstrap(AUTH_TOKEN, {
        currentServer: BASE_URL,
        syncServers: [BASE_URL],
      }),
    );
    await page.goto(dialogUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator(".message-input__textarea").first().waitFor({
      state: "visible",
      timeout: 30_000,
    });

    const result = await uploadAndAsk(page, dialogId, dialogUrl);
    console.log(
      JSON.stringify(
        {
          ok: true,
          baseUrl: BASE_URL,
          browser: BROWSER,
          headless: HEADLESS,
          agentKey: CUSTOM_VISION_AGENT_KEY,
          dialogUrl,
          dialogId,
          expected: "red square / 红色方块",
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

await main();
