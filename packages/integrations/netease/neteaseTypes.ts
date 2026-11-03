/**
 * 网易云音乐客户端契约（Phase 0）。
 *
 * 这一层是**通道无关**的：上层（桌面端 handler、renderer 播放条、agent 工具）
 * 只依赖这里定义的类型与 `NeteaseClient` 接口，不关心底下用的是网易云 web 协议
 * 还是官方开放平台签名通道。将来加第二条通道时，只换实现，不动上层。
 *
 * 与本文件配套的硬约束
 * --------------------
 * 1. **凭据只在用户机器**：会话（cookie / token）由 `NeteaseSessionStore` 落到
 *    本机文件，权限 0600；不进日志、不进对话、不上传任何服务器。
 * 2. **不伪造状态**：`NeteasePlayUrl.url` 允许为 `null`，并给出 `reason`；
 *    上层必须把它呈现为"不可播放"，不得显示成"正在播放"。
 * 3. **可注入**：`fetchImpl` / `now` / `timeoutMs` 全部可注入，单测不得打真网络。
 * 4. **错误归一**：对外只抛 `NeteaseError`，带机器可读 `code`；不得把底层
 *    异常原文直接透给 UI。
 */

/** 会话（用户已登录的网易云账号）。 */
export type NeteaseSession = {
  /** 登录态 cookie 串（服务端下发的一整串）。敏感：不得进日志。 */
  cookie: string;
  /** 用户 id（若接口返回）。 */
  uid?: number;
  /** 昵称，用于 UI 显示"已连接：xxx"。 */
  nickname?: string;
  /** 头像 URL（可选）。 */
  avatarUrl?: string;
  /** 取得时间（毫秒时间戳），用于展示"连接于…"与过期判断。 */
  obtainedAt: number;
};

/** 会话存储（桌面端落到本机通道目录；测试用内存实现）。 */
export type NeteaseSessionStore = {
  read(): Promise<NeteaseSession | null>;
  write(session: NeteaseSession): Promise<void>;
  clear(): Promise<void>;
};

/** 歌手 / 专辑的最小结构。 */
export type NeteaseArtist = { id: number; name: string };
export type NeteaseAlbum = { id: number; name: string; coverUrl?: string };

/** 一首歌（搜索与歌单曲目共用）。 */
export type NeteaseSong = {
  id: number;
  name: string;
  artists: NeteaseArtist[];
  album: NeteaseAlbum;
  /** 时长（毫秒）。 */
  durationMs?: number;
  /** 是否有 MV（有则优先播 MV）。 */
  hasMv?: boolean;
};

/** 搜索结果。 */
export type NeteaseSearchResult = {
  songs: NeteaseSong[];
  total: number;
  offset: number;
  limit: number;
};

/** 播放地址不可用的原因。UI 必须据此如实呈现，不得谎称在播。 */
export type NeteaseNoSourceReason =
  | "no-source"
  | "vip-required"
  | "region-blocked"
  | "not-purchased"
  | "unknown";

/** 播放地址结果。`url` 为 null 表示**这首歌现在放不了**。 */
export type NeteasePlayUrl = {
  songId: number;
  url: string | null;
  /** 码率 kbps。 */
  bitrateKbps?: number;
  /** 文件大小（字节）。 */
  sizeBytes?: number;
  /** 音质档位（standard / higher / exhigh / lossless …）。 */
  quality?: string;
  /** 不可播放的原因（url 为 null 时必有）。 */
  reason?: NeteaseNoSourceReason;
  /** 人话说明（UI 可直接展示）。 */
  message?: string;
};

/** 歌词。 */
export type NeteaseLyric = {
  songId: number;
  /** 原文歌词（LRC）。 */
  lrc?: string;
  /** 翻译歌词。 */
  translated?: string;
  /** 是否逐行时间轴歌词。 */
  synced: boolean;
};

