import { afterEach, beforeEach, expect, test, describe, jest } from "bun:test";
import { setDialogExtraReferencesAction } from "./setDialogExtraReferencesAction";
import {
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
} from "../dialogRuntimeStore";

describe("setDialogExtraReferencesAction", () => {
  beforeEach(() => {
    resetDialogRuntimeStoreForTests();
  });
  afterEach(() => {
    resetDialogRuntimeStoreForTests();
  });

  test("should patch current dialog with provided extraReferences", async () => {
    setActiveDialogKey("dialog_1");
    const mockState = {
      dialog: {},
      db: {
        entities: {
          dialog_1: {
            dbKey: "dialog_1",
            extraReferences: [],
          },
        },
      },
    };

    let dispatchedActionPayload: any = null;
    const mockDispatch = jest.fn().mockImplementation((action) => {
      if (typeof action === 'function') {
        // We do not want to execute the real dbSlice patch thunk since it depends on app env
        // Instead, just return unwrap mock
        return { unwrap: () => Promise.resolve() };
      }
      return { unwrap: () => Promise.resolve() };
    });
    
    // We need to mock the dbSlice patch
    const patchMock = jest.spyOn(await import("database/dbSlice"), "patch").mockImplementation(((payload: any) => {
      dispatchedActionPayload = { type: 'db/patch', payload };
      return (() => ({ unwrap: () => Promise.resolve() })) as any;
    }) as any);

    const mockGetState = jest.fn().mockReturnValue(mockState);

    const mockThunkApi = {
      dispatch: mockDispatch,
      getState: mockGetState,
    };

    const newReferences = [{ type: "skill", id: "skill_1" }] as any;

    await setDialogExtraReferencesAction(newReferences, mockThunkApi);

    expect(mockDispatch).toHaveBeenCalled();
    expect(dispatchedActionPayload).toBeDefined();
    
    expect(dispatchedActionPayload.type).toBe("db/patch");
    expect(dispatchedActionPayload.payload.dbKey).toBe("dialog_1");
    expect(dispatchedActionPayload.payload.changes.extraReferences).toEqual(newReferences);
    expect(dispatchedActionPayload.payload.changes.updatedAt).toBeDefined();
  });

  test("should handle missing currentDialogKey", async () => {
    const mockState = {
      dialog: {},
    };

    const mockThunkApi = {
      dispatch: jest.fn(),
      getState: () => mockState,
    };

    expect(
      setDialogExtraReferencesAction([], mockThunkApi)
    ).rejects.toThrow("No current dialog selected");
  });
  
  test("should default to empty array when passing null/undefined", async () => {
    setActiveDialogKey("dialog_1");
    const mockState = {
      dialog: {},
      db: {
        entities: {
          dialog_1: {
            dbKey: "dialog_1",
          },
        },
      },
    };

    let dispatchedActionPayload: any = null;
    const mockDispatch = jest.fn().mockImplementation((action) => {
      return { unwrap: () => Promise.resolve() };
    });
    
    jest.spyOn(await import("database/dbSlice"), "patch").mockImplementation(((payload: any) => {
      dispatchedActionPayload = { type: 'db/patch', payload };
      return (() => ({ unwrap: () => Promise.resolve() })) as any;
    }) as any);
    
    const mockThunkApi = {
      dispatch: mockDispatch,
      getState: () => mockState,
    };

    await setDialogExtraReferencesAction(null as any, mockThunkApi);

    expect(dispatchedActionPayload).toBeDefined();
    expect(dispatchedActionPayload.payload.changes.extraReferences).toEqual([]);
  });
});
