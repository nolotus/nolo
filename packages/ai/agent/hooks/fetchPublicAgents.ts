import { getDb } from "database/client/db";
import { pino } from "pino";
import { pubAgentKeys } from "database/keys";
import { Agent } from "app/types";
import { getRecordTimestamp, isTombstoneRecord } from "database/tombstones";
import {
  filterPublicAgentRecords,
  preparePublicAgentCatalogRecords,
  type PublicAgentFilterOptions,
  type PublicAgentListOptions,
} from "ai/agent/publicAgentCatalog";
import { buildSortMeta, sortAgents } from "ai/agent/utils/sortUtils";

const logger = pino({ name: "fetchPublicAgents" });

interface FetchPublicAgentsOptions extends PublicAgentFilterOptions, PublicAgentListOptions {}

interface PublicAgentTombstone {
  id?: string;
  dbKey?: string;
  deletedAt?: string | number;
  updatedAt?: string | number;
  createdAt?: string | number;
}

export interface FetchPublicAgentsResult {
  data: Agent[];
  total: number;
  hasMore: boolean;
  tombstones: PublicAgentTombstone[];
}

export async function fetchPublicAgents(
  options: FetchPublicAgentsOptions = {}
): Promise<FetchPublicAgentsResult> {
  const {
    limit = 20,
    sortBy = "recommended",
    searchName,
    userId,
    imageOutputOnly = false,
    toolName,
  } = options;

  try {
    const ranges = pubAgentKeys.allPublicRanges();
    let results: Agent[] = [];
    let tombstones: PublicAgentTombstone[] = [];

    const db = getDb();
    if (!db) return { data: [], total: 0, hasMore: false, tombstones: [] };

    const iterators = await Promise.all(
      ranges.map(({ start, end }) =>
        db.iterator({
          gte: start,
          lte: end,
        })
      )
    );
    for (const iterator of iterators) {
      for await (const [, value] of iterator) {
        if (!value?.isPublic) continue;
        if (isTombstoneRecord(value)) {
          tombstones.push(value as PublicAgentTombstone);
          continue;
        }
        results.push(value as Agent);
      }
    }
    results = filterPublicAgentRecords(preparePublicAgentCatalogRecords(results), {
      searchName,
      userId,
      imageOutputOnly,
      toolName,
    });

    results = sortAgents(
      results.map((agent) => ({
        ...(agent as any),
        __sort: buildSortMeta(agent),
      })),
      sortBy
    );

    const paginatedResults = results.slice(0, limit);

    logger.debug(
      {
        total: results.length,
        returned: paginatedResults.length,
        sortBy,
        limit,
        imageOutputOnly,
        firstItemCreatedAt: paginatedResults[0]?.createdAt,
      },
      "Fetched public agents (local)"
    );

    return {
      data: paginatedResults,
      total: results.length,
      hasMore: limit < results.length,
      tombstones: tombstones.sort(
        (left, right) => getRecordTimestamp(right) - getRecordTimestamp(left)
      ),
    };
  } catch (error) {
    logger.error({ error }, "Failed to fetch public agents (local)");
    throw error;
  }
}
