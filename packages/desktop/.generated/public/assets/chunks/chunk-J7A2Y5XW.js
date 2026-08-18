import {
  shareApi
} from "/public/assets/chunks/chunk-ZSRWC4Y4.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";

// packages/share/loadOwnerShares.ts
var DEFAULT_OWNER_SHARES_PAGE_SIZE = 200;
var mergeOwnerShares = (shares) => {
  const shareByToken = /* @__PURE__ */ new Map();
  shares.forEach((share) => {
    const token = asTrimmedString(share?.token);
    if (!token) return;
    const previous = shareByToken.get(token);
    if (!previous || share.createdAt >= previous.createdAt) {
      shareByToken.set(token, share);
    }
  });
  return Array.from(shareByToken.values()).sort((left, right) => right.createdAt - left.createdAt);
};
var fetchOwnerSharesPage = async ({
  server,
  userId,
  token,
  cursor,
  pageSize,
  includeCoverImage
}) => {
  const params = new URLSearchParams({
    limit: String(pageSize)
  });
  if (!includeCoverImage) {
    params.set("coverImage", "0");
  }
  if (cursor) {
    params.set("cursor", cursor);
  }
  const res = await fetch(shareApi.owner(server, userId, params), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`[owner shares] ${server} responded ${res.status}`);
  }
  const json = await res.json();
  return {
    data: Array.isArray(json.data) ? json.data : [],
    nextCursor: typeof json.nextCursor === "string" && json.nextCursor.trim().length > 0 ? json.nextCursor : void 0
  };
};
var fetchAllOwnerSharesFromServer = async ({
  server,
  userId,
  token,
  pageSize,
  includeCoverImage
}) => {
  const collected = [];
  let cursor;
  for (; ; ) {
    const page = await fetchOwnerSharesPage({
      server,
      userId,
      token,
      cursor,
      pageSize,
      includeCoverImage
    });
    collected.push(...page.data);
    if (!page.nextCursor || page.data.length === 0) {
      return collected;
    }
    cursor = page.nextCursor;
  }
};
var loadOwnerSharesAcrossServers = async ({
  servers,
  userId,
  token,
  pageSize = DEFAULT_OWNER_SHARES_PAGE_SIZE,
  includeCoverImage = true
}) => {
  if (servers.length === 0) {
    return [];
  }
  const settled = await Promise.allSettled(
    servers.map(
      (server) => fetchAllOwnerSharesFromServer({
        server,
        userId,
        token,
        pageSize,
        includeCoverImage
      })
    )
  );
  const fulfilled = settled.filter(
    (result) => result.status === "fulfilled"
  );
  const failures = settled.filter(
    (result) => result.status === "rejected"
  );
  if (fulfilled.length === 0) {
    throw failures[0]?.reason ?? new Error("Failed to load owner shares from all configured servers.");
  }
  if (failures.length > 0) {
    console.warn(
      "[owner shares] Partial owner shares load failure:",
      failures.map((failure) => failure.reason)
    );
  }
  return mergeOwnerShares(fulfilled.flatMap((result) => result.value));
};

export {
  loadOwnerSharesAcrossServers
};
