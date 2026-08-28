/**
 * Playwright-based XHS profile collector.
 *
 * Opens a profile URL in a desktop browser, reads window.__INITIAL_STATE__,
 * scrolls to trigger pagination via real user_posted responses,
 * and captures + normalizes all note data.
 *
 * Supports dependency injection of a Page-like object for unit testing.
 */

import {
  normalizeComment,
  normalizeNoteDetail,
  normalizeProfileState,
  normalizeProfileNote,
} from "../normalize";
import { redactXhsSensitiveValue } from "../redaction";
import type {
  XhsComment,
  XhsCollectorDiagnostic,
  XhsFailureCode,
  XhsNoteDetail,
  XhsNoteSummary,
  XhsProfile,
} from "../types";

// Minimal page interface for dependency injection
export interface XhsPageLike {
  goto(url: string, opts?: { waitUntil?: string }): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
  waitForResponse(
    fn: (resp: { url: () => string; ok: () => boolean }) => boolean,
    opts?: { timeout?: number },
  ): Promise<{ json: () => Promise<unknown> }>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  /** Current page URL. Available on real Playwright pages. */
  url?(): string;
  /** Page title. Available on real Playwright pages. */
  title?(): Promise<string>;
  close(): Promise<void>;
}

export interface CollectProfilePageResult {
  profile: XhsProfile;
  notes: XhsNoteSummary[];
  diagnostic?: XhsCollectorDiagnostic;
}

export interface CollectVisibleNoteDetailsResult {
  noteDetails: XhsNoteDetail[];
  commentsByNote: Record<string, XhsComment[]>;
  diagnostic?: XhsCollectorDiagnostic;
}

interface InternalState {
  noteMap: Map<string, XhsNoteSummary>;
  profile: XhsProfile | null;
}

function unwrapReactiveValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if ("_value" in record || "_rawValue" in record) {
    return record._value ?? record._rawValue;
  }
  return value;
}

/**
 * Detect whether the page shows a login wall or captcha.
 * Returns a diagnostic code + evidence, or null if the page looks normal.
 */
function detectPageBlockers(
  pageUrl: string,
  pageTitle: string,
): { code: XhsFailureCode; reason: string } | null {
  const lowerUrl = pageUrl.toLowerCase();
  const lowerTitle = pageTitle.toLowerCase();

  // Captcha / verification detection
  if (
    lowerUrl.includes("website-login/error") ||
    lowerTitle.includes("安全限制") ||
    lowerTitle.includes("验证") ||
    lowerTitle.includes("captcha") ||
    lowerTitle.includes("verify") ||
    lowerTitle.includes("安全验证")
  ) {
    return { code: "blocked", reason: "page title indicates captcha/verification wall" };
  }

  // Login redirect detection
  if (
    lowerUrl.includes("/login") ||
    lowerUrl.includes("loginpage") ||
    lowerUrl.includes("passport.xiaohongshu.com")
  ) {
    return { code: "login_required", reason: "page redirected to login URL" };
  }

  // Title-based login detection
  if (
    lowerTitle.includes("登录") ||
    lowerTitle.includes("login") ||
    lowerTitle.includes("sign in")
  ) {
    return { code: "login_required", reason: "page title indicates login wall" };
  }

  return null;
}

async function dismissVisibleLoginPrompt(page: XhsPageLike): Promise<boolean> {
  return Boolean(await page.evaluate(() => {
    try {
      const marker = "xhs-login-dismiss-v1";
      void marker;
      const visible = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 &&
          rect.height > 0 &&
          rect.x >= 0 &&
          rect.y >= 0 &&
          rect.x < window.innerWidth &&
          rect.y < window.innerHeight &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity || "1") > 0;
      };
      const pageLooksLikeLogin = /登录|login|sign.?in|手机号|验证码/i.test(
        document.body?.innerText ?? "",
      );
      const textOf = (el: Element) => [
        el.textContent ?? "",
        el.getAttribute("aria-label") ?? "",
        el.getAttribute("title") ?? "",
        el.getAttribute("class") ?? "",
        el.getAttribute("id") ?? "",
      ].join(" ");
      const looksLikeLogin = (el: Element | null) => {
        let current = el;
        for (let depth = 0; current && depth < 5; depth += 1) {
          if (/登录|手机号|验证码|login|sign.?in/i.test(textOf(current))) return true;
          current = current.parentElement;
        }
        return false;
      };
      const looksLikeClose = (el: Element) =>
        /关闭|close|dismiss|modal-close|icon-close|reds-icon-close|×|✕|x/i.test(textOf(el).trim());
      const textlessTopRightLoginIcon = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const tagName = el.tagName.toLowerCase();
        return pageLooksLikeLogin &&
          tagName === "svg" &&
          rect.width <= 48 &&
          rect.height <= 48 &&
          rect.x > window.innerWidth * 0.55 &&
          rect.y < window.innerHeight * 0.35 &&
          textOf(el).trim().length <= 40 &&
          (
            looksLikeLogin(el) ||
            Boolean(el.closest("[class*='login' i], [class*='Login'], [class*='modal' i], [role='dialog']"))
          );
      };
      const candidates = Array.from(document.querySelectorAll([
        "button",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "[class*='close' i]",
        "[class*='Close']",
        "[class*='icon-close' i]",
        "[class*='reds-icon-close' i]",
        "svg",
      ].join(",")));
      const target = candidates.find((el) =>
        visible(el) &&
        el.getAttribute("aria-hidden") !== "true" &&
        (looksLikeClose(el) || textlessTopRightLoginIcon(el)) &&
        (
          looksLikeLogin(el) ||
          (pageLooksLikeLogin && /close-icon|icon-close|reds-icon-close/i.test(textOf(el))) ||
          textlessTopRightLoginIcon(el) ||
          Boolean(el.closest("[class*='login' i], [class*='Login'], [class*='modal' i], [role='dialog']"))
        )
      );
      if (!target) return false;
      const clickable = target.closest("button,[role='button'],[class*='close' i],[class*='Close']") ?? target;
      (clickable as HTMLElement).click();
      return true;
    } catch {
      return false;
    }
  }).catch(() => false));
}

