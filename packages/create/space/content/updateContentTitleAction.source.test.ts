import { describe, expect, mock, test } from "bun:test";

const readMock = mock(({ dbKey, preferredServerOrigin }: any) => ({
  type: "read",
  payload: { dbKey, preferredServerOrigin },
}));

const patchMock = mock(({ dbKey, changes, preferredServerOrigin }: any) => ({
  type: "patch",
  payload: { dbKey, changes, preferredServerOrigin },
}));

const renameTableMock = mock((payload: any) => ({
  type: "renameTable",
  payload,
}));

let moduleVersion = 0;

async function loadUpdateContentTitleAction() {
  const realDbSlice = await import("database/dbSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
    patch: patchMock,
  }));

  const realTableSlice = await import("render/table/tableSlice");
  mock.module("render/table/tableSlice", () => ({
    ...realTableSlice,
    renameTable: renameTableMock,
  }));

  const mod = await import(`./updateContentTitleAction`);
  mock.restore();
  return mod;
}

function createDispatch(spaceData: any, updatedSpaceData: any) {
  return mock((action: any) => {
    if (action?.type === "read") {
      return { unwrap: async () => spaceData };
    }
    if (action?.type === "patch" && action.payload.dbKey === spaceData.id) {
      return { unwrap: async () => updatedSpaceData };
    }
    if (action?.type === "patch") {
      return { unwrap: async () => ({ dbKey: action.payload.dbKey, ...action.payload.changes }) };
    }
    if (action?.type === "renameTable") {
      return { unwrap: async () => undefined };
    }
    return { unwrap: async () => undefined };
  });
}

function createDispatchWithReadAbsent(spaceData: any, updatedSpaceData: any) {
  return mock((action: any) => {
    if (action?.type === "read" && action.payload.dbKey === spaceData.id) {
      return { unwrap: async () => spaceData };
    }
    if (action?.type === "read") {
      return { unwrap: async () => null };
    }
    if (action?.type === "patch" && action.payload.dbKey === spaceData.id) {
      return { unwrap: async () => updatedSpaceData };
    }
    if (action?.type === "patch") {
      return { unwrap: async () => ({ dbKey: action.payload.dbKey, ...action.payload.changes }) };
    }
    if (action?.type === "renameTable") {
      return { unwrap: async () => undefined };
    }
    return { unwrap: async () => undefined };
  });
}

function createDispatchWithIndividualPatchFailure(spaceData: any, updatedSpaceData: any) {
  return mock((action: any) => {
    if (action?.type === "read" && action.payload.dbKey === spaceData.id) {
      return { unwrap: async () => spaceData };
    }
    if (action?.type === "read") {
      return { unwrap: async () => ({ contentKey: "dialog-1", title: "old" }) };
    }
    if (action?.type === "patch" && action.payload.dbKey === spaceData.id) {
      return { unwrap: async () => updatedSpaceData };
    }
    if (action?.type === "patch") {
      return { unwrap: async () => { throw new Error("simulated patch failure"); } };
    }
    if (action?.type === "renameTable") {
      return { unwrap: async () => undefined };
    }
    return { unwrap: async () => undefined };
  });
}

