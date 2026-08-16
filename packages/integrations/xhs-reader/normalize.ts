/**
 * Normalize XHS data shapes from various sources:
 * - __INITIAL_STATE__ (camelCase)
 * - API responses (snake_case)
 *
 * xsecToken values are preserved ONLY in an internal `_xsecToken` field
 * that must not be exported in public-facing results.
 */

import type {
  XhsProfile,
  XhsNoteSummary,
  XhsNoteDetail,
  XhsComment,
  XhsCommentPage,
} from "./types";

// --- Profile normalization ---

interface RawProfileState {
  userPageData?: {
    basicInfo?: {
      nickname?: string;
      userid?: string;
      redId?: string;
      red_id?: string;
      imageb?: string;
      images?: string;
      desc?: string;
      ipLocation?: string;
      ip_location?: string;
      gender?: string;
    };
    interactions?: Array<{
      type?: string; // "follows" | "fans" | "interaction"
      name?: string;
      count?: number | string;
      countText?: string;
      i18nCount?: string;
    }>;
  };
}

interface RawUserPostedNote {
  id?: string;
  noteId?: string;
  note_id?: string;
  noteCard?: RawUserPostedNote;
  note_card?: RawUserPostedNote;
  displayTitle?: string;
  display_title?: string;
  title?: string;
  cover?: {
    url?: string;
    urlDefault?: string;
    urlPre?: string;
    url_default?: string;
    url_pre?: string;
    infoList?: Array<{ url?: string; imageScene?: string }>;
    info_list?: Array<{ url?: string; image_scene?: string }>;
  };
  type?: string;
  likedCount?: string | number;
  liked_count?: string | number;
  // Nested interact info shapes (camelCase and snake_case)
  interactInfo?: { likedCount?: string | number; liked_count?: string | number };
  interact_info?: { liked_count?: string | number; likedCount?: string | number };
  xsecToken?: string;
  xsec_token?: string;
  xsecSource?: string;
  xsec_source?: string;
}

/**
 * Extract profile from __INITIAL_STATE__ userPageData (camelCase) or API response shape.
 */
export function normalizeProfileState(
  raw: RawProfileState,
  userId: string,
): XhsProfile {
  const basic = raw.userPageData?.basicInfo ?? {};
  const interactions = raw.userPageData?.interactions ?? [];

  const getInteraction = (nameOrType: string): number | undefined => {
    // Match by type field first (real XHS API shape), then by name substring
    const entry = interactions.find(
      (i) =>
        i.type === nameOrType ||
        i.name?.toLowerCase().includes(nameOrType.toLowerCase()),
    );
    if (!entry) return undefined;

    // count may be a number or a string like "777"
    if (typeof entry.count === "number") return entry.count;
    if (typeof entry.count === "string") {
      const n = Number(entry.count);
      if (!isNaN(n)) return n;
    }
    if (entry.countText) {
      return parseCountText(entry.countText);
    }
    // i18nCount is also a string representation
    if (entry.i18nCount) {
      const n = Number(entry.i18nCount);
      if (!isNaN(n)) return n;
    }
    return undefined;
  };

  return {
    userId: basic.userid ?? userId,
    nickname: basic.nickname ?? "",
    redId: basic.redId ?? basic.red_id,
    avatarUrl: basic.imageb ?? basic.images,
    desc: basic.desc,
    ipLocation: basic.ipLocation ?? basic.ip_location,
    gender: basic.gender,
    interactionCounts: {
      follows: getInteraction("follows") ?? getInteraction("关注"),
      fans: getInteraction("fans") ?? getInteraction("粉丝"),
      likesAndCollects:
        getInteraction("interaction") ??
        getInteraction("获赞与收藏") ??
        getInteraction("赞藏"),
    },
  };
}

/**
 * Normalize a note from the user_posted list (initial state or paginated API).
 * xsecToken is preserved only in internal `_xsecToken`.
 */
