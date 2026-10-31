// packages/app/settings/settingPersistence.ts
//
// 单一职责:settings 的 hydrate 与持久化计划。
// 负责把远端存储的 settings record 转换成运行时 state(hydrate),以及把本地 state
// 变化转换成 settings record + register-backed write(persistence plan)。
//
// 不直接 dispatch settings slice action;只产出数据。调用方(如 setSettings thunk)
// 负责把 normalized changes 应用到 state。

import { asRecordOrEmpty } from "core/recordOrEmpty";
import { createUserKey, createUserPreferenceKey } from "database/keys";
import {
  USER_PREFERENCE_NAMES,
  buildDefaultAgentPreferenceRegisterRecord,
  readUserPreferenceRegisterValue,
  type UserPreferenceRegisterRecord,
} from "database/userPreferenceRegister";
import { DEFAULT_USER_PREFERENCE_PROFILE } from "ai/policy/types";
import { normalizeAgentUpdateFieldList } from "ai/policy/selfUpdateFields";
import { getSettingDbActionThunks } from "./dbActionThunks";
import { withSettingsRecordSchema } from "./settingsRecord";
import {
  hasOwn,
  normalizeAuthorityHomeServerSetting,
  normalizeDefaultAgentIdSetting,
  normalizePolicyLevelSetting,
  normalizeTonePresetSetting,
  normalizeSystemBuiltinSkills,
  omitKeys,
} from "./settingNormalizers";
import { SYSTEM_DEFAULT_AGENT_ID, type SettingState } from "./settingTypes";
import { DEFAULT_SYSTEM_AGENT_CAPABILITIES as DEFAULT_SYSTEM_BUILTIN_SKILLS } from "ai/tools/agentCapabilities";
import { normalizeEnabledPromptSkills } from "ai/skills/userPromptSkills";

/**
 * Run every field-level normalizer that may apply to a `setSettings` payload.
 * Returned object contains only keys that survived normalization.
 */
export const normalizeSettingChanges = (
  changes: Partial<SettingState>,
): Partial<SettingState> => {
  // Drop removed animation-picker values from historical callers before any write.
  let normalizedChanges: Partial<SettingState> = omitKeys(changes, [
    "preferredAnimationSet",
    "createMenuOpenCount",
    // 本地意图世代只活在 redux 状态里：既不能从服务端 record 写回，也不能写云。
    "localIntentEpoch",
    // 权威回显世代同理：纯本地世代标记，不入云端 record、不被远端回灌。
    "serverAuthorityEchoSeq",
    // 写失败状态同样是纯本地 observability：绝不进入云端 settings record。
    "lastWriteFailure",
    // Retired device appearance is never accepted by Redux, including legacy callers.
    "themeName", "themeMode", "isDark", "density", "fontPreset",
  ]) as Partial<SettingState>;

  if (hasOwn(normalizedChanges, "defaultAgentId")) {
    normalizedChanges = {
      ...normalizedChanges,
      defaultAgentId: normalizeDefaultAgentIdSetting(
        normalizedChanges.defaultAgentId,
      ),
    };
  }

  if (hasOwn(normalizedChanges, "defaultSpaceId")) {
    // Sticky default space was removed — strip legacy payloads.
    normalizedChanges = omitKeys(normalizedChanges, [
      "defaultSpaceId",
    ]) as Partial<SettingState>;
  }

  if (hasOwn(normalizedChanges, "userTonePreset")) {
    normalizedChanges = {
      ...normalizedChanges,
      userTonePreset: normalizeTonePresetSetting(
        normalizedChanges.userTonePreset,
      ),
    };
  }

  if (hasOwn(normalizedChanges, "knowledgeCaptureLevel")) {
    normalizedChanges = {
      ...normalizedChanges,
      knowledgeCaptureLevel: normalizePolicyLevelSetting(
        normalizedChanges.knowledgeCaptureLevel,
        DEFAULT_USER_PREFERENCE_PROFILE.knowledgeCaptureLevel,
      ) as SettingState["knowledgeCaptureLevel"],
    };
  }

  if (hasOwn(normalizedChanges, "spaceContextLevel")) {
    normalizedChanges = {
      ...normalizedChanges,
      spaceContextLevel: normalizePolicyLevelSetting(
        normalizedChanges.spaceContextLevel,
        DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel,
      ) as SettingState["spaceContextLevel"],
    };
  }

  if (hasOwn(normalizedChanges, "autoApproveSelfUpdateFields")) {
    normalizedChanges = {
      ...normalizedChanges,
      autoApproveSelfUpdateFields: normalizeAgentUpdateFieldList(
        normalizedChanges.autoApproveSelfUpdateFields,
      ),
    };
  }

  if (hasOwn(normalizedChanges, "systemBuiltinSkills")) {
    normalizedChanges = {
      ...normalizedChanges,
      systemBuiltinSkills: normalizeSystemBuiltinSkills(
        normalizedChanges.systemBuiltinSkills,
        DEFAULT_SYSTEM_BUILTIN_SKILLS,
      ),
    };
  }

  if (hasOwn(normalizedChanges, "enabledPromptSkills")) {
    normalizedChanges = {
      ...normalizedChanges,
      enabledPromptSkills: normalizeEnabledPromptSkills(
        normalizedChanges.enabledPromptSkills,
      ),
    };
  }

  return normalizedChanges;
};

