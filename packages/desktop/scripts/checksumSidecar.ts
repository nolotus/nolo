import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

/**
 * Electrobun 2.0.7 的发布契约：更新 manifest（`<channel>-<os>-<arch>-update.json`）
 * 保持 `schemaVersion: 1` + `artifact.file` 的旧形状，tar 完整性信息放在独立边车
 * `<channel>-<os>-<arch>-checksum.json` 里，字段为 `hash`（= manifest 的构建 hash）、
 * `tarSha256` / `tarSize`（**解压后** tar 的摘要与字节数）。见
 * https://github.com/blackboardsh/electrobun/blob/v2.0.7/docs/src/content/docs/electrobun/guides/updates.mdx
 *
 * 为什么需要在本地重算：hutch 在打包早期写出边车，而我们的 post-package 之后还会
 * 重写 Linux 更新包（`trim-linux-payload.ts` 的瘦身重打包 + launcher preflight 注入），
 * 最终字节与 hutch 记录的摘要/大小不同。2.0.7 客户端会按边车校验实际 tar，
 * 摘要不符会直接让更新准备失败（不会走 404 回退），因此必须按最终字节重生成。
 *
 * 解压走 `zstd -dc`（存在时）以获得正确的截断检测与低内存，缺失时回退到
 * `Bun.zstdDecompressSync`（Windows 构建机 PATH 不保证有 zstd）；两条路都校验
 * 解压结果的 tar 形状（非空、512 对齐、首块是 tar 头）。
 */

export type ArtifactChecksumSidecar = {
  hash: string;
  tarSha256: string;
  tarSize: number;
};

export const CHECKSUM_SIDECAR_SUFFIX = "-checksum.json";
const UPDATE_MANIFEST_SUFFIX = "-update.json";

export type ChecksumSidecarRegenerationReport = {
  sidecarPath: string;
  artifactPath: string;
  changed: boolean;
  previousHash?: string;
  previousTarSha256?: string;
  previousTarSize?: number;
  hash: string;
  tarSha256: string;
  tarSize: number;
};

/** 发布计划里的一项边车：名字（远端对象名）与实际文件路径必须成对给出。 */
export type ChecksumSidecarUpload = {
  uploadName: string;
  sourcePath: string;
};

/** `canary-linux-x64-update.json` → `canary-linux-x64-checksum.json` */
export function checksumSidecarNameForUpdateManifest(updateManifestName: string): string {
  if (!updateManifestName.toLowerCase().endsWith(UPDATE_MANIFEST_SUFFIX)) {
    throw new Error(`not an update manifest name: ${updateManifestName}`);
  }
  return `${updateManifestName.slice(0, -UPDATE_MANIFEST_SUFFIX.length)}${CHECKSUM_SIDECAR_SUFFIX}`;
}

/** `canary-linux-x64-checksum.json` → `canary-linux-x64-update.json`（同目录） */
export function updateManifestNameForChecksumSidecar(sidecarName: string): string {
  if (!sidecarName.toLowerCase().endsWith(CHECKSUM_SIDECAR_SUFFIX)) {
    throw new Error(`not a checksum sidecar name: ${sidecarName}`);
  }
  return `${sidecarName.slice(0, -CHECKSUM_SIDECAR_SUFFIX.length)}${UPDATE_MANIFEST_SUFFIX}`;
}

/** 边车对应的更新包上传名（`*-update.json` 的 `artifact.file` 指向的名字）。 */
export function isDesktopUpdateManifestUploadName(uploadName: string): boolean {
  return uploadName.toLowerCase().endsWith(UPDATE_MANIFEST_SUFFIX);
}

export function isDesktopChecksumSidecarUploadName(uploadName: string): boolean {
  return uploadName.toLowerCase().endsWith(CHECKSUM_SIDECAR_SUFFIX);
}

export function serializeChecksumSidecar(sidecar: ArtifactChecksumSidecar): string {
  return `${JSON.stringify({
    hash: sidecar.hash,
    tarSha256: sidecar.tarSha256,
    tarSize: sidecar.tarSize,
  })}\n`;
}