/** 扫码登录的状态机。 */
export type NeteaseQrLoginState =
  /** 等待扫码。 */
  | "waiting"
  /** 已扫码，等待用户在 App 里确认。 */
  | "scanned"
  /** 已确认，登录成功。 */
  | "confirmed"
  /** 二维码过期，需重新生成。 */
  | "expired"
  /** 其它失败（见 `message`）。 */
  | "failed";

/** 扫码登录票据。 */
export type NeteaseQrLogin = {
  /** 轮询用的 key。 */
  key: string;
  /** 二维码内容（URL），渲染后给用户扫码。 */
  qrUrl: string;
  /** 生成时间（毫秒）。 */
  createdAt: number;
  /** 过期时间（毫秒）。 */
  expiresAt: number;
};

/** 扫码登录轮询结果。 */
export type NeteaseQrLoginStatus = {
  state: NeteaseQrLoginState;
  /** 确认成功时带回会话。 */
  session?: NeteaseSession;
  /** 失败/异常的人话说明。 */
  message?: string;
};

/** 错误码。上层按码分支，不要解析文案。 */
export type NeteaseErrorCode =
  /** 未登录或会话已失效 → 引导重新扫码。 */
  | "not-authenticated"
  /** 会话过期 → 引导重新扫码。 */
  | "session-expired"
  /** 被限流 → 稍后重试，不要高频重试。 */
  | "rate-limited"
  /** 网易云要求人机验证 → 停下并把用户交给网易云 App。 */
  | "captcha-required"
  /** 响应结构不符合预期。 */
  | "bad-response"
  /** 网络失败 / 超时。 */
  | "network"
  /** 当前平台或通道不支持该操作。 */
  | "unsupported"
  /** 其它（`message` 带细节）。 */
  | "unknown";

/** 归一化错误。 */
export type NeteaseError = Error & {
  code: NeteaseErrorCode;
  /** 面向用户的一句话（不含敏感信息）。 */
  message: string;
  /** 底层原因（仅用于本地调试，不直接展示）。 */
  cause?: unknown;
};

/** 客户端构造参数。 */
export type NeteaseClientOptions = {
  /** 网络实现，测试注入假实现。 */
  fetchImpl?: typeof fetch;
  /** 接口根地址。 */
  baseUrl?: string;
  /** 请求超时（毫秒）。 */
  timeoutMs?: number;
  /** 当前时间（毫秒），测试可注入。 */
  now?: () => number;
  /** 已存在的会话（若有）。 */
  session?: NeteaseSession | null;
  /** 用户代理。 */
  userAgent?: string;
  /** 是否启用请求限流（默认启用）。 */
  rateLimit?: boolean;
};

/** 搜索参数。 */
export type NeteaseSearchQuery = {
  keyword: string;
  /** 每页条数，默认 20，上限 50。 */
  limit?: number;
  /** 偏移。 */
  offset?: number;
};

/** 播放地址请求。 */
export type NeteasePlayUrlQuery = {
  songId: number;
  /** 音质档位，默认 "standard"。 */
  quality?: string;
};

/** 客户端接口。上层只依赖这个。 */
export type NeteaseClient = {
  /** 生成扫码登录票据。 */
  createQrLogin(): Promise<NeteaseQrLogin>;
  /** 轮询扫码状态。 */
  pollQrLogin(key: string): Promise<NeteaseQrLoginStatus>;
  /** 当前会话（没有则 null）。 */
  getSession(): Promise<NeteaseSession | null>;
  /** 搜索歌曲。 */
  searchSongs(query: NeteaseSearchQuery): Promise<NeteaseSearchResult>;
  /** 取播放地址（可能返回 `url: null`）。 */
  getPlayUrl(query: NeteasePlayUrlQuery): Promise<NeteasePlayUrl>;
  /** 取歌词。 */
  getLyric(songId: number): Promise<NeteaseLyric>;
  /** 登出（清掉客户端持有的会话引用；落盘清理由 store 负责）。 */
  logout(): Promise<void>;
};
