import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { object, string, minLength, pipe } from "valibot";
import { useForm } from "./useForm";

const loginSchema = object({
  username: pipe(string(), minLength(1, "用户名必填")),
  password: pipe(string(), minLength(1, "密码必填")),
});

let dom: JSDOM;
let root: Root;
let container: HTMLDivElement;
let previousWindow: typeof globalThis.window | undefined;
let previousDocument: typeof globalThis.document | undefined;
let previousNavigator: typeof globalThis.navigator | undefined;
let previousHTMLElement: typeof globalThis.HTMLElement | undefined;
let previousActEnv: boolean | undefined;

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
  });
  previousWindow = globalThis.window;
  previousDocument = globalThis.document;
  previousNavigator = globalThis.navigator;
  previousHTMLElement = globalThis.HTMLElement;
  previousActEnv = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = dom.window.document.getElementById("root") as HTMLDivElement;
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  Object.assign(globalThis, {
    window: previousWindow,
    document: previousDocument,
    navigator: previousNavigator,
    HTMLElement: previousHTMLElement,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnv;
});

function runHook<T>(
  useFn: () => T,
): { api: () => T; rerender: (nextFn?: () => T) => void; unmount: () => void } {
  let api: T | null = null;
  let currentFn = useFn;
  function Probe() {
    api = currentFn();
    return null;
  }
  act(() => root.render(<Probe />));
  return {
    api: () => api!,
    rerender: (nextFn?: () => T) => {
      if (nextFn) currentFn = nextFn;
      act(() => root.render(<Probe />));
    },
    unmount: () => root.unmount(),
  };
}

describe("useForm", () => {
  test("初始化：defaultValues 直接出现在 values 上", () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "", password: "" },
        schema: loginSchema as any,
      }),
    );
    const api = h.api();
    expect(api.values.username).toBe("");
    expect(api.values.password).toBe("");
    expect(api.errors).toEqual({});
    expect(api.dirty.size).toBe(0);
    expect(api.submitting).toBe(false);
  });

  test("set 写入字段，dirty 记录字段名", () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "", password: "" },
        schema: loginSchema as any,
      }),
    );
    act(() => h.api().set("username", "alice"));
    h.rerender();
    const api = h.api();
    expect(api.values.username).toBe("alice");
    expect(api.dirty.has("username")).toBe(true);
    expect(api.dirty.has("password")).toBe(false);
  });

  test("validate 校验通过：errors 清空", () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "alice", password: "secret" },
        schema: loginSchema as any,
      }),
    );
    act(() => h.api().validate());
    h.rerender();
    expect(h.api().errors).toEqual({});
  });

  test("validate 校验失败：errors 按 path 映射 message", () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "", password: "" },
        schema: loginSchema as any,
      }),
    );
    act(() => h.api().validate());
    h.rerender();
    const api = h.api();
    expect(api.errors.username).toBe("用户名必填");
    expect(api.errors.password).toBe("密码必填");
  });

  const mockFn = () => {
    const calls: any[] = [];
    const fn = (...args: any[]) => { calls.push(args); };
    (fn as any).mock = { calls };
    (fn as any).toHaveBeenCalledWith = (...expected: any[]) =>
      calls.some((c) => JSON.stringify(c) === JSON.stringify(expected));
    return fn as any;
  };

  test("submit：校验通过则调用 onValid", async () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "alice", password: "secret" },
        schema: loginSchema as any,
      }),
    );
    const onValid = mockFn();
    const onInvalid = mockFn();
    await act(async () => {
      await h.api().submit(onValid, onInvalid)();
    });
    expect(onValid.mock.calls.length).toBe(1);
    expect(onValid.mock.calls[0]).toEqual([{ username: "alice", password: "secret" }]);
    expect(onInvalid.mock.calls.length).toBe(0);
    expect(h.api().submitting).toBe(false);
  });

  test("submit：校验失败则调用 onInvalid，不调 onValid", async () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "", password: "" },
        schema: loginSchema as any,
      }),
    );
    const onValid = mockFn();
    const onInvalid = mockFn();
    await act(async () => {
      await h.api().submit(onValid, onInvalid)();
    });
    expect(onValid.mock.calls.length).toBe(0);
    expect(onInvalid.mock.calls.length).toBe(1);
    expect(onInvalid.mock.calls[0]).toEqual([{
      username: "用户名必填",
      password: "密码必填",
    }]);
  });

  test("reset：整体替换 values，清空 errors 和 dirty", () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "", password: "" } as any,
        schema: loginSchema as any,
      }),
    );
    act(() => {
      h.api().set("username", "alice");
      h.api().validate();
    });
    h.rerender();
    expect(h.api().dirty.size).toBe(1);

    act(() => h.api().reset({ username: "bob", password: "x" } as any));
    h.rerender();
    const api = h.api();
    expect(api.values.username).toBe("bob");
    expect(api.dirty.size).toBe(0);
    expect(api.errors).toEqual({});
  });

  test("无 schema：validate 永远返回空 errors", () => {
    const h = runHook(() => useForm({ defaultValues: { a: "" } }));
    act(() => h.api().validate());
    h.rerender();
    expect(h.api().errors).toEqual({});
  });

  test("嵌套 path：valibot 嵌套对象错误映射到 a.b 形式", () => {
    const nestedSchema = object({
      refs: object({
        title: pipe(string(), minLength(1, "标题必填")),
      }),
    });
    const h = runHook(() =>
      useForm({
        defaultValues: { refs: { title: "" } } as any,
        schema: nestedSchema as any,
      }),
    );
    act(() => h.api().validate());
    h.rerender();
    expect(h.api().errors["refs.title"]).toBe("标题必填");
  });

  test("setAny：写入任意字符串 path 不报错", () => {
    const h = runHook(() =>
      useForm({ defaultValues: { a: "" } as any }),
    );
    act(() => h.api().setAny("custom.path", "value"));
    h.rerender();
    expect((h.api().values as any)["custom.path"]).toBe("value");
  });

  test("reset 无参数：清空 errors 和 dirty，保留当前 values", () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "", password: "" } as any,
        schema: loginSchema as any,
      }),
    );
    // set 后先 rerender 再 validate，避免 dispatch 异步性
    act(() => h.api().set("username", "alice"));
    h.rerender();
    act(() => h.api().set("password", "secret"));
    h.rerender();
    act(() => h.api().validate());
    h.rerender();
    expect(h.api().dirty.size).toBe(2);
    expect(Object.keys(h.api().errors).length).toBe(0);

    // 制造错误：清空 username
    act(() => h.api().set("username", ""));
    h.rerender();
    act(() => h.api().validate());
    h.rerender();
    expect(Object.keys(h.api().errors).length).toBe(1);

    act(() => h.api().reset());
    h.rerender();
    const api = h.api();
    // reset 无参保留 values，清空 errors 和 dirty
    expect(api.values.username).toBe("");
    expect(api.values.password).toBe("secret");
    expect(api.dirty.size).toBe(0);
    expect(api.errors).toEqual({});
  });

  test("submit 异步完成后 submitting 恢复 false", async () => {
    const h = runHook(() =>
      useForm({
        defaultValues: { username: "alice", password: "secret" },
        schema: loginSchema as any,
      }),
    );
    const onValid = async () => {
      await new Promise((r) => setTimeout(r, 10));
    };
    await act(async () => {
      await h.api().submit(onValid)();
    });
    h.rerender();
    expect(h.api().submitting).toBe(false);
  });
});