async function hashDecompressedTarCli(tarPath: string): Promise<{
  tarSha256: string;
  tarSize: number;
  firstBlock: Uint8Array;
}> {
  const proc = Bun.spawn(["zstd", "-dc", tarPath], { stdout: "pipe", stderr: "pipe" });
  // stderr 必须并行消费并限长：等 stdout 结束后再读，可能在 stderr 写满管道时互相卡死。
  const stderrPromise = (async () => {
    const chunks: Uint8Array[] = [];
    let kept = 0;
    const limit = 8 * 1024;
    for await (const chunk of proc.stderr as ReadableStream<Uint8Array>) {
      if (kept >= limit) continue;
      chunks.push(chunk);
      kept += chunk.byteLength;
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  })();
  const hasher = new Bun.CryptoHasher("sha256");
  let tarSize = 0;
  let firstBlock: Uint8Array = new Uint8Array(0);
  let readError: unknown = null;
  try {
    for await (const chunk of proc.stdout as ReadableStream<Uint8Array>) {
      if (firstBlock.byteLength < TAR_BLOCK_BYTES) {
        const combined = new Uint8Array(Math.min(TAR_BLOCK_BYTES, firstBlock.byteLength + chunk.byteLength));
        combined.set(firstBlock);
        combined.set(chunk.subarray(0, combined.byteLength - firstBlock.byteLength), firstBlock.byteLength);
        firstBlock = combined;
      }
      hasher.update(chunk);
      tarSize += chunk.byteLength;
    }
  } catch (error) {
    readError = error;
    proc.kill();
  }
  const [stderr, exitCode] = await Promise.all([stderrPromise, proc.exited]);
  if (readError) {
    throw new Error(`failed reading decompressed ${tarPath}: ${String(readError)}`);
  }
  if (exitCode !== 0) {
    // zstd 对截断/损坏输入返回非零（"premature end"）：这里必须 fail closed，
    // 否则会把部分解压结果当成完整 tar 写进边车。
    throw new Error(
      `zstd decompression failed for ${tarPath} (exit ${exitCode}): ${stderr.trim().slice(0, 2_000)}`,
    );
  }
  return { tarSha256: hasher.digest("hex"), tarSize, firstBlock };
}

/**
 * 宿主没有 `zstd` 命令时的兜底：`Bun.zstdDecompressSync` 是唯一对截断输入报错
 * 的进程内实现（`node:zlib` 的 stream 与 `zstdDecompressSync` 都会把截断当成成功，
 * 实测少最后一字节仍返回部分数据）。代价是要把整个 tar 放进内存，只在没有 CLI 的
 * 平台（例如 Windows 构建机）走这条路。
 */
async function hashDecompressedTarInProcess(
  tarPath: string,
): Promise<{ tarSha256: string; tarSize: number; firstBlock: Uint8Array }> {
  const compressed = new Uint8Array(await Bun.file(tarPath).arrayBuffer());
  let raw: Uint8Array;
  try {
    raw = Bun.zstdDecompressSync(compressed);
  } catch (error) {
    throw new Error(`zstd decompression failed for ${tarPath}: ${String(error)}`);
  }
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(raw);
  return {
    tarSha256: hasher.digest("hex"),
    tarSize: raw.byteLength,
    firstBlock: raw.subarray(0, TAR_BLOCK_BYTES),
  };
}

export type DigestDecompressor = "auto" | "cli" | "inprocess";

const TAR_BLOCK_BYTES = 512;

function isAllZero(block: Uint8Array): boolean {
  for (const byte of block) {
    if (byte !== 0) return false;
  }
  return true;
}

/**
 * 第一块必须像 tar 头：`ustar` magic、合法头校验和，或全零（空归档的结束块）。
 * 只校验长度对齐抓不住「512 对齐的垃圾」——那类输入解压成功、字节数对，但绝不是 tar。
 */
function looksLikeTarHeader(header: Uint8Array): boolean {
  if (header.byteLength < TAR_BLOCK_BYTES) return false;
  if (isAllZero(header.subarray(0, TAR_BLOCK_BYTES))) return true;
  const block = header.subarray(0, TAR_BLOCK_BYTES);
  const magic = block.subarray(257, 262);
  const isUstar =
    magic[0] === 0x75 && magic[1] === 0x73 && magic[2] === 0x74 && magic[3] === 0x61 && magic[4] === 0x72;
  const checksumField = block.subarray(148, 156);
  const recordedText = new TextDecoder().decode(checksumField).replace(/[^0-7]/g, "");
  const recorded = recordedText ? Number.parseInt(recordedText, 8) : Number.NaN;
  let computed = 0;
  for (let index = 0; index < TAR_BLOCK_BYTES; index += 1) {
    computed += index >= 148 && index < 156 ? 0x20 : block[index]!;
  }
  return isUstar || recorded === computed;
}

/** tar 归档的最小合法性：非空、512 字节对齐，且首块是合法 tar 头。 */
function assertLooksLikeTar(rawSize: number, header: Uint8Array, tarPath: string): void {
  if (rawSize <= 0) {
    throw new Error(`zstd decompression produced an empty tar for ${tarPath}`);
  }
  if (rawSize % TAR_BLOCK_BYTES !== 0) {
    throw new Error(
      `zstd decompression produced ${rawSize} bytes for ${tarPath}, which is not a tar archive`,
    );
  }
  if (!looksLikeTarHeader(header)) {
    throw new Error(
      `zstd decompression produced a ${rawSize}-byte payload for ${tarPath} whose first block is not a tar header`,
    );
  }
}

/** 解压后的 tar 摘要与大小（与客户端 `prepare_update` 的校验口径一致）。 */
export async function digestUncompressedTar(
  tarPath: string,
  options: { decompressor?: DigestDecompressor } = {},
): Promise<{ tarSha256: string; tarSize: number }> {
  if (!(await Bun.file(tarPath).exists())) throw new Error(`payload is missing: ${tarPath}`);
  const mode = options.decompressor ?? "auto";
  if (mode === "cli") {
    // 显式点名 CLI 时不允许静默回退：否则测试与 CI 会以为在验 CLI 路径，实际走的是兜底。
    if (!Bun.which("zstd")) {
      throw new Error(`zstd command is required for decompressor "cli" but was not found`);
    }
    const digest = await hashDecompressedTarCli(tarPath);
    assertLooksLikeTar(digest.tarSize, digest.firstBlock, tarPath);
    return { tarSha256: digest.tarSha256, tarSize: digest.tarSize };
  }
  if (mode === "auto" && Bun.which("zstd")) {
    const digest = await hashDecompressedTarCli(tarPath);
    assertLooksLikeTar(digest.tarSize, digest.firstBlock, tarPath);
    return { tarSha256: digest.tarSha256, tarSize: digest.tarSize };
  }
  const digest = await hashDecompressedTarInProcess(tarPath);
  assertLooksLikeTar(digest.tarSize, digest.firstBlock, tarPath);
  return { tarSha256: digest.tarSha256, tarSize: digest.tarSize };
}

async function readJsonFile<T>(path: string): Promise<T> {
  return (await readFile(path, "utf8").then((text) => JSON.parse(text))) as T;
}

type UpdateManifestFile = {
  hash?: string;
  artifact?: { file?: string };
};

function resolveManifestArtifact(args: {
  manifestPath: string;
  manifest: UpdateManifestFile;
}): { hash: string; artifactPath: string } {
  const hash = args.manifest.hash?.trim();
  const artifactFile = args.manifest.artifact?.file?.trim();
  if (!hash) throw new Error(`${args.manifestPath} has no hash field`);
  if (!artifactFile) throw new Error(`${args.manifestPath} has no artifact.file field`);
  // manifest 里放的是文件名（不含目录）。只取 basename，避免被 `../` 带出构建目录。
  return { hash, artifactPath: join(dirname(args.manifestPath), basename(artifactFile)) };
}

/** 递归列出目录下的文件（CI 会把各平台产物下载到 `desktop-linux/` 之类的子目录）。 */
async function listFilesRecursive(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isFile()) return [path];
      if (entry.isDirectory()) return listFilesRecursive(path);
      return [];
    }),
  );
  return files.flat();
}

