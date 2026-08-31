import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ClipboardImageError,
  getClipboardImageCommand,
  isRemoteSession,
  readClipboardImage,
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
      const { command } = getClipboardImageCommand({
        env: {},
        platform: "darwin",
        which: (bin) => (bin === "pngpaste" ? "/opt/homebrew/bin/pngpaste" : null),
      });
      expect(command).toEqual(["/opt/homebrew/bin/pngpaste", "-"]);
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
});
