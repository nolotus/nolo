#!/usr/bin/env bun
/**
 * 闸门：Linux 桌面产物必须能被 electrobun 自解压器解开（2026-09-16 事故）。
 *
 * 自解压器（官方 Setup 安装器与 in-app 更新 apply 共用）只支持这些 tar 条目类型：
 * 常规文件 '0'、目录 '5'、符号链接 '2'、PAX 扩展头 'x'/'g'。GNU longname（'L'/'K'）
 * 与硬链接 '1' 会直接以 `TarUnsupportedFileType` 中止解包——而任何超过 100 字符的
 * 路径都会让 GNU tar 写出 'L' 记录。实测证据：alpha.3 Linux 载荷含 110 个 'L'
 * 记录（classic-level 的 C 源码/头文件、非目标平台/musl prebuilds、连接器深路径），
 * 官方 Setup 安装器解到第 770 个条目即停；同一载荷结构也存在于更新 `.tar.zst` 中，
 * 因此 in-app 更新的 apply 阶段同样失败。背景与修复见
 * docs/incidents/2026-09-16-desktop-updater-metadata-and-legacy-data-transition.md §7。
 *
 * 用法（手动）：
 *   bun packages/desktop/scripts/verifyElectrobunPayloadCompat.ts <artifact...>
 * 支持的产物：`*-linux-x64-*.tar.zst`（更新载荷）与 `*Setup.tar.gz`（安装器，内含
 * `ELECTROBUN_ARCHIVE_V1` + zstd 载荷）。退出码非零表示不兼容。
 *
 * 构建管线在 packages/desktop/scripts/post-package.ts 中对 Linux 产物 fail-closed
 * 调用 {@link verifyLinuxPayloadArtifacts}。
 */
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
  writeSync,
} from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const INSTALLER_PAYLOAD_MARKER = Buffer.from("ELECTROBUN_ARCHIVE_V1", "utf8");

// 安装器二进制里同时存在 marker 字符串常量（模板/诊断文本），单独搜 marker 会先命中
// 代码区的常量；真正的载荷由 `<marker><zstd 魔数>` 紧邻构成，按组合模式搜索。
const ZSTD_MAGIC_BYTES = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const INSTALLER_PAYLOAD_PATTERN = Buffer.concat([INSTALLER_PAYLOAD_MARKER, ZSTD_MAGIC_BYTES]);

const SUPPORTED_TAR_TYPES = new Set<string>(["0", "5", "2", "x", "g"]);
const TAR_HEADER_BYTES = 512;
const MARKER_SEARCH_CHUNK_BYTES = 4 * 1024 * 1024;
const COPY_CHUNK_BYTES = 4 * 1024 * 1024;

export type PayloadCompatViolation = {
  kind: "longname" | "hardlink" | "unsupported-type";
  entry: string;
};

export type PayloadCompatReport = {
  artifactPath: string;
  payloadSource: string;
  entries: number;
  violations: PayloadCompatViolation[];
  ok: boolean;
};

/** 在安装器二进制中定位载荷起点（返回 zstd 流起始偏移；组合模式匹配，跳过代码区常量）。 */
export const findInstallerPayloadOffset = (artifactPath: string): number | null => {
  const fd = openSync(artifactPath, "r");
  try {
    const totalBytes = statSync(artifactPath).size;
    const chunk = Buffer.alloc(MARKER_SEARCH_CHUNK_BYTES);
    let carried = Buffer.alloc(0);
    let offset = 0;
    while (offset < totalBytes) {
      const bytesRead = readSync(fd, chunk, 0, chunk.length, offset);
      if (bytesRead <= 0) break;
      const buf = carried.length
        ? Buffer.concat([carried, chunk.subarray(0, bytesRead)])
        : Buffer.from(chunk.subarray(0, bytesRead));
      const index = buf.indexOf(INSTALLER_PAYLOAD_PATTERN);
      if (index !== -1) {
        const bufferStartInFile = offset - carried.length;
        return bufferStartInFile + index + INSTALLER_PAYLOAD_MARKER.length;
      }
      const carryLength = Math.min(buf.length, INSTALLER_PAYLOAD_PATTERN.length - 1);
      carried = Buffer.from(buf.subarray(buf.length - carryLength));
      offset += bytesRead;
    }
    return null;
  } finally {
    closeSync(fd);
  }
};