/**
 * 按最终产物字节重生成 `*-checksum.json`：摘要取自 manifest 指向的实际 tar，
 * `hash` 取自 manifest。没有边车时返回空数组；边车存在但同目录缺 manifest 时跳过
 * （发布闸门 `assertChecksumSidecarsMatchArtifacts` 会在发布前 fail closed）。
 */
export async function regenerateChecksumSidecarsForArtifacts(args: {
  artifactDir: string;
}): Promise<ChecksumSidecarRegenerationReport[]> {
  const artifactDir = resolve(args.artifactDir);
  const sidecarPaths = (await listFilesRecursive(artifactDir))
    .filter((path) => path.toLowerCase().endsWith(CHECKSUM_SIDECAR_SUFFIX))
    .sort();
  const reports: ChecksumSidecarRegenerationReport[] = [];
  for (const sidecarPath of sidecarPaths) {
    const sidecarName = basename(sidecarPath);
    const manifestPath = join(dirname(sidecarPath), updateManifestNameForChecksumSidecar(sidecarName));
    if (!(await Bun.file(manifestPath).exists())) continue;
    const manifest = await readJsonFile<UpdateManifestFile>(manifestPath);
    const { hash, artifactPath } = resolveManifestArtifact({ manifestPath, manifest });
    const previous = await readJsonFile<Partial<ArtifactChecksumSidecar>>(sidecarPath);
    const previousHash = previous.hash?.trim();
    if (previousHash && previousHash !== hash) {
      throw new Error(
        `checksum sidecar ${sidecarName} has hash ${previousHash} but ${basename(manifestPath)} has ${hash}`,
      );
    }
    const { tarSha256, tarSize } = await digestUncompressedTar(artifactPath);
    // hash 也参与幂等判定：缺 hash 的边车即使两个 tar 字段正确也仍然无效。
    const changed =
      previousHash !== hash || previous.tarSha256 !== tarSha256 || previous.tarSize !== tarSize;
    if (changed) {
      await writeFile(sidecarPath, serializeChecksumSidecar({ hash, tarSha256, tarSize }), "utf8");
    }
    reports.push({
      sidecarPath,
      artifactPath,
      changed,
      previousHash,
      previousTarSha256: previous.tarSha256,
      previousTarSize: previous.tarSize,
      hash,
      tarSha256,
      tarSize,
    });
  }
  return reports;
}