async function readPageVisibilityProbe(page: XhsPageLike): Promise<Pick<
  XhsCollectorDiagnostic,
  "bodyTextLength" | "visibleCloseCandidateCount" | "visibleNoteLinkCount"
> | null> {
  return await page.evaluate(() => {
    try {
      const marker = "xhs-page-visibility-probe-v1";
      void marker;
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
      ].join(" ");
      const pageLooksLikeLogin = /登录|login|sign.?in|手机号|验证码/i.test(
        document.body?.innerText ?? "",
      );
      const textlessTopRightLoginIcon = (el: Element) => {
        const rect = el.getBoundingClientRect();
        const tagName = el.tagName.toLowerCase();
        return pageLooksLikeLogin &&
          tagName === "svg" &&
          rect.width <= 48 &&
          rect.height <= 48 &&
          rect.x > window.innerWidth * 0.55 &&
          rect.y < window.innerHeight * 0.35 &&
          textOf(el).trim().length <= 40;
      };
      const visibleCloseCandidateCount = Array.from(document.querySelectorAll([
        "button",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "[class*='close' i]",
        "[class*='icon-close' i]",
        "svg",
      ].join(","))).filter((el) =>
        isVisible(el) &&
        (
          /关闭|close|dismiss|modal-close|icon-close|reds-icon-close|×|✕|x/i.test(textOf(el)) ||
          textlessTopRightLoginIcon(el)
        )
      ).length;
      const visibleNoteLinkCount = Array.from(
        document.querySelectorAll('a[href*="/explore/"], a[href*="/discovery/item/"]'),
      ).filter(isVisible).length;
      return {
        bodyTextLength: (document.body?.innerText ?? "").length,
        visibleCloseCandidateCount,
        visibleNoteLinkCount,
      };
    } catch {
      return {
        bodyTextLength: 0,
        visibleCloseCandidateCount: 0,
        visibleNoteLinkCount: 0,
      };
    }
  }).catch(() => null);
}

/**
 * Probe __INITIAL_STATE__ for note-like data to count how many notes
 * are visible in the initial page load.
 */
function countNotesInState(state: unknown): number {
  if (!state || typeof state !== "object") return 0;
  const s = state as Record<string, unknown>;
  const userContainer = s.user as Record<string, unknown> | undefined;

  // Real XHS shape: state.user.notes[0]
  const userNotes = unwrapReactiveValue(userContainer?.notes) as unknown[] | undefined;
  if (Array.isArray(userNotes) && userNotes.length > 0) {
    const firstPage = userNotes[0];
    if (Array.isArray(firstPage)) return firstPage.length;
  }

  // Alternate: state.user.userPageData.notes / noteList / choosedNotes
  const userPageData = unwrapReactiveValue(userContainer?.userPageData ?? s.userPageData) as
    | Record<string, unknown>
    | undefined;
  if (userPageData) {
    const lists = ["notes", "noteList", "choosedNotes"] as const;
    for (const key of lists) {
      const arr = userPageData[key];
      if (Array.isArray(arr) && arr.length > 0) return arr.length;
    }
  }

  return 0;
}

/**
 * Collect profile and notes from a XHS profile page using Playwright.
 *
 * @param page - A Playwright Page or compatible object.
 * @param profileUrl - The full XHS profile URL.
 * @param maxScrollPages - Max number of scroll/pagination pages to collect.
 * @returns Normalized profile + notes list + optional diagnostic.
 */
