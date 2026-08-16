import { isRecord } from "core/isRecord";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import {
  createXReadFailure,
  type XBackendName,
  type XMedia,
  type XPost,
  type XReadResult,
} from "./types";

type ParseOptions = {
  backend: XBackendName;
  fetchedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseMedia(value: unknown): XMedia[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const media = asRecord(item) ?? {};
    const type = asString(media.type);
    return {
      type:
        type === "image" || type === "video" || type === "gif"
          ? type
          : "unknown",
      url: asString(media.url),
      previewUrl: asString(media.previewUrl),
      altText: asString(media.altText),
    };
  });
}

export function parseXPostFixture(
  value: unknown,
  options: ParseOptions,
): XReadResult<XPost> {
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const raw = asRecord(value);
  const author = asRecord(raw?.author);
  const id = asString(raw?.id);
  const url = asString(raw?.url);
  const handle = asString(author?.handle);
  const text = asString(raw?.text);

  if (!raw || !id || !url || !handle || !text) {
    return createXReadFailure({
      code: "parse_error",
      message: "Fixture is missing id, url, author.handle, or text.",
      nextStep: "Check the sanitized X fixture shape before parsing it.",
      backend: options.backend,
      fetchedAt,
    });
  }

  const metrics = asRecord(raw.metrics);
  return {
    ok: true,
    backend: options.backend,
    fetchedAt,
    data: {
      id,
      url,
      author: {
        handle,
        displayName: asString(author?.displayName),
        id: asString(author?.id),
        verified:
          typeof author?.verified === "boolean" ? author.verified : undefined,
        profileUrl: asString(author?.profileUrl),
      },
      text,
      createdAt: asString(raw.createdAt),
      media: parseMedia(raw.media),
      metrics: metrics
        ? {
            replies: asOptionalFiniteNumber(metrics.replies),
            reposts: asOptionalFiniteNumber(metrics.reposts),
            likes: asOptionalFiniteNumber(metrics.likes),
            views: asOptionalFiniteNumber(metrics.views),
          }
        : undefined,
      sourceBackend: options.backend,
      fetchedAt,
    },
  };
}
