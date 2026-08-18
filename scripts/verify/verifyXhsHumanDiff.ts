#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { compactWhitespace } from "core/compactWhitespace";
import { toErrorMessage } from "core/errorMessage";
import {
  resolveXhsAnonymousUserDataDir,
  resolveXhsDesktopBrowserChannel,
} from "../../packages/integrations/xhs-reader/bridge/readXhsProfileWithBridge";

const DEFAULT_PROFILE_URL = "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556";

type HumanEvent = {
  type: string;
  at: string;
  url?: string;
  text?: string;
  tagName?: string;
  href?: string;
  role?: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
  x?: number;
  y?: number;
  scrollX?: number;
  scrollY?: number;
};

function readFlag(name: string) {
  const prefix = `${name}=`;
  const inline = Bun.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (inline !== undefined) return inline;
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
}

function hasFlag(name: string) {
  return Bun.argv.includes(name);
}

function assertNoSensitiveText(label: string, value: string) {
  if (/(^|[;\s])(?:a1|web_session|webId|galaxy_sessionid)=/i.test(value)) {
    throw new Error(`${label} appears to contain browser session material; refusing to continue.`);
  }
  if (/bypass|绕过验证|规避平台风控|隐形自动化/i.test(value)) {
    throw new Error(`${label} contains a disallowed automation route.`);
  }
}

function redactXhsUrl(value: string | undefined) {
  if (!value) return value;
  try {
    const url = new URL(value);
    for (const key of ["xsec_token", "token", "access_token"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "[redacted]");
    }
    return url.toString();
  } catch {
    return value.replace(/(xsec_token=)[^&#]+/gi, "$1[redacted]");
  }
}

const profileUrl = readFlag("--profile-url") ?? readFlag("--url") ?? DEFAULT_PROFILE_URL;
const manualMs = Math.min(10 * 60_000, Math.max(5_000, Number(readFlag("--manual-ms") ?? 120_000)));
const startMode = readFlag("--start") === "explore" ? "explore" : "profile";
const shouldRun = hasFlag("--run");
const artifactRoot = resolve(readFlag("--artifact-root") ?? "artifacts/xhs-human-diff");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = join(artifactRoot, timestamp);

assertNoSensitiveText("--profile-url", profileUrl);

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(`Usage:
  bun run verify:xhs-human-diff -- --run --profile-url <xhs-profile-url>

Records a human/manual anonymous desktop diff:
  before snapshot -> manual operation window -> after snapshot -> diff artifacts

Options:
  --run                    Actually open a visible anonymous desktop browser.
  --profile-url=<url>      XHS profile URL. Defaults to the maintained sample profile.
  --manual-ms=<n>          Manual operation window. Defaults to 120000, max 600000.
  --start=<explore|profile> Start before snapshot on explore or the target profile. Defaults to profile.
  --artifact-root=<path>   Artifact root. Defaults to artifacts/xhs-human-diff.

Optional env:
  NOLO_XHS_READER_DESKTOP_CHANNEL=<channel> Default desktop channel, defaults to stable.
`);
  process.exit(0);
}

if (!shouldRun) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: true,
    classification: "verify-script",
    profileUrl: redactXhsUrl(profileUrl),
    startMode,
    manualMs,
    artifactDir,
    runCommand:
      "NOLO_XHS_READER_DESKTOP_CHANNEL=stable bun run verify:xhs-human-diff -- --run --start=explore --profile-url <xhs-profile-url> --manual-ms 120000",
    policy: "匿名桌面记录；不登录、不写表、不复用用户真实浏览器资料、不使用平台私有接口。",
    artifacts: ["before.json", "after.json", "events.json", "diff.json", "before.png", "after.png"],
  }, null, 2));
  process.exit(0);
}

function sanitizeEvent(event: HumanEvent): HumanEvent {
  return {
    ...event,
    href: redactXhsUrl(event.href),
    url: redactXhsUrl(event.url),
    text: event.text?.slice(0, 160),
    className: event.className?.slice(0, 240),
  };
}

function compactText(value: string | undefined | null, max = 160) {
  return compactWhitespace(String(value ?? "")).slice(0, max);
}