/**
 * Appearance-only keys that are pure local preference: never written to the
 * server-side settings record and stripped from remotely stored records on
 * hydrate.
 */
const LOCAL_APPEARANCE_KEY_NAMES = [
  "themeName",
  "themeMode",
  "isDark",
  "density",
  "fontPreset",
] as const;

/**
 * Keys a guest (no logged-in user) may still update in local redux state.
 * Superset of the appearance keys: sidebarWidth stays server-persisted for
 * logged-in users, but must remain adjustable when logged out (desktop
 * local-first sidebar toggle/resize).
 */
const GUEST_UPDATABLE_KEY_NAMES = [
  "sidebarWidth",
] as const satisfies ReadonlyArray<keyof SettingState>;

/**
 * Appearance-only changes that should still update local state even when no
 * user is logged in (no server-side persistence).
 */
export const LOCAL_FIRST_APPEARANCE_KEYS: Readonly<
  Record<(typeof LOCAL_APPEARANCE_KEY_NAMES)[number], true>
> = Object.freeze(
  Object.fromEntries(
    LOCAL_APPEARANCE_KEY_NAMES.map((key) => [key, true]),
  ) as Record<(typeof LOCAL_APPEARANCE_KEY_NAMES)[number], true>,
);

/**
 * Keys that must NEVER be written back to the server-side settings record,
 * because they're either register-backed elsewhere (userAuthorityRegistry)
 * or pure local preference (appearance).
 */
export const LOCAL_ONLY_SETTINGS_KEYS: Readonly<
  Record<(typeof LOCAL_APPEARANCE_KEY_NAMES)[number], true>
> = LOCAL_FIRST_APPEARANCE_KEYS;

const GUEST_UPDATABLE_KEYS: Readonly<
  Record<(typeof GUEST_UPDATABLE_KEY_NAMES)[number], true>
> = Object.freeze(
  Object.fromEntries(
    GUEST_UPDATABLE_KEY_NAMES.map((key) => [key, true]),
  ) as Record<(typeof GUEST_UPDATABLE_KEY_NAMES)[number], true>,
);

const isGuestUpdatableKey = (
  key: string,
): key is (typeof GUEST_UPDATABLE_KEY_NAMES)[number] =>
  key in GUEST_UPDATABLE_KEYS;

export const isLocalFirstAppearanceChange = (
  changes: Partial<SettingState>,
): boolean => {
  const keys = Object.keys(changes);
  if (keys.length === 0) return false;
  return keys.every((key): key is (typeof GUEST_UPDATABLE_KEY_NAMES)[number] =>
    isGuestUpdatableKey(key),
  );
};

export const stripRegisterBackedFieldsFromSettingsWrite = (
  changes: Partial<SettingState>,
): Partial<SettingState> => {
  return omitKeys(changes, [
    "autoApproveCredits",
    "defaultSpaceId",
    "userAuthorityRegistry",
    "preferredAnimationSet",
    "createMenuOpenCount",
    ...LOCAL_APPEARANCE_KEY_NAMES,
  ]) as Partial<SettingState>;
};

/**
 * Drop schema-managed keys and any key that isn't supposed to be persisted on
 * the server. Returns null if nothing remains.
 */