export async function collectProfilePage(
  page: XhsPageLike,
  profileUrl: string,
  maxScrollPages: number = 5,
): Promise<CollectProfilePageResult> {
  const collectorState: InternalState = {
    noteMap: new Map(),
    profile: null,
  };

  const diagnostic: XhsCollectorDiagnostic = {
    code: "unknown",
    message: "",
  };

  // Set up response listener before navigation to capture user_posted responses
  const capturedResponses: Array<{ url: string; status: number; json: () => Promise<unknown> }> = [];
  const responseHandler = (resp: unknown) => {
    const r = resp as {
      url: () => string;
      ok: () => boolean;
      status: () => number;
      json: () => Promise<unknown>;
    };
    if (
      r.url().includes("/api/sns/web/v1/user_posted") &&
      r.ok()
    ) {
      capturedResponses.push({
        url: r.url(),
        status: r.status(),
        json: r.json.bind(r),
      });
    }
  };

  // Some Page implementations use page.on, others need different setup
  try {
    page.on("response", responseHandler);
  } catch {
    // If on() is not available, we rely on __INITIAL_STATE__ only
  }

  // Navigate to the profile page
  await page.goto(profileUrl, { waitUntil: "networkidle" });
  const loginPromptDismissedAfterNavigation = await dismissVisibleLoginPrompt(page);
  if (loginPromptDismissedAfterNavigation) {
    diagnostic.loginPromptDismissed = true;
  }

  // Capture page state for diagnostics
  const finalUrl = page.url?.() ?? profileUrl;
  let pageTitle = "";
  try {
    pageTitle = page.title ? await page.title() : "";
  } catch {
    // title() may not be available in all test mocks
  }

  diagnostic.finalUrl = redactXhsSensitiveValue(finalUrl) as string;
  diagnostic.pageTitle = pageTitle;
  const visibilityProbe = await readPageVisibilityProbe(page);
  if (visibilityProbe) {
    diagnostic.bodyTextLength = visibilityProbe.bodyTextLength;
    diagnostic.visibleCloseCandidateCount = visibilityProbe.visibleCloseCandidateCount;
    diagnostic.visibleNoteLinkCount = visibilityProbe.visibleNoteLinkCount;
  }

  // Check for login/captcha blockers
  const earlyBlocker = detectPageBlockers(finalUrl, pageTitle);
  if (earlyBlocker) {
    // Try to detect login state more precisely via page content
    const loginHint = await page.evaluate(() => {
      try {
        // Check for common XHS login indicators in the DOM
        const body = document.body?.innerText ?? "";
        const hasLoginText = /登录|login|sign.?in|手机号|验证码/i.test(body);
        // Check for login modal / overlay
        const loginModal = document.querySelector('[class*="login"]') ??
                           document.querySelector('[class*="Login"]');
        return { hasLoginText, hasLoginModal: !!loginModal };
      } catch {
        return { hasLoginText: false, hasLoginModal: false };
      }
    }).catch(() => ({ hasLoginText: false, hasLoginModal: false }));

    diagnostic.loginDetected = loginHint?.hasLoginText || loginHint?.hasLoginModal;
    diagnostic.redirectedToLogin = finalUrl.toLowerCase().includes("login");
    diagnostic.code = earlyBlocker.code;
    diagnostic.message = earlyBlocker.reason +
      (diagnostic.loginDetected ? " (login UI detected on page)" : "");
  }

  await waitForInitialProfileState(page, earlyBlocker ? 1_500 : 15_000);

  // Read __INITIAL_STATE__ from the page
  const initialState = await readSerializableInitialState(page);

  diagnostic.initialStatePresent = !!initialState;
  diagnostic.initialStateNoteCount = countNotesInState(initialState);

  if (initialState) {
    const rawState = initialState as Record<string, unknown>;

    // Extract profile info — try real path (state.user.userPageData) first,
    // then flat path (state.userPageData) for backward compat with test fakes.
    const userContainer = rawState.user as Record<string, unknown> | undefined;
    const userPageData = unwrapReactiveValue(
      userContainer?.userPageData ?? rawState.userPageData,
    ) as Record<string, unknown> | undefined;

    if (userPageData) {
      const userId = extractUserId(profileUrl);
      collectorState.profile = normalizeProfileState(
        { userPageData: userPageData as any },
        userId,
      );
    }

    // Extract initial notes from __INITIAL_STATE__
    const noteList = extractNotesFromState(initialState);
    for (const note of noteList) {
      collectorState.noteMap.set(note.noteId, note);
    }
  }

  // If no profile from state, create a minimal one from URL
  if (!collectorState.profile) {
    const userId = extractUserId(profileUrl);
    collectorState.profile = { userId, nickname: "" };
  }

  // Scroll to trigger pagination
  let scrollCount = 0;
  let consecutiveEmpty = 0;

  const userPostedUrlRe = /\/api\/sns\/web\/v1\/user_posted/;

  while (scrollCount < maxScrollPages && consecutiveEmpty < 2) {
    const countBefore = collectorState.noteMap.size;

    // Start the waitForResponse listener before scrolling, so no response is missed.
    // Also prepare the scroll evaluate - both run independently in parallel.
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => userPostedUrlRe.test(r.url()) && r.ok(),
        { timeout: 8000 },
      ).catch(() => null),
      page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      }),
    ]);

    if (resp) {
      try {
        const body = await resp.json();
        const pageNotes = extractNotesFromPostedResponse(body);
        for (const note of pageNotes) {
          collectorState.noteMap.set(note.noteId, note);
        }
      } catch {
        // ignore json parse errors
      }
    }

    scrollCount++;
    if (collectorState.noteMap.size === countBefore) {
      consecutiveEmpty++;
    } else {
      consecutiveEmpty = 0;
    }
  }

  if (!collectorState.profile?.nickname || collectorState.noteMap.size === 0) {
    const lateLoginPromptDismissed = await dismissVisibleLoginPrompt(page);
    if (lateLoginPromptDismissed) {
      diagnostic.loginPromptDismissed = true;
    }
    await waitForInitialProfileState(page, earlyBlocker ? 1_000 : 12_000);
    const lateState = await readSerializableInitialState(page);
    if (lateState) {
      const rawState = lateState as Record<string, unknown>;
      const userContainer = rawState.user as Record<string, unknown> | undefined;
      const userPageData = unwrapReactiveValue(
        userContainer?.userPageData ?? rawState.userPageData,
      ) as Record<string, unknown> | undefined;
      if (userPageData && !collectorState.profile?.nickname) {
        const userId = extractUserId(profileUrl);
        collectorState.profile = normalizeProfileState(
          { userPageData: userPageData as any },
          userId,
        );
      }
      const lateNotes = extractNotesFromState(lateState);
      for (const note of lateNotes) {
        collectorState.noteMap.set(note.noteId, note);
      }
      diagnostic.initialStatePresent = true;
      diagnostic.initialStateNoteCount = Math.max(
        diagnostic.initialStateNoteCount ?? 0,
        countNotesInState(lateState),
      );
    }
  }

  diagnostic.capturedApiResponseCount = capturedResponses.length;
  if (capturedResponses.length > 0) {
    diagnostic.firstApiResponseStatus = capturedResponses[0].status;
  }

  const notes = Array.from(collectorState.noteMap.values());
  const visibleCounts = await readVisibleProfileCounts(page);
  if (collectorState.profile && visibleCounts) {
    const existing = collectorState.profile.interactionCounts;
    collectorState.profile.interactionCounts = {
      follows: existing?.follows ?? visibleCounts.follows,
      fans: existing?.fans ?? visibleCounts.fans,
      likesAndCollects:
        existing?.likesAndCollects ?? visibleCounts.likesAndCollects,
    };
  }

  // Build diagnostic for empty results
  if (notes.length === 0) {
    const diagnosticLoginPromptDismissed = await dismissVisibleLoginPrompt(page);
    if (diagnosticLoginPromptDismissed) {
      diagnostic.loginPromptDismissed = true;
    }
    // Check if the page has login indicators even without URL redirect
    const loginCheck = await page.evaluate(() => {
      try {
        const body = document.body?.innerText ?? "";
        return {
          hasLoginText: /登录|login|sign.?in|请先登录|未登录/i.test(body),
          hasLoginModal: !!(
            document.querySelector('[class*="login"]') ??
            document.querySelector('[class*="Login"]')
          ),
          bodyLength: body.length,
        };
      } catch {
        return { hasLoginText: false, hasLoginModal: false, bodyLength: 0 };
      }
    }).catch(() => ({ hasLoginText: false, hasLoginModal: false, bodyLength: 0 })) as { hasLoginText: boolean; hasLoginModal: boolean; bodyLength: number };
    const safeLoginCheck = loginCheck ?? { hasLoginText: false, hasLoginModal: false, bodyLength: 0 };

    diagnostic.loginDetected = safeLoginCheck.hasLoginText || safeLoginCheck.hasLoginModal;

    // Determine the appropriate diagnostic code
    let code: XhsFailureCode = earlyBlocker?.code ?? "empty_profile_state";
    let message = earlyBlocker
      ? earlyBlocker.reason +
        (diagnostic.loginDetected ? " (login UI detected on page)" : "")
      : "";

    if (earlyBlocker) {
      code = earlyBlocker.code;
      message = earlyBlocker.reason +
        (diagnostic.loginDetected ? " (login UI detected on page)" : "");
    } else if (diagnostic.loginDetected) {
      code = "login_required";
      message =
        "页面检测到登录提示，未获取到笔记。" +
        "当前小红书读取器为匿名公开模式，不会登录或复用账号；" +
        "该页面对未登录访客不可见。";
    } else if (!diagnostic.initialStatePresent) {
      code = "empty_profile_state";
      message =
        "页面未注入 __INITIAL_STATE__，可能页面未完全加载或被反爬拦截。" +
        "请尝试增加 timeoutMs；如果页面要求登录，匿名模式会停止读取。";
    } else if (
      diagnostic.initialStatePresent &&
      (diagnostic.initialStateNoteCount ?? 0) === 0 &&
      diagnostic.capturedApiResponseCount === 0
    ) {
      code = "empty_profile_state";
      message =
        "__INITIAL_STATE__ 存在但未发现笔记数据，且未捕获到 user_posted API 响应。" +
        "可能该用户无公开笔记，或页面在 headless 环境下被限流。" +
        "匿名模式不会切换到登录态读取。";
    } else {
      code = "empty_profile_state";
      message = "收集完成但未获取到笔记数据。";
    }

    diagnostic.code = code;
    diagnostic.message = message;
  }

  return {
    profile: collectorState.profile,
    notes,
    diagnostic: notes.length === 0 ? diagnostic : undefined,
  };
}

