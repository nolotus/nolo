import {
  createXReadFailure,
  type XPost,
  type XReadResult,
} from "./types";

type VisibleTextParseOptions = {
  url: string;
  fetchedAt?: string;
};

const STOP_LINES = new Set([
  "translate post",
  "reply",
  "repost",
  "like",
  "view",
  "share",
  "home",
  "search",
  "notifications",
  "messages",
]);

function getPostId(url: string): string | undefined {
  return /\/status\/(\d+)/.exec(url)?.[1];
}

function cleanLines(visibleText: string): string[] {
  return visibleText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isStopLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    STOP_LINES.has(lower) ||
    line === "·" ||
    line === "查看" ||
    /^查看\s+\d+\s+条回复$/.test(line) ||
    /[上下]午\d{1,2}:\d{2}\s+·\s+\d{4}年\d{1,2}月\d{1,2}日/.test(line) ||
    /^\d+\s+(replies|reply|reposts|repost|quotes|likes|views)$/i.test(line)
  );
}

export function parseVisibleXPostText(
  visibleText: string,
  options: VisibleTextParseOptions,
): XReadResult<XPost> {
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const id = getPostId(options.url);
  const lines = cleanLines(visibleText);
  const handleIndex = lines.findIndex((line) => /^@[A-Za-z0-9_]{1,15}$/.test(line));
  const handle = handleIndex >= 0 ? lines[handleIndex].slice(1) : undefined;
  const displayName = handleIndex > 0 ? lines[handleIndex - 1] : undefined;

  if (!id || !handle) {
    return createXReadFailure({
      code: "parse_error",
      message: "Visible X page text did not include a status id and author handle.",
      nextStep: "Check whether the page is loaded, logged in, or showing a challenge.",
      backend: "desktop_local_browser",
      fetchedAt,
    });
  }

  const bodyLines: string[] = [];
  for (const line of lines.slice(handleIndex + 1)) {
    if (isStopLine(line)) {
      break;
    }
    if (/^@[A-Za-z0-9_]{1,15}$/.test(line)) {
      break;
    }
    bodyLines.push(line);
  }

  const text = bodyLines.join("\n").trim();
  if (!text) {
    return createXReadFailure({
      code: "parse_error",
      message: "Visible X page text did not include a readable post body.",
      nextStep: "Try refreshing the page or using the authenticated desktop bridge.",
      backend: "desktop_local_browser",
      fetchedAt,
    });
  }

  return {
    ok: true,
    backend: "desktop_local_browser",
    fetchedAt,
    data: {
      id,
      url: options.url,
      author: {
        handle,
        displayName,
      },
      text,
      media: [],
      sourceBackend: "desktop_local_browser",
      fetchedAt,
    },
  };
}
