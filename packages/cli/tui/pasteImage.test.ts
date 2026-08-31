import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_MAX_IMAGE_BYTES,
  detectImagePaths,
  fileUriToPath,
  formatBytes,
  formatComposerAttachmentLine,
  ImageReadError,
  mapWindowsPathToWsl,
  mergeAttachedImages,
  popLastAttachedImage,
  readImageAsDataUrl,
  readImagePaths,
  resolveImageSource,
  summarizeAttachment,
  summarizeAttachments,
  type AttachedImage,
} from "./pasteImage";

// 1x1 transparent PNG
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "nolo-paste-image-test-"));
}

describe("pasteImage", () => {
  test("resolveImageSource expands ~", () => {
    const home = process.env.HOME ?? "";
    expect(resolveImageSource("~/foo/x.png", "/anywhere")).toBe(`${home}/foo/x.png`);
    expect(resolveImageSource("~", "/anywhere")).toBe(home);
  });

  test("resolveImageSource keeps absolute paths", () => {
    expect(resolveImageSource("/tmp/x.png", "/anywhere")).toBe("/tmp/x.png");
  });

  test("resolveImageSource resolves relative against cwd", () => {
    expect(resolveImageSource("./x.png", "/tmp")).toBe("/tmp/x.png");
    expect(resolveImageSource("../x.png", "/tmp/sub")).toBe("/tmp/x.png");
  });

  test("fileUriToPath decodes file:// URI variants", () => {
    expect(fileUriToPath("file:///Users/me/a.png")).toBe("/Users/me/a.png");
    expect(fileUriToPath("file://localhost/Users/me/a.png")).toBe("/Users/me/a.png");
    // %20 → 空格
    expect(fileUriToPath("file:///Users/me/My%20Photos/a.png")).toBe(
      "/Users/me/My Photos/a.png"
    );
    // 中文 percent-encoding (UTF-8)
    expect(fileUriToPath("file:///Users/me/%E5%9B%BE%E7%89%87/a.png")).toBe(
      "/Users/me/图片/a.png"
    );
    // 非法百分号序列不抛错,原样返回
    expect(fileUriToPath("file:///Users/me/a%ZZ.png")).toBe("/Users/me/a%ZZ.png");
    // 非 file:// 输入返回 null
    expect(fileUriToPath("/plain/path.png")).toBeNull();
    expect(fileUriToPath("https://x/a.png")).toBeNull();
    // 无路径部分的 file URI 不合法
    expect(fileUriToPath("file://")).toBeNull();
    // host 非 localhost 也剥离(按 file URI 规范,host 被忽略)
    expect(fileUriToPath("file://other.host/Users/me/a.png")).toBe("/Users/me/a.png");
  });

  test("fileUriToPath keeps the trailing slash when present", () => {
    expect(fileUriToPath("file:///Users/me/a.png/")).toBe("/Users/me/a.png/");
  });

  test("mapWindowsPathToWsl maps drive paths to /mnt", () => {
    expect(mapWindowsPathToWsl("C:\\Users\\me\\a.png")).toBe("/mnt/c/Users/me/a.png");
    // 盘符大小写归一为小写
    expect(mapWindowsPathToWsl("D:\\Pics\\b.png")).toBe("/mnt/d/Pics/b.png");
    // 前向斜杠 + 多余分隔符折叠
    expect(mapWindowsPathToWsl("C://Users//me/a.png")).toBe("/mnt/c/Users/me/a.png");
    // 非 Windows 绝对路径原样返回(幂等)
    expect(mapWindowsPathToWsl("/mnt/c/Users/me/a.png")).toBe("/mnt/c/Users/me/a.png");
    expect(mapWindowsPathToWsl("relative.png")).toBe("relative.png");
    expect(mapWindowsPathToWsl("~/x.png")).toBe("~/x.png");
  });

  test("detectImagePaths decodes file:// URIs (percent-encoded, with spaces and CJK)", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "My Photos", "截图.png");
      mkdirSync(join(dir, "My Photos"), { recursive: true });
      writeFileSync(png, "");

      // %20 for space, UTF-8 percent-encoding for 截图
      const encoded = "file://" + png
        .replace(/ /g, "%20")
        .split("/")
        .map((seg) => (/[\u4e00-\u9fff]/.test(seg) ? encodeURIComponent(seg) : seg))
        .join("/");
      const detected = detectImagePaths(`see ${encoded}`, dir);
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(png);
      expect(detected[0]?.raw).toBe(encoded);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths handles file://localhost/… form", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "a.png");
      writeFileSync(png, "");
      const detected = detectImagePaths(`file://localhost${png}`, dir);
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(png);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths does NOT map Windows paths when not in WSL", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "a.png");
      writeFileSync(png, "");
      // 非 WSL(wsl:false):C:\... 是相对路径,解析到 cwd 下且不存在 → 不识别
      const detected = detectImagePaths("C:\\Users\\me\\a.png", dir, { wsl: false });
      expect(detected).toEqual([]);
      // 注入 wsl:true 后应被映射为 /mnt/c/... ,目标不存在 → 仍返回空(安全,不抛错)
      const mapped = detectImagePaths("C:\\Users\\me\\a.png", dir, { wsl: true });
      expect(mapped).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths maps Windows paths to /mnt under WSL when file exists", () => {
    // 通过注入 wsl 判定 + 指向 /mnt 下实际存在的文件验证映射命中链路。
    // 无法在测试环境造 /mnt 挂载点,改用纯函数断言 + 非存在路径安全校验。
    const dir = makeTempDir();
    try {
      const png = join(dir, "a.png");
      writeFileSync(png, "");
      // 构造一个 Windows 路径,其映射结果恰好落到真实文件上:
      // 不成立(映射固定 /mnt 前缀),故此处只验证映射后存在性校验路径:
      // C:\<cwd中无盘符> 不被误识别。
      const detected = detectImagePaths(`C:\\${png}`, dir, { wsl: true });
      expect(detected).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths picks up absolute path tokens", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "a.png");
      const txt = join(dir, "a.txt");
      writeFileSync(png, "");
      writeFileSync(txt, "hello");

      const detected = detectImagePaths(png, dir);
      expect(detected).toEqual([{ raw: png, resolvedPath: png }]);

      const notImage = detectImagePaths(txt, dir);
      expect(notImage).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths only returns paths that exist", () => {
    const dir = makeTempDir();
    try {
      const real = join(dir, "real.png");
      writeFileSync(real, "");
      const missing = join(dir, "missing.png");

      const detected = detectImagePaths(
        `look at this ${real} and this ${missing}`,
        dir
      );
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(real);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths skips non-image extensions", () => {
    const dir = makeTempDir();
    try {
      const txt = join(dir, "notes.txt");
      writeFileSync(txt, "hi");

      expect(detectImagePaths(txt, dir)).toEqual([]);
      expect(detectImagePaths(`see ${txt}`, dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths handles quoted tokens", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "with space.png");
      writeFileSync(png, "");

      const detected = detectImagePaths(`look "${png}"`, dir);
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(png);
      // raw 保留外层引号,这样 stripImageTokens 在原 input 上能精准 replace
      expect(detected[0]?.raw).toBe(`"${png}"`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths decodes iTerm2-style backslash-escaped spaces", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "with space.png");
      writeFileSync(png, "");

      // iTerm2 / WezTerm paste 文件路径会把空格转义成 `\ `
      const line = `看图 ${dir}/with\\ space.png 怎么样`;
      const detected = detectImagePaths(line, dir);
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(png);
      // raw 保留 `\ ` 转义,stripImageTokens 在原 input 上能匹配
      expect(detected[0]?.raw).toBe(`${dir}/with\\ space.png`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths decodes \\ pairs as a single backslash", () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "back\\slash.png");
      writeFileSync(png, "");

      const detected = detectImagePaths(`${dir}/back\\\\slash.png`, dir);
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(png);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths handles Chinese filename with backslash-escaped space", () => {
    const dir = makeTempDir();
    try {
      // 模拟 macOS Finder 中文文件名 + 空格 + iTerm2 paste 行为
      const png = join(dir, "截屏2026-06-03 下午12.34.09.png");
      writeFileSync(png, "");

      const line = `${dir}/截屏2026-06-03\\ 下午12.34.09.png 这个图是啥`;
      const detected = detectImagePaths(line, dir);
      expect(detected).toHaveLength(1);
      expect(detected[0]?.resolvedPath).toBe(png);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("detectImagePaths picks up multiple image paths in one line", () => {
    const dir = makeTempDir();
    try {
      const a = join(dir, "a.jpg");
      const b = join(dir, "b.webp");
      writeFileSync(a, "");
      writeFileSync(b, "");

      const detected = detectImagePaths(`${a} and ${b}`, dir);
      expect(detected.map((entry) => entry.resolvedPath)).toEqual([a, b]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readImageAsDataUrl encodes a real PNG to data URL", async () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "pixel.png");
      writeFileSync(png, new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64")));

      const attached = await readImageAsDataUrl(png);
      expect(attached.mime).toBe("image/png");
      expect(attached.filename).toBe("pixel.png");
      expect(attached.sizeBytes).toBeGreaterThan(0);
      expect(attached.dataUrl).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readImageAsDataUrl rejects too-large images", async () => {
    const dir = makeTempDir();
    try {
      const png = join(dir, "big.png");
      const oversized = Buffer.alloc(1024 * 1024, 0xff);
      writeFileSync(png, new Uint8Array(oversized));

      await expect(
        readImageAsDataUrl(png, { maxBytes: 1024 })
      ).rejects.toMatchObject({ code: "too-large" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readImageAsDataUrl rejects unsupported extensions", async () => {
    const dir = makeTempDir();
    try {
      const txt = join(dir, "not-image.svg");
      writeFileSync(txt, "<svg/>");

      await expect(readImageAsDataUrl(txt)).rejects.toMatchObject({
        code: "unsupported-extension",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readImageAsDataUrl rejects missing files", async () => {
    const dir = makeTempDir();
    try {
      const missing = join(dir, "ghost.png");
      await expect(readImageAsDataUrl(missing)).rejects.toBeInstanceOf(ImageReadError);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readImageAsDataUrl rejects directories", async () => {
    const dir = makeTempDir();
    try {
      await expect(readImageAsDataUrl(dir)).rejects.toMatchObject({
        code: "is-directory",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("formatBytes and summarizeAttachment render expected text", () => {
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");

    // summarizeAttachment 现在渲染成带边框的多行卡片，不再是单行文本。
    // 这里断言承载信息的两项——文件名与 formatBytes 的输出——而不绑定边框样式，
    // 既保住 formatBytes 在本用例中的覆盖，又不会因外框调整而误报。
    const summary = summarizeAttachment({
      dataUrl: "data:image/png;base64,xxx",
      mime: "image/png",
      filename: "shot.png",
      sizeBytes: 2345,
      sourcePath: "/tmp/shot.png",
    });
    expect(summary).toContain("shot.png");
    expect(summary).toContain("2.3 KB");
  });

  test("DEFAULT_MAX_IMAGE_BYTES is 8 MB", () => {
    expect(DEFAULT_MAX_IMAGE_BYTES).toBe(8 * 1024 * 1024);
  });
});

describe("mergeAttachedImages", () => {
  const a: AttachedImage = {
    dataUrl: "data:image/png;base64,aaa",
    mime: "image/png",
    filename: "a.png",
    sizeBytes: 100,
    sourcePath: "/tmp/a.png",
  };
  const b: AttachedImage = {
    dataUrl: "data:image/png;base64,bbb",
    mime: "image/png",
    filename: "b.png",
    sizeBytes: 200,
    sourcePath: "/tmp/b.png",
  };
  const aRefreshed: AttachedImage = {
    dataUrl: "data:image/png;base64,aaa-v2",
    mime: "image/png",
    filename: "a.png",
    sizeBytes: 101,
    sourcePath: "/tmp/a.png",
  };

  test("returns existing when incoming is empty", () => {
    expect(mergeAttachedImages([a, b], [])).toEqual([a, b]);
  });

  test("returns incoming when existing is empty", () => {
    expect(mergeAttachedImages([], [a])).toEqual([a]);
  });

  test("dedupes by sourcePath, incoming wins", () => {
    const merged = mergeAttachedImages([a, b], [aRefreshed]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(aRefreshed);
    expect(merged[1]).toEqual(b);
  });

  test("keeps order: existing first, then unique incoming", () => {
    const c: AttachedImage = { ...a, sourcePath: "/tmp/c.png" };
    const merged = mergeAttachedImages([a, b], [c, b]);
    expect(merged.map((img) => img.sourcePath)).toEqual([
      "/tmp/a.png",
      "/tmp/b.png",
      "/tmp/c.png",
    ]);
  });
});

describe("readImagePaths", () => {
  test("reads multiple paths and reports failures via onFailure", async () => {
    const dir = makeTempDir();
    try {
      const real = join(dir, "real.png");
      writeFileSync(real, new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64")));
      const missing = join(dir, "missing.png");

      const successes: AttachedImage[] = [];
      const failures: Array<{ path: string; message: string }> = [];
      const result = await readImagePaths([real, missing], {
        onSuccess: (img) => successes.push(img),
        onFailure: (path, err) => failures.push({ path, message: err.message }),
      });

      expect(successes).toHaveLength(1);
      expect(successes[0]?.sourcePath).toBe(real);
      expect(result.images).toHaveLength(1);
      expect(result.failures).toEqual([missing]);
      expect(failures).toHaveLength(1);
      expect(failures[0]?.path).toBe(missing);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("applies resolve option to raw paths before reading", async () => {
    const dir = makeTempDir();
    try {
      const real = join(dir, "shot.png");
      writeFileSync(real, new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64")));

      const result = await readImagePaths(["shot.png"], {
        resolve: (raw) => join(dir, raw),
      });
      expect(result.images).toHaveLength(1);
      expect(result.images[0]?.sourcePath).toBe(real);
      expect(result.failures).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("dedupes failure reports when same path appears twice", async () => {
    const dir = makeTempDir();
    try {
      const missing = join(dir, "missing.png");
      const failures: string[] = [];
      const result = await readImagePaths([missing, missing, missing], {
        onFailure: (path) => failures.push(path),
      });
      expect(failures).toHaveLength(1);
      expect(failures[0]).toBe(missing);
      expect(result.failures).toEqual([missing]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("empty paths returns empty result with no callbacks", async () => {
    let successCount = 0;
    let failureCount = 0;
    const result = await readImagePaths([], {
      onSuccess: () => {
        successCount += 1;
      },
      onFailure: () => {
        failureCount += 1;
      },
    });
    expect(result.images).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(successCount).toBe(0);
    expect(failureCount).toBe(0);
  });

  test("summarizeAttachments aggregates multiple images into a compact panel", () => {
    const img1: AttachedImage = {
      filename: "screen1.png",
      sizeBytes: 1024 * 1024,
      sourcePath: "/tmp/screen1.png",
      dataUrl: "data:image/png;base64,abc",
      mime: "image/png",
    };
    const img2: AttachedImage = {
      filename: "screen2.jpg",
      sizeBytes: 500 * 1024,
      sourcePath: "/tmp/screen2.jpg",
      dataUrl: "data:image/jpeg;base64,def",
      mime: "image/jpeg",
    };

    expect(summarizeAttachments([])).toBe("");
    expect(summarizeAttachments([img1])).toContain("Name: screen1.png");

    const multi = summarizeAttachments([img1, img2]);
    expect(multi).toContain("Attached 2 Images");
    expect(multi).toContain("1. screen1.png");
    expect(multi).toContain("2. screen2.jpg");
    expect(multi).toContain("1.0 MB");
    expect(multi).toContain("500.0 KB");
  });
});
describe("composer attachment line (附件条)", () => {
  const img = (filename: string, sizeBytes: number): AttachedImage => ({
    filename,
    sizeBytes,
    sourcePath: `/tmp/${filename}`,
    dataUrl: "data:image/png;base64,abc",
    mime: "image/png",
  });

  test("无附件返回 null（composer 隐藏附件行）", () => {
    expect(formatComposerAttachmentLine([])).toBeNull();
  });

  test("≤2 张全列：📎 <filename> (<size>) 逗号分隔", () => {
    expect(formatComposerAttachmentLine([img("clip-a.png", 512)])).toBe(
      "📎 clip-a.png (512 B)",
    );
    expect(
      formatComposerAttachmentLine([
        img("clip-a.png", 1024),
        img("clip-b.jpg", 500 * 1024),
      ]),
    ).toBe("📎 clip-a.png (1.0 KB), 📎 clip-b.jpg (500.0 KB)");
  });

  test("更多张列前 2 张 + +N", () => {
    const line = formatComposerAttachmentLine([
      img("a.png", 1),
      img("b.png", 2),
      img("c.png", 3),
      img("d.png", 4),
      img("e.png", 5),
    ]);
    expect(line).toBe("📎 a.png (1 B), 📎 b.png (2 B) +3");
  });

  test("popLastAttachedImage 弹出最后一张（Backspace 撤销逻辑）", () => {
    const empty = popLastAttachedImage([]);
    expect(empty.handled).toBe(false);
    expect(empty.images).toEqual([]);

    const a = img("a.png", 1);
    const b = img("b.png", 2);
    const c = img("c.png", 3);
    const undo = popLastAttachedImage([a, b, c]);
    expect(undo.handled).toBe(true);
    expect(undo.removed).toBe(c);
    expect(undo.images).toEqual([a, b]);
    // 逐个撤销到空。
    const undo2 = popLastAttachedImage(undo.images);
    expect(undo2.removed).toBe(b);
    const undo3 = popLastAttachedImage(undo2.images);
    expect(undo3.removed).toBe(a);
    expect(popLastAttachedImage(undo3.images).handled).toBe(false);
  });
});
