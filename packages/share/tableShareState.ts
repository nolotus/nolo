import { DataType } from "create/types";
import { createWebSharePath } from "./link";
import { loadOwnerSharesAcrossServers } from "./loadOwnerShares";
import type { ShareSummary } from "./types";

export interface TableShareState {
  tableDbKey: string;
  matches: ShareSummary[];
  currentShare: ShareSummary | null;
  communityShare: ShareSummary | null;
  isCommunityShared: boolean;
  hasReplicationIssue: boolean;
  shareUrl?: string;
  communityShareUrl?: string;
}

const compareTableShares = (left: ShareSummary, right: ShareSummary) => {
  const leftCommunity = left.visibility === "community";
  const rightCommunity = right.visibility === "community";
  if (leftCommunity !== rightCommunity) {
    return leftCommunity ? -1 : 1;
  }
  return right.createdAt - left.createdAt;
};

export const isTableShareSummaryForDbKey = (
  share: ShareSummary,
  tableDbKey: string
): boolean => {
  if (share.type !== DataType.TABLE) return false;
  return share.originalId === tableDbKey || share.tableDbKey === tableDbKey;
};

export const buildTableShareState = (
  shares: ShareSummary[],
  tableDbKey: string
): TableShareState => {
  const matches = shares
    .filter((share) => isTableShareSummaryForDbKey(share, tableDbKey))
    .sort(compareTableShares);
  const currentShare = matches[0] ?? null;
  const communityShare =
    matches.find((share) => share.visibility === "community") ?? null;

  return {
    tableDbKey,
    matches,
    currentShare,
    communityShare,
    isCommunityShared: !!communityShare,
    hasReplicationIssue: Number(communityShare?.replicationDirtyAt ?? 0) > 0,
    ...(currentShare ? { shareUrl: createWebSharePath(currentShare.token) } : {}),
    ...(communityShare
      ? { communityShareUrl: createWebSharePath(communityShare.token) }
      : {}),
  };
};

export const loadTableShareState = async (args: {
  servers: string[];
  userId: string;
  token: string;
  tableDbKey: string;
  pageSize?: number;
}): Promise<TableShareState> => {
  const shares = await loadOwnerSharesAcrossServers({
    servers: args.servers,
    userId: args.userId,
    token: args.token,
    ...(typeof args.pageSize === "number" ? { pageSize: args.pageSize } : {}),
  });

  return buildTableShareState(shares, args.tableDbKey);
};
