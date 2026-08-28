import { asOptionalTrimmedString } from "core/optionalString";
import { buildAgentKeys, readAgentRecord } from "./agentDataHelpers";
import {
  ensureDemoUsersOnBases,
  loginDemoUser,
  registerDemoUser,
  runAgent,
  type DemoCredentials,
  type ServerDemoCredentials,
  writeRecord,
} from "./agentHelpers";
import { ensureAgentAttachedToSpace } from "./spaceDataHelpers";

export interface DemoUserOptions {
  baseUrl: string;
  seed: string;
  username: string;
  locale?: string;
}

export interface UpsertAgentOptions {
  baseUrl: string;
  authToken: string;
  userId: string;
  agentRecord: Record<string, any> & {
    id: string;
    name?: string;
    isPublic?: boolean;
  };
  attachSpaceId?: string;
  attachContentKey?: string;
  attachTitle?: string;
}

export async function ensureDemoUserAccess(
  options: DemoUserOptions
): Promise<DemoCredentials> {
  const { baseUrl, seed, username, locale = "zh-CN" } = options;
  await registerDemoUser(baseUrl, seed, username, locale).catch(() => null);
  return loginDemoUser(baseUrl, seed, username, locale);
}

export async function ensureDemoUserAccessOnBases(
  options: DemoUserOptions
): Promise<ServerDemoCredentials[]> {
  const { baseUrl, seed, username, locale = "zh-CN" } = options;
  return ensureDemoUsersOnBases({
    preferredBase: baseUrl,
    seed,
    username,
    locale,
  });
}

export async function upsertAgentRecord(options: UpsertAgentOptions) {
  const {
    baseUrl,
    authToken,
    userId,
    agentRecord,
    attachSpaceId,
    attachContentKey,
    attachTitle,
  } = options;
  const keys = buildAgentKeys(agentRecord.id, userId);
  const normalizedRecord = {
    ...agentRecord,
    userId,
    updatedAt: Date.now(),
    createdAt: agentRecord.createdAt ?? Date.now(),
  };

  await writeRecord(baseUrl, userId, authToken, keys.privateKey, normalizedRecord);
  if (agentRecord.isPublic) {
    await writeRecord(baseUrl, userId, authToken, keys.publicKey, normalizedRecord);
  }

  const contentKey =
    attachContentKey ?? (agentRecord.isPublic ? keys.publicKey : keys.privateKey);
  if (attachSpaceId) {
    await ensureAgentAttachedToSpace({
      baseUrl,
      userId,
      authToken,
      spaceId: attachSpaceId,
      contentKey,
      title: attachTitle ?? agentRecord.name ?? agentRecord.id,
    });
  }

  return {
    privateKey: keys.privateKey,
    publicKey: agentRecord.isPublic ? keys.publicKey : null,
    contentKey,
  };
}

export async function upsertAgentRecordOnBases(options: {
  serverEntries: ServerDemoCredentials[];
  agentRecord: UpsertAgentOptions["agentRecord"];
  attachSpaceId?: string;
  attachContentKey?: string;
  attachTitle?: string;
}) {
  const results = [];
  for (const entry of options.serverEntries) {
    const result = await upsertAgentRecord({
      baseUrl: entry.baseUrl,
      authToken: entry.authToken,
      userId: entry.userId,
      agentRecord: options.agentRecord,
      attachSpaceId: options.attachSpaceId,
      attachContentKey: options.attachContentKey,
      attachTitle: options.attachTitle,
    });
    results.push({ baseUrl: entry.baseUrl, ...result });
  }
  return results;
}

export async function attachExistingAgentToSpace(options: {
  baseUrl: string;
  authToken: string;
  userId: string;
  agentKey: string;
  spaceId: string;
}) {
  const { baseUrl, authToken, userId, agentKey, spaceId } = options;
  const agent = await readAgentRecord({ baseUrl, agentKey, authToken });
  await ensureAgentAttachedToSpace({
    baseUrl,
    userId,
    authToken,
    spaceId,
    contentKey: agentKey,
    title: asOptionalTrimmedString(agent?.name) ?? agentKey,
  });
  return agent;
}

export async function verifyAgentResponse(options: {
  baseUrl: string;
  authToken: string;
  agentKey: string;
  prompt?: string;
  expected?: string;
}) {
  const {
    baseUrl,
    authToken,
    agentKey,
    prompt = "只回复 OK",
    expected = "OK",
  } = options;
  const verify = await runAgent(baseUrl, authToken, agentKey, prompt);
  if (verify.content.trim() !== expected) {
    throw new Error(`验证失败，期望 "${expected}"，实际得到: ${verify.content}`);
  }
  return verify;
}
