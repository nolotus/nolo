/**
 * 应用「起不来」的唯一原因归类与文案真值（服务端失败页 + 前端详情页共用）。
 *
 * 为什么要共用：同一次失败会在两处被看到——
 * 1. 浏览器直接打开 `/apps/<id>`（含跨域 server / 自定义域名）：服务端返回的 HTML
 *    失败页（`server/handlers/appRuntimeFailurePage.ts` 渲染）；
 * 2. 站内详情页的同源预览：前端探针（`app/pages/share/appRuntimeProbe.ts`）判定后
 *    在预览块里显示的人话。
 * 两处若各写一套文案/判定，就会漂成两套真值（改一边忘另一边），所以归类与措辞
 * 都住在这里：web 与 server 都从 `core/appRuntimeFailure` 取。
 *
 * 分类规则：**原文优先、HTTP 状态兜底**。同一个 500 既可能是「产物不合法」也可能是
 * 「沙箱起不来」，只有原文能区分。
 */

export type AppRuntimeFailureReason =
  | "invalidArtifact"
  | "sandboxUnavailable"
  | "notFound"
  | "throttled"
  | "forbidden"
  | "misconfigured"
  | "unknown";

export interface AppRuntimeFailureCopy {
  /** 一句人话，给访客看；不回显整段 JSON / 堆栈。 */
  message: string;
  /** 是否值得点「重试」再试一次。 */
  retryable: boolean;
  reason: AppRuntimeFailureReason;
  /** 这个失败是不是「改代码能解决」——只有真能编辑的人才显示「修复代码（高级）」。 */
  fixable: boolean;
}