async function readVisibleProfileCounts(
  page: XhsPageLike,
): Promise<XhsProfile["interactionCounts"] | null> {
  const counts = await page.evaluate(() => {
    const marker = "xhs-visible-profile-counts-v1";
    void marker;
    const parseVisibleCount = (text: string): number | undefined => {
      const cleaned = text.trim().replace(/,/g, "");
      const match = cleaned.match(/^([\d.]+)\s*(万|亿|千|k|K|w|W)?\+?$/);
      if (!match) return undefined;
      const value = Number(match[1]);
      if (!Number.isFinite(value)) return undefined;
      const unit = match[2];
      if (unit === "万" || unit === "w" || unit === "W") return Math.round(value * 10_000);
      if (unit === "亿") return Math.round(value * 100_000_000);
      if (unit === "千" || unit === "k" || unit === "K") return Math.round(value * 1_000);
      return Math.round(value);
    };
    const lines = (document.body?.innerText ?? "")
      .split(/\n+/)
      .flatMap((line) => {
        const trimmed = line.trim();
        return trimmed ? [trimmed] : [];
      });
    const result: {
      follows?: number;
      fans?: number;
      likesAndCollects?: number;
    } = {};
    for (let i = 0; i < lines.length; i += 1) {
      const label = lines[i];
      const value = i > 0 ? parseVisibleCount(lines[i - 1]) : undefined;
      if (value == null) continue;
      if (label === "关注") result.follows = value;
      if (label === "粉丝") result.fans = value;
      if (label === "获赞与收藏" || label === "赞藏") {
        result.likesAndCollects = value;
      }
    }
    return result;
  }).catch(() => null) as XhsProfile["interactionCounts"] | null;

  if (!counts || typeof counts !== "object") return null;
  const hasAny =
    typeof counts.follows === "number" ||
    typeof counts.fans === "number" ||
    typeof counts.likesAndCollects === "number";
  return hasAny ? counts : null;
}