async function installRecorder(page: any, events: HumanEvent[]) {
  await page.exposeBinding("noloRecordXhsHumanEvent", (_source: unknown, event: HumanEvent) => {
    events.push(sanitizeEvent(event));
  }).catch(() => undefined);
  await page.addInitScript(() => {
    const record = (event: any) => {
      const target = event.target as Element | null;
      if (!target || typeof (window as any).noloRecordXhsHumanEvent !== "function") return;
      const anchor = target.closest?.("a") as HTMLAnchorElement | null;
      const element = target as HTMLElement;
      const rect = element.getBoundingClientRect?.();
      void (window as any).noloRecordXhsHumanEvent({
        type: event.type,
        at: new Date().toISOString(),
        url: location.href,
        text: (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
        tagName: target.tagName,
        href: anchor?.href,
        role: target.getAttribute?.("role") ?? undefined,
        ariaLabel: target.getAttribute?.("aria-label") ?? undefined,
        title: target.getAttribute?.("title") ?? undefined,
        className: String(target.getAttribute?.("class") ?? "").slice(0, 240),
        x: rect ? Math.round(rect.x) : undefined,
        y: rect ? Math.round(rect.y) : undefined,
        scrollX: Math.round(window.scrollX),
        scrollY: Math.round(window.scrollY),
      });
    };
    window.addEventListener("click", record, true);
    window.addEventListener("wheel", record, true);
    window.addEventListener("keydown", record, true);
  });
}

async function installFinishOverlay(page: any, finish: () => void, targetProfileUrl: string) {
  await page.exposeBinding("noloFinishXhsHumanDiff", () => finish()).catch(() => undefined);
  await page.evaluate((targetUrl: string) => {
    const id = "nolo-xhs-human-diff-finish";
    document.getElementById(id)?.remove();
    document.getElementById("nolo-xhs-human-diff-target")?.remove();
    const button = document.createElement("button");
    button.id = id;
    button.textContent = "结束记录";
    button.style.cssText = [
      "position:fixed",
      "right:16px",
      "top:16px",
      "z-index:2147483647",
      "padding:10px 14px",
      "border:1px solid #111",
      "border-radius:6px",
      "background:#111",
      "color:#fff",
      "font:14px -apple-system,BlinkMacSystemFont,sans-serif",
      "cursor:pointer",
      "box-shadow:0 4px 18px rgba(0,0,0,.2)",
    ].join(";");
    button.addEventListener("click", () => {
      void (window as any).noloFinishXhsHumanDiff?.();
      button.textContent = "记录结束中...";
    });
    const target = document.createElement("div");
    target.id = "nolo-xhs-human-diff-target";
    target.textContent = `目标主页: ${targetUrl}`;
    target.style.cssText = [
      "position:fixed",
      "right:16px",
      "top:60px",
      "z-index:2147483647",
      "max-width:420px",
      "padding:8px 10px",
      "border:1px solid #111",
      "border-radius:6px",
      "background:#fff",
      "color:#111",
      "font:12px -apple-system,BlinkMacSystemFont,sans-serif",
      "box-shadow:0 4px 18px rgba(0,0,0,.18)",
      "overflow-wrap:anywhere",
    ].join(";");
    document.documentElement.appendChild(button);
    document.documentElement.appendChild(target);
  }, redactXhsUrl(targetProfileUrl)).catch(() => undefined);
}

async function removeFinishOverlay(page: any) {
  await page.evaluate(() => {
    document.getElementById("nolo-xhs-human-diff-finish")?.remove();
    document.getElementById("nolo-xhs-human-diff-target")?.remove();
  }).catch(() => undefined);
}

async function snapshotPage(page: any, screenshotPath: string) {
  const data = await page.evaluate(() => {
    const isVisible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.x < window.innerWidth &&
        rect.y < window.innerHeight &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        Number(style.opacity || "1") > 0;
    };
    const textOf = (el: Element) => [
      el.textContent ?? "",
      el.getAttribute("aria-label") ?? "",
      el.getAttribute("title") ?? "",
      el.getAttribute("class") ?? "",
    ].join(" ").replace(/\s+/g, " ").trim();
    const rectOf = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const budget = { nodes: 0 };
    const countInitialStateNotes = (value: unknown, seen = new WeakSet<object>(), depth = 0): number => {
      if (depth > 12 || budget.nodes > 5000) return 0;
      if (!value || typeof value !== "object") return 0;
      if (seen.has(value as object)) return 0;
      seen.add(value as object);
      budget.nodes += 1;
      if (Array.isArray(value)) {
        return value.reduce((total, item) => total + countInitialStateNotes(item, seen, depth + 1), 0);
      }
      const obj = value as Record<string, unknown>;
      const id = String(obj.noteId ?? obj.note_id ?? obj.id ?? "");
      const title = String(obj.title ?? obj.displayTitle ?? obj.desc ?? "");
      let total = /^[a-f0-9]{20,32}$/i.test(id) && title ? 1 : 0;
      for (const child of Object.values(obj)) total += countInitialStateNotes(child, seen, depth + 1);
      return total;
    };
    const visibleCloseCandidates = Array.from(document.querySelectorAll([
      "button",
      "[role='button']",
      "[aria-label]",
      "[title]",
      "[class*='close' i]",
      "[class*='icon-close' i]",
      "svg",
    ].join(","))).filter((el) =>
      isVisible(el) &&
      /关闭|close|dismiss|modal-close|icon-close|reds-icon-close|×|✕|x/i.test(textOf(el))
    ).slice(0, 20).map((el) => ({
      text: textOf(el).slice(0, 160),
      tagName: el.tagName,
      role: el.getAttribute("role") ?? undefined,
      ariaLabel: el.getAttribute("aria-label") ?? undefined,
      title: el.getAttribute("title") ?? undefined,
      className: String(el.getAttribute("class") ?? "").slice(0, 240),
      rect: rectOf(el),
    }));
    const visibleNoteLinks = Array.from(
      document.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"]'),
    ).filter(isVisible).slice(0, 50).map((el) => ({
      href: (el as HTMLAnchorElement).href,
      text: textOf(el).slice(0, 160),
      rect: rectOf(el),
    }));
    const visibleCards = visibleNoteLinks.slice(0, 30).map((link) => {
      const anchor = Array.from(document.querySelectorAll("a")).find((el) => (el as HTMLAnchorElement).href === link.href);
      const card = anchor?.closest?.("[class*='note'], [class*='card'], section, article, li, div") ?? anchor;
      const image = card?.querySelector?.("img") as HTMLImageElement | null;
      return {
        href: link.href,
        text: textOf(card ?? anchor ?? document.body).slice(0, 240),
        imageUrl: image?.currentSrc || image?.src || undefined,
        rect: card ? rectOf(card) : link.rect,
      };
    });
    const initialState = (window as any).__INITIAL_STATE__;
    return {
      capturedAt: new Date().toISOString(),
      url: location.href,
      title: document.title,
      bodyTextLength: (document.body?.innerText ?? "").length,
      scrollX: Math.round(window.scrollX),
      scrollY: Math.round(window.scrollY),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      initialStatePresent: Boolean(initialState),
      initialStateNoteCount: countInitialStateNotes(initialState),
      visibleCloseCandidates,
      visibleNoteLinks,
      visibleCards,
      visibleTextSample: (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 800),
    };
  });
  const redacted = JSON.parse(JSON.stringify(data), (_key, value) =>
    typeof value === "string" ? redactXhsUrl(value) : value
  );
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return redacted;
}