export const sanitizeStoredSettingsRecord = (
  settingsRecord: unknown,
): Record<string, unknown> | null => {
  if (!settingsRecord || typeof settingsRecord !== "object") {
    return null;
  }

  const record = settingsRecord as Record<string, unknown>;
  const sanitizedSettings = omitKeys(record, [
    "autoApproveCredits",
    "defaultSpaceId",
    "schemaVersion",
    "preferredAnimationSet",
    ...LOCAL_APPEARANCE_KEY_NAMES,
  ]);
  return Object.keys(sanitizedSettings).length > 0 ? sanitizedSettings : null;
};

export const hydrateStoredSettings = ({
  userId,
  settingsRecord,
  authorityHomeServer,
}: {
  userId?: string | null;
  settingsRecord: unknown;
  authorityHomeServer?: string | null;
}): Record<string, unknown> | null => {
  const record = (settingsRecord ?? {}) as Record<string, unknown>;
  const resolvedDefaultAgentId =
    normalizeDefaultAgentIdSetting(record.defaultAgentId) ??
    SYSTEM_DEFAULT_AGENT_ID;
  const resolvedEnabledPromptSkills = normalizeEnabledPromptSkills(
    record.enabledPromptSkills,
  );

  const baseSettings = sanitizeStoredSettingsRecord(settingsRecord) ?? {};
  const normalizedAuthorityHome =
    normalizeAuthorityHomeServerSetting(authorityHomeServer);
  const existingRegistry = asRecordOrEmpty(
    baseSettings.userAuthorityRegistry
  ) as Record<string, string>;
  const userAuthorityRegistry =
    userId && normalizedAuthorityHome
      ? { ...existingRegistry, [userId]: normalizedAuthorityHome }
      : existingRegistry;
  const userAuthorityRegistryIsEmpty = Object.keys(userAuthorityRegistry).length === 0;
  const hydratedSettings = {
    ...baseSettings,
    enabledPromptSkills: resolvedEnabledPromptSkills,
    // 服务端独占字段：只读回显（缺失时沿用初始值 0，非法值按 0）
    ...(hasOwn(record, "autoApproveCredits")
      ? { autoApproveCredits: typeof record.autoApproveCredits === "number" && Number.isFinite(record.autoApproveCredits) && record.autoApproveCredits >= 0 ? record.autoApproveCredits : 0 }
      : {}),
    ...(userAuthorityRegistryIsEmpty ? {} : { userAuthorityRegistry }),
    defaultAgentId: resolvedDefaultAgentId,
  };

  return Object.keys(hydratedSettings).length > 0 ? hydratedSettings : null;
};

/**
 * 服务端权威字段：只读回显，不由用户意图驱动。
 *
 * 它们既不在 `stripRegisterBackedFieldsFromSettingsWrite` / `sanitizeStoredSettingsRecord`
 * 的放行口径里（用户永远写不上去），也不该跟着用户偏好一起被丢弃——因此即使一次
 * hydrate 因 epoch 不一致被整体丢弃，这两个字段仍要落到 Redux。
 *
 * 这里**显式列出**，不写成「除用户偏好以外的全部」：以后新增的字段默认不进入
 * 权威集合，必须在这里被单独确认。
 */
const SERVER_AUTHORITATIVE_SETTINGS_KEYS = [
  "autoApproveCredits",
  "userAuthorityRegistry",
] as const satisfies ReadonlyArray<keyof SettingState>;

/**
 * 从 hydrate 结果里挑出服务端权威字段，作为可独立应用的最小 payload。
 *
 * 语义保证（与 `hydrateStoredSettings` 一致）：
 *  - `autoApproveCredits` 在 `hydrateStoredSettings` 里是**先于 sanitize** 从原始
 *    record 取的（`sanitizeStoredSettingsRecord` 会剥掉它），因此这里拿到的是权威值；
 *  - record 里没有该键 → hydrate 结果里也没有该键 → 整项不写，绝不写 0 覆盖当前值；
 *  - `userAuthorityRegistry` 为空时不出现 → 同样不写空对象覆盖。
 */
export const pickServerAuthoritativeSettings = (
  hydrated: Record<string, unknown>,
): Partial<SettingState> => {
  const picked: Record<string, unknown> = {};
  for (const key of SERVER_AUTHORITATIVE_SETTINGS_KEYS) {
    if (hasOwn(hydrated, key)) {
      picked[key] = hydrated[key];
    }
  }
  return picked as Partial<SettingState>;
};

