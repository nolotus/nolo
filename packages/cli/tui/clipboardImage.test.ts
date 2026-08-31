import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLIPBOARD_SWEEP_MAX_AGE_MS,
  ClipboardImageError,
  decodeOsascriptPngHex,
  getClipboardImageCommand,
  isRemoteSession,
  OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE,
  readClipboardImage,
  sweepStaleClipboardFiles,
  type ClipboardImageDeps,
} from "./clipboardImage";

describe("clipboardImage", () => {
  describe("isRemoteSession", () => {
    test("returns true when SSH_CONNECTION is present", () => {
      expect(isRemoteSession({ SSH_CONNECTION: "1.2.3.4 5678 5.6.7.8 22" })).toBe(true);
    });

    test("returns true when SSH_TTY is present", () => {
      expect(isRemoteSession({ SSH_TTY: "/dev/pts/0" })).toBe(true);
    });

    test("returns true when SSH_CLIENT is present", () => {
      expect(isRemoteSession({ SSH_CLIENT: "1.2.3.4 5678 22" })).toBe(true);
    });

    test("returns false when no SSH environment variables are set", () => {
      expect(isRemoteSession({})).toBe(false);
    });
  });

  describe("remote session downgrade", () => {
    test("throws remote-session error when SSH_CONNECTION is present", () => {
      expect(() =>
        getClipboardImageCommand({
          env: { SSH_CONNECTION: "1.2.3.4 5678 5.6.7.8 22" },
          platform: "darwin",
          which: () => "/opt/homebrew/bin/pngpaste",
        }),
      ).toThrowError(/远程会话无法读取本地剪贴板，请拖入图片文件或直接输入图片路径/);
    });

    test("throws remote-session error when SSH_TTY is present", () => {
      expect(() =>
        getClipboardImageCommand({
          env: { SSH_TTY: "/dev/pts/1" },
          platform: "linux",
          which: () => "/usr/bin/xclip",
        }),
      ).toThrowError(/远程会话无法读取本地剪贴板，请拖入图片文件或直接输入图片路径/);
    });
  });

  describe("platform command selection", () => {
    test("macOS (darwin) selects pngpaste", () => {
      const { command, outputFormat } = getClipboardImageCommand({
        env: {},
        platform: "darwin",
        which: (bin) => (bin === "pngpaste" ? "/opt/homebrew/bin/pngpaste" : null),
      });
      expect(command).toEqual(["/opt/homebrew/bin/pngpaste", "-"]);
      // pngpaste 存在：stdout 即原始字节流。
      expect(outputFormat).toBe("raw");
    });

    test("macOS pngpaste missing falls back to system osascript (osascript-hex)", () => {
      // pngpaste 缺失不再直接失败：自动改走系统自带 osascript 读 «class PNGf»。
      const { command, outputFormat } = getClipboardImageCommand({
        env: {},
        platform: "darwin",
        which: (bin) => (bin === "osascript" ? "/usr/bin/osascript" : null),
      });
      expect(command[0]).toBe("/usr/bin/osascript");
      expect(command[1]).toBe("-e");
      expect(command[2]).toBe("the clipboard as «class PNGf»");
      expect(outputFormat).toBe("osascript-hex");
    });

    test("macOS binary missing gives actionable brew install hint", () => {
      try {
        getClipboardImageCommand({
          env: {},
          platform: "darwin",
          which: () => null,
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ClipboardImageError);
        const clipErr = err as ClipboardImageError;
        expect(clipErr.code).toBe("binary-missing");
        expect(clipErr.message).toContain("brew install pngpaste");
      }
    });

    test("Windows (win32) selects PowerShell Get-Clipboard command", () => {
      const { command } = getClipboardImageCommand({
        env: {},
        platform: "win32",
        which: (bin) => (bin === "powershell.exe" ? "C:\\Windows\\powershell.exe" : null),
      });
      expect(command[0]).toBe("C:\\Windows\\powershell.exe");
      expect(command.join(" ")).toContain("Get-Clipboard -Format Image");
    });

    test("Windows binary missing gives actionable error", () => {
      try {
        getClipboardImageCommand({
          env: {},
          platform: "win32",
          which: () => null,
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ClipboardImageError);
        expect((err as ClipboardImageError).code).toBe("binary-missing");
        expect((err as ClipboardImageError).message).toContain("PowerShell");
      }
    });

    test("Linux with WAYLAND_DISPLAY selects wl-paste --type image/png", () => {
      const { command } = getClipboardImageCommand({
        env: { WAYLAND_DISPLAY: "wayland-0" },
        platform: "linux",
        which: (bin) => (bin === "wl-paste" ? "/usr/bin/wl-paste" : null),
      });
      expect(command).toEqual(["/usr/bin/wl-paste", "--type", "image/png"]);
    });

    test("Linux with WAYLAND_DISPLAY missing wl-paste gives actionable hint", () => {
      try {
        getClipboardImageCommand({
          env: { WAYLAND_DISPLAY: "wayland-0" },
          platform: "linux",
          which: () => null,
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ClipboardImageError);
        const clipErr = err as ClipboardImageError;
        expect(clipErr.code).toBe("binary-missing");
        expect(clipErr.message).toContain("wl-clipboard");
      }
    });

    test("Linux with X11 selects xclip -selection clipboard -t image/png -o", () => {
      const { command } = getClipboardImageCommand({
        env: { DISPLAY: ":0" },
        platform: "linux",
        which: (bin) => (bin === "xclip" ? "/usr/bin/xclip" : null),
      });
      expect(command).toEqual([
        "/usr/bin/xclip",
        "-selection",
        "clipboard",
        "-t",
        "image/png",
        "-o",
      ]);
    });

    test("Linux with X11 missing xclip falls back to wl-paste if available", () => {
      const { command } = getClipboardImageCommand({
        env: {},
        platform: "linux",
        which: (bin) => (bin === "wl-paste" ? "/usr/bin/wl-paste" : null),
      });
      expect(command).toEqual(["/usr/bin/wl-paste", "--type", "image/png"]);
    });

    test("Linux without xclip or wl-paste gives actionable hint", () => {
      try {
        getClipboardImageCommand({
          env: {},
          platform: "linux",
          which: () => null,
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ClipboardImageError);
        const clipErr = err as ClipboardImageError;
        expect(clipErr.code).toBe("binary-missing");
        expect(clipErr.message).toContain("xclip");
      }
    });
  });

  describe("readClipboardImage content hash and file stability", () => {
    const testTempDir = join(tmpdir(), "nolo-clip-test-" + Math.random().toString(36).slice(2));

    const mockPngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);

    function createMockSpawn(bytes: Uint8Array, exitCode = 0, stderr = "") {
      return (() => {
        return {
          stdout: new Response(bytes as any).body,
          stderr: new Response(stderr).body,
          exited: Promise.resolve(exitCode),
        } as any;
      }) as typeof Bun.spawn;
    }

    test("same image bytes produce identical deterministic filename and path across calls", async () => {
      const deps: ClipboardImageDeps = {
        env: {},
        platform: "darwin",
        which: () => "/usr/local/bin/pngpaste",
        spawn: createMockSpawn(mockPngBytes),
        tempDir: testTempDir,
      };

      const result1 = await readClipboardImage(deps);
      const result2 = await readClipboardImage(deps);

      // Verify deterministic filename: clip-<sha256[0:12]>.png
      expect(result1.filename).toMatch(/^clip-[a-f0-9]{12}\.png$/);
      expect(result1.filename).toBe(result2.filename);
      expect(result1.sourcePath).toBe(result2.sourcePath);
      expect(result1.dataUrl).toBe(result2.dataUrl);
      expect(result1.sizeBytes).toBe(mockPngBytes.byteLength);
      expect(result1.mime).toBe("image/png");

      // Verify file is actually written to disk
      expect(existsSync(result1.sourcePath)).toBe(true);
      const savedBytes = readFileSync(result1.sourcePath);
      expect(new Uint8Array(savedBytes)).toEqual(mockPngBytes);

      // Clean up
      try {
        rmSync(testTempDir, { recursive: true, force: true });
      } catch {}
    });

    test("different bytes produce different hash filenames", async () => {
      const differentBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      const res1 = await readClipboardImage({
        env: {},
        platform: "darwin",
        which: () => "/usr/local/bin/pngpaste",
        spawn: createMockSpawn(mockPngBytes),
        tempDir: testTempDir,
      });

      const res2 = await readClipboardImage({
        env: {},
        platform: "darwin",
        which: () => "/usr/local/bin/pngpaste",
        spawn: createMockSpawn(differentBytes),
        tempDir: testTempDir,
      });

      expect(res1.filename).not.toBe(res2.filename);

      try {
        rmSync(testTempDir, { recursive: true, force: true });
      } catch {}
    });

    test("empty clipboard output throws empty-clipboard error", async () => {
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: () => "/usr/local/bin/pngpaste",
          spawn: createMockSpawn(new Uint8Array(0), 1, "No image found"),
          tempDir: testTempDir,
        }),
      ).rejects.toThrowError(/剪贴板中没有图像数据/);
    });

    test("read timeout kills the process and throws a readable error", async () => {
      const killed = { value: false };
      // 模拟剪贴板后端无响应：stdout/stderr 永不给数据、exited 永不 resolve。
      const spawnHanging = (() => ({
        stdout: new ReadableStream({ start() {} }),
        stderr: new ReadableStream({ start() {} }),
        exited: new Promise<number>(() => {}),
        kill: () => {
          killed.value = true;
        },
      })) as unknown as typeof Bun.spawn;

      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: () => "/usr/local/bin/pngpaste",
          spawn: spawnHanging,
          tempDir: testTempDir,
          timeoutMs: 50,
        }),
      ).rejects.toThrowError(/读取剪贴板超时，剪贴板后端可能无响应/);

      expect(killed.value).toBe(true);
    });

    test("oversized image throws too-large error", async () => {
      const largeBytes = new Uint8Array(200);
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: () => "/usr/local/bin/pngpaste",
          spawn: createMockSpawn(largeBytes),
          tempDir: testTempDir,
          maxBytes: 100,
        }),
      ).rejects.toThrowError(/剪贴板图像过大/);
    });
  });

  describe("osascript fallback (darwin without pngpaste)", () => {
    const mockPngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
    ]);
    const testTempDir = join(
      tmpdir(),
      "nolo-clip-osa-test-" + Math.random().toString(36).slice(2),
    );

    /** osascript 把剪贴板 PNG 编码为 `«data PNGf<hex>»` 文本输出。 */
    function osascriptSpawn(bytes: Uint8Array, exitCode = 0) {
      const hex = Buffer.from(bytes).toString("hex").toUpperCase();
      const text = `«data PNGf${hex}»\n`;
      return (() => ({
        stdout: new Response(Buffer.from(text, "utf8") as any).body,
        stderr: new Response("").body,
        exited: Promise.resolve(exitCode),
      })) as unknown as typeof Bun.spawn;
    }

    /** stdout 原样输出给定文本（模拟无 PNGf 标记 / 坏 hex 的 osascript 输出）。 */
    function rawTextSpawn(text: string, exitCode = 0, stderr = "") {
      return (() => ({
        stdout: new Response(Buffer.from(text, "utf8") as any).body,
        stderr: new Response(stderr).body,
        exited: Promise.resolve(exitCode),
      })) as unknown as typeof Bun.spawn;
    }

    const osaWhich = (bin: string) =>
      bin === "osascript" ? "/usr/bin/osascript" : null;

    test("decodeOsascriptPngHex decodes «data PNGf<hex>» output (upper/lower hex)", () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x00, 0xff]);
      const upper = decodeOsascriptPngHex(`«data PNGf${"895000FF"}»`);
      expect(upper.kind).toBe("bytes");
      expect(Array.from((upper as { bytes: Uint8Array }).bytes)).toEqual([
        0x89, 0x50, 0x00, 0xff,
      ]);
      const lower = decodeOsascriptPngHex("PNGf895000ff\n");
      expect(lower.kind).toBe("bytes");
      expect(Array.from((lower as { bytes: Uint8Array }).bytes)).toEqual([
        0x89, 0x50, 0x00, 0xff,
      ]);
    });

    test("decodeOsascriptPngHex: no marker / marker without hex → empty", () => {
      expect(decodeOsascriptPngHex("").kind).toBe("empty");
      expect(decodeOsascriptPngHex("execution error: Can't get the clipboard").kind).toBe(
        "empty",
      );
      expect(decodeOsascriptPngHex("«data PNGf»").kind).toBe("empty");
    });

    test("decodeOsascriptPngHex: odd-length hex → invalid", () => {
      expect(decodeOsascriptPngHex("PNGf89500").kind).toBe("invalid");
    });

    test("decodeOsascriptPngHex: non-hex chars after marker → invalid", () => {
      // 宽容匹配只取前导 hex run（89），尾部的 GH 是坏数据。
      expect(decodeOsascriptPngHex("«data PNGf89GH»").kind).toBe("invalid");
      expect(decodeOsascriptPngHex("PNGfZZZZ").kind).toBe("invalid");
    });

    test("readClipboardImage via osascript decodes hex and writes the same deterministic file", async () => {
      const image = await readClipboardImage({
        env: {},
        platform: "darwin",
        which: osaWhich,
        spawn: osascriptSpawn(mockPngBytes),
        tempDir: testTempDir,
      });
      // 与 raw 路径相同的字节 → 相同的确定性文件名（sha256[0:12]）。
      expect(image.filename).toMatch(/^clip-[a-f0-9]{12}\.png$/);
      expect(existsSync(image.sourcePath)).toBe(true);
      const saved = new Uint8Array(readFileSync(image.sourcePath));
      expect(saved).toEqual(mockPngBytes);
      try {
        rmSync(testTempDir, { recursive: true, force: true });
      } catch {}
    });

    test("readClipboardImage osascript empty/failed output → empty-clipboard with actionable hint", async () => {
      try {
        await readClipboardImage({
          env: {},
          platform: "darwin",
          which: osaWhich,
          // 剪贴板没有 PNG：osascript 非零码退出且 stdout 为空。
          spawn: osascriptSpawn(new Uint8Array(0), 1),
          tempDir: testTempDir,
        });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ClipboardImageError);
        const clipErr = err as ClipboardImageError;
        expect(clipErr.code).toBe("empty-clipboard");
        expect(clipErr.message).toBe(OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE);
        expect(clipErr.message).toContain("brew install pngpaste");
      }
      // exit 0 但输出里没有 PNGf → 同样 empty。
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: osaWhich,
          spawn: rawTextSpawn("no data here"),
          tempDir: testTempDir,
        }),
      ).rejects.toThrowError(OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE);
    });

    test("readClipboardImage osascript 失败时 stderr 附加到 empty 消息末尾", async () => {
      // 对齐 raw 分支：stderr 非空时以 ": <stderr>" 附加（osascript 剪贴板无
      // PNG 时会输出 execution error，吞掉会丢失诊断线索）。
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: osaWhich,
          spawn: rawTextSpawn("", 1, "execution error: Can't get the clipboard as «class PNGf». (-1700)"),
          tempDir: testTempDir,
        }),
      ).rejects.toThrowError(
        new RegExp(
          `${OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE.replace(/[.*+?${}()|[\]\\]/g, "\\$&")}: execution error: Can't get the clipboard`,
        ),
      );
      // stderr 为空时不附加尾巴（保持干净文案）。
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: osaWhich,
          spawn: rawTextSpawn("", 1),
          tempDir: testTempDir,
        }),
      ).rejects.toThrowError(
        new RegExp(`${OSASCRIPT_EMPTY_CLIPBOARD_MESSAGE.replace(/[.*+?${}()|[\]\\]/g, "\\$&")}$`),
      );
    });

    test("readClipboardImage osascript bad hex → read-failed", async () => {
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: osaWhich,
          spawn: rawTextSpawn("«data PNGfABC»"), // 奇数长度
          tempDir: testTempDir,
        }),
      ).rejects.toThrowError(/hex 编码损坏/);
      await expect(
        readClipboardImage({
          env: {},
          platform: "darwin",
          which: osaWhich,
          spawn: rawTextSpawn("«data PNGf89GH»"), // 非 hex 字符
          tempDir: testTempDir,
        }),
      ).rejects.toThrowError(/hex 编码损坏/);
      try {
        rmSync(testTempDir, { recursive: true, force: true });
      } catch {}
    });
  });

  describe("sweepStaleClipboardFiles (US-5.7)", () => {
    function makeSweepDir() {
      return mkdtempSync(join(tmpdir(), "nolo-sweep-test-"));
    }

    function addFile(
      dir: string,
      name: string,
      ageMs: number,
      now: number,
      content: string = "x",
    ) {
      const full = join(dir, name);
      writeFileSync(full, content);
      const stale = new Date(now - ageMs);
      utimesSync(full, stale, stale);
    }

    test("删除超龄 clip-* 文件，保留新文件与非匹配文件名", async () => {
      const dir = makeSweepDir();
      const now = 1_700_000_000_000;
      addFile(dir, "clip-abcdef123456.png", 25 * 60 * 60 * 1000, now); // 过期 → 删
      addFile(dir, "clip-abcdef123456.jpeg", 25 * 60 * 60 * 1000, now); // 过期 → 删
      addFile(dir, "clip-0123456789ab.gif", 25 * 60 * 60 * 1000, now); // 过期 → 删
      addFile(dir, "clip-abcdef123456.webp", 25 * 60 * 60 * 1000, now); // 过期 → 删
      addFile(dir, "clip-abcdef123456.jpg", 60 * 1000, now); // 新文件 → 留
      addFile(dir, "clip-123.png", 25 * 60 * 60 * 1000, now); // hash <8 位 → 留
      addFile(dir, "clip-GH123456.png", 25 * 60 * 60 * 1000, now); // 非 hex → 留
      addFile(dir, "other.png", 25 * 60 * 60 * 1000, now); // 非 clip-* → 留

      const removed = await sweepStaleClipboardFiles(dir, { now });
      expect(removed).toBe(4);
      expect(existsSync(join(dir, "clip-abcdef123456.png"))).toBe(false);
      expect(existsSync(join(dir, "clip-abcdef123456.jpeg"))).toBe(false);
      expect(existsSync(join(dir, "clip-0123456789ab.gif"))).toBe(false);
      expect(existsSync(join(dir, "clip-abcdef123456.webp"))).toBe(false);
      expect(existsSync(join(dir, "clip-abcdef123456.jpg"))).toBe(true);
      expect(existsSync(join(dir, "clip-123.png"))).toBe(true);
      expect(existsSync(join(dir, "clip-GH123456.png"))).toBe(true);
      expect(existsSync(join(dir, "other.png"))).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    test("默认 maxAgeMs 为 24h（导出常量），now 注入生效", async () => {
      expect(CLIPBOARD_SWEEP_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
      const dir = makeSweepDir();
      const now = 1_700_000_000_000;
      addFile(dir, "clip-abcdef123456.png", 23 * 60 * 60 * 1000, now);
      // 未到 24h：默认阈值下不删。
      expect(await sweepStaleClipboardFiles(dir, { now })).toBe(0);
      // 注入更小的阈值：立即过期。
      expect(
        await sweepStaleClipboardFiles(dir, { now, maxAgeMs: 60 * 1000 }),
      ).toBe(1);
      rmSync(dir, { recursive: true, force: true });
    });

    test("目录缺失返回 0 且不抛错", async () => {
      const missing = join(tmpdir(), "nolo-sweep-missing-" + Math.random().toString(36).slice(2));
      expect(await sweepStaleClipboardFiles(missing, { now: 0 })).toBe(0);
    });

    test("单个文件错误被吞掉（同名目录 unlink 失败不影响其余清扫）", async () => {
      const dir = makeSweepDir();
      const now = 1_700_000_000_000;
      addFile(dir, "clip-abcdef123456.png", 25 * 60 * 60 * 1000, now);
      // 用一个同名"目录"制造 unlink 失败（macOS/linux 上 unlink 目录报 EPERM/EISDIR）。
      const stubborn = join(dir, "clip-fedcba987654.png");
      (await import("node:fs")).mkdirSync(stubborn);
      const removed = await sweepStaleClipboardFiles(dir, { now });
      expect(removed).toBe(1); // 只删掉可删的那个；stubborn 失败被吞掉
      expect(existsSync(join(dir, "clip-abcdef123456.png"))).toBe(false);
      expect(existsSync(stubborn)).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