/** 从各种失败载体里掏出错误原文：字符串、`{error|detail|message|reason}`、JSON 字符串。 */
const readFailureText = (raw: unknown): string => {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  for (const key of ["detail", "error", "message", "reason"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

/**
 * 失败原文可读化：服务端把错误包在 JSON 里下发（`{"error":"沙箱启动失败: …"}`），
 * 浏览器直接打开 `/apps/<id>` 时整屏就是这段 JSON。这里把内层 `error` 剥出来，
 * 只留「技术详情」里给运维/自己看的那一层；超长截断，避免把整段 stderr 塞进 DOM。
 */
export const readAppRuntimeErrorText = (raw: unknown, limit = 4000): string => {
  const text = readFailureText(raw).trim();
  if (!text) return "";
  let resolved = text;
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      resolved = readFailureText(parsed).trim() || text;
    } catch {
      // 不是 JSON：原样保留
    }
  }
  return resolved.length > limit ? `${resolved.slice(0, limit)}…` : resolved;
};

/** 「产物不合法」的原文特征：沙箱约定是入口模块导出 default 的 fetch 处理函数。 */
const INVALID_ARTIFACT =
  /must export default|导出\s*default|没有导出|未导出|artifact is missing|产物缺失/i;

/**
 * 应用运行失败 → 原因归类 + 站内（详情页）文案。
 *
 * 服务端 `handleAppSandbox` 的失败原文（`沙箱启动失败: …`、`应用不存在或未部署`、
 * `用户应用入口暂时不可用`）是给运维看的，不能原样甩给访客。
 */
export const describeAppRuntimeFailure = (raw: unknown): AppRuntimeFailureCopy => {
  const text = readAppRuntimeErrorText(raw);
  const status =
    typeof (raw as any)?.status === "number" ? (raw as any).status : undefined;

  // 1) 代码/产物问题：重试没用，得改代码重新部署。
  if (INVALID_ARTIFACT.test(text)) {
    return {
      message:
        "这个应用当前无法启动：构建产物里没有可运行的入口（入口模块没有导出 default 的 fetch 处理函数）。代码改好后重新部署即可。",
      retryable: false,
      reason: "invalidArtifact",
      fixable: true,
    };
  }
  // 2) 运行环境问题：重试有意义；应用自己启动即崩时也确实要去改代码。
  if (text.includes("沙箱启动失败") || text.includes("沙箱不可用") || (!text && status === 500)) {
    return {
      message:
        "应用没能启动（沙箱启动失败）。可以重试一次；仍打不开说明部署环境暂时不可用。",
      retryable: true,
      reason: "sandboxUnavailable",
      fixable: true,
    };
  }
  if (text.includes("应用不存在") || (!text && status === 404)) {
    return {
      message: "这个应用还没有部署好或已被删除，暂时打不开。",
      retryable: false,
      reason: "notFound",
      fixable: false,
    };
  }
  if (text.includes("入口暂时不可用") || (!text && status === 503)) {
    return {
      message: "应用入口暂时不可用（服务端正在限流或维护），稍后再试。",
      retryable: true,
      reason: "throttled",
      fixable: false,
    };
  }
  // 部署配置类失败：服务端根本没配沙箱后端。这不是「稍后再试」能好的，
  // 冒充限流文案会让用户一直点重试（review W4）。
  if (text.includes("沙箱后端未配置") || text.includes("未被允许") || text.includes("misconfigured")) {
    return {
      message:
        "应用入口还没配置好（服务端缺少可用的沙箱后端），重试不会变好，需要管理员处理。",
      retryable: false,
      reason: "misconfigured",
      fixable: false,
    };
  }
  if (text.includes("仅限空间成员") || text.includes("无权限") || (!text && status === 403)) {
    return {
      message: "这个应用只对作者或空间成员开放，暂时看不到它的预览。",
      retryable: false,
      reason: "forbidden",
      fixable: false,
    };
  }
  return {
    message: "应用暂时打不开（加载失败）。可以点「重试」再来一次。",
    retryable: true,
    reason: "unknown",
    fixable: false,
  };
};

export interface AppRuntimeFailurePageCopy {
  /** 页面标题（h1）。 */
  heading: string;
  /** 页面正文：给人看的一句话 + 下一步。 */
  message: string;
  /** 是否给「重试」按钮（重新导航同一地址）。 */
  retry: boolean;
  /** 响应状态码：导航失败仍是失败语义，不改写成 200。 */
  status: number;
  reason: AppRuntimeFailureReason;
}

/**
 * 同一份归类 → 服务端独立失败页的措辞（浏览器直接打开应用时看到的那一页）。
 *
 * 与站内文案的差别只在「语境」：独立页面的读者可能是访客，所以产物问题会写明
 * 「作者需要修好代码重新部署」，不知道「修复代码（高级）」入口是什么。
 * 归类（reason / retry / status）与站内完全同源，不存在第二套判定。
 */
export const describeAppRuntimeFailurePage = (
  raw: unknown
): AppRuntimeFailurePageCopy => {
  const copy = describeAppRuntimeFailure(raw);
  switch (copy.reason) {
    case "invalidArtifact":
      return {
        heading: "应用没能启动",
        message:
          "这个应用的构建产物不完整：入口模块没有导出 default 的 fetch 处理函数。作者修好代码并重新部署后就能打开。",
        retry: false,
        status: 500,
        reason: copy.reason,
      };
    case "notFound":
      return {
        heading: "应用不存在或未部署",
        message: copy.message,
        retry: false,
        status: 404,
        reason: copy.reason,
      };
    case "throttled":
      return {
        heading: "应用入口暂时不可用",
        message: copy.message,
        retry: true,
        status: 503,
        reason: copy.reason,
      };
    case "misconfigured":
      return {
        heading: "应用入口还没配置好",
        message: copy.message,
        retry: false,
        status: 503,
        reason: copy.reason,
      };
    case "forbidden":
      return {
        heading: "无权访问这个应用",
        message: copy.message,
        retry: false,
        status: 403,
        reason: copy.reason,
      };
    case "sandboxUnavailable":
      return {
        heading: "应用没能启动",
        message: copy.message,
        retry: true,
        status: 500,
        reason: copy.reason,
      };
    default:
      return {
        heading: "应用暂时打不开",
        message: copy.message,
        retry: true,
        status: 500,
        reason: copy.reason,
      };
  }
};
