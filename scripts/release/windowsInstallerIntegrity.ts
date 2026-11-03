/**
 * Windows 安装包结构完整性判据（发布链路共用）。
 *
 * 为什么不用「最小字节数」当完整性判据：这条门禁历史上已经咬过两次——
 *   1. 阈值按 zip 主件（≥50 MB）标定，切成 Inno Setup 单文件 .exe（实测 ~48.6 MB）
 *      后把完全正确的产物以 "too small" 拦死；
 *   2. 2026-11-03 安装包降到 ~42.95 MB（压缩/内容变动，三次独立构建仅差约 3 KB），
 *      47 MB 的生产阈值又把 Desktop Build 连挂十几次。
 *
 * 体积与完整性本来就不等价：包可以合法地瘦身，也可以被截断而体积仍大于阈值。
 * 真正的完整性判据是**结构**——它是不是一个合法的 PE 镜像——加上**内容**判据
 * （安装后 runtime marker / launcher / HTTP healthcheck，见
 * scripts/verify/desktop/smokeInstalledWindowsDesktop.ps1）。
 */

/** 读取文件头部的 PE 标识；不是合法 PE 镜像时返回 null。 */
export async function readWindowsPeSignature(
  filePath: string,
): Promise<"MZ" | null> {
  const handle = Bun.file(filePath);
  if (!(await handle.exists())) return null;
  const size = handle.size;
  // 空文件 / 明显不是安装包的体积：结构检查无从谈起，直接判否。
  if (size < 1024) return null;

  const head = new Uint8Array(await handle.slice(0, 64).arrayBuffer());
  if (head.length < 64) return null;
  if (head[0] !== 0x4d || head[1] !== 0x5a) return null; // "MZ"

  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const peOffset = view.getInt32(0x3c, true);
  // PE 头必须落在 DOS 头之后（>=64），否则它与 DOS 头重叠，不是合法布局。
  if (peOffset < 64 || peOffset > size - 4) return null;

  const signature = new Uint8Array(await handle.slice(peOffset, peOffset + 4).arrayBuffer());
  if (signature.length < 4) return null;
  if (signature[0] !== 0x50 || signature[1] !== 0x45) return null; // "PE"
  if (signature[2] !== 0 || signature[3] !== 0) return null;
  return "MZ";
}

/**
 * 断言本地 Windows 安装包是结构完整的 PE 镜像。
 * 抛错信息要能区分「文件是空的」与「文件不是 PE」。
 */
export async function assertWindowsInstallerLooksRunnable(
  filePath: string,
): Promise<void> {
  const exists = await Bun.file(filePath).exists();
  if (!exists) {
    throw new Error(`Windows installer artifact is missing: ${filePath}`);
  }
  const size = Bun.file(filePath).size;
  if (size === 0) {
    throw new Error(`Windows installer artifact is empty: ${filePath}`);
  }
  const signature = await readWindowsPeSignature(filePath);
  if (signature === "MZ") return;
  throw new Error(
    `Windows installer artifact is not a valid PE image: ${filePath} (${size} bytes) — ` +
      `it is missing the MZ/PE headers, so it is truncated or not an installer.`,
  );
}

/** 从远端字节流判断是否为 PE 镜像（用于发布后校验：只看头两字节即可）。 */
export function looksLikePeHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a;
}
