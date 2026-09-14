// 文件路径: core/fnv1a32.ts

/**
 * FNV-1a 32bit 字符串哈希（零依赖、浏览器安全）。
 *
 * - 确定性：同一输入恒定同一输出；
 * - 仅用于展示 / 分组 / 排序类 id，非安全用途（不抗碰撞攻击）；
 * - 浏览器可达模块禁止引入 node:crypto（会把 web bundle 构建打挂），
 *   需要短哈希时统一走这里。
 */
export const fnv1a32 = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // 32bit
  }
  return hash >>> 0;
};

/** 8 位十六进制短 id 片段（如 `cred-3f9a1b2c` 中的 `3f9a1b2c`）。 */
export const fnv1a32Hex = (str: string): string =>
  fnv1a32(str).toString(16).padStart(8, "0");
