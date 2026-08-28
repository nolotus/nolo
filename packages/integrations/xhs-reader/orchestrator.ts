/**
 * XHS Profile Collection Orchestrator
 *
 * Coordinates the Playwright profile collector and analyzer to produce a
 * desktop-visible XhsProfileCollection.
 */

import {
  collectProfilePage,
  collectVisibleNoteDetails,
} from "./backends/playwrightProfileCollector";
import type { XhsPageLike } from "./backends/playwrightProfileCollector";
import { analyzeProfile } from "./analyze/profileAnalyzer";
import { redactXhsSensitiveValue } from "./redaction";
import { parseXhsNoteUrl } from "./url";
import type {
  XhsNoteDetail,
  XhsNoteSummary,
  XhsProfile,
  XhsProfileCollection,
  XhsReadResult,
} from "./types";
import { createXhsFailure, createXhsSuccess } from "./types";

export interface CollectXhsProfileOptions {
  profileUrl: string;
  maxScrollPages?: number; // default 0
  enrichDetails?: boolean; // default false
  includeComments?: boolean; // default false
  maxCommentPagesPerNote?: number; // default 1
  headless?: boolean; // default false
  /** Deprecated: ignored so reads stay within visible desktop page behavior. */
  cookie?: string;
  /** Injected page for testing. */
  page?: XhsPageLike;
  /** Deprecated: ignored so reads stay within visible desktop page behavior. */
  fetchImpl?: typeof fetch;
  /** Deprecated: direct detail enrichment is disabled. */
  minLikesForDetail?: number;
  /** Deprecated: direct comment collection is disabled. */
  minCommentsForCollect?: number;
  /** Public note URLs discovered from an external index such as Google SERP. */
  indexedNoteUrls?: string[];
}

function normalizeIndexedNoteUrls(urls: string[] | undefined) {
  const accepted: Array<{ url: string; note: XhsNoteSummary }> = [];
  const seen = new Set<string>();
  for (const raw of urls ?? []) {
    if (accepted.length >= 3) break;
    try {
      const parsed = parseXhsNoteUrl(String(raw));
      if (seen.has(parsed.noteId)) continue;
      seen.add(parsed.noteId);
      accepted.push({
        url: parsed.canonicalUrl,
        note: {
          noteId: parsed.noteId,
          xsecToken: parsed.xsecToken,
          xsecSource: parsed.xsecSource,
        },
      });
    } catch {
      // Ignore non-XHS or malformed external-index results.
    }
  }
  return accepted;
}

function isIndexedNoteDetailForProfile(
  profile: XhsProfile,
  detail: XhsNoteDetail,
) {
  const profileUserId = profile.userId?.trim();
  const detailUserId = detail.userId?.trim();
  if (profileUserId && detailUserId && profileUserId === detailUserId) {
    return true;
  }

  const profileNickname = profile.nickname?.trim();
  const detailNickname = detail.nickname?.trim();
  return Boolean(
    profileNickname &&
      detailNickname &&
      profileNickname === detailNickname,
  );
}

/**
 * Main orchestrator to collect a full XHS profile.
 *
 * Returns a redacted XhsProfileCollection or a failure.
 * When profile and notes are both empty, returns a structured diagnostic
 * instead of silent success.
 */