export function normalizeProfileNote(raw: RawUserPostedNote): XhsNoteSummary {
  const noteCard = raw.noteCard ?? raw.note_card;
  const noteId =
    raw.noteId ??
    raw.note_id ??
    raw.id ??
    noteCard?.noteId ??
    noteCard?.note_id ??
    noteCard?.id ??
    "";
  const cover = firstNonEmptyString(
    raw.cover?.url ??
      raw.cover?.urlDefault ??
      raw.cover?.urlPre ??
      raw.cover?.url_default ??
      raw.cover?.url_pre ??
      firstInfoUrl(raw.cover?.infoList) ??
      firstInfoUrl(raw.cover?.info_list) ??
      noteCard?.cover?.url ??
      noteCard?.cover?.urlDefault ??
      noteCard?.cover?.urlPre ??
      noteCard?.cover?.url_default ??
      noteCard?.cover?.url_pre ??
      firstInfoUrl(noteCard?.cover?.infoList) ??
      firstInfoUrl(noteCard?.cover?.info_list),
    raw.cover?.urlDefault,
    raw.cover?.urlPre,
    raw.cover?.url_default,
    raw.cover?.url_pre,
    firstInfoUrl(raw.cover?.infoList),
    firstInfoUrl(raw.cover?.info_list),
    noteCard?.cover?.urlDefault,
    noteCard?.cover?.urlPre,
    noteCard?.cover?.url_default,
    noteCard?.cover?.url_pre,
    firstInfoUrl(noteCard?.cover?.infoList),
    firstInfoUrl(noteCard?.cover?.info_list),
  );

  // Resolve likedCount from multiple possible locations
  const resolvedLikedCount =
    resolveLikedCount(raw) ?? (noteCard ? resolveLikedCount(noteCard) : undefined);

  return {
    noteId,
    title:
      raw.displayTitle ??
      raw.display_title ??
      raw.title ??
      noteCard?.displayTitle ??
      noteCard?.display_title ??
      noteCard?.title,
    coverUrl: cover,
    type: raw.type === "video" || noteCard?.type === "video" ? "video" : "normal",
    likedCount: resolvedLikedCount,
    xsecToken: raw.xsecToken ?? raw.xsec_token ?? noteCard?.xsecToken ?? noteCard?.xsec_token,
    xsecSource: raw.xsecSource ?? raw.xsec_source ?? noteCard?.xsecSource ?? noteCard?.xsec_source,
  };
}

function firstNonEmptyString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

/**
 * Resolve liked count from top-level fields or nested interactInfo/interact_info.
 */
function resolveLikedCount(raw: RawUserPostedNote): number | undefined {
  // Direct top-level fields
  if (typeof raw.likedCount === "number") return raw.likedCount;
  if (typeof raw.liked_count === "number") return raw.liked_count;
  if (raw.likedCount != null) return Number(raw.likedCount) || undefined;
  if (raw.liked_count != null) return Number(raw.liked_count) || undefined;

  // Nested interactInfo (camelCase)
  const ii = raw.interactInfo;
  if (ii) {
    if (typeof ii.likedCount === "number") return ii.likedCount;
    if (typeof ii.liked_count === "number") return ii.liked_count;
    if (ii.likedCount != null) return Number(ii.likedCount) || undefined;
  }

  // Nested interact_info (snake_case)
  const iiSnake = raw.interact_info;
  if (iiSnake) {
    if (typeof iiSnake.liked_count === "number") return iiSnake.liked_count;
    if (typeof iiSnake.likedCount === "number") return iiSnake.likedCount;
    if (iiSnake.liked_count != null) return Number(iiSnake.liked_count) || undefined;
  }

  return undefined;
}

/**
 * Normalize a note detail from the /api/sns/web/v1/feed response.
 *
 * Supports both camelCase (INITIAL_STATE) and snake_case (API) shapes:
 * - wrapper: { note: { noteCard: ... } } or { id, note_card, model_type }
 * - noteCard / note_card
 * - interactInfo / interact_info
 * - imageList / image_list
 * - tagList / tag_list
 */
