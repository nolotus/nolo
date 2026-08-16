import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test } from "bun:test";

import spaceReducer, {
  deleteContentFromSpace,
  deleteMultipleContent,
} from "../spaceSlice";

describe("deleteContentFromSpace fulfilled reducer", () => {
  test("updates currentSpace when payload and state space ids differ only by prefix", () => {
    const baseState = spaceReducer(undefined, { type: "unknown" });
    const store = configureStore({
      reducer: { space: spaceReducer as any },
      preloadedState: {
        space: {
          ...baseState,
          currentSpaceId: "01SPACE",
          currentSpace: {
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
          },
        },
      },
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

    expect((store.getState() as any).space.currentSpace).toEqual(updatedSpaceData);
  });
});

describe("deleteMultipleContent fulfilled reducer", () => {
  test("updates currentSpace when payload and state space ids differ only by prefix", () => {
    const baseState = spaceReducer(undefined, { type: "unknown" });
    const store = configureStore({
      reducer: { space: spaceReducer as any },
      preloadedState: {
        space: {
          ...baseState,
          currentSpaceId: "01SPACE",
          currentSpace: {
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
          },
        },
      },
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

    expect((store.getState() as any).space.currentSpace).toEqual(updatedSpaceData);
  });
});