export async function collectVisibleNoteDetails(
  page: XhsPageLike,
  notes: XhsNoteSummary[],
  options: {
    includeComments?: boolean;
    maxNotes?: number;
  } = {},
): Promise<CollectVisibleNoteDetailsResult> {
  const noteDetails: XhsNoteDetail[] = [];
  const commentsByNote: Record<string, XhsComment[]> = {};
  const maxNotes = Math.max(0, Math.min(options.maxNotes ?? 3, 3));
  let blockedDiagnostic: XhsCollectorDiagnostic | undefined;

  for (const note of notes.slice(0, maxNotes)) {
    const currentFeedDetail = await collectCurrentVisibleFeedCardDetail(page, note);
    if (currentFeedDetail) {
      noteDetails.push(currentFeedDetail);
      continue;
    }

    const noteUrl = buildPublicNoteUrl(note);
    await page.goto(noteUrl.toString(), { waitUntil: "networkidle" });

    // Parallelize independent post-goto operations: dismiss login prompt and read page title.
    const [loginPromptDismissed, pageTitleResolved] = await Promise.all([
      dismissVisibleLoginPrompt(page),
      (async () => {
        try { return page.title ? await page.title() : ""; } catch { return ""; }
      })(),
    ]);
    const finalUrl = page.url?.() ?? noteUrl.toString();
    const pageTitle = pageTitleResolved;

    const blocker = detectPageBlockers(finalUrl, pageTitle);
    if (blocker) {
      const feedClickDetail = await collectVisibleFeedCardDetail(page, note);
      if (feedClickDetail) {
        noteDetails.push(feedClickDetail);
        blockedDiagnostic = undefined;
        continue;
      }
      blockedDiagnostic = {
        code: blocker.code,
        message:
          "匿名打开公开笔记详情页受限，已停止可见详情/评论读取：" +
          blocker.reason,
        finalUrl: redactXhsSensitiveValue(finalUrl) as string,
        pageTitle,
        loginDetected: blocker.code === "login_required",
        loginPromptDismissed,
        captchaDetected: blocker.code === "blocked",
      };
      break;
    }

    await waitForInitialProfileState(page, 8_000);
    const state = await readSerializableInitialState(page);
    const detail = extractVisibleNoteDetail(state, note);
    if (detail) {
      noteDetails.push(detail);
    } else {
      const feedClickDetail = await collectVisibleFeedCardDetail(page, note);
      if (feedClickDetail) {
        noteDetails.push(feedClickDetail);
      }
    }

    if (options.includeComments === true) {
      const comments = extractVisibleComments(state);
      if (comments.length > 0) {
        commentsByNote[note.noteId] = comments.slice(0, 20);
      }
    }
  }

  return {
    noteDetails,
    commentsByNote,
    diagnostic: blockedDiagnostic,
  };
}

function buildPublicNoteUrl(note: XhsNoteSummary): URL {
  const noteUrl = new URL(`https://www.xiaohongshu.com/explore/${note.noteId}`);
  if (note.xsecToken) noteUrl.searchParams.set("xsec_token", note.xsecToken);
  if (note.xsecSource != null) noteUrl.searchParams.set("xsec_source", note.xsecSource);
  return noteUrl;
}

async function collectVisibleFeedCardDetail(
  page: XhsPageLike,
  note: XhsNoteSummary,
): Promise<XhsNoteDetail | null> {
  try {
    await page.goto("https://www.xiaohongshu.com/explore", { waitUntil: "networkidle" });
    await dismissVisibleLoginPrompt(page);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const clicked = await clickVisibleFeedCard(page, note.noteId);
      if (clicked) {
        const { promise: settlePromise, resolve: settleResolve } = Promise.withResolvers<void>();
        setTimeout(settleResolve, 600);
        await settlePromise;
        const state = await readSerializableInitialState(page);
        const stateDetail = extractVisibleNoteDetail(state, note);
        if (stateDetail) return stateDetail;
        const domDetail = await extractVisibleFeedCardDetailFromDom(page, note);
        if (domDetail) return domDetail;
      }

      // Scroll and wait in parallel for next attempt
      const { promise: scrollPromise, resolve: scrollResolve } = Promise.withResolvers<void>();
      setTimeout(scrollResolve, 250);
      await Promise.all([
        page.evaluate(() => {
          window.scrollBy(0, Math.floor(window.innerHeight * 0.85));
        }).catch(() => undefined),
        scrollPromise,
      ]);
    }
  } catch {
    return null;
  }

  return null;
}

async function collectCurrentVisibleFeedCardDetail(
  page: XhsPageLike,
  note: XhsNoteSummary,
): Promise<XhsNoteDetail | null> {
  try {
    const clicked = await clickVisibleFeedCard(page, note.noteId);
    if (!clicked) return null;
    await new Promise((resolve) => setTimeout(resolve, 600));
    const state = await readSerializableInitialState(page);
    const stateDetail = extractVisibleNoteDetail(state, note);
    if (stateDetail) return stateDetail;
    return await extractVisibleFeedCardDetailFromDom(page, note);
  } catch {
    return null;
  }
}

async function clickVisibleFeedCard(
  page: XhsPageLike,
  noteId: string,
): Promise<boolean> {
  return (await page.evaluate((targetNoteId: string) => {
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        `a[href*="/explore/${targetNoteId}"], a[href*="/discovery/item/${targetNoteId}"]`,
      ),
    );
    const target = anchors.find((anchor) => {
      const rect = anchor.getBoundingClientRect();
      const style = window.getComputedStyle(anchor);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x < window.innerWidth &&
        rect.y < window.innerHeight &&
        style.visibility !== "hidden" &&
        style.display !== "none";
    });
    if (!target) return false;
    target.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }));
    return true;
  }, noteId).catch(() => false)) === true;
}

