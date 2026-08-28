import { configureStore, createAsyncThunk } from "@reduxjs/toolkit";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { createUserPreferenceKey } from "database/keys";
import { noloAgentId } from "core/init";
import { SETTINGS_RECORD_SCHEMA_VERSION } from "./settingsRecord";

let moduleVersion = 0;
let authVersion = 0;

const loadSettingSlice = async () => {
  const actualAuthSlice = await import(
    new URL(`../../auth/authSlice.ts?actual=${authVersion++}`, import.meta.url).href
  );
  const selectTestUserId = (state: any) =>
    state.auth?.currentUser?.userId ?? null;
  mock.module("auth/authSlice", () => ({
    ...actualAuthSlice,
    selectUserId: selectTestUserId,
  }));
  // This suite verifies cloud account and guest persistence semantics. The
  // local edition selector deliberately always returns the fixed local user.
  mock.module("identity/selectors", () => ({
    selectIdentityUserId: selectTestUserId,
  }));
  return import(`./settingSlice.tsx?test=${moduleVersion++}`);
};
const loadSettingsDbActionThunks = () =>
  import(`./dbActionThunks.ts?test=${moduleVersion++}`);

afterEach(async () => {
  const { setSettingDbActionThunksForTests } = await loadSettingsDbActionThunks();
  setSettingDbActionThunksForTests(null);
  mock.restore();
});

