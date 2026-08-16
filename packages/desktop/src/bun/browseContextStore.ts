// packages/desktop/src/bun/browseContextStore.ts
//
// 浏览器窗口的"当前浏览上下文"存储 + 能力包注册表。
//
// 架构：
// - 通道固定：浏览器窗口 → did-navigate/executeJavascript → 主进程本 store → API → 对话附带
// - 能力包决定"往通道里放什么内容"，不绑定具体网页
// - url-tracker 默认挂；text-extractor 等按对话意图动态挂载
//
// Electrobun 约束：
// - sandbox 窗口 executeJavascript 无返回值，必须靠 host-message 单向回传
// - did-navigate 事件原生提供 URL，不需要注入 JS

export type BrowseContext = {
  url: string;
  title: string;
  textSnippet?: string;
  capturedAt: number;
  capability: string;
  /** 视频播放地址（video-playurl 能力包提取，无需鉴权的 CDN 直链） */
  playurl?: string;
  /** 视频标题（优先于页面 title） */
  videoTitle?: string;
  /** 播放地址来源平台 */
  source?: string;
  /** 提取失败时的错误消息 */
  playurlError?: string;
};

export type BrowseCapabilityPack = {
  id: string;
  /** 默认挂载则返回 true；按需能力返回 false */
  alwaysOn: boolean;
  /** 页面导航时触发；sandbox 窗口注入的 JS 必须自行 sendToHost 回传 */
  onNavigate?: (url: string) => string | null;
  /** 对话发送前按需调用；返回要附带的上下文片段 */
  resolve?: (current: BrowseContext | null) => BrowseContext | null;
};

const store = new Map<string, BrowseContext>();
const capabilities = new Map<string, BrowseCapabilityPack>();

export function registerBrowseCapability(pack: BrowseCapabilityPack): void {
  capabilities.set(pack.id, pack);
}

export function getAlwaysOnCapabilities(): BrowseCapabilityPack[] {
  return [...capabilities.values()].filter((pack) => pack.alwaysOn);
}

export function getCapability(id: string): BrowseCapabilityPack | undefined {
  return capabilities.get(id);
}

/** 按对话意图关键词选择要挂载的按需能力包 */
export function resolveCapabilitiesByIntent(message: string): BrowseCapabilityPack[] {
  const intent = message.toLowerCase();
  const matched: BrowseCapabilityPack[] = [];
  if (/文章|内容|讲的什么|总结|正文|read|article|summary/.test(intent)) {
    const pack = getCapability("text-extractor");
    if (pack) matched.push(pack);
  }
  if (/视频|作者|video|author/.test(intent)) {
    const pack = getCapability("video-meta");
    if (pack) matched.push(pack);
  }
  if (/转写|字幕|转录|transcrib|subtitle/.test(intent)) {
    const pack = getCapability("video-playurl");
    if (pack) matched.push(pack);
  }
  return matched;
}

export function setBrowseContext(previewId: string, context: BrowseContext): void {
  store.set(previewId, context);
}

export function getBrowseContext(previewId: string): BrowseContext | null {
  return store.get(previewId) ?? null;
}

export function clearBrowseContext(previewId: string): void {
  store.delete(previewId);
}

/**
 * 合并浏览上下文：保留已有字段（如 playurl），只覆盖 patch 提供的字段。
 * 防止两条 host-message（url-tracker 的 context / video-playurl）先后到达时
 * 互相整表覆盖、丢掉对方刚写入的字段（reviewer P1：playurl 提取「成功」却常读不到）。
 */
export function mergeBrowseContext(
  existing: BrowseContext | null,
  patch: Partial<BrowseContext>
): BrowseContext {
  return {
    ...(existing || {}),
    ...patch,
    capturedAt: Date.now(),
  } as BrowseContext;
}

// --- 默认能力包：url-tracker（始终挂载，靠 did-navigate 事件）---
registerBrowseCapability({
  id: "url-tracker",
  alwaysOn: true,
  onNavigate: (url) => url,
  resolve: (current) => current,
});

// --- 按需能力包：text-extractor（对话提到"文章/内容"时挂载）---
// 注入的 JS 在 sandbox 窗口内运行，靠 __electrobunSendToHost 回传正文摘要。
registerBrowseCapability({
  id: "text-extractor",
  alwaysOn: false,
  onNavigate: null,
  resolve: (current) => current,
});