async function extractVisibleFeedCardDetailFromDom(
  page: XhsPageLike,
  note: XhsNoteSummary,
): Promise<XhsNoteDetail | null> {
  const card = await page.evaluate((targetNoteId: string) => {
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x < window.innerWidth &&
        rect.y < window.innerHeight &&
        style.visibility !== "hidden" &&
        style.display !== "none";
    };
    const looksLikeCount = (line: string) => /^[\d.]+\s*(万|w|W|千|k|K)?$/.test(line);
    const cleanLines = (text: string) =>
      text
        .split(/\n+/)
        .flatMap((line) => {
          const trimmed = line.trim();
          if (!trimmed) return [];
          if (/登录|扫码|手机号|验证码|首页|推荐|穿搭|美食|彩妆|影视|职场|情感|家居|游戏|旅行|健身|视频|ICP|营业执照|©/.test(trimmed)) return [];
          if (/^(问点点|ai|RED|直播|发布|消息|更多|关于我们)$/.test(trimmed)) return [];
          return [trimmed];
        });
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        `a[href*="/explore/${targetNoteId}"], a[href*="/discovery/item/${targetNoteId}"]`,
      ),
    ).filter(visible);
    const profileIdFromHref = (href: string) => {
      const match = href.match(/\/user\/profile\/([a-f0-9]{24})/i);
      return match?.[1] ?? "";
    };
    const coverUrl = (() => {
      for (const anchor of anchors) {
        const img = anchor.querySelector<HTMLImageElement>("img");
        const src = img?.currentSrc || img?.src || "";
        const rect = img?.getBoundingClientRect();
        if (src && rect && rect.width >= 80 && rect.height >= 80) {
          return src;
        }
      }
      return "";
    })();
    let best: {
      title: string;
      nickname: string;
      likedText: string;
      userId: string;
      coverUrl: string;
      score: number;
    } | null = null;
    for (const anchor of anchors) {
      const anchorLines = cleanLines(anchor.innerText ?? "");
      // Single pass: find first non-count line
      let anchorTitle = "";
      for (const al of anchorLines) {
        if (!looksLikeCount(al)) { anchorTitle = al; break; }
      }

      let source: Element | null = anchor;
      for (let depth = 0; source && depth < 8; depth += 1) {
        const text = (source as HTMLElement).innerText ?? "";
        if (text.length > 800) {
          source = source.parentElement;
          continue;
        }

        const lines = cleanLines(text);

        // Single pass through lines: find title, likedText, nickname
        let title = "";
        let titleIdx = -1;
        let likedText = "";
        let nickname = "";
        // Build index map for O(1) title lookup by text
        const lineIndexMap = new Map<string, number>();
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li];
          lineIndexMap.set(line, li);
          const isCount = looksLikeCount(line);
          if (anchorTitle && !isCount && title === "") {
            title = anchorTitle;
          }
          if (!anchorTitle && title === "" && !isCount) {
            title = line;
          }
        }
        // Find title position once using Map
        if (title) {
          titleIdx = lineIndexMap.get(title) ?? -1;
        }

        const afterTitle = titleIdx >= 0 ? lines.slice(titleIdx + 1) : lines.slice(1);
        // Single pass through afterTitle for likedText and nickname
        for (const at of afterTitle) {
          if (!likedText && looksLikeCount(at)) { likedText = at; }
          if (!nickname && !looksLikeCount(at) && at !== likedText) { nickname = at; }
        }

        // Find profile link with text content (single pass version)
        const profileLinks = source.querySelectorAll<HTMLAnchorElement>('a[href*="/user/profile/"]');
        let profileLink: HTMLAnchorElement | null = null;
        for (const pl of profileLinks) {
          if (cleanLines(pl.innerText ?? "").join(" ").length > 0) {
            profileLink = pl;
            break;
          }
        }
        const profileLinkText = profileLink
          ? cleanLines(profileLink.innerText ?? "")[0]
          : "";
        const finalNickname = profileLinkText || nickname;
        const userId = profileLink ? profileIdFromHref(profileLink.href) : "";
        const score =
          (title ? 10 : 0) +
          (anchorTitle ? 8 : 0) +
          (finalNickname ? 4 : 0) +
          (likedText ? 4 : 0) +
          (userId ? 4 : 0) +
          (coverUrl ? 2 : 0) -
          (title === "问点点" || title === "ai" ? 100 : 0);
        if (title && (!best || score > best.score)) {
          best = { title, nickname: finalNickname, likedText, userId, coverUrl, score };
        }
        source = source.parentElement;
      }
    }
    if (best) {
      return best;
    }
    {
      const title = document.title.replace(/\s*-\s*小红书\s*$/, "").trim();
      return {
        title: title && title !== "小红书" ? title : "",
        nickname: "",
        likedText: "",
        userId: "",
        coverUrl: "",
        score: 0,
      };
    }
  }, note.noteId).catch(() => null) as {
    title?: string;
    nickname?: string;
    likedText?: string;
    userId?: string;
    coverUrl?: string;
  } | null;

  const title = card?.title || note.title;
  if (!title) return null;

  return {
    noteId: note.noteId,
    title,
    desc: "",
    type: note.type ?? "normal",
    userId: card?.userId ?? "",
    nickname: card?.nickname ?? "",
    imageUrls: card?.coverUrl ? [card.coverUrl] : undefined,
    metrics: {
      likedCount: parseVisibleCount(card?.likedText) ?? note.likedCount ?? 0,
      collectedCount: 0,
      commentCount: 0,
      shareCount: 0,
    },
  };
}