/**
 * 发布前 fail closed 校验：计划上传的每个边车都必须与**它自己所在目录**的 manifest
 * 的 hash、以及该 manifest 指向的最终 tar 的摘要/大小一致。必须按上传计划的
 * `sourcePath` 定位，不能拿 `uploadName` 去拼 `artifactDir` 根目录——发布计划会递归
 * 发现子目录里的产物（CI 按平台分目录下载），根目录拼路径会 ENOENT 或校验到同名旧文件。
 *
 * 不一致就中止发布：宁可发不出，也不能让 2.0.7 客户端按错误边车拒绝更新包。
 */
export async function assertChecksumSidecarsMatchArtifacts(args: {
  sidecars: readonly ChecksumSidecarUpload[];
}): Promise<void> {
  const seen = new Map<string, string>();
  for (const sidecar of args.sidecars) {
    const sidecarName = basename(sidecar.sourcePath);
    if (sidecarName !== sidecar.uploadName) {
      throw new Error(
        `checksum sidecar upload ${sidecar.uploadName} does not match its file ${sidecar.sourcePath}`,
      );
    }
    const previousPath = seen.get(sidecar.uploadName);
    if (previousPath) {
      throw new Error(
        `ambiguous checksum sidecar upload name ${sidecar.uploadName}: ${previousPath} and ${sidecar.sourcePath}`,
      );
    }
    seen.set(sidecar.uploadName, sidecar.sourcePath);

    const manifestPath = join(
      dirname(sidecar.sourcePath),
      updateManifestNameForChecksumSidecar(sidecarName),
    );
    if (!(await Bun.file(manifestPath).exists())) {
      throw new Error(
        `checksum sidecar ${sidecar.uploadName} has no update manifest next to it (${manifestPath})`,
      );
    }
    const manifest = await readJsonFile<UpdateManifestFile>(manifestPath);
    const { hash, artifactPath } = resolveManifestArtifact({ manifestPath, manifest });
    const sidecarJson = await readJsonFile<Partial<ArtifactChecksumSidecar>>(sidecar.sourcePath);
    if (sidecarJson.hash?.trim() !== hash) {
      throw new Error(
        `checksum sidecar ${sidecar.uploadName} hash ${sidecarJson.hash ?? "<missing>"} does not match ${basename(manifestPath)} hash ${hash}`,
      );
    }
    const { tarSha256, tarSize } = await digestUncompressedTar(artifactPath);
    if (sidecarJson.tarSha256 !== tarSha256 || sidecarJson.tarSize !== tarSize) {
      throw new Error(
        `checksum sidecar ${sidecar.uploadName} does not match the final payload ` +
          `(sidecar tarSha256=${sidecarJson.tarSha256 ?? "<missing>"} tarSize=${sidecarJson.tarSize ?? "<missing>"}, ` +
          `actual tarSha256=${tarSha256} tarSize=${tarSize})`,
      );
    }
  }
}
