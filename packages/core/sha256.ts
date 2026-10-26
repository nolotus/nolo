// 必须带 .js：crypto-js 没有 exports map，Node 的 ESM 解析器不会给裸子路径
// 补扩展名（bun 会），CLI 产物把 crypto-js 设为 external 后会原样保留这条 import。
import SHA256 from "crypto-js/sha256.js";

/** Compute a SHA-256 digest as lowercase hexadecimal without relying on Web Crypto. */
export function sha256Hex(text: string): string {
  return SHA256(text).toString();
}
