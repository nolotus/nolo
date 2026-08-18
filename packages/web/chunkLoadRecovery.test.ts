import { describe, expect, it } from "bun:test";

import {
  CHUNK_LOAD_CACHE_BUST_PARAM,
  CHUNK_LOAD_RELOAD_STORAGE_PREFIX,
  buildChunkRecoveryHref,
  isChunkLoadError,
  maybeRecoverFromChunkLoadError,
} from "./chunkLoadRecovery";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    keys: () => Array.from(values.keys()),
  };
};

describe("chunk load recovery", () => {
  it("recognizes dynamic import and chunk load failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://us.nolo.chat/public/assets/chunks/TopbarNotificationBell-TK2H6OYN.js"
        )
      )
    ).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("network failed"))).toBe(false);
  });

  it("builds a cache-busting recovery href on the same path", () => {
    const href = buildChunkRecoveryHref(
      { pathname: "/agent-pub-x", search: "?tab=1", hash: "#y" },
      1700000000000
    );
    expect(href).toBe(
      `/agent-pub-x?tab=1&${CHUNK_LOAD_CACHE_BUST_PARAM}=1700000000000#y`
    );
  });

  it("hard-navigates once per failed chunk signature with cache bust", () => {
    const storage = createStorage();
    const assigned: string[] = [];
    const env = {
      location: {
        pathname: "/agent-pub-x",
        search: "",
        hash: "",
        href: "https://us.nolo.chat/agent-pub-x",
        assign: (href: string) => {
          assigned.push(href);
        },
        reload: () => {
          assigned.push("reload");
        },
      },
      sessionStorage: storage,
    };
    const error = new TypeError(
      "Failed to fetch dynamically imported module: https://us.nolo.chat/public/assets/chunks/TopbarNotificationBell-TK2H6OYN.js"
    );

    expect(maybeRecoverFromChunkLoadError(error, env)).toBe(true);
    expect(maybeRecoverFromChunkLoadError(error, env)).toBe(false);
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toContain(`${CHUNK_LOAD_CACHE_BUST_PARAM}=`);
    expect(assigned[0]).toContain("/agent-pub-x");
    expect(storage.keys()[0].startsWith(CHUNK_LOAD_RELOAD_STORAGE_PREFIX)).toBe(
      true
    );
  });

  it("allows a later different chunk failure to recover independently", () => {
    const storage = createStorage();
    const assigned: string[] = [];
    const env = {
      location: {
        pathname: "/",
        search: "",
        hash: "",
        href: "https://us.nolo.chat/",
        assign: (href: string) => {
          assigned.push(href);
        },
        reload: () => {
          assigned.push("reload");
        },
      },
      sessionStorage: storage,
    };

    expect(
      maybeRecoverFromChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://cdn/a.js"),
        env
      )
    ).toBe(true);
    expect(
      maybeRecoverFromChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://cdn/b.js"),
        env
      )
    ).toBe(true);
    expect(assigned).toHaveLength(2);
  });

  it("still avoids repeated recovery when session storage is unavailable", () => {
    let reloads = 0;
    const env = {
      location: {
        pathname: "/",
        search: "",
        hash: "",
        href: "https://us.nolo.chat/",
        assign: () => {
          reloads += 1;
        },
        reload: () => {
          reloads += 1;
        },
      },
      sessionStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    };
    const error = new Error("Loading chunk storage-blocked failed.");

    expect(maybeRecoverFromChunkLoadError(error, env)).toBe(true);
    expect(maybeRecoverFromChunkLoadError(error, env)).toBe(false);
    expect(reloads).toBe(1);
  });
});
