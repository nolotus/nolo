import {
  API_ENDPOINTS
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/share/link.ts
var SHARE_LINK_PREFIX = "share:";
var createShareLink = (token) => `${SHARE_LINK_PREFIX}${token}`;
var createWebSharePath = (token) => `/share/${encodeURIComponent(token)}`;
var shareApi = {
  community: (server, params) => {
    const base = `${server}${API_ENDPOINTS.SHARE}/community`;
    return params?.toString() ? `${base}?${params}` : base;
  },
  creatorCommunity: (server, userId, params) => {
    const base = `${server}${API_ENDPOINTS.SHARE}/community/${encodeURIComponent(userId)}`;
    return params?.toString() ? `${base}?${params}` : base;
  },
  owner: (server, userId, params) => {
    const base = `${server}${API_ENDPOINTS.SHARE}/owner/${encodeURIComponent(userId)}`;
    return params?.toString() ? `${base}?${params}` : base;
  }
};

export {
  createShareLink,
  createWebSharePath,
  shareApi
};