export function normalizeNoteDetail(
  raw: Record<string, unknown>,
): XhsNoteDetail {
  // Resolve the note-level object: may be wrapped in `note` or be top-level
  const note = (raw.note ?? raw) as Record<string, unknown>;

  // Resolve the note card: camelCase `noteCard` or snake_case `note_card`
  const noteCard = (note.noteCard ?? note.note_card ?? note) as Record<string, unknown>;

  // --- noteId ---
  const id = (
    note.noteId ??
    note.note_id ??
    note.id ??
    noteCard.noteId ??
    noteCard.note_id ??
    raw.id ??
    raw.note_id ??
    raw.noteId ??
    ""
  ) as string;

  // --- basic fields ---
  const title = (noteCard.title ?? note.title ?? "") as string;
  const desc = (noteCard.desc ?? note.desc ?? "") as string;
  const type = (
    noteCard.type === "video" || note.type === "video" ? "video" : "normal"
  ) as "normal" | "video";

  // --- user ---
  const user = (noteCard.user ?? note.user ?? {}) as Record<string, unknown>;

  // --- interact info: camelCase or snake_case ---
  const interactInfo = (
    noteCard.interactInfo ??
    noteCard.interact_info ??
    note.interactInfo ??
    note.interact_info ??
    {}
  ) as Record<string, unknown>;

  // --- images: camelCase or snake_case ---
  const imageList = (
    noteCard.imageList ??
    noteCard.image_list ??
    note.imageList ??
    note.image_list ??
    []
  ) as Array<Record<string, unknown>>;
  const imageUrls = imageList
    .map((img) => (
      img.urlDefault ?? img.url_default ?? img.url ?? firstInfoUrl(img.infoList) ?? firstInfoUrl(img.info_list)
    ) as string)
    .filter(Boolean);

  // --- video ---
  const video = (noteCard.video ?? note.video ?? {}) as Record<string, unknown>;
  const videoMedia = (video.media ?? {}) as Record<string, unknown>;
  const videoStream = (videoMedia.stream ?? {}) as Record<string, unknown>;
  const h264 = (videoStream.h264 ?? videoStream.H264 ?? []) as Array<Record<string, unknown>>;
  const videoUrl = h264.length > 0 ? (h264[0].masterUrl as string) : undefined;

  // --- tags: camelCase or snake_case ---
  const rawTagList = (
    noteCard.tagList ??
    noteCard.tag_list ??
    note.tagList ??
    note.tag_list ??
    []
  ) as Array<Record<string, unknown>>;
  const tagList = rawTagList
    .map((t) => (t.name ?? t.tagType ?? t.tag_type ?? "") as string)
    .filter(Boolean);

  // --- ipLocation ---
  const ipLocation = (
    noteCard.ipLocation ??
    noteCard.ip_location ??
    note.ipLocation ??
    note.ip_location ??
    undefined
  ) as string | undefined;

  // --- metrics ---
  const likedCount = Number(interactInfo.likedCount ?? interactInfo.liked_count ?? 0);
  const collectedCount = Number(
    interactInfo.collectedCount ?? interactInfo.collected_count ?? 0,
  );
  const commentCount = Number(
    interactInfo.commentCount ?? interactInfo.comment_count ?? 0,
  );
  const shareCount = Number(
    interactInfo.shareCount ?? interactInfo.share_count ?? interactInfo.sharedCount ?? interactInfo.shared_count ?? 0,
  );

  return {
    noteId: id,
    title,
    desc,
    type,
    userId: (user.userId ?? user.userid ?? user.user_id ?? "") as string,
    nickname: (user.nickname ?? "") as string,
    avatarUrl: (user.avatar ?? user.imageb ?? undefined) as string | undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    videoUrl,
    tagList: tagList.length > 0 ? tagList : undefined,
    ipLocation,
    metrics: { likedCount, collectedCount, commentCount, shareCount },
    createdAt: (note.time ?? noteCard.time ?? undefined) as string | undefined,
    lastUpdateTime: (
      noteCard.lastUpdateTime ?? noteCard.last_update_time ?? note.lastUpdateTime ?? undefined
    ) as string | undefined,
  };
}

/**
 * Normalize a single comment from the comment API.
 */
export function normalizeComment(raw: Record<string, unknown>): XhsComment {
  const user = (raw.user ?? {}) as Record<string, unknown>;
  const subComments = (raw.sub_comments ?? raw.subComments ?? []) as Array<
    Record<string, unknown>
  >;

  return {
    commentId: (raw.id ?? raw.commentId ?? "") as string,
    userId: (user.user_id ?? user.userId ?? "") as string,
    nickname: (user.nickname ?? "") as string,
    avatarUrl: (user.image ?? user.avatar ?? undefined) as string | undefined,
    content: (raw.content ?? "") as string,
    likeCount: Number(raw.likeCount ?? raw.like_count ?? 0),
    subCommentCount: Number(
      raw.sub_comment_count ?? raw.subCommentCount ?? subComments.length,
    ),
    subComments: subComments.map(normalizeComment),
    ipLocation: (raw.ipLocation ?? raw.ip_location ?? undefined) as string | undefined,
    createdAt: (raw.createTime ?? raw.create_time ?? undefined) as string | undefined,
  };
}

/**
 * Normalize a comment page response.
 */
export function normalizeCommentPage(
  raw: Record<string, unknown>,
): XhsCommentPage {
  const data = (raw.data ?? raw) as Record<string, unknown>;
  const comments = (data.comments ?? []) as Array<Record<string, unknown>>;
  return {
    comments: comments.map(normalizeComment),
    hasMore: Boolean(data.has_more ?? data.hasMore ?? false),
    cursor: (data.cursor ?? undefined) as string | undefined,
  };
}

// --- Helpers ---

/**
 * Safely extract the URL from the first entry of an infoList/info_list array.
 * Handles the `unknown` element type without using `any`.
 */
function firstInfoUrl(list: unknown): string | undefined {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const first = list[0] as Record<string, unknown> | undefined;
  if (first && typeof first.url === "string") return first.url;
  return undefined;
}

/**
 * Parse Chinese count text like "1.2万" -> 12000, "999" -> 999
 */
function parseCountText(text: string): number | undefined {
  const cleaned = text.trim();
  if (!cleaned) return undefined;

  const wanMatch = cleaned.match(/([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);

  const yiMatch = cleaned.match(/([\d.]+)\s*亿/);
  if (yiMatch) return Math.round(parseFloat(yiMatch[1]) * 100000000);

  const num = Number(cleaned.replace(/,/g, ""));
  return isNaN(num) ? undefined : num;
}
