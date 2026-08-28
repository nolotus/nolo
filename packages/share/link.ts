import { shareKey } from "./keys";
import { API_ENDPOINTS } from "database/config";

const SHARE_LINK_PREFIX = "share:";

export const createShareLink = (token: string) => `${SHARE_LINK_PREFIX}${token}`;

export const createWebSharePath = (token: string) =>
  `/share/${encodeURIComponent(token)}`;

/** Build absolute share API URL for a given server origin. */
export const shareApi = {
  community: (server: string, params?: URLSearchParams) => {
    const base = `${server}${API_ENDPOINTS.SHARE}/community`;
    return params?.toString() ? `${base}?${params}` : base;
  },
  creatorCommunity: (server: string, userId: string, params?: URLSearchParams) => {
    const base = `${server}${API_ENDPOINTS.SHARE}/community/${encodeURIComponent(userId)}`;
    return params?.toString() ? `${base}?${params}` : base;
  },
  owner: (server: string, userId: string, params?: URLSearchParams) => {
    const base = `${server}${API_ENDPOINTS.SHARE}/owner/${encodeURIComponent(userId)}`;
    return params?.toString() ? `${base}?${params}` : base;
  },
};

export const isShareImportInput = (input: string): boolean => {
  const value = input.trim();
  return value.startsWith(SHARE_LINK_PREFIX) || shareKey.isShareKey(value);
};

export const getShareDbKeyFromInput = (input: string): string => {
  const value = input.trim();
  if (!value) return "";
  if (shareKey.isShareKey(value)) return value;
  if (!value.startsWith(SHARE_LINK_PREFIX)) return "";

  const token = value.slice(SHARE_LINK_PREFIX.length).trim();
  return token ? shareKey.create(token) : "";
};
