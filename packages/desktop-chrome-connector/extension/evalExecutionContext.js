/**
 * Which *document* an `eval_script` approval is bound to.
 *
 * A tab URL is not a document: a reload of the very same URL is a new one, and a script approved on
 * the old document must not run in the new one. The binding is therefore the tab's main-frame
 * execution context (`Runtime.executionContextCreated`), captured when the request is shown to the
 * user and re-identified before `Runtime.evaluate`, which then runs with that explicit `contextId`
 * instead of the session default.
 *
 * Free of `chrome.*` so `evalResult.test.ts` can drive every rule here without a debugger. The
 * background worker maps both failures to `STALE_ACTION_CHALLENGE` / `EVAL_CONTEXT_UNAVAILABLE`.
 */

/** The tab reported no identifiable main-frame context, so nothing was asked and nothing ran. */
export const EVAL_CONTEXT_UNAVAILABLE = "EVAL_CONTEXT_UNAVAILABLE";

/** Bounded per tab: enough ids to describe what the user's approval window covered, and no growth. */
const MAX_DESTROYED_IDS = 64;

function tabKey(tabId) {
  const key = String(tabId ?? "").trim();
  return key;
}

/**
 * `Runtime.executionContextCreated` params → the fields an approval is bound to.
 *
 * `auxData.isDefault` marks the frame's own world; isolated worlds (extensions, devtools) share the
 * frameId and must never be mistaken for the document the user was shown.
 */
export function executionContextFromEvent(params) {
  const context = params?.context;
  if (!context || typeof context !== "object") return null;
  const contextId = Number(context.id);
  if (!Number.isInteger(contextId) || contextId < 0) return null;
  const auxData = context.auxData && typeof context.auxData === "object" ? context.auxData : {};
  const frameId = typeof auxData.frameId === "string" ? auxData.frameId : "";
  return {
    contextId,
    // Stable across debugger detach/attach, where the numeric id can be re-issued per session.
    uniqueId: typeof context.uniqueId === "string" ? context.uniqueId : "",
    frameId,
    isMainFrame: auxData.isDefault === true && Boolean(frameId),
    origin: typeof context.origin === "string" ? context.origin : "",
    name: typeof context.name === "string" ? context.name : "",
  };
}

/** One registry per worker: the live contexts of every attached tab, plus what was seen destroyed. */
export function createExecutionContextRegistry() {
  const byTab = new Map();
  const destroyedByTab = new Map();

  function liveFor(key) {
    let contexts = byTab.get(key);
    if (!contexts) {
      contexts = new Map();
      byTab.set(key, contexts);
    }
    return contexts;
  }

  function destroyedFor(key) {
    let ids = destroyedByTab.get(key);
    if (!ids) {
      ids = new Set();
      destroyedByTab.set(key, ids);
    }
    return ids;
  }

  return {
    record(tabId, context) {
      const key = tabKey(tabId);
      if (!key || !context || !Number.isInteger(Number(context.contextId))) return null;
      const contexts = liveFor(key);
      const stored = { ...context, contextId: Number(context.contextId) };
      contexts.set(stored.contextId, stored);
      // A re-reported context is alive again: `Runtime.enable` replays live contexts on every attach.
      destroyedByTab.get(key)?.delete(stored.contextId);
      return stored;
    },

    destroy(tabId, contextId) {
      const key = tabKey(tabId);
      const id = Number(contextId);
      if (!key || !Number.isInteger(id)) return;
      byTab.get(key)?.delete(id);
      const ids = destroyedFor(key);
      ids.add(id);
      if (ids.size > MAX_DESTROYED_IDS) {
        for (const oldest of [...ids].slice(0, ids.size - MAX_DESTROYED_IDS)) ids.delete(oldest);
      }
    },

    /** A detach ends every context of that session; keeping them would fake a live document. */
    clear(tabId) {
      const key = tabKey(tabId);
      if (!key) return;
      byTab.delete(key);
      destroyedByTab.delete(key);
    },

    contexts(tabId) {
      return [...(byTab.get(tabKey(tabId))?.values() ?? [])];
    },

    /**
     * The document of the tab: the newest live context of `frameId`'s own world, or null. The caller
     * passes the tab's main frame id (`Page.getFrameTree`) — `auxData.isDefault` alone only says "this
     * frame's own world", which a child frame also has.
     */
    mainFrame(tabId, frameId) {
      const contexts = [...(byTab.get(tabKey(tabId))?.values() ?? [])];
      for (let index = contexts.length - 1; index >= 0; index -= 1) {
        const context = contexts[index];
        if (context.isMainFrame !== true) continue;
        if (typeof frameId === "string" && frameId && context.frameId !== frameId) continue;
        return context;
      }
      return null;
    },

    isDestroyed(tabId, contextId) {
      return destroyedByTab.get(tabKey(tabId))?.has(Number(contextId)) === true;
    },
  };
}

/**
 * Is the approved context still this tab's live main frame?
 *
 * The numeric id can be re-issued when the debugger session is re-attached, so a matching number
 * proves nothing: `uniqueId` is the only identity. When either side lacks one the answer is `false`
 * (fail closed) rather than a numeric comparison that could match a different document.
 */
export function sameExecutionContext(recorded, live) {
  if (!recorded || !live || live.isMainFrame !== true) return false;
  const recordedUnique = typeof recorded.uniqueId === "string" ? recorded.uniqueId : "";
  const liveUnique = typeof live.uniqueId === "string" ? live.uniqueId : "";
  if (!recordedUnique || !liveUnique) return false;
  return recordedUnique === liveUnique;
}

/** The part of a context an approval record keeps: identity only, no page data. */
export function approvalContextSnapshot(context) {
  if (!context || !Number.isInteger(Number(context.contextId))) return null;
  return {
    contextId: Number(context.contextId),
    uniqueId: typeof context.uniqueId === "string" ? context.uniqueId : "",
    frameId: typeof context.frameId === "string" ? context.frameId : "",
  };
}

/**
 * Document identity for the approval fingerprint: the URL plus the execution context, so a reload
 * of the same URL, a same-URL client-side document swap or a changed script all break the match.
 */
export function evalDocumentIdentity(input) {
  const url = typeof input?.url === "string" ? input.url.trim() : "";
  const context = input?.context && typeof input.context === "object" ? input.context : {};
  const uniqueId = typeof context.uniqueId === "string" ? context.uniqueId : "";
  const anchor = uniqueId ? `ctx:${uniqueId}` : `ctx:${Number(context.contextId)}`;
  return `${url}#${anchor}`;
}

/** CDP says this when the document went away between the approval and `Runtime.evaluate`. */
export function isMissingContextError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /cannot find context|no context with given id|execution context .*not found|context .*was not found/i.test(
    message,
  );
}