function parseVisibleCount(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const normalized = text.trim();
  const match = normalized.match(/([\d.]+)\s*(万|w|W|千|k|K)?/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const unit = match[2];
  if (unit === "万" || unit === "w" || unit === "W") return Math.round(value * 10_000);
  if (unit === "千" || unit === "k" || unit === "K") return Math.round(value * 1_000);
  return Math.round(value);
}

async function readSerializableInitialState(page: XhsPageLike): Promise<unknown> {
  return page.evaluate(() => {
    const unwrap = (value: any): any =>
      value && typeof value === "object" && ("_value" in value || "_rawValue" in value)
        ? (value._value ?? value._rawValue)
        : value;
    const state = (window as any).__INITIAL_STATE__;
    if (!state) return null;

    const userPageData = unwrap(state.user?.userPageData ?? state.userPageData);
    const notes = unwrap(state.user?.notes);
    const firstPageNotes = Array.isArray(notes?.[0]) ? notes[0] : undefined;

    return {
      user: {
        userPageData,
        notes: firstPageNotes ? [firstPageNotes] : notes,
      },
      userPageData,
      note: unwrap(state.note),
      comments: unwrap(state.comments ?? state.comment ?? state.note?.comments ?? state.note?.comment),
      feed: {
        feeds: unwrap(state.feed?.feeds),
        items: unwrap(state.feed?.items),
      },
    };
  }).catch(() => null);
}

async function waitForInitialProfileState(page: XhsPageLike, timeoutMs: number): Promise<"ready" | "mock_skip" | "timeout"> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ready = await page.evaluate(() => {
      try {
        const unwrap = (value: any): any =>
          value && typeof value === "object" && ("_value" in value || "_rawValue" in value)
            ? (value._value ?? value._rawValue)
            : value;
        const state = (window as any).__INITIAL_STATE__;
        const userPageData = unwrap(state?.user?.userPageData ?? state?.userPageData);
        const notes = unwrap(state?.user?.notes);
        const firstPage = Array.isArray(notes?.[0]) ? notes[0] : undefined;
        const hasProfile = Boolean(userPageData?.basicInfo);
        const hasNotes = Array.isArray(firstPage) && firstPage.length > 0;
        const noteState = unwrap(state?.note);
        const comments = unwrap(state?.comments ?? state?.comment ?? state?.note?.comments);
        const hasNoteDetail = Boolean(
          noteState?.currentNote?.desc ||
          noteState?.noteDetail?.desc ||
          noteState?.noteCard?.desc ||
          noteState?.desc,
        );
        const hasComments = Array.isArray(comments?.list) || Array.isArray(comments);
        return hasProfile || hasNotes || hasNoteDetail || hasComments;
      } catch {
        return false;
      }
    }).catch(() => false);
    if (ready == null) return "mock_skip";
    if (ready) return "ready";
    const { promise: pollWait, resolve: pollResolve } = Promise.withResolvers<void>();
    setTimeout(pollResolve, 500);
    await pollWait;
  }
  return "timeout";
}

/**
 * Extract notes from __INITIAL_STATE__ object.
 * Tries multiple known paths:
 * - Real XHS shape: state.user.notes[0] (first page note array)
 * - Real XHS shape: state.user.userPageData.notes (alternate)
 * - Flat test shape: state.userPageData.notes / noteList / choosedNotes
 */
function extractNotesFromState(state: unknown): XhsNoteSummary[] {
  const s = state as Record<string, unknown>;
  const userContainer = s.user as Record<string, unknown> | undefined;

  // Real XHS shape: state.user.notes[0] is the first-page note array
  const userNotes = unwrapReactiveValue(userContainer?.notes) as unknown[] | undefined;
  if (Array.isArray(userNotes) && userNotes.length > 0) {
    const firstPage = userNotes[0];
    if (Array.isArray(firstPage)) {
      return normalizeNotesList(firstPage as Array<Record<string, unknown>>);
    }
  }

  // Real XHS shape: state.user.userPageData.notes
  const userPageData = unwrapReactiveValue(userContainer?.userPageData ?? s.userPageData) as
    | Record<string, unknown>
    | undefined;
  if (userPageData) {
    const noteList = (userPageData.notes ??
      userPageData.noteList ??
      userPageData.choosedNotes ??
      []) as Array<Record<string, unknown>>;
    if (noteList.length > 0) {
      return normalizeNotesList(noteList);
    }
  }

  // Additional: try state.note.noteList (some XHS versions)
  const noteContainer = unwrapReactiveValue(s.note) as Record<string, unknown> | undefined;
  if (noteContainer) {
    const noteList = (noteContainer.noteList ?? noteContainer.notes ?? []) as Array<Record<string, unknown>>;
    if (Array.isArray(noteList) && noteList.length > 0) {
      return normalizeNotesList(noteList);
    }
  }

  // Additional: try state.feed.feeds (some XHS SPA versions)
  const feedContainer = unwrapReactiveValue(s.feed) as Record<string, unknown> | undefined;
  if (feedContainer) {
    const feeds = unwrapReactiveValue(feedContainer.feeds ?? feedContainer.items);
    if (Array.isArray(feeds) && feeds.length > 0) {
      return normalizeNotesList(feeds as Array<Record<string, unknown>>);
    }
  }

  return [];
}

/**
 * Shared normalization for a raw notes list (works for both INITIAL_STATE
 * and paginated user_posted responses).
 */
function normalizeNotesList(rawNotes: Array<Record<string, unknown>>): XhsNoteSummary[] {
  return rawNotes.flatMap((raw, index) => {
    const unwrapped = unwrapNoteWrapper(raw) as any;
    const normalized = normalizeProfileNote(unwrapped);
    if (normalized.noteId) return [normalized];
    const title = normalized.title?.trim();
    const rawIndex =
      typeof raw.index === "number" || typeof raw.index === "string"
        ? String(raw.index)
        : String(index);
    return [{
      ...normalized,
      noteId: `visible-profile-card-${rawIndex}`,
      title,
    }];
  });
}

