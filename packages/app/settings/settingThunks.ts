import { ACCOUNT_CHAT_DISPLAY_PREFERENCE_KEYS } from "./accountChatDisplayOwner";
// packages/app/settings/settingThunks.ts
//
// 单一职责:settings slice 的所有 async thunk(getSettings / setSettings /
// 各种细粒度 setXxx / toggleXxx / changeXxx)。
//
// thunk 必须放在 settingSlice 之外定义,避免 reducers 闭包内 thunk 自递归
// 触发的 TS 类型推断失败。

import { createAsyncThunk } from "@reduxjs/toolkit";

import { selectIdentityUserId } from "identity/selectors";
import { getSessionGenerationForState, getSessionSnapshotForState } from "identity/sessionSource";
import { createUserKey, createUserPreferenceKey } from "database/keys";
import {
  USER_PREFERENCE_NAMES,
  readUserPreferenceRegisterValue,
} from "database/userPreferenceRegister";
import {
  DEFAULT_USER_PREFERENCE_PROFILE,
  type KnowledgeCaptureLevel,
  type SpaceContextLevel,
  type TonePreset,
} from "ai/policy/types";

import {
  bumpLocalIntentEpoch,
  publishUiPlugins,
  recordSettingsWriteFailure,
  updateSettingsState,
} from "./settingActions";
import { enqueueAccountSettingsWrite } from "./accountSettingsWriteQueue";
import {
  SETTINGS_WRITE_RETRY_BACKOFF_MS,
  delaySettingsWriteRetry,
  describeSettingsWriteFailure,
  isSettingsWriteSupersededError,
  readLocalIntentEpoch,
  resolveSettingsWriteFailureAfterSuccess,
  SettingsWriteSupersededError,
} from "./settingsWriteRetry";
import { getAccountChatDisplayOwner, pickAccountChatDisplayPreferences, omitAccountChatDisplayPreferences, type AccountChatDisplayPreferences } from "./accountChatDisplayOwner";
import { getSettingDbActionThunks } from "./dbActionThunks";
import {
  buildSettingsPersistencePlan,
  hydrateStoredSettings,
  isLocalFirstAppearanceChange,
  normalizeSettingChanges,
  persistDefaultAgentRegister,
  pickServerAuthoritativeSettings,
} from "./settingPersistence";
import {
  hasOwn,
  normalizeDefaultAgentIdSetting,
  resolveDefaultAgentIdSetting,
} from "./settingNormalizers";
import { SYSTEM_DEFAULT_AGENT_ID, type SettingState, type SettingsWriteFailure } from "./settingTypes";

/**
 * 单调「服务端权威回显」世代。字段缺失/非数值一律读作 0（与
 * `readLocalIntentEpoch` 同口径：早期 store 行为与旧代码一致）。
 */