export const buildSettingsPersistencePlan = ({
  userId,
  currentSettings,
  changes,
  previousDefaultAgentRecord,
}: {
  userId: string;
  currentSettings: Partial<SettingState>;
  changes: Partial<SettingState>;
  previousDefaultAgentRecord: Partial<UserPreferenceRegisterRecord<string>> | null | undefined;
}) => {
  const normalizedChanges = normalizeSettingChanges(changes);
  const persistedChanges =
    stripRegisterBackedFieldsFromSettingsWrite(normalizedChanges);
  const previousDefaultAgentId =
    normalizeDefaultAgentIdSetting(currentSettings.defaultAgentId) ??
    SYSTEM_DEFAULT_AGENT_ID;
  const nextDefaultAgentId =
    normalizeDefaultAgentIdSetting(normalizedChanges.defaultAgentId) ?? null;

  const previousDefaultAgentValue =
    readUserPreferenceRegisterValue<string>(
      previousDefaultAgentRecord,
      USER_PREFERENCE_NAMES.DEFAULT_AGENT,
    ) ?? null;

  const defaultAgentRegisterWrite =
    hasOwn(normalizedChanges, "defaultAgentId") &&
    previousDefaultAgentId !==
      (nextDefaultAgentId ?? SYSTEM_DEFAULT_AGENT_ID) &&
    (!previousDefaultAgentRecord ||
      previousDefaultAgentValue !== nextDefaultAgentId)
      ? {
          customKey: createUserPreferenceKey.defaultAgent(userId),
          data: buildDefaultAgentPreferenceRegisterRecord({
            userId,
            defaultAgentId: nextDefaultAgentId,
            previousRecord: previousDefaultAgentRecord,
          }),
        }
      : null;

  const settingsPatch =
    Object.keys(persistedChanges).length > 0
      ? {
          dbKey: createUserKey.settings(userId),
          changes: withSettingsRecordSchema(
            persistedChanges as Record<string, unknown>,
          ),
        }
      : null;

  return {
    normalizedChanges,
    defaultAgentRegisterWrite,
    settingsPatch,
  };
};

/**
 * Read the cached default-agent preference record from the in-memory db entities.
 * Returns null if the record is missing or not an object.
 */
export const getCachedDefaultAgentRegisterRecord = (
  getState: () => { db: { entities: Record<string, unknown> } },
  registerKey: string,
): Partial<UserPreferenceRegisterRecord<string>> | null => {
  const record = getState().db.entities[registerKey];
  if (!record || typeof record !== "object") return null;
  return record as Partial<UserPreferenceRegisterRecord<string>>;
};

/**
 * Persist the user's default-agent id to the dedicated register, skipping the
 * write when the value already matches the previous one. The dispatcher is
 * typed loosely because the readAndWait / write thunks come from a swappable
 * layer (see `./dbActionThunks`) and full thunk type inference here would
 * require importing the full ThunkApi.
 */
export const persistDefaultAgentRegister = async (
  dispatch: (action: unknown) => { unwrap: () => Promise<unknown> },
  getState: () => { db: { entities: Record<string, unknown> } },
  userId: string,
  value: string | null,
): Promise<void> => {
  const registerKey = createUserPreferenceKey.defaultAgent(userId);
  let previousRecord: Partial<UserPreferenceRegisterRecord<string>> | null =
    getCachedDefaultAgentRegisterRecord(getState, registerKey);
  if (!previousRecord) {
    previousRecord = (await dispatch(
      getSettingDbActionThunks().readAndWait(registerKey),
    )
      .unwrap()
      .catch(() => null)) as Partial<UserPreferenceRegisterRecord<string>> | null;
  }

  const previousValue =
    readUserPreferenceRegisterValue<string>(
      previousRecord,
      USER_PREFERENCE_NAMES.DEFAULT_AGENT,
    ) ?? null;
  if (previousRecord && previousValue === value) {
    return;
  }

  await dispatch(
    getSettingDbActionThunks().write({
      customKey: registerKey,
      data: buildDefaultAgentPreferenceRegisterRecord({
        userId,
        defaultAgentId: value,
        previousRecord,
      }),
    }),
  ).unwrap();
};