function unwrapNoteWrapper(raw: Record<string, unknown>): Record<string, unknown> {
  const value = unwrapReactiveValue(raw) as Record<string, unknown>;
  const noteCard = unwrapReactiveValue(
    value.note_card ?? value.noteCard ?? value.note ?? value,
  ) as Record<string, unknown>;
  const inner = unwrapReactiveValue(
    noteCard.note_card ?? noteCard.noteCard ?? noteCard,
  ) as Record<string, unknown>;
  if (inner === value) return value;
  return {
    ...inner,
    id: inner.id ?? value.id,
    noteId: inner.noteId ?? value.noteId,
    note_id: inner.note_id ?? value.note_id,
    xsecToken: inner.xsecToken ?? value.xsecToken,
    xsec_token: inner.xsec_token ?? value.xsec_token,
  };
}

/**
 * Extract notes from a user_posted API response body.
 * Supports both camelCase and snake_case shapes directly through normalizeProfileNote.
 * Also handles nested wrappers like data.items[].note_card.
 */
function extractNotesFromPostedResponse(body: unknown): XhsNoteSummary[] {
  const b = body as Record<string, unknown>;
  const data = (b.data ?? b) as Record<string, unknown>;

  // Direct data.notes path
  const notes = data.notes as Array<Record<string, unknown>> | undefined;
  if (notes && notes.length > 0) {
    return normalizeNotesList(notes);
  }

  // data.items path (some API versions wrap notes in items)
  const items = data.items as Array<Record<string, unknown>> | undefined;
  if (items && items.length > 0) {
    // Items may be note objects directly or wrapped in various wrappers:
    //   { note_card: { ... } }          — snake_case (real API)
    //   { noteCard:  { ... } }          — camelCase
    //   { note:      { ... } }          — older shape
    //   { note_card: { note_card: … }}  — doubly-nested snake_case
    //   { noteCard:  { noteCard:  … }}  — doubly-nested camelCase
    return normalizeNotesList(items);
  }

  return [];
}

function extractVisibleNoteDetail(
  state: unknown,
  fallback: XhsNoteSummary,
): XhsNoteDetail | null {
  const candidates = findObjectsDeep(state, (value) => {
    const id = value.noteId ?? value.note_id ?? value.id;
    const noteCard = (value.noteCard ?? value.note_card ?? value.note) as
      | Record<string, unknown>
      | undefined;
    const nestedId = noteCard?.noteId ?? noteCard?.note_id ?? noteCard?.id;
    const hasDetailShape =
      value.desc != null ||
      noteCard?.desc != null ||
      value.interactInfo != null ||
      value.interact_info != null ||
      noteCard?.interactInfo != null ||
      noteCard?.interact_info != null;
    return (id === fallback.noteId || nestedId === fallback.noteId) && hasDetailShape;
  });

  const raw = candidates[0] ?? findObjectsDeep(state, (value) => {
    const title = value.title ?? value.displayTitle ?? value.display_title;
    return title != null && title === fallback.title;
  })[0];

  if (!raw) {
    if (!fallback.title) return null;
    return {
      noteId: fallback.noteId,
      title: fallback.title,
      desc: "",
      type: fallback.type ?? "normal",
      userId: "",
      nickname: "",
      metrics: {
        likedCount: fallback.likedCount ?? 0,
        collectedCount: 0,
        commentCount: 0,
        shareCount: 0,
      },
    };
  }

  const normalized = normalizeNoteDetail(raw);
  return {
    ...normalized,
    noteId: normalized.noteId || fallback.noteId,
    title: normalized.title || fallback.title || "",
    type: normalized.type || fallback.type || "normal",
    metrics: {
      ...normalized.metrics,
      likedCount: normalized.metrics.likedCount || fallback.likedCount || 0,
    },
  };
}

function extractVisibleComments(state: unknown): XhsComment[] {
  const candidates = findObjectsDeep(state, (value) => {
    const hasContent = typeof value.content === "string" && value.content.trim().length > 0;
    const hasUser =
      value.user != null ||
      value.userId != null ||
      value.user_id != null ||
      value.nickname != null;
    return hasContent && hasUser;
  });
  const seen = new Set<string>();
  const comments: XhsComment[] = [];
  for (const raw of candidates) {
    const normalized = normalizeComment(raw);
    const key = normalized.commentId || `${normalized.nickname}:${normalized.content}`;
    if (!normalized.content || seen.has(key)) continue;
    seen.add(key);
    comments.push(normalized);
  }
  return comments;
}

function findObjectsDeep(
  value: unknown,
  predicate: (record: Record<string, unknown>) => boolean,
  seen = new Set<unknown>(),
): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);

  const record = unwrapReactiveValue(value) as Record<string, unknown>;
  const results: Array<Record<string, unknown>> = [];
  if (record && typeof record === "object" && predicate(record)) {
    results.push(record);
  }

  if (Array.isArray(record)) {
    for (const item of record) {
      results.push(...findObjectsDeep(item, predicate, seen));
    }
    return results;
  }

  for (const child of Object.values(record)) {
    results.push(...findObjectsDeep(child, predicate, seen));
  }
  return results;
}

/**
 * Extract userId from a profile URL.
 */
function extractUserId(url: string): string {
  const match = url.match(/\/profile\/([a-f0-9]{24})/i);
  return match ? match[1] : "";
}
