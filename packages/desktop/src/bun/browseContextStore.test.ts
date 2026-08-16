import { describe, it, expect } from "bun:test";
import {
  resolveCapabilitiesByIntent,
  getCapability,
  buildVideoPlayurlScript,
  mergeBrowseContext,
} from "./browseContextStore";

describe("mergeBrowseContext — 两条 host-message 不互覆盖", () => {
  it("playurl 先到、context 后到：context 不抹掉 playurl", () => {
    const playurlCtx = mergeBrowseContext(null, {
      url: "https://www.bilibili.com/video/BV1W33J6oEVR/",
      title: "AI Agent",
      capability: "video-playurl",
      playurl: "https://upos-sz-mirror08c.bilivideo.com/audio.m4a",
      source: "bilibili",
    });
    const afterContext = mergeBrowseContext(playurlCtx, {
      url: "https://www.bilibili.com/video/BV1W33J6oEVR/",
      title: "AI Agent - 哔哩哔哩",
      capability: "url-tracker",
    });
    expect(afterContext.playurl).toBe(playurlCtx.playurl);
    expect(afterContext.source).toBe("bilibili");
    expect(afterContext.capability).toBe("url-tracker");
  });

  it("context 先到、playurl 后到：playurl 正常写入", () => {
    const base = mergeBrowseContext(null, {
      url: "https://www.douyin.com/video/123",
      title: "某视频",
      capability: "url-tracker",
    });
    const afterPlayurl = mergeBrowseContext(base, {
      capability: "video-playurl",
      playurl: "https://v3-dy.ixigua.com/video.mp4",
      source: "douyin",
    });
    expect(afterPlayurl.playurl).toBe("https://v3-dy.ixigua.com/video.mp4");
    expect(afterPlayurl.title).toBe("某视频");
    expect(afterPlayurl.url).toBe("https://www.douyin.com/video/123");
  });

  it("失败路径保留 playurlError 且不丢已有 playurl", () => {
    const base = mergeBrowseContext(null, {
      url: "https://x",
      title: "t",
      capability: "url-tracker",
    });
    const failed = mergeBrowseContext(base, {
      capability: "video-playurl",
      playurlError: "未找到播放地址",
    });
    expect(failed.playurlError).toBe("未找到播放地址");
    expect(failed.title).toBe("t");
  });
});

describe("video-playurl browse capability pack", () => {
  it("已注册且 onNavigate 返回注入脚本", () => {
    const pack = getCapability("video-playurl");
    expect(pack).toBeDefined();
    expect(pack?.alwaysOn).toBe(false);
    const js = pack?.onNavigate?.("https://www.bilibili.com/video/BV1W33J6oEVR/");
    expect(typeof js).toBe("string");
    expect(js!.length).toBeGreaterThan(100);
  });

  it("对话提到转写/字幕时按需挂载", () => {
    const ids = resolveCapabilitiesByIntent("帮我转写这个视频").map((p) => p.id);
    expect(ids).toContain("video-playurl");
    expect(resolveCapabilitiesByIntent("生成字幕").map((p) => p.id)).toContain(
      "video-playurl"
    );
    expect(resolveCapabilitiesByIntent("transcribe this video").map((p) => p.id)).toContain(
      "video-playurl"
    );
  });

  it("文章意图不误挂 video-playurl", () => {
    const ids = resolveCapabilitiesByIntent("总结这篇文章讲了什么").map((p) => p.id);
    expect(ids).toContain("text-extractor");
    expect(ids).not.toContain("video-playurl");
  });

  it("提取脚本按 Electrobun 契约用 sendToHost 回传（无返回值）", () => {
    const js = buildVideoPlayurlScript();
    expect(js).toContain("__electrobunSendToHost");
    expect(js).toContain("nolo-browser-playurl");
    // 不依赖 executeJavascript 的返回值（handoff 警告的 console.log+return 方案是错的）
    expect(js).not.toMatch(/console\.log/);
  });

  it("提取脚本覆盖 B 站与抖音候选路径，取不到时回传明确错误", () => {
    const js = buildVideoPlayurlScript();
    expect(js).toContain("__playinfo__"); // B 站播放器数据
    expect(js).toContain("__INITIAL_STATE__"); // B 站 SSR 兜底
    expect(js).toContain("_ROUTER_DATA"); // 抖音候选（未经真实环境验证）
    expect(js).toContain("querySelector(\"video\")"); // <video> 兜底
    expect(js).toContain("error:"); // 失败时回传错误而非静默
  });
});