// ============================================================================
// video-playurl 能力包：在已登录的 B 站 / 抖音视频页提取播放地址（playurl）+ 标题。
//
// 通道：did-navigate → onNavigate 返回注入 JS → sandbox 窗口执行 →
//       __electrobunSendToHost({ type: "nolo-browser-playurl", ... }) →
//       host-message → setBrowseContext（见 index.ts wiring）。
//
// Electrobun 约束：executeJavascript 无返回值，必须靠 sendToHost 单向回传。
// （handoff 警告：console.log + return 的 spike 脚本在该环境下无效，不要用。）
//
// 已验证 / 未验证状态：
// - B 站：公开视频无需登录，window.__playinfo__ 含 dash 音视频流 —— 逻辑按页面
//   真实结构实现，可先跑通。
// - 抖音：需要真实桌面端 + 登录态，本轮无法验证。候选路径：
//   window._ROUTER_DATA / SSR JSON / 渲染后 <video> 的 src。此处按候选路径
//   实现探测，标注「未经真实环境验证」；提取不到时回传明确错误，不静默。
// - 退路（三条路线都取不到时）：webview 内同源 fetch 详情接口（cookie 自动
//   携带、仍不外传），但需处理 a_bogus 签名，复杂度高，暂不实现。
//
// 安全约束：cookie 不出 webview、不落盘、不进日志；只回传播放地址与标题。
// ============================================================================

/** 注入到 sandbox 窗口的 playurl 提取脚本（onNavigate 契约：返回 JS 字符串） */
export function buildVideoPlayurlScript(): string {
  return `(() => {
  try {
    const send = (payload) => globalThis.__electrobunSendToHost?.({
      type: "nolo-browser-playurl",
      url: location.href,
      ...payload,
    });
    let playurl = null;
    let title = null;
    let source = null;

    const pickBest = (list) =>
      list.slice().sort((a, b) => (b.bandwidth || 0) - (a.bandwidth || 0))[0];

    // 1) Bilibili: window.__playinfo__（播放器注入的 dash 音视频流）
    const pi = globalThis.__playinfo__;
    if (pi && pi.data) {
      const dash = pi.data.dash;
      const audio =
        (dash && dash.audio) || (pi.data.dolby && pi.data.dolby.audio) || [];
      if (audio && audio.length) {
        const best = pickBest(audio);
        playurl = best && (best.baseUrl || best.base_url);
        source = "bilibili";
      }
      if (!playurl && dash && dash.video && dash.video.length) {
        const best = pickBest(dash.video);
        playurl = best && (best.baseUrl || best.base_url);
        source = "bilibili";
      }
      if (!playurl && pi.data.durl && pi.data.durl.length) {
        playurl = pi.data.durl[0].url;
        source = "bilibili";
      }
    }

    // 2) Bilibili fallback: __INITIAL_STATE__.videoData（标题 + 部分场景的 dash）
    if (globalThis.__INITIAL_STATE__) {
      const vd = globalThis.__INITIAL_STATE__.videoData;
      if (vd) {
        title = vd.title || title;
        if (!playurl && vd.dash && vd.dash.audio && vd.dash.audio.length) {
          const best = pickBest(vd.dash.audio);
          playurl = best && (best.baseUrl || best.base_url);
          source = "bilibili";
        }
      }
    }

    // 3) Douyin（未经真实环境验证）: _ROUTER_DATA 里正则找 mp4/m3u8 直链
    if (!playurl && globalThis._ROUTER_DATA) {
      try {
        const s = JSON.stringify(globalThis._ROUTER_DATA);
        const m = s.match(/https?:\\\\?\\/\\\\?\\/[^"\\\\ ]+?\\.(mp4|m3u8)[^"\\\\ ]*/i);
        if (m) {
          playurl = m[0].replace(/\\\\\\//g, "/");
          source = "douyin";
        }
      } catch (e) {}
    }

    // 4) 兜底: 已渲染 <video> 元素的 src
    if (!playurl) {
      const v = document.querySelector("video");
      const src = v && (v.currentSrc || v.src);
      if (src && /^https?:/i.test(src)) {
        playurl = src;
        source = source || "video-element";
      }
    }

    if (!playurl) {
      send({ playurl: null, error: "未找到播放地址（__playinfo__/_ROUTER_DATA/<video> 均失败）" });
      return;
    }
    send({ playurl, title: title || document.title, source });
  } catch (e) {
    globalThis.__electrobunSendToHost?.({
      type: "nolo-browser-playurl",
      url: location.href,
      playurl: null,
      error: String(e),
    });
  }
})();`;
}

// 注册 video-playurl 能力包：对话提到「转写/字幕」时由 index.ts 按需注入
registerBrowseCapability({
  id: "video-playurl",
  alwaysOn: false,
  // 页面导航时返回要注入的提取 JS；非视频意图由 index.ts 决定是否注入
  onNavigate: () => buildVideoPlayurlScript(),
  resolve: (current) => current,
});