const readServerAuthorityEchoSeq = (getState: () => unknown): number => {
  const value = (getState() as { settings?: { serverAuthorityEchoSeq?: unknown } })
    ?.settings?.serverAuthorityEchoSeq;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

/**
 * 插件域意图快照：来源（归属账号 / 代次）+ 值的**对象引用**。
 *
 * `publishUiPlugins` 是插件域唯一的写入口，每次都原子写入这三项、并把值换成
 * `normalizeUiPlugins` 的新对象。因此「三项全等」等价于「本次远端读期间插件域
 * 没有被任何人写过」——用它就能把插件域与无关设置的意图隔离开：
 * `localIntentEpoch` 仍统管用户偏好字段，但不再顺带决定插件快照能否发布。否则
 * 新 generation 的插件 hydrate 只要与一次无关设置写入（sidebarWidth 等）重叠就会
 * 被整体跳过，而没有任何其它路径为当前 generation 补发插件来源，selector 随后
 * fail-closed 成 absent（PLUGIN-HYDRATE-UNRELATED-INTENT-001）。
 *
 * 已知取舍（同一 generation 内并发 hydrate 时「先完成者发布」）：第二次读会发现
 * 插件域已被第一次读发布而跳过。生产入口 App.tsx 的 hydrateSessionSettings 按
 * session key 去重（同一 key 复用同一 promise），不存在同代次并发读；若将来新增
 * 同代次并发读入口，需在这里补更精确的来源标记，而不是放宽本判据。
 */
interface UiPluginIntentSnapshot {
  value: unknown;
  ownerAccountId: string | null;
  generation: number | undefined;
}

const readUiPluginIntentSnapshot = (
  getState: () => unknown,
): UiPluginIntentSnapshot => {
  const state = (getState() as { settings?: Partial<SettingState> })?.settings;
  return {
    value: state?.uiPlugins,
    ownerAccountId: state?.uiPluginsOwnerAccountId ?? null,
    generation: state?.uiPluginsGeneration,
  };
};

const isSameUiPluginIntent = (
  a: UiPluginIntentSnapshot,
  b: UiPluginIntentSnapshot,
): boolean =>
  a.value === b.value &&
  a.ownerAccountId === b.ownerAccountId &&
  a.generation === b.generation;

/**
 * Read the persisted settings record for the current user, normalize it, and
 * apply it to local state. Returns the hydrated record (or null when no user).
 */
const latestChatHydrations = new WeakMap<Function, object>();

export const getSettings = createAsyncThunk<
  Record<string, unknown> | null,
  void,
  { state: any }
>("settings/getSettings", async (_, { dispatch, getState }) => {
  const userId = selectIdentityUserId(getState() as any);
  if (!userId || (getSessionSnapshotForState(getState()) && getSessionSnapshotForState(getState())?.transition !== "idle")) return null;
  const session = getSessionGenerationForState(getState());
  const hydration = {};
  latestChatHydrations.set(getState, hydration);
  // Captured before the cloud read: this hydrate may only be applied when no
  // local user intent was published while the read was in flight.
  const startLocalIntentEpoch = readLocalIntentEpoch(getState);
  // Second, independent generation: server-authoritative echo writes (media
  // allowance echo) advance it. A hydrate may only overwrite
  // `autoApproveCredits` when no echo happened during the read.
  const startAuthorityEchoSeq = readServerAuthorityEchoSeq(getState);
  // Plugin-domain intent captured with the same discipline as the two
  // generations above, but scoped to plugins only: see
  // `readUiPluginIntentSnapshot`.
  const startUiPluginIntent = readUiPluginIntentSnapshot(getState);
  const settingsKey = createUserKey.settings(userId);
  const authorityHomeKey = createUserPreferenceKey.authorityHome(userId);
  const [settingsRecord, authorityHomeRecord] = await Promise.all([
    dispatch(getSettingDbActionThunks().readAndWait(settingsKey))
      .unwrap()
      .catch(() => null),
    dispatch(getSettingDbActionThunks().readAndWait(authorityHomeKey))
      .unwrap()
      .catch(() => null),
  ]);
  // A pending cloud read must not hydrate a different signed-in account.
  if (selectIdentityUserId(getState() as any) !== userId ||
      (getSessionSnapshotForState(getState()) && getSessionSnapshotForState(getState())?.transition !== "idle") ||
      getSessionGenerationForState(getState()) !== session ||
      latestChatHydrations.get(getState) !== hydration) return null;
  const authorityHomeServer =
    readUserPreferenceRegisterValue<string>(
      authorityHomeRecord,
      USER_PREFERENCE_NAMES.AUTHORITY_HOME,
    ) ?? null;

  const hydrated = hydrateStoredSettings({
    userId,
    settingsRecord,
    authorityHomeServer,
  });
  if (hydrated) {
    const normalizedPayload = normalizeSettingChanges(
      hydrated as Partial<SettingState>,
    );
    const { currentServer: _ignored, ...settingsToApply } = normalizedPayload;
    // Hydrate the account owner without allowing a stale cloud read to cross identities.
    if (selectIdentityUserId(getState() as any) !== userId ||
      (getSessionSnapshotForState(getState()) && getSessionSnapshotForState(getState())?.transition !== "idle") ||
      getSessionGenerationForState(getState()) !== session ||
      latestChatHydrations.get(getState) !== hydration) return null;
    // Three independent staleness guards, each scoped to what it actually protects:
    //  - 用户意图世代（localIntentEpoch）：远端读期间用户改过设置 → 丢弃本次
    //    hydrate 的**用户偏好**字段（不写 Owner、不写用户偏好）；
    //  - 权威回显世代（serverAuthorityEchoSeq）：远端读期间服务端回显过权威值
    //    → 丢弃本次 hydrate 的 **autoApproveCredits**（不覆盖更新的回显）；
    //  - 插件域意图快照（uiPlugins 值 + 来源账号/代次）：只看插件域，无关设置的
    //    写入不得挡掉插件快照（见下方 pluginIntentChanged）。
    // 三者互不推进、互不代替。
    const intentChanged =
      readLocalIntentEpoch(getState) !== startLocalIntentEpoch;
    const echoChanged =
      readServerAuthorityEchoSeq(getState) !== startAuthorityEchoSeq;
    const authoritative = pickServerAuthoritativeSettings(hydrated);
    const {
      autoApproveCredits: _ignoredCredits,
      userAuthorityRegistry: _ignoredRegistry,
      ...preferenceFields
    } = settingsToApply;
    const applied: Partial<SettingState> = {};
    // 插件快照按**插件域**自己的意图判定，而不是全局用户意图世代：
    // 无关设置（sidebarWidth / maxExecutionTime 等）的写入也会推进
    // localIntentEpoch，却与插件无关。用全局世代判它会让新 generation 的插件
    // hydrate 被一次无关写入整体挡掉，且没有其它路径为当前 generation 补发插件
    // 来源，selector 随后 fail-closed 成 absent（插件入口消失、开关被拒绝）。
    // 反之，本次读期间真的发生过本地插件意图（值/来源三项任一变化）时，更旧的
    // hydrate 不得覆盖它。
    const pluginIntentChanged = !isSameUiPluginIntent(
      startUiPluginIntent,
      readUiPluginIntentSnapshot(getState),
    );
    if (!pluginIntentChanged) {
      dispatch(publishUiPlugins({ value: settingsToApply.uiPlugins!, accountId: userId, generation: session }));
    }
    // 用户偏好字段仍由全局用户意图世代统管：期间有任意本地写入 → 更旧的云端
    // 偏好值一律丢弃（不写 Owner、不写偏好）。
    if (!intentChanged) {
      Object.assign(applied, preferenceFields);
    }
    // autoApproveCredits：仅当期间没有发生权威回显才应用（回显更新 → 跳过）。
    if (!echoChanged && hasOwn(authoritative, "autoApproveCredits")) {
      applied.autoApproveCredits = authoritative.autoApproveCredits as number;
    }
    // userAuthorityRegistry：由同一次读派生（不是独立回显），照旧应用。
    if (hasOwn(authoritative, "userAuthorityRegistry")) {
      applied.userAuthorityRegistry = authoritative.userAuthorityRegistry as
        | Record<string, string>
        | undefined;
    }
    // Same account, but the user edited settings while this cloud read was in
    // flight: the persisted user-preference values are older than local intent,
    // so drop them (no Owner write-back, no preference write-back).
    // Server-authoritative fields are still mirrored per the rules above: they
    // are read-only echoes that user intent can never drive, so keeping them
    // stale until the next hydrate would leave autoApproveCredits sitting on
    // the initialState default.
    if (intentChanged) {
      if (Object.keys(applied).length > 0) {
        dispatch(updateSettingsState(applied));
      }
      return null;
    }
    const owner = getAccountChatDisplayOwner(getState);
    owner.setAccount(userId);
    owner.updateForAccount(userId, pickAccountChatDisplayPreferences(preferenceFields));
    dispatch(updateSettingsState(omitAccountChatDisplayPreferences(applied)));
  }
  return hydrated;
});

/**
 * Apply settings changes. The thunk is responsible for:
 *  1. Normalizing the changes
 *  2. Persisting the settings record (via buildSettingsPersistencePlan)
 *  3. Persisting register-backed fields (defaultAgentId)
 *  4. Updating local state via updateSettingsState
 *
 * When no user is logged in, only guest-updatable changes (local-first
 * appearance keys plus sidebarWidth) are accepted; other settings still
 * require a logged-in user.
 */
const persistSettingsChanges = createAsyncThunk<
  Partial<SettingState>,
  Partial<SettingState>,
  { state: any }
>("settings/persistSettingsChanges", async (changes, { dispatch, getState }) => {
  const session = getSessionGenerationForState(getState());
  const currentSettings = (getState() as any).settings;
  const normalizedChanges = normalizeSettingChanges(changes);
  const previousDefaultAgentId =
    normalizeDefaultAgentIdSetting(currentSettings.defaultAgentId) ??
    SYSTEM_DEFAULT_AGENT_ID;
  const userId = selectIdentityUserId(getState() as any);
  if (hasOwn(normalizedChanges, "uiPlugins") && getSessionSnapshotForState(getState())?.transition !== "idle") throw new Error("Session is transitioning.");
  if (!userId) {
    const hasAppearanceChanges = Object.keys(normalizedChanges).length > 0;
    if (hasAppearanceChanges) {
      if (!isLocalFirstAppearanceChange(normalizedChanges)) {
        throw new Error("User not found for persisting settings.");
      }
    } else {
      throw new Error("User not found for persisting settings.");
    }
    dispatch(bumpLocalIntentEpoch());
    dispatch(updateSettingsState(normalizedChanges));
    return normalizedChanges;
  }
  const persistencePlan = buildSettingsPersistencePlan({
    userId,
    currentSettings,
    changes: normalizedChanges,
    previousDefaultAgentRecord: null,
  });
  // Publish synchronously alongside the legacy Redux mirror. Waiting for
  // cloud persistence makes the Owner stale and lets older requests overwrite
  // newer user intent when they complete out of order.
  if (selectIdentityUserId(getState() as any) !== userId) return {};
  const owner = getAccountChatDisplayOwner(getState);
  // Local user intent is being published now: advance the generation so any
  // hydrate that started earlier is discarded instead of overwriting it.
  dispatch(bumpLocalIntentEpoch());
  // Identifies this intent for the write path: a failure may only be retried
  // while this is still the account's newest local intent.
  const intentEpoch = readLocalIntentEpoch(getState);
  owner.setAccount(userId);
  owner.updateForAccount(userId, pickAccountChatDisplayPreferences(persistencePlan.normalizedChanges));
  if (hasOwn(persistencePlan.normalizedChanges, "uiPlugins")) {
    dispatch(publishUiPlugins({ value: persistencePlan.normalizedChanges.uiPlugins!, accountId: userId, generation: session }));
  }
  dispatch(updateSettingsState(omitAccountChatDisplayPreferences(persistencePlan.normalizedChanges)));
  // Keys of the user intent (for the failure state) and of the keys that are
  // actually pushed to the cloud settings record (for reconciliation).
  const intentKeys = Object.keys(persistencePlan.normalizedChanges);
  const persistedKeys = Object.keys(
    persistencePlan.settingsPatch?.changes ?? {},
  ).filter((key) => key !== "schemaVersion");
  const isCurrentIntent = () =>
    (!getSessionSnapshotForState(getState()) || getSessionSnapshotForState(getState())?.transition === "idle") &&
    selectIdentityUserId(getState()) === userId &&
    getSessionGenerationForState(getState()) === session &&
    readLocalIntentEpoch(getState) === intentEpoch;
  const performWrite = async () => {
    // 便宜收紧（非原子）：每次真正发写之前再判一次世代 —— 首次与重试各一次。
    // 若这次意图已被更新的本地意图取代，就不要把旧 payload 发出去；窗口从
    // 「退避 200ms + 一次网络往返」缩到一次函数调用。最终一致性仍由同账号串行
    // 队列保证：新意图的写排在队尾、紧接本次之后执行并覆盖服务端。
    // 抛哨兵错误（而不是普通 Error）：被取代 ≠ 失败，调用方应正常 resolve。
    if (!isCurrentIntent()) {
      throw new SettingsWriteSupersededError();
    }
    const nextDefaultAgentId =
      normalizeDefaultAgentIdSetting(
        persistencePlan.normalizedChanges.defaultAgentId,
      ) ?? null;
    if (
      hasOwn(changes, "defaultAgentId") &&
      previousDefaultAgentId !== (nextDefaultAgentId ?? SYSTEM_DEFAULT_AGENT_ID)
    ) {
      await persistDefaultAgentRegister(
        dispatch as unknown as (action: unknown) => {
          unwrap: () => Promise<unknown>;
        },
        getState as unknown as () => {
          db: { entities: Record<string, unknown> };
        },
        userId,
        nextDefaultAgentId,
      );
    }
    if (persistencePlan.settingsPatch) {
      await dispatch(
        getSettingDbActionThunks().upsert({
          dbKey: persistencePlan.settingsPatch.dbKey,
          data: persistencePlan.settingsPatch.changes,
        }),
      ).unwrap();
    }
  };
  // 写成功即收敛已有的失败状态：本次覆盖了失败状态里剩下的全部键 → 清空；
  // 只覆盖一部分 → 剔除已覆盖的键（剩下的继续可见）；其它账号的状态不动。
  const settleSettingsWriteFailureAfterSuccess = () => {
    if (!isCurrentIntent()) return;
    const existing = (getState() as any)?.settings
      ?.lastWriteFailure as SettingsWriteFailure | null | undefined;
    if (!existing) return;
    const next = resolveSettingsWriteFailureAfterSuccess({
      failure: existing,
      accountId: userId,
      intentKeys,
      persistedKeys,
    });
    // 同一引用 = 跨账号状态，本次成功与它无关，不 dispatch。
    if (next === existing) return;
    dispatch(recordSettingsWriteFailure(next));
  };
  // Preserve persistence ordering for overlapping writes by this account.
  // Local UI/Owner publication above remains immediate and optimistic.
  await enqueueAccountSettingsWrite(getState, userId, async () => {
    let firstFailureAt = 0;
    try {
      await performWrite();
      settleSettingsWriteFailureAfterSuccess();
      return;
    } catch (firstError) {
      // 被更新的本地意图取代（写前复查就已放弃）：不是失败，正常 resolve。
      // 新意图自己的写正在正常进行，调用方 / UI 不该看到「保存失败」。
      if (isSettingsWriteSupersededError(firstError)) return;
      firstFailureAt = Date.now();
      // Only retry while this intent is still the account's newest local intent.
      // A newer edit makes the server write of this payload pointless and
      // dangerous (it would persist a value the user already replaced).
      // Being superseded at any of these points is a resolve, never a reject.
      if (!isCurrentIntent()) return;
      await delaySettingsWriteRetry(SETTINGS_WRITE_RETRY_BACKOFF_MS);
      if (!isCurrentIntent()) return;
      try {
        await performWrite();
        settleSettingsWriteFailureAfterSuccess();
        return;
      } catch (retryError) {
        // 重试本身被世代复查拦下：同样是「被取代」，不是失败。
        if (isSettingsWriteSupersededError(retryError)) return;
        // Retry failed too: keep the optimistic local value (never roll back a
        // newer local edit) and record a readable failure + reconciliation
        // verdict for the UI. The rejection still bubbles to the caller.
        // A newer local intent that arrived in the meantime owns the outcome:
        // do not leave a stale failure state behind for it (and do not reject).
        if (!isCurrentIntent()) return;
        const failure = await describeSettingsWriteFailure({
          getState: getState as unknown as () => unknown,
          accountId: userId,
          intentEpoch,
          intentKeys,
          persistedKeys,
          at: firstFailureAt,
        });
        if (!isCurrentIntent()) return;
        dispatch(recordSettingsWriteFailure(failure));
        throw retryError;
      }
    }
  });
  // No post-await client-state publication: completion order is not intent order.
  return persistencePlan.normalizedChanges;
});

/**
 * Account-chat preferences have an explicit Owner-first API.
 * Persistence, failure state, and per-account ordering remain centralized
 * in setSettings until the surrounding Settings write protocol is extracted.
 */
export const setAccountChatDisplayPreferences = createAsyncThunk(
  "settings/setAccountChatDisplayPreferences",
  async (changes: Partial<AccountChatDisplayPreferences>, { dispatch, getState }) => {
    const userId = selectIdentityUserId(getState());
    if (!userId) throw new Error("User not found for persisting settings.");
    const owner = getAccountChatDisplayOwner(getState);
    owner.setAccount(userId);
    // Persist the complete current chat intent: a queued, superseded partial
    // write may be skipped, so a later toggle must carry its sibling values.
    return dispatch(persistSettingsChanges({
      ...owner.getSnapshot(),
      ...pickAccountChatDisplayPreferences(changes),
    } as Partial<SettingState>)).unwrap();
  },
);

/**
 * Public legacy Settings API explicitly excludes account-chat display fields.
 * Reject rather than silently dropping user intent from old consumers.
 */
export const setSettings = createAsyncThunk(
  "settings/setSettings",
  async (changes: Partial<SettingState>, { dispatch }) => {
    const forbidden = ACCOUNT_CHAT_DISPLAY_PREFERENCE_KEYS;
    if (forbidden.some((key) => Object.prototype.hasOwnProperty.call(changes, key))) {
      throw new Error("Chat display preferences must use setAccountChatDisplayPreferences.");
    }
    return dispatch(persistSettingsChanges(changes)).unwrap();
  },
);

// --- 细粒度 setter thunk(几乎都是 setSettings 的薄包装) ---

export const setSidebarWidth = createAsyncThunk(
  "settings/setSidebarWidth",
  async (sidebarWidth: number, { dispatch }) =>
    dispatch(setSettings({ sidebarWidth })).unwrap(),
);

export const toggleEnableReadCurrentSpace = createAsyncThunk(
  "settings/toggleEnableReadCurrentSpace",
  async (_: void, { dispatch, getState }) => {
    const current = (getState() as any).settings.enableReadCurrentSpace;
    return dispatch(
      setSettings({
        enableReadCurrentSpace: !current,
        spaceContextLevel: current
          ? 1
          : DEFAULT_USER_PREFERENCE_PROFILE.spaceContextLevel,
      }),
    ).unwrap();
  },
);

export const setEditorDefaultMode = createAsyncThunk(
  "settings/setEditorDefaultMode",
  async (mode: "markdown" | "block", { dispatch }) =>
    dispatch(setSettings({ editorDefaultMode: mode })).unwrap(),
);

export const setEditorLightCodeTheme = createAsyncThunk(
  "settings/setEditorLightCodeTheme",
  async (theme: string, { dispatch }) =>
    dispatch(setSettings({ editorLightCodeTheme: theme })).unwrap(),
);

export const setEditorDarkCodeTheme = createAsyncThunk(
  "settings/setEditorDarkCodeTheme",
  async (theme: string, { dispatch }) =>
    dispatch(setSettings({ editorDarkCodeTheme: theme })).unwrap(),
);

export const setEditorCodeTheme = createAsyncThunk(
  "settings/setEditorCodeTheme",
  async (theme: string, { dispatch }) =>
    dispatch(
      setSettings({
        editorLightCodeTheme: theme,
        editorDarkCodeTheme: theme,
      }),
    ).unwrap(),
);

export const toggleEditorWordCount = createAsyncThunk(
  "settings/toggleEditorWordCount",
  async (_: void, { dispatch, getState }) => {
    const current = (getState() as any).settings.editorWordCountEnabled;
    return dispatch(setSettings({ editorWordCountEnabled: !current })).unwrap();
  },
);

export const toggleEditorShortcut = createAsyncThunk(
  "settings/toggleEditorShortcut",
  async (key: string, { dispatch, getState }) => {
    const currentShortcuts = (getState() as any).settings.editorShortcuts;
    const newShortcuts = {
      ...currentShortcuts,
      [key]: !currentShortcuts[key],
    };
    return dispatch(setSettings({ editorShortcuts: newShortcuts })).unwrap();
  },
);

export const setEditorFontSize = createAsyncThunk(
  "settings/setEditorFontSize",
  async (fontSize: number, { dispatch }) =>
    dispatch(setSettings({ editorFontSize: fontSize })).unwrap(),
);

export const toggleEditorAutoSave = createAsyncThunk(
  "settings/toggleEditorAutoSave",
  async (_: void, { dispatch, getState }) => {
    const current = (getState() as any).settings.editorAutoSave;
    return dispatch(setSettings({ editorAutoSave: !current })).unwrap();
  },
);

export const setEditorAutoSaveInterval = createAsyncThunk(
  "settings/setEditorAutoSaveInterval",
  async (interval: number, { dispatch }) =>
    dispatch(setSettings({ editorAutoSaveInterval: interval })).unwrap(),
);

export const setGlobalPrompt = createAsyncThunk(
  "settings/setGlobalPrompt",
  async (prompt: string, { dispatch }) =>
    dispatch(setSettings({ globalPrompt: prompt })).unwrap(),
);

export const setUserTonePreset = createAsyncThunk(
  "settings/setUserTonePreset",
  async (tone: TonePreset, { dispatch }) =>
    dispatch(setSettings({ userTonePreset: tone })).unwrap(),
);

export const setKnowledgeCaptureLevel = createAsyncThunk(
  "settings/setKnowledgeCaptureLevel",
  async (level: KnowledgeCaptureLevel, { dispatch }) =>
    dispatch(setSettings({ knowledgeCaptureLevel: level })).unwrap(),
);

export const setSpaceContextLevel = createAsyncThunk(
  "settings/setSpaceContextLevel",
  async (level: SpaceContextLevel, { dispatch }) =>
    dispatch(
      setSettings({
        spaceContextLevel: level,
        enableReadCurrentSpace: level > 1,
      }),
    ).unwrap(),
);

export const setAiRecentContentLimit = createAsyncThunk(
  "settings/setAiRecentContentLimit",
  async (limit: number, { dispatch }) =>
    dispatch(setSettings({ aiRecentContentLimit: limit })).unwrap(),
);

export const setMaxExecutionTime = createAsyncThunk(
  "settings/setMaxExecutionTime",
  async (time: number, { dispatch }) =>
    dispatch(setSettings({ maxExecutionTime: time })).unwrap(),
);

export const setDefaultAgentId = createAsyncThunk(
  "settings/setDefaultAgentId",
  async (agentId: string, { dispatch }) =>
    dispatch(
      setSettings({
        defaultAgentId: resolveDefaultAgentIdSetting(agentId),
      }),
    ).unwrap(),
);


export const setUiPluginState = createAsyncThunk<void, { id: "music" | "calendar"; value: "enabled" | "disabled"; session: ReturnType<typeof getSessionSnapshotForState> }, { state: any }>(
  "settings/setUiPluginState", async ({ id, value, session }, { dispatch, getState }) => {
    const current = getSessionSnapshotForState(getState());
    if (!session || session.transition !== "idle" || current?.transition !== "idle" || current.activeAccountId !== session.activeAccountId || current.sessionGeneration !== session.sessionGeneration) throw new Error("Session changed; reopen plugin configuration.");
    const state = getState().settings;
    if (state.uiPluginsOwnerAccountId !== current.activeAccountId || state.uiPluginsGeneration !== current.sessionGeneration) throw new Error("Plugin settings are not hydrated for this session.");
    await dispatch(setSettings({ uiPlugins: { ...state.uiPlugins, [id]: value } })).unwrap();
  },
);
