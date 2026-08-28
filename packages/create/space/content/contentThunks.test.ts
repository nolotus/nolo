import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test } from "bun:test";

import spaceReducer, {
  deleteContentFromSpace,
  deleteMultipleContent,
} from "../spaceSlice";
import { setCurrentSpaceBoth, getCurrentSpaceRaw, resetSpaceCurrentState } from "../spaceCurrentStore";

describe("deleteContentFromSpace fulfilled reducer", () => {
  test("updates currentSpace when payload and state space ids differ only by prefix", () => {
    resetSpaceCurrentState();
    setCurrentSpaceBoth("01SPACE", {
      id: "01SPACE",
      contents: {
        "agent-user-1-01AGENT": {
          title: "Agent",
          type: "agent",
          contentKey: "agent-user-1-01AGENT",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    } as any);
    const store = configureStore({
      reducer: { space: spaceReducer as any },
      middleware: (gdm: any) => gdm({ thunk: true, serializableCheck: false }),
    });

    const updatedSpaceData = {
      id: "01SPACE",
      contents: {},
      updatedAt: 2,
    };

    store.dispatch(
      (deleteContentFromSpace as any).fulfilled(
        {
          contentKey: "agent-user-1-01AGENT",
          spaceId: "space-01SPACE",
          updatedSpaceData,
        },
        "test-request",
        {
          contentKey: "agent-user-1-01AGENT",
          spaceId: "space-01SPACE",
        }
      ) as any
    );

    expect(getCurrentSpaceRaw()).toEqual(updatedSpaceData);
  });
});

describe("deleteMultipleContent fulfilled reducer", () => {
  test("updates currentSpace when payload and state space ids differ only by prefix", () => {
    resetSpaceCurrentState();
    setCurrentSpaceBoth("01SPACE", {
      id: "01SPACE",
      contents: {
        "page-user-1-01PAGE": {
          title: "Page",
          type: "page",
          contentKey: "page-user-1-01PAGE",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    } as any);
    const store = configureStore({
      reducer: { space: spaceReducer as any },
      middleware: (gdm: any) => gdm({ thunk: true, serializableCheck: false }),
    });

    const updatedSpaceData = {
      id: "01SPACE",
      contents: {},
      updatedAt: 2,
    };

    store.dispatch(
      (deleteMultipleContent as any).fulfilled(
        {
          spaceId: "space-01SPACE",
          updatedSpaceData,
        },
        "test-request",
        {
          contentKeys: ["page-user-1-01PAGE"],
          spaceId: "space-01SPACE",
        }
      ) as any
    );

    expect(getCurrentSpaceRaw()).toEqual(updatedSpaceData);
  });
});