function diffSnapshots(before: any, after: any, events: HumanEvent[]) {
  const beforeLinks = new Set((before.visibleNoteLinks ?? []).map((link: any) => link.href));
  const afterLinks = new Set((after.visibleNoteLinks ?? []).map((link: any) => link.href));
  const beforeCards = new Set((before.visibleCards ?? []).map((card: any) => compactText(card.text, 120)));
  const afterCards = new Set((after.visibleCards ?? []).map((card: any) => compactText(card.text, 120)));
  return {
    urlChanged: before.url !== after.url,
    beforeUrl: before.url,
    afterUrl: after.url,
    bodyTextLengthDelta: Number(after.bodyTextLength ?? 0) - Number(before.bodyTextLength ?? 0),
    initialStateNoteCountDelta:
      Number(after.initialStateNoteCount ?? 0) - Number(before.initialStateNoteCount ?? 0),
    visibleCloseCandidateCountDelta:
      Number(after.visibleCloseCandidates?.length ?? 0) - Number(before.visibleCloseCandidates?.length ?? 0),
    visibleNoteLinkCountDelta:
      Number(after.visibleNoteLinks?.length ?? 0) - Number(before.visibleNoteLinks?.length ?? 0),
    visibleCardCountDelta:
      Number(after.visibleCards?.length ?? 0) - Number(before.visibleCards?.length ?? 0),
    newVisibleNoteLinks: [...afterLinks].filter((href) => !beforeLinks.has(href)).slice(0, 30),
    newVisibleCardTexts: [...afterCards].filter((text) => text && !beforeCards.has(text)).slice(0, 30),
    clickedTargets: events.filter((event) => event.type === "click").slice(0, 50),
    scrollEvents: events.filter((event) => event.type === "wheel").length,
    keyEvents: events.filter((event) => event.type === "keydown").length,
  };
}

