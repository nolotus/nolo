import { describe, expect, test } from "bun:test";
import { randomFillSync } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  compressImage,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_SIZE_BYTES,
  TARGET_IMAGE_BYTES,
} from "./compressImage";
import {
  readImageAsDataUrl,
  summarizeAttachment,
  summarizeAttachments,
  type AttachedImage,
} from "./pasteImage";
import { readClipboardImage, type ClipboardImageDeps } from "./clipboardImage";

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "nolo-compress-test-"));
}

describe("compressImage", () => {
  test("未超阈值时原样返回，不进行重编码", async () => {
    // 500x400 PNG，大小远小于 5MB
    const smallPngBuf = await sharp({
      create: {
        width: 500,
        height: 400,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .png()
      .toBuffer();

    const result = await compressImage(smallPngBuf, "image/png");

    expect(result.compressed).toBe(false);
    expect(result.buffer).toBe(smallPngBuf);
    expect(result.originalBytes).toBe(smallPngBuf.byteLength);
    expect(result.compressedBytes).toBe(smallPngBuf.byteLength);
    expect(result.mime).toBe("image/png");
  });

  test("超过尺寸阈值（>1568px 宽）时等比缩放并保持宽高比", async () => {
    // 3000x1500 横屏图像，宽 > 1568
    const wideBuf = await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 3,
        background: { r: 255, g: 128, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await compressImage(wideBuf, "image/png");

    expect(result.compressed).toBe(true);
    expect(result.originalBytes).toBe(wideBuf.byteLength);
    expect(result.compressedBytes).toBe(result.buffer.byteLength);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1568);
    expect(meta.height).toBe(784);
    expect(meta.format).toBe("png");
  });

  test("超过尺寸阈值（>1568px 高）时竖屏等比缩放", async () => {
    // 1000x4000 竖屏图像，高 > 1568
    const tallBuf = await sharp({
      create: {
        width: 1000,
        height: 4000,
        channels: 3,
        background: { r: 0, g: 200, b: 100 },
      },
    })
      .png()
      .toBuffer();

    const result = await compressImage(tallBuf, "image/png");

    expect(result.compressed).toBe(true);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.height).toBe(1568);
    expect(meta.width).toBe(392);
  });

  function makeNoiseRaw(width: number, height: number): Uint8Array {
    // 必须用 CSPRNG 噪声：LCG 低位序列周期极短（256），deflate 会把周期性压掉，
    // 导致 PNG 体积不超标、JPEG 降级链不被触发
    const raw = new Uint8Array(width * height * 3);
    randomFillSync(raw);
    return raw;
  }

  test("未超尺寸但超过发送目标的噪点 PNG 转为 JPEG 并收敛体积（截图场景根治 413）", async () => {
    // 噪点不可无损压缩：PNG 重压后仍远超 1.5MB 发送目标 → 应白底 flatten 转 JPEG
    const width = 1000;
    const height = 1000;
    const noisyPng = await sharp(makeNoiseRaw(width, height), {
      raw: { width, height, channels: 3 },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(noisyPng.byteLength).toBeGreaterThan(TARGET_IMAGE_BYTES);
    expect(width).toBeLessThanOrEqual(MAX_IMAGE_DIMENSION);

    const result = await compressImage(noisyPng, "image/png");

    expect(result.compressed).toBe(true);
    expect(result.mime).toBe("image/jpeg");
    expect(result.compressedBytes).toBeLessThan(noisyPng.byteLength / 2);
    expect(result.compressedBytes).toBeLessThanOrEqual(TARGET_IMAGE_BYTES);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("jpeg");
  });

  test("小幅超发送目标的 JPEG 按硬触发线放行，不做无谓重编码", async () => {
    // JPEG/WebP 已是有损格式，1.5MB~5MB 区间重压收益有限，预检直接放行
    const width = 1500;
    const height = 1125;
    const noisyJpeg = await sharp(makeNoiseRaw(width, height), {
      raw: { width, height, channels: 3 },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    expect(noisyJpeg.byteLength).toBeGreaterThan(TARGET_IMAGE_BYTES);
    expect(noisyJpeg.byteLength).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);

    const result = await compressImage(noisyJpeg, "image/jpeg");

    expect(result.compressed).toBe(false);
    expect(result.buffer).toBe(noisyJpeg);
  });

  test("超过体积阈值（>5MB）但尺寸 <= 1568px 时进行压缩重编码", async () => {
    // 构造一个体积 > 5MB 的未压缩 PNG
    const uncompressedPng = await sharp({
      create: {
        width: 1500,
        height: 1500,
        channels: 4,
        background: { r: 120, g: 60, b: 240, alpha: 1 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(uncompressedPng.byteLength).toBeGreaterThan(MAX_IMAGE_SIZE_BYTES);

    const result = await compressImage(uncompressedPng, "image/png");

    expect(result.compressed).toBe(true);
    expect(result.originalBytes).toBe(uncompressedPng.byteLength);
    expect(result.compressedBytes).toBeLessThan(MAX_IMAGE_SIZE_BYTES);
    expect(result.compressedBytes).toBeLessThan(result.originalBytes);
  });

  test("JPEG 图像在超标时等比缩放并以 JPEG 格式重编码", async () => {
    const jpegBuf = await sharp({
      create: {
        width: 2500,
        height: 2000,
        channels: 3,
        background: { r: 80, g: 160, b: 240 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await compressImage(jpegBuf, "image/jpeg");

    expect(result.compressed).toBe(true);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(1568);
    expect(meta.format).toBe("jpeg");
  });

  test("GIF 动图跳过压缩（动图重编码会丢帧）", async () => {
    const gifDummy = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
    const result = await compressImage(gifDummy, "image/gif");

    expect(result.compressed).toBe(false);
    expect(result.buffer).toBe(gifDummy);
    expect(result.originalBytes).toBe(gifDummy.byteLength);
  });

  test("sharp 加载或执行异常时优雅降级为原图，不抛出异常", async () => {
    const testBuf = new Uint8Array([1, 2, 3, 4, 5]);

    const result = await compressImage(testBuf, "image/png", {
      sharpLoader: async () => {
        throw new Error("Simulated sharp load failure");
      },
    });

    expect(result.compressed).toBe(false);
    expect(result.buffer).toBe(testBuf);
    expect(result.originalBytes).toBe(5);
    expect(result.compressedBytes).toBe(5);
  });

  test("损坏的图片数据在 sharp 无法解析时降级为原图", async () => {
    const corruptBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff, 0xff, 0xff]);
    const result = await compressImage(corruptBuf, "image/png");

    expect(result.compressed).toBe(false);
    expect(result.buffer).toBe(corruptBuf);
  });

  test("sharp 加载成功但在后续处理抛错时，降级使用原图且不污染 cachedSharp", async () => {
    // 构造损坏的图片数据（导致 sharp 处理阶段抛错）
    const corruptBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00, 0xff, 0xff]);
    const badResult = await compressImage(corruptBuf, "image/png");
    expect(badResult.compressed).toBe(false);
    expect(badResult.buffer).toBe(corruptBuf);

    // 下次传入正常超限图片时，cachedSharp 仍正常工作完成压缩
    const validBuf = await sharp({
      create: {
        width: 3000,
        height: 1000,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const goodResult = await compressImage(validBuf, "image/png");
    expect(goodResult.compressed).toBe(true);
    const meta = await sharp(goodResult.buffer).metadata();
    expect(meta.width).toBe(1568);
  });

  test("图片在压缩后（或降级原图）仍超过 maxBytes 时，抛出 too-large", async () => {
    const dir = makeTempDir();
    try {
      const imgPath = join(dir, "large.png");
      const buf = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 100, g: 200, b: 50 },
        },
      })
        .png()
        .toBuffer();
      writeFileSync(imgPath, buf);

      // 设定极小的 maxBytes，确保即便压缩后仍超限
      expect(
        readImageAsDataUrl(imgPath, { maxBytes: 10 })
      ).rejects.toThrow("image too large");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("剪贴板图像在压缩后仍超过 maxBytes 时，抛出 too-large", async () => {
    const dir = makeTempDir();
    try {
      const pngBuf = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const deps: ClipboardImageDeps = {
        env: {},
        platform: "darwin",
        which: () => "/usr/local/bin/pngpaste",
        spawn: (() => ({
          stdout: new Response(pngBuf as any).body,
          stderr: new Response("").body,
          exited: Promise.resolve(0),
        })) as any,
        tempDir: dir,
        maxBytes: 10,
      };

      expect(readClipboardImage(deps)).rejects.toThrow("剪贴板图像过大");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readImageAsDataUrl 让原本超过 8MB 的大图经压缩后成功附加", async () => {
    const dir = makeTempDir();
    try {
      // 3000x3000 且 compressionLevel: 0，体积约为 36 MB（远超 8MB 上限）
      const hugePng = await sharp({
        create: {
          width: 3000,
          height: 3000,
          channels: 4,
          background: { r: 200, g: 100, b: 50, alpha: 1 },
        },
      })
        .png({ compressionLevel: 0 })
        .toBuffer();

      expect(hugePng.byteLength).toBeGreaterThan(8 * 1024 * 1024);

      const filePath = join(dir, "huge.png");
      writeFileSync(filePath, hugePng);

      // readImageAsDataUrl 在压缩前 >8MB，但自动压缩后应成功附加
      const attached = await readImageAsDataUrl(filePath, { maxBytes: 8 * 1024 * 1024 });

      expect(attached.filename).toBe("huge.png");
      expect(attached.sizeBytes).toBeLessThan(8 * 1024 * 1024);
      expect(attached.originalSizeBytes).toBe(hugePng.byteLength);
      expect(attached.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readClipboardImage 让原本超过 8MB 的剪贴板图像经压缩后成功附加", async () => {
    const dir = makeTempDir();
    try {
      // 生成 > 8MB 的剪贴板图像流
      const hugePng = await sharp({
        create: {
          width: 2800,
          height: 2800,
          channels: 4,
          background: { r: 30, g: 90, b: 180, alpha: 1 },
        },
      })
        .png({ compressionLevel: 0 })
        .toBuffer();

      expect(hugePng.byteLength).toBeGreaterThan(8 * 1024 * 1024);

      const deps: ClipboardImageDeps = {
        env: {},
        platform: "darwin",
        which: () => "/usr/local/bin/pngpaste",
        spawn: (() => ({
          stdout: new Response(hugePng as any).body,
          stderr: new Response("").body,
          exited: Promise.resolve(0),
        })) as any,
        tempDir: dir,
        maxBytes: 8 * 1024 * 1024,
      };

      const result = await readClipboardImage(deps);

      expect(result.sizeBytes).toBeLessThan(8 * 1024 * 1024);
      expect(result.originalSizeBytes).toBe(hugePng.byteLength);
      expect(result.filename).toMatch(/^clip-[a-f0-9]{12}\.png$/);
      expect(existsSync(result.sourcePath)).toBe(true);

      // 验证落盘内容与返回 sizeBytes 一致
      const savedBytes = readFileSync(result.sourcePath);
      expect(savedBytes.byteLength).toBe(result.sizeBytes);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("附件卡片在图片被压缩时展示压缩前后尺寸变化", () => {
    const compressedImage: AttachedImage = {
      filename: "large-shot.png",
      sizeBytes: 780 * 1024,
      originalSizeBytes: 4.1 * 1024 * 1024,
      sourcePath: "/tmp/large-shot.png",
      dataUrl: "data:image/png;base64,mock",
      mime: "image/png",
    };

    const card = summarizeAttachment(compressedImage);
    expect(card).toContain("已压缩 4.1 MB → 780.0 KB");
    expect(card).toContain("Name: large-shot.png");

    const uncompressedImage: AttachedImage = {
      filename: "normal.png",
      sizeBytes: 500 * 1024,
      sourcePath: "/tmp/normal.png",
      dataUrl: "data:image/png;base64,mock",
      mime: "image/png",
    };

    const normalCard = summarizeAttachment(uncompressedImage);
    expect(normalCard).not.toContain("已压缩");
    expect(normalCard).toContain("Size: 500.0 KB");

    // 多图卡片
    const multiCard = summarizeAttachments([compressedImage, uncompressedImage]);
    expect(multiCard).toContain("已压缩 4.1 MB → 780.0 KB");
    expect(multiCard).toContain("500.0 KB");
  });
});