const assertZstdMagic = (filePath: string): void => {
  const fd = openSync(filePath, "r");
  try {
    const head = Buffer.alloc(4);
    readSync(fd, head, 0, 4, 0);
    if (head[0] !== 0x28 || head[1] !== 0xb5 || head[2] !== 0x2f || head[3] !== 0xfd) {
      throw new Error(`expected zstd payload magic at the start of ${filePath}`);
    }
  } finally {
    closeSync(fd);
  }
};

const copyFileSliceTo = (sourcePath: string, start: number, destPath: string): void => {
  const inFd = openSync(sourcePath, "r");
  const outFd = openSync(destPath, "w");
  const buffer = Buffer.alloc(COPY_CHUNK_BYTES);
  let offset = start;
  try {
    for (;;) {
      const bytesRead = readSync(inFd, buffer, 0, buffer.length, offset);
      if (bytesRead <= 0) break;
      writeSync(outFd, buffer, 0, bytesRead);
      offset += bytesRead;
    }
  } finally {
    closeSync(inFd);
    closeSync(outFd);
  }
};

const decompressZstdToTar = (zstdPath: string, outTarPath: string): string => {
  const proc = Bun.spawnSync(["zstd", "-d", "-f", "-q", "-o", outTarPath, zstdPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (!proc.success) {
    throw new Error(
      `zstd decompress failed for ${zstdPath}: ${proc.stderr.toString("utf8").trim()}`,
    );
  }
  return outTarPath;
};

/**
 * 逐块扫描 tar 文件，报告自解压器不支持的条目。
 * 只读取 512 字节头并按 size 字段跳过数据区，不把整个 tar 读入内存
 * （CI runner 只有 ~1.6GB 内存，载荷解包后约 768MB）。
 */
export const scanTarFileForCompat = (
  tarPath: string,
): { entries: number; violations: PayloadCompatViolation[] } => {
  const violations: PayloadCompatViolation[] = [];
  let entries = 0;
  const fd = openSync(tarPath, "r");
  try {
    const fileSize = statSync(tarPath).size;
    const header = Buffer.alloc(TAR_HEADER_BYTES);
    let offset = 0;
    while (offset + TAR_HEADER_BYTES <= fileSize) {
      const bytesRead = readSync(fd, header, 0, TAR_HEADER_BYTES, offset);
      if (bytesRead < TAR_HEADER_BYTES) break;
      if (header.every((byte) => byte === 0)) {
        offset += TAR_HEADER_BYTES;
        continue;
      }
      entries += 1;
      const nameField = header.subarray(0, 100);
      const nameEnd = nameField.indexOf(0);
      const name = (nameEnd === -1 ? nameField : nameField.subarray(0, nameEnd)).toString("utf8");
      const sizeField = header
        .subarray(124, 136)
        .toString("ascii")
        .replace(/\0.*$/s, "")
        .trim();
      const parsedSize = sizeField ? Number.parseInt(sizeField, 8) : 0;
      const entrySize = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 0;
      const typeRaw = header[156];
      const type = typeRaw === 0 ? "0" : String.fromCharCode(typeRaw);

      if (type === "L" || type === "K") {
        violations.push({ kind: "longname", entry: name || "(gnu longlink record)" });
      } else if (type === "1") {
        violations.push({ kind: "hardlink", entry: name });
      } else if (!SUPPORTED_TAR_TYPES.has(type)) {
        violations.push({ kind: "unsupported-type", entry: `${type} ${name}` });
      }

      offset += TAR_HEADER_BYTES + Math.ceil(entrySize / TAR_HEADER_BYTES) * TAR_HEADER_BYTES;
    }
  } finally {
    closeSync(fd);
  }
  return { entries, violations };
};

/** 校验单个产物（更新载荷 `.tar.zst` 或 Setup 安装器）与其内嵌载荷的兼容性。 */
export const verifyArtifactPayloadCompat = (artifactPath: string): PayloadCompatReport => {
  if (!existsSync(artifactPath)) {
    throw new Error(`artifact not found: ${artifactPath}`);
  }
  const workDir = mkdtempSync(join(tmpdir(), "nolo-payload-compat-"));
  try {
    let tarPath: string;
    let payloadSource: string;

    if (artifactPath.endsWith("Setup.tar.gz")) {
      const extractDir = join(workDir, "setup-archive");
      mkdirSync(extractDir, { recursive: true });
      const extractProc = Bun.spawnSync(["tar", "-xzf", artifactPath, "-C", extractDir], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if (!extractProc.success) {
        throw new Error(
          `failed to extract Setup archive ${artifactPath}: ${extractProc.stderr.toString("utf8").trim()}`,
        );
      }
      const installerPath = join(extractDir, "installer");
      if (!existsSync(installerPath)) {
        throw new Error(`Setup archive does not contain an 'installer' entry: ${artifactPath}`);
      }
      const payloadOffset = findInstallerPayloadOffset(installerPath);
      if (payloadOffset === null) {
        throw new Error(
          `Setup installer payload marker (${INSTALLER_PAYLOAD_MARKER.toString("utf8")}) not found: ${artifactPath}`,
        );
      }
      const zstdPath = join(workDir, "installer-payload.zst");
      copyFileSliceTo(installerPath, payloadOffset, zstdPath);
      assertZstdMagic(zstdPath);
      tarPath = decompressZstdToTar(zstdPath, join(workDir, "installer-payload.tar"));
      payloadSource = "embedded ELECTROBUN_ARCHIVE_V1 payload";
    } else if (artifactPath.endsWith(".tar.zst")) {
      assertZstdMagic(artifactPath);
      tarPath = decompressZstdToTar(artifactPath, join(workDir, "payload.tar"));
      payloadSource = "tar.zst payload";
    } else {
      throw new Error(
        `unsupported artifact (expected *.tar.zst or *Setup.tar.gz): ${artifactPath}`,
      );
    }

    const { entries, violations } = scanTarFileForCompat(tarPath);
    return {
      artifactPath,
      payloadSource,
      entries,
      violations,
      ok: entries > 0 && violations.length === 0,
    };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
};

/** 扫描产物目录中的 Linux 载荷并 fail-closed 校验（post-package 调用）。 */
export const verifyLinuxPayloadArtifacts = async (
  artifactDir: string,
): Promise<PayloadCompatReport[]> => {
  const names = await readdir(artifactDir);
  const targets = names
    .filter(
      (name) =>
        (name.includes("linux") && name.endsWith(".tar.zst")) ||
        name.endsWith("Setup.tar.gz"),
    )
    .sort();
  if (targets.length === 0) {
    throw new Error(
      `no Linux payload artifacts (*-linux-x64-*.tar.zst or *Setup.tar.gz) found in ${artifactDir}`,
    );
  }

  const reports = targets.map((name) => verifyArtifactPayloadCompat(join(artifactDir, name)));
  const failed = reports.filter((report) => !report.ok);
  if (failed.length > 0) {
    const lines = failed.map((report) => {
      const detail = report.violations
        .slice(0, 5)
        .map((violation) => `${violation.kind}: ${violation.entry}`)
        .join("; ");
      const suffix = report.violations.length > 5 ? "; …" : "";
      return `  - ${report.artifactPath} (${report.violations.length} violation(s)): ${detail}${suffix}`;
    });
    throw new Error(
      `Linux payload artifacts are not electrobun-extractor compatible ` +
        `(GNU longname/hardlink/unknown tar entries abort install & update with ` +
        `TarUnsupportedFileType):\n${lines.join("\n")}`,
    );
  }
  return reports;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: bun packages/desktop/scripts/verifyElectrobunPayloadCompat.ts <artifact...>");
    process.exit(2);
  }
  let failed = 0;
  for (const artifact of args) {
    try {
      const report = verifyArtifactPayloadCompat(artifact);
      if (report.ok) {
        console.log(`ok   ${artifact} (${report.entries} entries, ${report.payloadSource})`);
      } else {
        failed += 1;
        console.error(`FAIL ${artifact}: ${report.violations.length} violation(s)`);
        for (const violation of report.violations.slice(0, 10)) {
          console.error(`  ${violation.kind}: ${violation.entry}`);
        }
      }
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${artifact}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  process.exit(failed === 0 ? 0 : 1);
}
