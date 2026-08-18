/**
 * 极简函数式表单 hook。
 *
 * 设计目标：只做三件事——状态容器、纯函数操作、schema 校验入口。
 * 不模仿 react-hook-form：没有 register/Controller/control/useWatch。
 * 字段就是 values 上的普通属性，读取直接 values.name，写入直接 set("name", v)。
 *
 * 校验通过 Standard Schema 接口接入（valibot / zod v4 都实现该规范），
 * 本 hook 与具体校验库解耦。
 */

import { useCallback, useReducer, useRef, type FormEvent } from "react";

// Standard Schema 最小类型（避免引入 @standard-schema/spec 类型依赖）
// 详见 https://github.com/standard-schema/standard-schema
//
// 实现侧（valibot/zod v4）的导出类型不直接是 StandardSchema<...>，
// 但都有 `~standard` 字段。这里用结构化类型兼容，避免给 schema 加 `as any`。
export interface StandardSchemaResultError {
  issues: ReadonlyArray<StandardIssue>;
  value?: undefined;
}
export interface StandardSchemaResultOk<O> {
  issues?: undefined;
  value: O;
}
export interface StandardSchema<Input = unknown, Output = unknown> {
  "~standard": {
    version: 1;
    vendor: string;
    validate: (
      value: Input,
    ) => StandardSchemaResultOk<Output> | StandardSchemaResultError;
  };
}

/**
 * 宽松 schema 类型：接受任何带 `~standard` 字段的对象。
 * 用于 hook 的 schema 参数，让 valibot/zod v4 的具体 schema 类型无需 `as any` 即可传入。
 *
 * 不约束 validate 的参数/返回类型——具体库的签名各有差异，
 * hook 内部统一按运行时结构处理（看 result.issues 判断成败）。
 *
 * 设计缺口（已知，有意为之）：
 * - 不校验 `~standard.version`：当前所有实现都是 v1，未来若有 v2 再加。
 * - schema 的 transform 输出被丢弃：本 hook 只用 schema 做校验（取 issues），
 *   不用 validate 成功时返回的 `value`（可能被 transform 过）。调用方拿到的是
 *   原始 `values`，不是 schema 输出。如果需要 transform，请在 submit 回调里
 *   单独处理，或用 valibot 的 `parse()` 在 submit 时再跑一次。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStandardSchema = { "~standard": { validate: (value: any) => any } };

export interface StandardIssue {
  message: string;
  path?: ReadonlyArray<PropertyKey | string | number | symbol | object>;
}

export interface FormApi<T extends object> {
  /** 当前所有字段值。直接读 values.name，不包装。 */
  values: T;
  /** 错误映射：扁平 path → message。例如 errors["name"] 或 errors["refs.0.title"]。 */
  errors: Record<string, string>;
  /** 已改动过的字段名集合。 */
  dirty: ReadonlySet<string>;
  /** 是否正在提交。 */
  submitting: boolean;
  /** 写入单字段。等价于 set("name", e.target.value) 的便捷版。 */
  set: <K extends string & keyof T>(name: K, value: T[K]) => void;
  /** 写入字段的便捷重载：任意字符串 path（支持嵌套如 "refs.0.title"）。 */
  setAny: (name: string, value: unknown) => void;
  /** 读最新所有值（ref 保证回调里拿到的是最新值，而非 render 快照）。 */
  getValues: () => T;
  /** 读最新单字段值（ref 保证回调里拿到的是最新值）。 */
  getValue: (name: string) => unknown;
  /** 触发整表校验，返回错误 map（同时更新 errors）。 */
  validate: () => Record<string, string>;
  /** 生成 onSubmit 句柄：自动 preventDefault + 校验 + 分派。 */
  submit: (
    onValid: (values: T) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string>) => void,
  ) => (e?: FormEvent) => Promise<void>;
  /** 用新值整体替换状态，并清空错误与 dirty。不传参则只清空错误和 dirty，保留当前 values。 */
  reset: (values?: T) => void;
}

// --- 状态 ---

/**
 * 把 Standard Schema issue.path 映射为扁平字段 key。
 *
 * valibot: path 是对象数组 [{key: "username", ...}]，取 .key。
 * zod v4: path 是 (string|number)[]，直接 join。
 * 混合或其他：尽力提取，失败回退 _root。
 */
