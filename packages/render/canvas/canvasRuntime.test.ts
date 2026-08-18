import { describe, expect, it } from "bun:test";
import {
  parseCanvasRuntimeAction,
  reduceCanvasRuntimeAction,
} from "./canvasRuntime";

describe("canvas runtime actions", () => {
  it("accepts safe built-in actions and rejects source-like callbacks", () => {
    expect(parseCanvasRuntimeAction({ type: "toggle", key: "detailsOpen" })).toEqual({
      type: "toggle",
      key: "detailsOpen",
    });
    expect(parseCanvasRuntimeAction({ type: "setState", key: "step", value: 2 })).toEqual({
      type: "setState",
      key: "step",
      value: 2,
    });
    expect(parseCanvasRuntimeAction({ type: "scrollTo", targetId: "pricing" })).toEqual({
      type: "scrollTo",
      targetId: "pricing",
    });
    expect(parseCanvasRuntimeAction("alert(1)")).toBeNull();
    expect(parseCanvasRuntimeAction({ type: "eval", code: "alert(1)" })).toBeNull();
  });

  it("updates local runtime state without mutating the previous state", () => {
    const initial = { detailsOpen: false, step: 1 };
    const toggled = reduceCanvasRuntimeAction(initial, {
      type: "toggle",
      key: "detailsOpen",
    });
    const stepped = reduceCanvasRuntimeAction(toggled, {
      type: "setState",
      key: "step",
      value: 2,
    });

    expect(initial).toEqual({ detailsOpen: false, step: 1 });
    expect(toggled).toEqual({ detailsOpen: true, step: 1 });
    expect(stepped).toEqual({ detailsOpen: true, step: 2 });
  });
});
