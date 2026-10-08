import type {
  MediaJob,
  MediaJobDepth,
  MediaQuote,
  MediaScope,
} from "ai/lecture/types";

const API = "/api/media-jobs";

export async function mediaJobRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) {
    const error = body?.error;
    throw Object.assign(
      new Error(error?.message ?? "Media request failed"),
      error,
    );
  }
  return body as T;
}

export const createMediaJob = (payload: {
  fileId: string;
  dialogId?: string;
  sourceLang?: string;
  targetLang?: string;
}) =>
  mediaJobRequest<{ job: MediaJob }>("", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMediaQuote = (
  id: string,
  scope: MediaScope,
  depth: MediaJobDepth,
  sourceLang?: string,
  targetLang?: string,
) =>
  mediaJobRequest<{ job: MediaJob; quote: MediaQuote }>(`/${id}/quote`, {
    method: "POST",
    body: JSON.stringify({ scope, depth, sourceLang, targetLang }),
  });

export const startMediaJob = (
  id: string,
  scope: MediaScope,
  depth: MediaJobDepth,
  sourceLang?: string,
  targetLang?: string,
) =>
  mediaJobRequest<{ job: MediaJob }>(`/${id}/start`, {
    method: "POST",
    body: JSON.stringify({ scope, depth, sourceLang, targetLang }),
  });

export const getMediaJob = (id: string) =>
  mediaJobRequest<{ job: MediaJob }>(`/${id}`);

export const mediaJobAction = (id: string, action: string, payload?: unknown) =>
  mediaJobRequest<{ job: MediaJob }>(`/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