describe("settingSlice", () => {
  test("addHostToCurrentServer preserves explicit origin ports for local web runtimes", async () => {
    const { addHostToCurrentServer, default: settingReducer } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    const nextState = settingReducer(
      baseState,
      addHostToCurrentServer("http://127.0.0.1:38123")
    );

    expect(nextState.currentServer).toBe("http://127.0.0.1:38123");
  });

  test("addHostToCurrentServer keeps host:port inputs instead of dropping the port", async () => {
    const { addHostToCurrentServer, default: settingReducer } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    const nextState = settingReducer(
      baseState,
      addHostToCurrentServer("localhost:3000")
    );

    expect(nextState.currentServer).toBe("http://localhost:3000");
  });

  test("buildSettingsPersistencePlan persists defaultAgentId in the main settings record", async () => {
    const { buildSettingsPersistencePlan } = await loadSettingSlice();
    const plan = buildSettingsPersistencePlan({
      userId: "user1",
      currentSettings: {
        defaultAgentId: "agent-a",
      },
      changes: {
        defaultAgentId: "agent-b",
      },
      previousDefaultAgentRecord: null,
    });

    expect(plan.defaultAgentRegisterWrite).toEqual({
      customKey: createUserPreferenceKey.defaultAgent("user1"),
      data: expect.objectContaining({
        preferenceName: "agent_default",
        value: "agent-b",
      }),
    });
    expect(plan.settingsPatch).toEqual({
      dbKey: "user1-settings",
      changes: expect.objectContaining({
        defaultAgentId: "agent-b",
        schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION,
      }),
    });
  });

  test("buildSettingsPersistencePlan does not persist defaultSpaceId in the settings blob", async () => {
    const { buildSettingsPersistencePlan } = await loadSettingSlice();
    const plan = buildSettingsPersistencePlan({
      userId: "user1",
      currentSettings: {
          defaultAgentId: "agent-a",
      },
      changes: {
      },
      previousDefaultAgentRecord: null,
    });

    expect(plan.defaultAgentRegisterWrite).toBeNull();
    expect(plan.settingsPatch).toBeNull();
  });

  test("buildSettingsPersistencePlan does not persist authority registry in the settings blob", async () => {
    const { buildSettingsPersistencePlan } = await loadSettingSlice();
    const plan = buildSettingsPersistencePlan({
      userId: "user1",
      currentSettings: {},
      changes: {
        userAuthorityRegistry: {
          user1: "https://self.example.com",
        },
      } as any,
      previousDefaultAgentRecord: null,
    });

    expect(plan.defaultAgentRegisterWrite).toBeNull();
    expect(plan.settingsPatch).toBeNull();
  });

  test("buildSettingsPersistencePlan patches non-default settings together with normalized defaults", async () => {
    const { buildSettingsPersistencePlan } = await loadSettingSlice();
    const plan = buildSettingsPersistencePlan({
      userId: "user1",
      currentSettings: {
        defaultAgentId: "agent-a",
      },
      changes: {
        showThinking: false,
      },
      previousDefaultAgentRecord: null,
    });

    expect(plan.defaultAgentRegisterWrite).toBeNull();
    expect(plan.settingsPatch).toEqual({
      dbKey: "user1-settings",
      changes: {
        showThinking: false,
        schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION,
      },
    });
  });

  test("buildSettingsPersistencePlan keeps appearance settings local-only", async () => {
    const { buildSettingsPersistencePlan } = await loadSettingSlice();
    const plan = buildSettingsPersistencePlan({
      userId: "user1",
      currentSettings: {
        themeName: "ocean",
        themeMode: "system",
        isDark: false,
        density: "compact",
        fontPreset: "system",
      },
      changes: {
        themeName: "purple",
        themeMode: "dark",
        isDark: true,
        density: "spacious",
        fontPreset: "songti",
        showThinking: false,
      } as any,
      previousDefaultAgentRecord: null,
    });

    expect(plan.defaultAgentRegisterWrite).toBeNull();
    expect(plan.settingsPatch).toEqual({
      dbKey: "user1-settings",
      changes: {
        showThinking: false,
        schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION,
      },
    });
    expect(plan.normalizedChanges).toEqual({
      themeName: "iris",
      themeMode: "dark",
      isDark: true,
      density: "spacious",
      fontPreset: "song",
      showThinking: false,
    });
  });

  test("setSettings upserts the settings record when no local blob exists yet", async () => {
    const { setSettings, default: settingReducer } = await loadSettingSlice();
    const { setSettingDbActionThunksForTests } = await loadSettingsDbActionThunks();
    const recordedCalls: Array<{ dbKey: string; data: any }> = [];
    const upsert = createAsyncThunk(
      "test/settingsUpsert",
      async ({ dbKey, data }: { dbKey: string; data: any }) => {
        recordedCalls.push({ dbKey, data });
        return { dbKey, ...data };
      }
    );
    const patch = createAsyncThunk("test/settingsPatch", async () => {
      throw new Error("patch should not be called for settings persistence");
    });

    setSettingDbActionThunksForTests({
      readAndWait: createAsyncThunk("test/settingsReadAndWait", async () => null),
      patch,
      upsert,
      write: createAsyncThunk("test/settingsWrite", async () => null),
    });

    const store = configureStore({
      reducer: {
        settings: settingReducer,
        auth: (
          state = {
            currentUser: { userId: "user1" },
            users: [],
            isLoggedIn: true,
            currentToken: "token",
            isLoading: false,
          }
        ) => state,
      },
    });

    await store.dispatch(setSettings({ autoApproveSelfUpdateFields: ["prompt"] }) as any).unwrap();

    expect(recordedCalls).toEqual([{
      dbKey: "user1-settings",
      data: {
        autoApproveSelfUpdateFields: ["prompt"],
        schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION,
      },
    }]);
  });

  test("setSettings guest still rejects non-local-first settings", async () => {
    const { setSettings, default: settingReducer } = await loadSettingSlice();
    const { setSettingDbActionThunksForTests } = await loadSettingsDbActionThunks();
    let writeCalled = false;

    setSettingDbActionThunksForTests({
      readAndWait: createAsyncThunk("test/guestRejectRead", async () => null),
      patch: createAsyncThunk("test/guestRejectPatch", async () => null),
      upsert: createAsyncThunk("test/guestRejectUpsert", async () => null),
      write: createAsyncThunk("test/guestRejectWrite", async () => {
        writeCalled = true;
        return null;
      }),
    });

    const store = configureStore({
      reducer: {
        settings: settingReducer,
        auth: (
          state = {
            currentUser: null,
            users: [],
            isLoggedIn: false,
            currentToken: null,
            isLoading: false,
          }
        ) => state,
      },
    });

    await expect(
      store
        .dispatch(setSettings({ showThinking: false }) as any)
        .unwrap(),
    ).rejects.toThrow("User not found for persisting settings.");

    await expect(
      store
        .dispatch(
          setSettings({
            showThinking: false,
          }) as any,
        )
        .unwrap(),
    ).rejects.toThrow("User not found for persisting settings.");

    expect(writeCalled).toBe(false);
  });

  test("setSettings guest updates sidebarWidth locally without server write", async () => {
    const { setSettings, default: settingReducer } = await loadSettingSlice();
    const { setSettingDbActionThunksForTests } = await loadSettingsDbActionThunks();
    let persistenceCalled = false;
    const recordPersistence = async () => {
      persistenceCalled = true;
      return null;
    };

    setSettingDbActionThunksForTests({
      readAndWait: createAsyncThunk("test/guestSidebarRead", recordPersistence),
      patch: createAsyncThunk("test/guestSidebarPatch", recordPersistence),
      upsert: createAsyncThunk("test/guestSidebarUpsert", recordPersistence),
      write: createAsyncThunk("test/guestSidebarWrite", recordPersistence),
    });

    const store = configureStore({
      reducer: {
        settings: settingReducer,
        auth: (
          state = {
            currentUser: null,
            users: [],
            isLoggedIn: false,
            currentToken: null,
            isLoading: false,
          }
        ) => state,
      },
    });

    await store.dispatch(setSettings({ sidebarWidth: 0 }) as any).unwrap();

    expect((store.getState() as any).settings.sidebarWidth).toBe(0);
    expect(persistenceCalled).toBe(false);
  });

  test("buildSettingsPersistencePlan keeps sidebarWidth server-persisted for logged-in users", async () => {
    const { buildSettingsPersistencePlan } = await loadSettingSlice();
    const plan = buildSettingsPersistencePlan({
      userId: "user1",
      currentSettings: {},
      changes: { sidebarWidth: 320 },
      previousDefaultAgentRecord: null,
    });

    expect(plan.settingsPatch).toEqual({
      dbKey: "user1-settings",
      changes: {
        sidebarWidth: 320,
        schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION,
      },
    });
  });

  test("hydrateStoredSettings reads defaultSpaceId from the register-backed value", async () => {
    const { hydrateStoredSettings } = await loadSettingSlice();
    const result = hydrateStoredSettings({
      userId: "user1",
      settingsRecord: {
        themeName: "blue",
        themeMode: "dark",
        isDark: true,
        density: "spacious",
        defaultAgentId: "agent-live",
        schemaVersion: 99,
      },
    });

    expect(result).toEqual({
      defaultAgentId: "agent-live",
    });
  });

  test("hydrateStoredSettings builds the current user's authority registry from the register-backed authority home", async () => {
    const { hydrateStoredSettings } = await loadSettingSlice();
    const result = hydrateStoredSettings({
      userId: "user1",
      settingsRecord: {
        userAuthorityRegistry: {
          user1: "https://old.example.com",
          collaborator: "https://collab.example.com",
        },
      },
      authorityHomeServer: "https://self.example.com/",
    });

    expect(result).toEqual({
      defaultAgentId: "system-default",
      userAuthorityRegistry: {
        user1: "https://self.example.com",
        collaborator: "https://collab.example.com",
      },
    });
  });

  test("hydrateStoredSettings keeps all/system-default behavior when defaults are absent in settings", async () => {
    const { hydrateStoredSettings } = await loadSettingSlice();
    const result = hydrateStoredSettings({
      userId: "user1",
      settingsRecord: { themeName: "blue" },
    });

    expect(result).toEqual({
      defaultAgentId: "system-default",
    });
  });

  test("hydrateStoredSettings ignores remotely stored appearance settings", async () => {
    const { hydrateStoredSettings } = await loadSettingSlice();
    const result = hydrateStoredSettings({
      userId: "user1",
      settingsRecord: {
        themeName: "blue",
        themeMode: "dark",
        isDark: true,
        density: "spacious",
        fontPreset: "song",
      },
    });

    expect(result).toEqual({
      defaultAgentId: "system-default",
    });
  });

  test("normalizes legacy font aliases to canonical font presets in local state", async () => {
    const { default: settingReducer } = await loadSettingSlice();
    const nextState = settingReducer(undefined, {
      type: "settings/_updateSettingsState",
      payload: { fontPreset: "songti" },
    } as any);

    expect(nextState.fontPreset).toBe("song");
  });

  test("normalizes legacy theme aliases to canonical theme names in local state", async () => {
    const { default: settingReducer } = await loadSettingSlice();
    const nextState = settingReducer(undefined, {
      type: "settings/_updateSettingsState",
      payload: { themeName: "purple" },
    } as any);

    expect(nextState.themeName).toBe("iris");
  });

  test("normalizes legacy nolo defaultAgentId to the system-default sentinel", async () => {
    const {
      SYSTEM_DEFAULT_AGENT_ID,
      default: settingReducer,
      selectDefaultAgentId,
      selectDefaultAgentPreference,
    } = await loadSettingSlice();
    const nextState = settingReducer(undefined, {
      type: "settings/_updateSettingsState",
      payload: { defaultAgentId: noloAgentId },
    });

    expect(nextState.defaultAgentId).toBe(SYSTEM_DEFAULT_AGENT_ID);
    expect(
      selectDefaultAgentPreference({
        settings: { ...nextState, defaultAgentId: noloAgentId },
      } as any)
    ).toBe(SYSTEM_DEFAULT_AGENT_ID);
    expect(
      selectDefaultAgentId({
        settings: { ...nextState, defaultAgentId: noloAgentId },
      } as any)
    ).toBe(noloAgentId);
  });

  test("normalizes the current concrete nolo id to the system-default sentinel", async () => {
    const {
      SYSTEM_DEFAULT_AGENT_ID,
      default: settingReducer,
      selectDefaultAgentPreference,
    } = await loadSettingSlice();
    const nextState = settingReducer(undefined, {
      type: "settings/_updateSettingsState",
      payload: { defaultAgentId: noloAgentId },
    });

    expect(nextState.defaultAgentId).toBe(SYSTEM_DEFAULT_AGENT_ID);
    expect(
      selectDefaultAgentPreference({
        settings: { ...nextState, defaultAgentId: noloAgentId },
      } as any)
    ).toBe(SYSTEM_DEFAULT_AGENT_ID);
  });

  test("initializes deleteShortcut with default value and allows updating it", async () => {
    const { default: settingReducer, selectDeleteShortcut } = await loadSettingSlice();
    const baseState = settingReducer(undefined, { type: "unknown" });
    
    expect(baseState.deleteShortcut).toMatch(/^(meta|ctrl)\+backspace$/);
    
    const nextState = settingReducer(
      baseState,
      {
        type: "settings/_updateSettingsState",
        payload: { deleteShortcut: "ctrl+shift+delete" },
      }
    );
    
    expect(nextState.deleteShortcut).toBe("ctrl+shift+delete");
    expect(
      selectDeleteShortcut({ settings: nextState } as any)
    ).toBe("ctrl+shift+delete");
  });
});
