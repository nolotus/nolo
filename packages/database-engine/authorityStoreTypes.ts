export type AuthorityBatchOperation =
  | { type: "put"; key: string; value: unknown }
  | { type: "del"; key: string };

export type AuthorityIteratorOptions = {
  gte?: string;
  lte?: string;
  lt?: string;
  reverse?: boolean;
  /**
   * 是否返回键。
   * 注意：实测 real level 传 keys: false 时产出 [undefined, value]（key 为 undefined，不是 null；
   * value 照常返回），若同时传 values: false 则产出零条目；
   * memory/sqlite 忽略此字段、始终返回真实 key。
   * 【调用方约束】禁止传入 keys: false；只有 values: false 是三端统一支持且行为一致的。
   */
  keys?: boolean;
  /**
   * 是否返回值。设为 false 时底层跳过读取/解码 value（keys-only 扫描；三端有 conformance 用例覆盖）。
   * level/sqlite/memory 三后端行为一致：产出 [key, undefined]，调用方请按 nullish (== null) 判定。
   */
  values?: boolean;
};

export interface AuthorityBatchWriter {
  put(key: string, value: unknown): void;
  del(key: string): void;
  write(): Promise<void>;
}

export interface AuthorityStore {
  readonly location?: string;
  readonly status?: string;
  open(): Promise<void>;
  close(): Promise<void>;
  /**
   * Schema-free KV payloads.
   * Non-generic overload first so bare `get(key)` stays `Promise<any>`
   * (generic-only `get<T=any>` collapses under expect/NoInfer to `undefined`).
   */
  get(key: string): Promise<any>;
  get<T>(key: string): Promise<T>;
  put(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  batchWrite(ops: AuthorityBatchOperation[]): Promise<void>;
  createBatch(): AuthorityBatchWriter;
  iterator(
    options?: AuthorityIteratorOptions
  ): AsyncIterableIterator<[string, unknown]>;
}
