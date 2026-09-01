import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

const selectByIdMock = mock(
  (state: any, dbKey: string) => state?.db?.entities?.[dbKey] ?? null,
);
const createPatchThunk = (payload: any) =>
  Object.assign(
    (_dispatch: any, _getState: any, extra: any) => {
      const promise = (async () => {
        if (extra?.db && payload?.dbKey) {
          const current = await extra.db.get(payload.dbKey).catch(() => ({
            dbKey: payload.dbKey,
          }));
          const next = {
            ...current,
            ...(payload.changes || {}),
          };
          await extra.db.put(payload.dbKey, next);
          return next;
        }
        return {
          dbKey: payload?.dbKey,
          ...(payload?.changes || {}),
        };
      })();
      (promise as any).unwrap = () => promise;
      return promise;
    },
    { kind: "patch", ...payload },
  );
const patchMock = mock(createPatchThunk);
const readAndWaitMock = mock((dbKey: string) => ({
  kind: "readAndWait",
  dbKey,
}));
const changeSpaceMock = mock((spaceId: string) => ({
  kind: "changeSpace",
  spaceId,
}));

let moduleVersion = 0;

const realSpaceThunks = { ...(await import("create/space/spaceThunks")) };

afterAll(() => {
  mock.module("create/space/spaceThunks", () => realSpaceThunks);
});

async function loadEnsureDialogSpaceAction() {
  const actualDbSlice = await import("database/dbSlice");

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    selectById: selectByIdMock,
    patch: patchMock,
    readAndWait: readAndWaitMock,
    selectEntities: (state: any) => state.db?.entities ?? {},
  }));
  mock.module("create/space/spaceThunks", () => ({
    changeSpace: changeSpaceMock,
  }));
  const mod = await import(`./ensureDialogSpaceAction`);
  mock.restore();
  return mod;
}

const clearMocks = () => {
  selectByIdMock.mockReset();
  selectByIdMock.mockImplementation(
    (state: any, dbKey: string) => state?.db?.entities?.[dbKey] ?? null,
  );
  patchMock.mockReset();
  patchMock.mockImplementation(createPatchThunk);
  readAndWaitMock.mockReset();
  readAndWaitMock.mockImplementation((dbKey: string) => ({
    kind: "readAndWait",
    dbKey,
  }));
  changeSpaceMock.mockReset();
  changeSpaceMock.mockImplementation((spaceId: string) => ({
    kind: "changeSpace",
    spaceId,
  }));
};

const makeDispatch = () =>
  mock((action: any) => {
    if (action.kind === "changeSpace") return { unwrap: async () => undefined };
    if (action.kind === "patch") return { unwrap: async () => undefined };
    if (action.kind === "readAndWait") return { unwrap: async () => null };
    throw new Error(`unexpected action: ${JSON.stringify(action)}`);
  });

const baseState = (currentSpaceId: string | null = null) => ({
  space: { currentSpaceId },
  db: { entities: {} },
});

describe("ensureDialogSpaceAction", () => {
  afterEach(() => {
    clearMocks();
  });

  it("uses spaceId persisted in dialog config", async () => {
    clearMocks();
    const { ensureDialogSpaceAction } = await loadEnsureDialogSpaceAction();
    selectByIdMock.mockReturnValue({
      dbKey: "dialog-user-1",
      spaceId: "space-demo",
    });
    const dispatch = makeDispatch();

    const result = await ensureDialogSpaceAction("dialog-user-1")(
      dispatch,
      () => baseState() as any,
    );

    expect(result).toBe("demo");
    expect(changeSpaceMock).toHaveBeenCalledWith("demo");
  });

  it("prefers the routed space id before persisted dialog state", async () => {
    clearMocks();
    const { ensureDialogSpaceAction } = await loadEnsureDialogSpaceAction();
    selectByIdMock.mockReturnValue({
      dbKey: "dialog-user-1",
      spaceId: "space-stale",
    });
    const dispatch = makeDispatch();

    const result = await ensureDialogSpaceAction(
      "dialog-user-1",
      "space-route",
    )(dispatch, () => baseState() as any);

    expect(result).toBe("route");
    expect(changeSpaceMock).toHaveBeenCalledWith("route");
  });

  it("returns null for dialogs with no space context (all view)", async () => {
    clearMocks();
    const { ensureDialogSpaceAction } = await loadEnsureDialogSpaceAction();
    selectByIdMock.mockReturnValue({ dbKey: "dialog-user-1" });
    const dispatch = makeDispatch();

    const result = await ensureDialogSpaceAction("dialog-user-1")(
      dispatch,
      () => baseState() as any,
    );

    expect(result).toBeNull();
    expect(changeSpaceMock).not.toHaveBeenCalled();
  });

  it("skips changeSpace when already on the correct space", async () => {
    clearMocks();
    const { ensureDialogSpaceAction } = await loadEnsureDialogSpaceAction();
    selectByIdMock.mockReturnValue({
      dbKey: "dialog-user-1",
      spaceId: "space-demo",
    });
    const dispatch = makeDispatch();

    const result = await ensureDialogSpaceAction("dialog-user-1")(
      dispatch,
      () => baseState("demo") as any,
    );

    expect(result).toBe("demo");
    expect(changeSpaceMock).not.toHaveBeenCalled();
  });
});
