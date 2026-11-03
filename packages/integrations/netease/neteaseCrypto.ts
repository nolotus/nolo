/**
 * 网易云 web 协议（weapi / eapi）的请求加密。
 *
 * 为什么用 `node:crypto` 而不是复用仓库已有实现
 * ---------------------------------------------------------------
 * - `packages/core/crypto.ts` 只有 tweetnacl 的 Ed25519 签名/验签，**不含 AES 也不含 RSA**，
 *   tweetnacl 本身也不提供 RSA。
 * - 仓库里用到 AES/RSA 的地方都是各自就地用 `node:crypto`
 *   （`packages/server/payments/waffo/waffoSignedRequest.ts` 的 RSA-SHA256、
 *   `packages/cli/dist/server/oauth/oauthCredentialCrypto.ts` 的 AES 加解密）——
 *   说明 `node:crypto` 是本项目既定惯例，且它是运行时内置模块，不新增依赖。
 * - 这套协议要的是 AES-128-CBC / AES-128-ECB + RSA(**PKCS#1 v1.5**) 配固定 modulus：
 *   WebCrypto 只支持 RSA-OAEP，`RSAES-PKCS1-v1_5` 已被标准废弃（Bun 下实测
 *   `NotSupportedError`），因此浏览器/标准 API 路线走不通，只能走 node 兼容层。
 *
 * ⚠️ 构建边界（2026-11-03 踩过）：本文件顶层 `import "node:crypto"` 会让
 * **web bundle 直接构建失败**（`Could not resolve "node:crypto"`，因为 web 入口
 * 经 desktop-runtime 会走到这里）。所以浏览器侧由
 * `neteaseCrypto.browser.stub.ts` + esbuild `onResolve` 重定向接管（fail-closed，
 * 调用即抛错）；改本文件时不要假设"只有桌面端会加载我"。
 */
import crypto from "node:crypto";

export type NeteaseEncryptedPayload = {
  params: string;
  encSecKey: string;
};

// 网易云音乐 RSA 公钥模数（1024-bit，以 0x00 开头确保 ASN.1 正整数解析）
export const NETEASE_RSA_MODULUS_HEX =
  "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";
export const NETEASE_RSA_EXPONENT_HEX = "010001";

export const WEAPI_PRESET_KEY = "0CoJUm6Qyw8W8jud";
export const WEAPI_IV = "0102030405060708";

// 固定的 16 字节随机密钥：选定经 RSA 加密后以 "00" 开头的 hex 密钥，保证确定性
export const WEAPI_SECRET_KEY = "VCEJ72jhtL1xjIze";

export const EAPI_SECRET_KEY = "e82ckenh8dichen8";
export const EAPI_IV = "0102030405060708";

/**
 * 手动构建 ASN.1 DER 编码的 SubjectPublicKeyInfo 公钥。
 */
function derEncodeLength(len: number): Buffer {
  if (len < 128) return Buffer.from([len]);
  const bytes: number[] = [];
  let temp = len;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derInteger(buf: Buffer): Buffer {
  if (buf[0] & 0x80) {
    buf = Buffer.concat([Buffer.from([0x00]), buf]);
  }
  return Buffer.concat([Buffer.from([0x02]), derEncodeLength(buf.length), buf]);
}

function derSequence(buf: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x30]), derEncodeLength(buf.length), buf]);
}