export async function collectXhsProfile(
  options: CollectXhsProfileOptions,
): Promise<XhsReadResult<XhsProfileCollection>> {
  const {
    profileUrl,
    maxScrollPages = 0,
    enrichDetails = false,
    includeComments = false,
    maxCommentPagesPerNote = 1,
    indexedNoteUrls,
    page,
  } = options;
  const indexedNotes = normalizeIndexedNoteUrls(indexedNoteUrls);

  // Step 1: Collect profile and note list via Playwright
  if (!page) {
    return createXhsFailure({
      code: "unknown",
      message:
        "A Playwright page must be provided (via options.page). " +
        "The orchestrator does not manage browser lifecycle.",
    });
  }

  let profileResult;
  try {
    profileResult = await collectProfilePage(page, profileUrl, maxScrollPages);
  } catch (err) {
    return createXhsFailure({
      code: "network_error",
      message: `Profile page collection failed: ${String(err)}`,
    });
  }

  const { profile, notes, diagnostic } = profileResult;

  // Step 2: If collector detected a blocker (login/blocked/empty), return failure
  // with diagnostic instead of silently succeeding with empty data.
  if (diagnostic && notes.length === 0) {
    // Profile is empty too? Return as failure with diagnostic.
    const profileEmpty = !profile.nickname && !profile.redId;
    if (profileEmpty && indexedNotes.length === 0) {
      return createXhsFailure({
        code: diagnostic.code,
        message: diagnostic.message,
        diagnostic,
      });
    }
    // Profile exists but notes are empty — still return the data but attach diagnostic.
    // This allows agents to see the profile but know notes collection failed.
  }

  // Direct authenticated XHS API enrichment is intentionally disabled. When
  // explicitly requested, enrichment opens public note pages anonymously and
  // extracts only what the desktop page has already rendered.
  let noteDetails: XhsProfileCollection["noteDetails"] = [];
  let commentsByNote: XhsProfileCollection["commentsByNote"] = {};
  let visibleDetailDiagnostic = diagnostic;

  const notesForVisibleDetail = notes.length > 0 ? notes : indexedNotes.map((item) => item.note);

  if (
    (enrichDetails || includeComments || indexedNotes.length > 0) &&
    notesForVisibleDetail.length > 0
  ) {
    try {
      const visibleDetails = await collectVisibleNoteDetails(page, notesForVisibleDetail, {
        includeComments: includeComments || indexedNotes.length > 0,
        maxNotes: maxCommentPagesPerNote,
      });
      noteDetails = visibleDetails.noteDetails;
      commentsByNote = visibleDetails.commentsByNote;
      visibleDetailDiagnostic = visibleDetails.diagnostic ?? diagnostic;
    } catch (err) {
      visibleDetailDiagnostic = {
        code: "network_error",
        message: `Visible note detail collection failed: ${String(err)}`,
      };
    }
  }

  const indexedNoteIds = new Set(indexedNotes.map((item) => item.note.noteId));
  const verifiedIndexedNoteIds = new Set(
    noteDetails
      .filter(
        (detail) =>
          indexedNoteIds.has(detail.noteId) &&
          isIndexedNoteDetailForProfile(profile, detail),
      )
      .map((detail) => detail.noteId),
  );
  const verifiedIndexedNoteUrls = indexedNotes
    .filter((item) => verifiedIndexedNoteIds.has(item.note.noteId))
    .map((item) => item.url);
  const verifiedNoteDetails = noteDetails.filter(
    (detail) =>
      !indexedNoteIds.has(detail.noteId) ||
      verifiedIndexedNoteIds.has(detail.noteId),
  );
  const verifiedCommentsByNote = Object.fromEntries(
    Object.entries(commentsByNote).filter(
      ([noteId]) =>
        !indexedNoteIds.has(noteId) || verifiedIndexedNoteIds.has(noteId),
    ),
  );

  // Step 3: Run analyzer
  const mergedNotes = [
    ...notes,
    ...indexedNotes
      .filter((item) => verifiedIndexedNoteIds.has(item.note.noteId))
      .map((item) => {
        const detail = verifiedNoteDetails.find((note) => note.noteId === item.note.noteId);
        return {
          ...item.note,
          ...(detail?.title ? { title: detail.title } : {}),
          ...(detail?.type ? { type: detail.type } : {}),
          ...(detail?.metrics?.likedCount ? { likedCount: detail.metrics.likedCount } : {}),
        } satisfies XhsNoteSummary;
      })
      .filter((note) => !notes.some((existing) => existing.noteId === note.noteId)),
  ];
  const analysis = analyzeProfile(mergedNotes, verifiedNoteDetails, verifiedCommentsByNote);

  // Step 4: Build result and redact sensitive fields
  const collection: XhsProfileCollection = {
    profile,
    notes: mergedNotes.map((n) => {
      // Remove xsecToken from public result
      const { xsecToken, xsecSource, ...publicNote } = n;
      return publicNote;
    }),
    noteDetails: verifiedNoteDetails,
    commentsByNote: verifiedCommentsByNote,
    analysis,
    ...(indexedNotes.length > 0
      ? {
          indexedDiscovery: {
            source: "external_index" as const,
            requestedNoteUrls: indexedNoteUrls ?? [],
            acceptedNoteUrls: indexedNotes.map((item) => item.url),
            verifiedNoteUrls: verifiedIndexedNoteUrls,
          },
        }
      : {}),
    diagnostic: visibleDetailDiagnostic,
  };

  // Final redaction pass
  const redacted = redactXhsSensitiveValue(collection) as XhsProfileCollection;

  return createXhsSuccess(redacted);
}