describe("updateContentTitleAction behavior", () => {
  test("patches both space contents and standalone content record", async () => {
    const { updateContentTitleAction } = await loadUpdateContentTitleAction();
    readMock.mockClear();
    patchMock.mockClear();
    renameTableMock.mockClear();

    const contentKey = "dialog-user-a-dialog-1";
    const spaceData = {
      id: "space-a",
      contents: {
        [contentKey]: {
          contentKey,
          type: "dialog",
          title: "Old title",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    };
    const updatedSpaceData = {
      ...spaceData,
      contents: {
        [contentKey]: {
          ...spaceData.contents[contentKey],
          title: "New title",
        },
      },
    };
    const dispatch = createDispatch(spaceData, updatedSpaceData);

    const result = await updateContentTitleAction(
      {
        spaceId: "space-a",
        contentKey,
        title: "  New title  ",
        sourceServerOrigin: "https://nolo.chat",
      },
      { dispatch }
    );

    expect(result.updatedSpaceData).toBe(updatedSpaceData);
    expect(readMock).toHaveBeenCalledWith({
      dbKey: "space-a",
      preferredServerOrigin: "https://nolo.chat",
    });
    expect(patchMock).toHaveBeenCalledTimes(2);
    expect(patchMock.mock.calls[0]?.[0]).toMatchObject({
      dbKey: "space-a",
      preferredServerOrigin: "https://nolo.chat",
      changes: {
        contents: {
          [contentKey]: {
            title: "New title",
          },
        },
      },
    });
    expect(patchMock.mock.calls[1]?.[0]).toMatchObject({
      dbKey: contentKey,
      preferredServerOrigin: "https://nolo.chat",
      changes: {
        title: "New title",
      },
    });
    expect(patchMock.mock.calls[1]?.[0]?.changes).not.toHaveProperty("name");
  });

  test("also patches app name because app lists read name instead of title", async () => {
    const { updateContentTitleAction } = await loadUpdateContentTitleAction();
    readMock.mockClear();
    patchMock.mockClear();
    renameTableMock.mockClear();

    const contentKey = "app-user-a-demo";
    const spaceData = {
      id: "space-a",
      contents: {
        [contentKey]: {
          contentKey,
          type: "app",
          title: "Old app",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    };
    const updatedSpaceData = {
      ...spaceData,
      contents: {
        [contentKey]: {
          ...spaceData.contents[contentKey],
          title: "New app",
        },
      },
    };
    const dispatch = createDispatch(spaceData, updatedSpaceData);
    const dispatchEvent = mock(() => true);
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      dispatchEvent,
      Event: class {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      },
    };

    try {
      await updateContentTitleAction(
        {
          spaceId: "space-a",
          contentKey,
          title: "New app",
        },
        { dispatch }
      );
    } finally {
      (globalThis as any).window = originalWindow;
    }

    expect(patchMock).toHaveBeenCalledTimes(2);
    expect(patchMock.mock.calls[1]?.[0]).toMatchObject({
      dbKey: contentKey,
      changes: {
        title: "New app",
        name: "New app",
      },
    });
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect((dispatchEvent.mock.calls as any)[0]?.[0]?.type).toBe("nolo-user-data-updated");
  });

  test("skips the individual record patch when the standalone record does not exist", async () => {
    const { updateContentTitleAction } = await loadUpdateContentTitleAction();
    readMock.mockClear();
    patchMock.mockClear();
    renameTableMock.mockClear();

    const contentKey = "dialog-user-a-ephemeral";
    const spaceData = {
      id: "space-a",
      contents: {
        [contentKey]: {
          contentKey,
          type: "dialog",
          title: "Old title",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    };
    const updatedSpaceData = {
      ...spaceData,
      contents: {
        [contentKey]: {
          ...spaceData.contents[contentKey],
          title: "New title",
        },
      },
    };
    const dispatch = createDispatchWithReadAbsent(spaceData, updatedSpaceData);
    const dispatchEvent = mock(() => true);
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      dispatchEvent,
      Event: class {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      },
    };

    try {
      await updateContentTitleAction(
        {
          spaceId: "space-a",
          contentKey,
          title: "New title",
        },
        { dispatch }
      );
    } finally {
      (globalThis as any).window = originalWindow;
    }

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(patchMock.mock.calls[0]?.[0]).toMatchObject({
      dbKey: "space-a",
    });
    expect(readMock.mock.calls.some((c) => c[0]?.dbKey === contentKey)).toBe(true);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  test("throws when the individual record patch fails so the data paths do not silently diverge", async () => {
    const { updateContentTitleAction } = await loadUpdateContentTitleAction();
    readMock.mockClear();
    patchMock.mockClear();
    renameTableMock.mockClear();

    const contentKey = "dialog-user-a-broken";
    const spaceData = {
      id: "space-a",
      contents: {
        [contentKey]: {
          contentKey,
          type: "dialog",
          title: "Old title",
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    };
    const updatedSpaceData = {
      ...spaceData,
      contents: {
        [contentKey]: {
          ...spaceData.contents[contentKey],
          title: "New title",
        },
      },
    };
    const dispatch = createDispatchWithIndividualPatchFailure(
      spaceData,
      updatedSpaceData
    );

    await expect(
      updateContentTitleAction(
        {
          spaceId: "space-a",
          contentKey,
          title: "New title",
        },
        { dispatch }
      )
    ).rejects.toThrow(/标题已写入空间，但同步独立记录失败/);
  });
});
