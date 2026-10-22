import SHA256 from "crypto-js/sha256";

/** Compute a SHA-256 digest as lowercase hexadecimal without relying on Web Crypto. */
export function sha256Hex(text: string): string {
  return SHA256(text).toString();
}