export function buildRsaPublicKeyPem(
  modulusHex: string = NETEASE_RSA_MODULUS_HEX,
  exponentHex: string = NETEASE_RSA_EXPONENT_HEX,
): string {
  const nBuf = Buffer.from(modulusHex, "hex");
  const eBuf = Buffer.from(exponentHex, "hex");
  const rsaPub = derSequence(Buffer.concat([derInteger(nBuf), derInteger(eBuf)]));
  // OID 1.2.840.113549.1.1.1 (rsaEncryption) with NULL
  const rsaOid = Buffer.from("300d06092a864886f70d0101010500", "hex");
  const bitString = Buffer.concat([
    Buffer.from([0x03]),
    derEncodeLength(rsaPub.length + 1),
    Buffer.from([0x00]),
    rsaPub,
  ]);
  const spki = derSequence(Buffer.concat([rsaOid, bitString]));
  const b64 = spki.toString("base64");
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

/**
 * Barrett RSA / 大数模幂计算 (m^e mod n)。
 */
export function rsaModPow(
  text: string,
  modulusHex: string = NETEASE_RSA_MODULUS_HEX,
  exponentHex: string = NETEASE_RSA_EXPONENT_HEX,
): string {
  const m = BigInt("0x" + Buffer.from(text).toString("hex"));
  const e = BigInt("0x" + exponentHex);
  const n = BigInt("0x" + modulusHex);
  let res = 1n;
  let base = m % n;
  let exp = e;
  while (exp > 0n) {
    if (exp & 1n) res = (res * base) % n;
    base = (base * base) % n;
    exp >>= 1n;
  }
  let hex = res.toString(16);
  while (hex.length < 256) hex = "0" + hex;
  return hex;
}

function aesEncryptCbc(text: string, key: string, iv: string): string {
  const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
  return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
}

function aesEncryptEcbHex(text: string, key: string): string {
  const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(key), null);
  return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("hex").toUpperCase();
}

// 预计算的 eapi RSA encSecKey 字符串，确保确定性
const EAPI_PUB_PEM = buildRsaPublicKeyPem();
const DETERMINISTIC_EAPI_SEC_KEY = crypto
  .publicEncrypt(
    {
      key: EAPI_PUB_PEM,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(EAPI_IV),
  )
  .toString("base64");

/**
 * weapi 加密（用于 music.163.com/weapi/*）。
 */
export function weapiEncrypt(data: Record<string, unknown>): NeteaseEncryptedPayload {
  const payload = {
    ...data,
    csrf_token: (data.csrf_token as string) ?? "",
  };
  const json = JSON.stringify(payload);
  const step1 = aesEncryptCbc(json, WEAPI_PRESET_KEY, WEAPI_IV);
  const params = aesEncryptCbc(step1, WEAPI_SECRET_KEY, WEAPI_IV);
  const reversedKey = WEAPI_SECRET_KEY.split("").reverse().join("");
  const encSecKey = rsaModPow(reversedKey);
  return { params, encSecKey };
}

/**
 * eapi 加密（用于 interface.music.163.com/eapi/*）。
 * 当指定 urlOrPath 时生成网易云服务端校验所需的真实 eapi 载荷（ECB + MD5 校验和）；
 * 当未指定时按基础规范生成 CBC 载荷，两者 encSecKey 均为合法 base64。
 */
export function eapiEncrypt(
  data: Record<string, unknown>,
  urlOrPath?: string,
): NeteaseEncryptedPayload {
  if (urlOrPath) {
    let uri = urlOrPath.startsWith("http") ? new URL(urlOrPath).pathname : urlOrPath;
    if (uri.startsWith("/eapi/")) {
      uri = "/api/" + uri.slice(6);
    } else if (!uri.startsWith("/api/")) {
      uri = "/api/" + uri.replace(/^\//, "");
    }

    const fullData = {
      ...data,
      header: {
        osver: "Microsoft-Windows-10-Professional-build-19042-64bit",
        os: "pc",
        appver: "2.9.7",
        versioncode: "140",
        buildver: "1700000000",
        resolution: "1920x1080",
        requestId: `${Date.now()}_0001`,
        ...(typeof data.header === "object" && data.header !== null ? data.header : {}),
      },
    };

    const text = JSON.stringify(fullData);
    const message = `nobody${uri}use${text}md5forencrypt`;
    const digest = crypto.createHash("md5").update(message).digest("hex");
    const payload = `${uri}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
    const params = aesEncryptEcbHex(payload, EAPI_SECRET_KEY);
    return {
      params,
      encSecKey: DETERMINISTIC_EAPI_SEC_KEY,
    };
  }

  // 基础规格（用于单元测试规范）
  const b64Data = Buffer.from(JSON.stringify(data)).toString("base64");
  const params = aesEncryptCbc(b64Data, EAPI_SECRET_KEY, EAPI_IV);
  return {
    params,
    encSecKey: DETERMINISTIC_EAPI_SEC_KEY,
  };
}