async function main() {
  const playwright = await import("playwright");
  await mkdir(artifactDir, { recursive: true });
  const events: HumanEvent[] = [];
  const channel = resolveXhsDesktopBrowserChannel(process.env.NOLO_XHS_READER_DESKTOP_CHANNEL);
  const context = await playwright.chromium.launchPersistentContext(
    resolveXhsAnonymousUserDataDir(),
    {
      headless: false,
      channel,
      viewport: null,
      args: ["--start-maximized"],
    },
  );
  let activePage = context.pages()[0] ?? await context.newPage();
  const preparePage = async (nextPage: any) => {
    activePage = nextPage;
    await installRecorder(nextPage, events);
    if (!finished) await installFinishOverlay(nextPage, finish, profileUrl);
    nextPage.on?.("domcontentloaded", () => {
      activePage = nextPage;
      if (!finished) void installFinishOverlay(nextPage, finish, profileUrl);
    });
    nextPage.on?.("framenavigated", () => {
      activePage = nextPage;
    });
  };
  let finished = false;
  const finish = () => {
    finished = true;
  };
  context.on("page", (nextPage: any) => {
    void preparePage(nextPage);
  });
  const page = activePage;
  await installRecorder(page, events);
  await page.goto("https://www.xiaohongshu.com/explore", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.mouse.move(360, 260, { steps: 12 }).catch(() => undefined);
  await page.mouse.wheel(0, 420).catch(() => undefined);
  await page.waitForTimeout(800);
  if (startMode === "profile") {
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
  }
  const looksLoggedIn = await page.evaluate(() => /退出登录|编辑资料/.test(document.body?.innerText ?? ""))
    .catch(() => false);
  if (looksLoggedIn) {
    await context.close();
    throw new Error("XHS page visibly looks logged in. Refusing to record with a logged-in session.");
  }

  const before = await snapshotPage(page, join(artifactDir, "before.png"));
  await writeFile(join(artifactDir, "before.json"), `${JSON.stringify(before, null, 2)}\n`);

  await installFinishOverlay(page, finish, profileUrl);
  page.on("domcontentloaded", () => {
    activePage = page;
    if (!finished) void installFinishOverlay(page, finish, profileUrl);
  });
  page.on?.("framenavigated", () => {
    activePage = page;
  });
  console.log(JSON.stringify({
    ok: true,
    recording: true,
    message: startMode === "explore"
      ? "Chrome 已从首页开始记录。请不要登录；请按真人路径进入右上角显示的目标主页。结束时点右上角“结束记录”。"
      : "Chrome 已打开。请不要登录；像真人一样点叉、滚动、点卡片。结束时点右上角“结束记录”，或等待 manualMs 超时。",
    startMode,
    targetProfileUrl: redactXhsUrl(profileUrl),
    manualMs,
    artifactDir,
  }, null, 2));
  const startedAt = Date.now();
  while (!finished && Date.now() - startedAt < manualMs) {
    await page.waitForTimeout(500);
  }
  const finalPage = activePage;
  await removeFinishOverlay(finalPage);
  await finalPage.waitForTimeout(500);

  const after = await snapshotPage(finalPage, join(artifactDir, "after.png"));
  const sanitizedEvents = events.map(sanitizeEvent);
  const diff = diffSnapshots(before, after, sanitizedEvents);
  await writeFile(join(artifactDir, "after.json"), `${JSON.stringify(after, null, 2)}\n`);
  await writeFile(join(artifactDir, "events.json"), `${JSON.stringify(sanitizedEvents, null, 2)}\n`);
  await writeFile(join(artifactDir, "diff.json"), `${JSON.stringify(diff, null, 2)}\n`);
  await context.close();

  console.log(JSON.stringify({
    ok: true,
    artifactDir,
    before: {
      url: before.url,
      visibleCloseCandidates: before.visibleCloseCandidates.length,
      visibleNoteLinks: before.visibleNoteLinks.length,
      visibleCards: before.visibleCards.length,
      initialStateNoteCount: before.initialStateNoteCount,
    },
    after: {
      url: after.url,
      visibleCloseCandidates: after.visibleCloseCandidates.length,
      visibleNoteLinks: after.visibleNoteLinks.length,
      visibleCards: after.visibleCards.length,
      initialStateNoteCount: after.initialStateNoteCount,
    },
    diff,
  }, null, 2));
}

main().catch((error) => {
  console.error(toErrorMessage(error));
  process.exit(1);
});
