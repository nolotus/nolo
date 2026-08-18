import {
  buildSkillDocMarkdown,
  parseSkillDocProtocol,
  resolvePageSkillMetadata,
  type SkillDocConfig,
} from "../../packages/ai/skills/skillDocProtocol";
import { deterministicId } from "./agentHelpers";
import { buildPageKey, buildPageRecord } from "./pageHelpers";
import { readDbRecord } from "./spaceDataHelpers";

export function normalizeSkillSeed(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSkillDocId(input: string) {
  return deterministicId("01SK", normalizeSkillSeed(input) || input);
}

export function buildSkillPageKey(userId: string, skillId: string) {
  return buildPageKey(userId, skillId);
}

export function buildSkillPageRecord(args: {
  dbKey: string;
  skillId: string;
  title: string;
  spaceId: string | null;
  body: string;
  skillConfig: SkillDocConfig;
  existing?: Record<string, any> | null;
}) {
  const { dbKey, skillId, title, spaceId, body, skillConfig, existing } = args;
  return {
    ...buildPageRecord({
      dbKey,
      pageId: skillId,
      title,
      spaceId,
      content: buildSkillDocMarkdown({
        body,
        skillConfig,
      }),
      existing,
      meta: {
        ...(existing?.meta ?? {}),
        kind: "skill",
        skillConfig,
      },
      slateData: null,
    }),
  };
}

export async function readSkillDocRecord(args: {
  baseUrl: string;
  authToken: string;
  skillKey: string;
}) {
  const record = await readDbRecord(args.baseUrl, args.authToken, args.skillKey);
  const parsed = parseSkillDocProtocol(record.content ?? "", record.meta, record.tools);
  const meta = resolvePageSkillMetadata(record);
  return {
    record,
    body: parsed.content,
    meta,
    skillConfig: meta?.skillConfig,
  };
}

export function parseJsonArg<T>(raw: string | undefined, fallback: T): T {
  if (raw === undefined) return fallback;
  return JSON.parse(raw) as T;
}