function pathToKey(path: StandardIssue["path"]): string {
  if (!path || path.length === 0) return "_root";
  const parts: string[] = [];
  for (const seg of path) {
    if (seg === null || seg === undefined) continue;
    if (typeof seg === "string" || typeof seg === "number") {
      parts.push(String(seg));
    } else if (typeof seg === "object" && seg !== null) {
      // valibot: { key: "username", value, input, ... }
      const k = (seg as any).key;
      if (k !== undefined && k !== null) parts.push(String(k));
    }
  }
  return parts.length > 0 ? parts.join(".") : "_root";
}

type State<T extends object> = {
  values: T;
  errors: Record<string, string>;
  dirty: Set<string>;
  submitting: boolean;
};

type Action<T extends object> =
  | { type: "set"; name: string; value: unknown }
  | { type: "errors"; errors: Record<string, string> }
  | { type: "submitting"; on: boolean }
  | { type: "reset"; values?: T };

function reducer<T extends object>(s: State<T>, a: Action<T>): State<T> {
  switch (a.type) {
    case "set":
      return {
        ...s,
        values: { ...s.values, [a.name]: a.value } as T,
        dirty: new Set<string>(s.dirty).add(a.name),
      };
    case "errors":
      return { ...s, errors: a.errors };
    case "submitting":
      return { ...s, submitting: a.on };
    case "reset":
      return {
        values: a.values ?? s.values,
        errors: {},
        dirty: new Set<string>(),
        submitting: false,
      };
  }
}

// --- hook ---

/**
 * 用法：
 *   const form = useForm({
 *     defaultValues: { email: "", password: "" },
 *     schema: loginSchema,  // valibot object() / zod v4 / 任何 Standard Schema
 *   });
 *
 *   <Input value={form.values.email}
 *          onChange={e => form.set("email", e.target.value)}
 *          error={!!form.errors.email} />
 *
 *   <form onSubmit={form.submit(onSubmit)}>
 */
export function useForm<T extends object>(opts: {
  defaultValues: T;
  schema?: AnyStandardSchema;
}): FormApi<T> {
  const [state, dispatch] = useReducer(reducer<T>, opts.defaultValues, (v) => ({
    values: v,
    errors: {},
    dirty: new Set<string>(),
    submitting: false,
  }));

  // schema 走 ref，避免每次重渲染都重建 useCallback 依赖链。
  const schemaRef = useRef(opts.schema);
  schemaRef.current = opts.schema;

  // values 走 ref，让 validate/submit 始终读到最新值，避免闭包陷阱。
  // （不依赖 state.values 重建 useCallback，submit handler 闭包永远拿最新 values）
  const valuesRef = useRef(state.values);
  valuesRef.current = state.values;

  const set = useCallback(
    <K extends string & keyof T>(name: K, value: T[K]) => {
      dispatch({ type: "set", name: name as string, value });
    },
    [],
  );

  const setAny = useCallback((name: string, value: unknown) => {
    dispatch({ type: "set", name, value });
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const schema = schemaRef.current;
    if (!schema) {
      dispatch({ type: "errors", errors: {} });
      return {};
    }
    const result = schema["~standard"].validate(valuesRef.current);
    if (!("issues" in result) || !result.issues) {
      dispatch({ type: "errors", errors: {} });
      return {};
    }
    const errors: Record<string, string> = {};
    for (const issue of result.issues) {
      const path = pathToKey(issue.path);
      if (!errors[path]) errors[path] = issue.message;
    }
    dispatch({ type: "errors", errors });
    return errors;
  }, []);

  const submit = useCallback(
    (
      onValid: (values: T) => void | Promise<void>,
      onInvalid?: (errors: Record<string, string>) => void,
    ) =>
      async (e?: FormEvent) => {
        e?.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length > 0) {
          onInvalid?.(errors);
          return;
        }
        dispatch({ type: "submitting", on: true });
        try {
          await onValid(valuesRef.current);
        } finally {
          dispatch({ type: "submitting", on: false });
        }
      },
    [validate],
  );

  const reset = useCallback((values?: T) => {
    dispatch({ type: "reset", values: values as T });
  }, []);

  const getValues = useCallback((): T => valuesRef.current, []);
  const getValue = useCallback((name: string): unknown => {
    return (valuesRef.current as Record<string, unknown>)[name];
  }, []);

  return {
    values: state.values,
    errors: state.errors,
    dirty: state.dirty,
    submitting: state.submitting,
    set,
    setAny,
    getValues,
    getValue,
    validate,
    submit,
    reset,
  };
}