import { asOptionalFiniteNumber } from "core/optionalNumber";

export type DeepInfraRequestIdStore = {
  iterator(options: { gte?: string; lte?: string }): AsyncIterable<[string, unknown]>;
};

export type DeepInfraRequestIdQueryResult = {
  requestIds: string[];
  responseIds: string[];
  scannedTokenRecords: number;
  matchedTokenRecords: number;
};

const TOKEN_PREFIX = "token-";
const TOKEN_RANGE_END = `${TOKEN_PREFIX}\uffff`;

const isTokenRecordLike = (value: unknown) =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { provider?: unknown }).provider === "string"
  );

const tokenTimestamp = (value: {
  timestamp?: unknown;
  createdAt?: unknown;
}) => {
  const timestamp = asOptionalFiniteNumber(value.timestamp);
  if (timestamp !== undefined) return timestamp;
  const createdAtNumber = asOptionalFiniteNumber(value.createdAt);
  if (createdAtNumber !== undefined) return createdAtNumber;
  if (typeof value.createdAt === "string") {
    const parsed = Date.parse(value.createdAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const pushStrings = (target: Set<string>, value: unknown) => {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed) target.add(trimmed);
  }
};

export async function collectDeepInfraRequestIds({
  store,
  bucketStart,
  bucketEnd,
}: {
  store: DeepInfraRequestIdStore;
  bucketStart: string;
  bucketEnd: string;
}): Promise<DeepInfraRequestIdQueryResult> {
  const startMs = Date.parse(bucketStart);
  const endMs = Date.parse(bucketEnd);
  const requestIds = new Set<string>();
  const responseIds = new Set<string>();
  let scannedTokenRecords = 0;
  let matchedTokenRecords = 0;

  for await (const [, value] of store.iterator({
    gte: TOKEN_PREFIX,
    lte: TOKEN_RANGE_END,
  })) {
    if (!isTokenRecordLike(value)) continue;
    scannedTokenRecords += 1;
    const record = value as {
      provider: string;
      timestamp?: number;
      createdAt?: number | string;
      provider_request_ids?: unknown;
      provider_response_ids?: unknown;
    };
    const time = tokenTimestamp(record);
    if (typeof time !== "number") continue;
    if (record.provider !== "deepinfra") continue;
    if (time < startMs || time >= endMs) continue;
    matchedTokenRecords += 1;
    pushStrings(requestIds, record.provider_request_ids);
    pushStrings(responseIds, record.provider_response_ids);
  }

  return {
    requestIds: [...requestIds],
    responseIds: [...responseIds],
    scannedTokenRecords,
    matchedTokenRecords,
  };
}
