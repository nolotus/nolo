import React from "react";
import { useTranslation } from "react-i18next";
import { LuClock, LuDownload, LuGlobe, LuLaptop, LuMonitor, LuSmartphone, LuSquareTerminal, LuTerminal } from "react-icons/lu";
import { CLIENT_DOWNLOAD_META, CONNECTOR_DOWNLOAD_META, CONNECTOR_DOWNLOAD_URL, getClientDownloadUrls } from "app/constants/clientDownloads";
import {
  getCliInstallCommand,
  getCurlCliInstallCommand,
  getCliDownloadMeta,
  NOLO_CLI_NPM_URL,
} from "app/constants/cliDownloads";
import { copyTextToClipboard } from "app/utils/clipboard";
import {
  desktopReleaseManifestDbKey,
  normalizeDesktopReleaseManifest,
  resolveDesktopManifestChannelFromOrigin,
} from "app/constants/desktopReleaseManifest";
import { useAppSelector } from "app/store";
import { selectById } from "database/dbSlice";
import type { IconType } from "react-icons";
import NoloHeadMark from "render/web/ui/NoloHeadMark";
import "./ClientDownloadsPage.css";

type LinuxPackageLinks = {
  installer: string;
  tar: string;
  deb: string;
  rpm: string;
};

export type DownloadCard = {
  id: string;
  icon: IconType;
  platform: "android" | "windows" | "linux" | "macos" | "ios";
  titleKey: string;
  titleFallback?: string;
  descKey: string;
  descFallback?: string;
  meta: string;
  href: string | LinuxPackageLinks;
  actionTextKey?: string;
  actionTextFallback?: string;
  actionTarget?: "_blank" | "_self";
  hint?: string;
  isPrimary?: boolean;
};

export type DetectedPlatform = "ios" | "android" | "windows" | "macos" | "linux" | "unknown";

export function detectIsIos(ua?: string, plat?: string, touchPoints?: number): boolean {
  if (typeof window === "undefined" && ua === undefined) {
    return false;
  }
  const userAgent = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  const platform = plat ?? (typeof navigator !== "undefined" ? navigator.platform : "") ?? "";
  const maxTouchPoints = touchPoints ?? (typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0) ?? 0;

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return true;
  }
  const isMacPlatform = platform.toLowerCase().startsWith("mac") || /macintosh|mac os x/i.test(userAgent);
  if (isMacPlatform && maxTouchPoints > 1) {
    return true;
  }
  return false;
}

export function detectIsAndroid(ua?: string): boolean {
  if (typeof window === "undefined" && ua === undefined) {
    return false;
  }
  const userAgent = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  return /android/i.test(userAgent);
}

export function detectIsMac(ua?: string, plat?: string, touchPoints?: number): boolean {
  if (typeof window === "undefined" && ua === undefined) {
    return false;
  }
  if (detectIsIos(ua, plat, touchPoints)) {
    return false;
  }
  const platform = plat ?? (typeof navigator !== "undefined" ? navigator.platform : "") ?? "";
  const userAgent = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  return (
    platform.toLowerCase().startsWith("mac") ||
    /macintosh|mac os x/i.test(userAgent)
  );
}

export function detectIsLinux(ua?: string, plat?: string): boolean {
  if (typeof window === "undefined" && ua === undefined) {
    return false;
  }
  const platform = plat ?? (typeof navigator !== "undefined" ? navigator.platform : "") ?? "";
  const userAgent = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  // Android UA contains "Linux" but is not a Linux desktop; exclude it.
  if (/android/i.test(userAgent)) return false;
  return /linux/i.test(platform) || /linux/i.test(userAgent);
}

export function detectIsWindows(ua?: string, plat?: string): boolean {
  if (typeof window === "undefined" && ua === undefined) {
    return false;
  }
  const platform = plat ?? (typeof navigator !== "undefined" ? navigator.platform : "") ?? "";
  const userAgent = ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  return (
    platform.toLowerCase().startsWith("win") ||
    /windows/i.test(userAgent)
  );
}

export function detectPlatform(ua?: string, plat?: string, touchPoints?: number): DetectedPlatform {
  if (detectIsIos(ua, plat, touchPoints)) return "ios";
  if (detectIsAndroid(ua)) return "android";
  if (detectIsMac(ua, plat, touchPoints)) return "macos";
  if (detectIsWindows(ua, plat)) return "windows";
  if (detectIsLinux(ua, plat)) return "linux";
  return "unknown";
}

export function buildDownloadCards(options: {
  detectedPlatform: DetectedPlatform;
  downloadUrls: ReturnType<typeof getClientDownloadUrls>;
  versionFor: (platform: "windows" | "linux" | "macos") => string | null;
  t: (key: string, fallback?: string) => string;
}): DownloadCard[] {
  const { detectedPlatform, downloadUrls, versionFor, t } = options;

  const metaWithVersion = (
    platform: "windows" | "linux" | "macos",
    base: string,
  ) => {
    const v = versionFor(platform);
    return v ? `${base} · v${v}` : base;
  };

  const iosCard: DownloadCard = {
    id: "ios",
    icon: LuGlobe,
    platform: "ios",
    titleKey: "clientDownloads.iosTitle",
    titleFallback: "iPhone / iPad",
    descKey: "clientDownloads.iosWebDesc",
    descFallback: "无需安装，在浏览器中即可使用完整功能。",
    meta: "Web / PWA",
    href: "/chat",
    actionTextKey: "clientDownloads.iosWebAction",
    actionTextFallback: "在浏览器中使用 Nolo（添加到主屏幕）",
    actionTarget: "_self",
    hint: t(
      "clientDownloads.iosWebHint",
      "在 Safari 中点击分享按钮「添加到主屏幕」，即可全屏使用。",
    ),
    isPrimary: true,
  };

  const androidCard: DownloadCard = {
    id: "android",
    icon: LuSmartphone,
    platform: "android",
    titleKey: "clientDownloads.androidTitle",
    descKey: "clientDownloads.androidDesc",
    meta: CLIENT_DOWNLOAD_META.android,
    href: downloadUrls.android,
  };

  const windowsCard: DownloadCard = {
    id: "windows",
    icon: LuMonitor,
    platform: "windows",
    titleKey: "clientDownloads.windowsTitle",
    descKey: "clientDownloads.windowsDesc",
    meta: metaWithVersion("windows", CLIENT_DOWNLOAD_META.windows),
    href: downloadUrls.windows,
  };

  const macosCard: DownloadCard = {
    id: "macos",
    icon: LuLaptop,
    platform: "macos",
    titleKey: "clientDownloads.macosTitle",
    descKey: "clientDownloads.macosDesc",
    meta: metaWithVersion("macos", CLIENT_DOWNLOAD_META.macos),
    href: downloadUrls.macos,
  };

  const linuxCard: DownloadCard = {
    // Linux 桌面端独占一整行（4 种包格式，1/4 宽度放不下）
    id: "linux",
    icon: LuTerminal,
    platform: "linux",
    titleKey: "clientDownloads.linuxTitle",
    descKey: "clientDownloads.linuxDesc",
    meta: metaWithVersion("linux", CLIENT_DOWNLOAD_META.linux),
    href: {
      installer: downloadUrls.linuxInstaller,
      tar: downloadUrls.linux,
      deb: downloadUrls.linuxDeb,
      rpm: downloadUrls.linuxRpm,
    } as LinuxPackageLinks,
  };

  switch (detectedPlatform) {
    case "ios":
      // iOS: 首屏主推 Web 入口（添加到主屏幕），Android APK 降为次级，其余按桌面顺序排后
      return [iosCard, androidCard, windowsCard, macosCard, linuxCard];
    case "macos":
      // 桌面 macOS 置顶
      return [macosCard, windowsCard, androidCard, linuxCard];
    case "windows":
      // 桌面 Windows 置顶
      return [windowsCard, macosCard, androidCard, linuxCard];
    case "linux":
      // 桌面 Linux 置顶
      return [linuxCard, windowsCard, macosCard, androidCard];
    case "android":
      // Android 置顶
      return [androidCard, windowsCard, macosCard, linuxCard];
    case "unknown":
    default:
      // 未知平台或 SSR：桌面优先排列，不盲目在首屏置顶推安卓 APK
      return [windowsCard, macosCard, androidCard, linuxCard];
  }
}

const ClientDownloadsPage: React.FC = () => {
  const { t } = useTranslation();
  const [copiedCli, setCopiedCli] = React.useState(false);
  const [detectedPlatform, setDetectedPlatform] = React.useState<DetectedPlatform>("unknown");
  const [isMac, setIsMac] = React.useState(false);
  const [isLinux, setIsLinux] = React.useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  const manifestChannel = resolveDesktopManifestChannelFromOrigin(origin);
  const manifestDbKey = desktopReleaseManifestDbKey(manifestChannel);
  const manifestEntity = useAppSelector((state) =>
    selectById(state, manifestDbKey),
  );
  // SSR has no window.origin, so the channel defaults to stable while the
  // server injects the manifest for the request's actual origin. Fall back
  // to the other channel's entity so SSR renders the right links.
  const altManifestDbKey = desktopReleaseManifestDbKey(
    manifestChannel === "alpha" ? "stable" : "alpha",
  );
  const altManifestEntity = useAppSelector((state) =>
    selectById(state, altManifestDbKey),
  );
  const desktopReleaseManifest = normalizeDesktopReleaseManifest(
    manifestEntity?.data ?? altManifestEntity?.data,
  );
  const downloadUrls = getClientDownloadUrls(origin, desktopReleaseManifest);
  const cliInstallCommand = isMac || isLinux
    ? getCurlCliInstallCommand(origin)
    : getCliInstallCommand(origin);
  const cliDownloadMeta = getCliDownloadMeta();

  React.useEffect(() => {
    const plat = detectPlatform();
    setDetectedPlatform(plat);
    setIsMac(plat === "macos");
    setIsLinux(plat === "linux");
  }, []);

  const handleCopyCli = async () => {
    try {
      await copyTextToClipboard(cliInstallCommand);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // Extract each platform's version from its own manifest artifact. Releases
  // are per-platform and may differ (e.g. windows 0.10.0 while linux is still
  // 0.9.0), so show the version of the platform the user is about to download,
  // not a single shared value.
  const versionFor = (platform: "windows" | "linux" | "macos") =>
    desktopReleaseManifest?.artifacts?.[platform]?.version ?? null;

  const downloadCards = React.useMemo(() => {
    return buildDownloadCards({
      detectedPlatform,
      downloadUrls,
      versionFor,
      t,
    });
  }, [detectedPlatform, downloadUrls, desktopReleaseManifest, t]);

  return (
    <main className="client-downloads-page">
      <div className="client-downloads-page__container">
        <section className="client-downloads-page__hero">
        <div className="client-downloads-page__hero-content">
          <div className="client-downloads-page__eyebrow">
            <NoloHeadMark size={20} />
            <span>{t("clientDownloads.eyebrow", "客户端开源 · 跑在你自己的电脑上")}</span>
          </div>
          <h1 className="client-downloads-page__title">
            {t("clientDownloads.title")}
          </h1>
          <p className="client-downloads-page__subtitle">
            {t("clientDownloads.subtitle")}
          </p>
        </div>
      </section>
      <section className="client-downloads-page__grid">
        {downloadCards.map(
          ({
            id,
            icon: Icon,
            platform,
            titleKey,
            titleFallback,
            descKey,
            descFallback,
            meta,
            href,
            actionTextKey,
            actionTextFallback,
            actionTarget,
            hint,
            isPrimary,
          }) => {
            const linuxLinks = typeof href === "object" ? (href as LinuxPackageLinks) : null;
            const actionText = actionTextKey
              ? t(actionTextKey, actionTextFallback)
              : t("clientDownloads.downloadNow");
            return (
              <article
                key={id}
                className={`client-download-card${isPrimary ? " client-download-card--primary" : ""}`}
                data-platform={platform}
              >
                {isPrimary && (
                  <span className="client-download-card__primary-badge">
                    {t("clientDownloads.recommended", "推荐")}
                  </span>
                )}
                <div className="client-download-card__head">
                  <div className="client-download-card__icon" data-platform={platform}>
                    <Icon size={22} aria-hidden="true" />
                  </div>
                </div>

                <div className="client-download-card__body">
                  <h2 className="client-download-card__title">{t(titleKey, titleFallback)}</h2>
                  <p className="client-download-card__meta">{meta}</p>
                  <p className="client-download-card__desc">{t(descKey, descFallback)}</p>
                </div>

                {linuxLinks ? (
                  <div className="client-download-card__linux-options">
                    <a href={linuxLinks.installer} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                      <span className="client-download-card__linux-format">TAR.GZ</span>
                      <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxInstallerDesc", "自解压安装器 · 推荐（装后可应用内自动更新）")}</span>
                      <span className="client-download-card__linux-option__hint">
                        <code>{t("clientDownloads.linuxInstallerInstallHint", "解压后运行 ./installer")}</code>
                      </span>
                      <LuDownload size={14} aria-hidden="true" />
                    </a>
                    <a href={linuxLinks.tar} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                      <span className="client-download-card__linux-format">TAR.ZST</span>
                      <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxTarDesc", "便携包 · 不参与应用内更新")}</span>
                      <span className="client-download-card__linux-option__hint">
                        {t("clientDownloads.linuxTarInstallHint", "解压后运行 bin/launcher（需手动替换升级）")}
                      </span>
                      <LuDownload size={14} aria-hidden="true" />
                    </a>
                    <a href={linuxLinks.deb} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                      <span className="client-download-card__linux-format">DEB</span>
                      <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxDebDesc", "Debian / Ubuntu · 由包管理器更新")}</span>
                      <span className="client-download-card__linux-option__hint">
                        <code>{t("clientDownloads.linuxDebInstallHint", "sudo apt install ./nolo-desktop_amd64.deb")}</code>
                      </span>
                      <LuDownload size={14} aria-hidden="true" />
                    </a>
                    <a href={linuxLinks.rpm} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                      <span className="client-download-card__linux-format">RPM</span>
                      <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxRpmDesc", "Fedora / RHEL · 由包管理器更新")}</span>
                      <span className="client-download-card__linux-option__hint">
                        <code>{t("clientDownloads.linuxRpmInstallHint", "sudo dnf install ./nolo-desktop_x86_64.rpm")}</code>
                      </span>
                      <LuDownload size={14} aria-hidden="true" />
                    </a>
                  </div>
                ) : (
                  <a
                    href={href as string}
                    className="client-download-card__action"
                    target={actionTarget ?? "_blank"}
                    rel={actionTarget === "_self" ? undefined : "noreferrer"}
                  >
                    {platform === "ios" ? (
                      <LuGlobe size={15} aria-hidden="true" />
                    ) : (
                      <LuDownload size={15} aria-hidden="true" />
                    )}
                    <span>{actionText}</span>
                  </a>
                )}
                {hint && (
                  <p className="client-download-card__hint">{hint}</p>
                )}
              </article>
            );
          },
        )}
      </section>

      <div className="client-download-cli-card client-download-connector-card">
        <div className="client-download-cli-card__head">
          <div className="client-download-cli-card__icon">
            <LuGlobe size={22} aria-hidden="true" />
          </div>
          <div className="client-download-cli-card__badges">
            <span className="client-download-cli-card__badge">{t("clientDownloads.connectorBadge", "Firefox")}</span>
            <span className="client-download-cli-card__badge">{CONNECTOR_DOWNLOAD_META}</span>
          </div>
        </div>

        <div className="client-download-cli-card__body">
          <h2 className="client-download-cli-card__title">{t("clientDownloads.connectorTitle", "Browser Connector")}</h2>
          <p className="client-download-cli-card__desc">{t("clientDownloads.connectorDesc", "Let your local Nolo agent read and operate the Firefox tabs you point it at. Signed by Mozilla, installs in one click.")}</p>
          <a
            href={CONNECTOR_DOWNLOAD_URL}
            className="client-download-connector-card__action"
          >
            <LuDownload size={15} aria-hidden="true" />
            <span>{t("clientDownloads.downloadNow")}</span>
          </a>
        </div>

        <div className="client-download-cli-card__footer">
          <span className="client-download-cli-card__requirement">
            {t("clientDownloads.connectorRequirement", "Requires Nolo Desktop running on the same computer.")}
          </span>
        </div>
      </div>

      <div className="client-download-cli-card">
        <div className="client-download-cli-card__head">
          <div className="client-download-cli-card__icon">
            <LuSquareTerminal size={22} aria-hidden="true" />
          </div>
          <div className="client-download-cli-card__badges">
            <span className="client-download-cli-card__badge">CLI</span>
            <span className="client-download-cli-card__badge">{cliDownloadMeta}</span>
          </div>
        </div>

        <div className="client-download-cli-card__body">
          <h2 className="client-download-cli-card__title">{t("clientDownloads.cliTitle", "命令行工具 (Nolo CLI)")}</h2>
          <p className="client-download-cli-card__desc">{t("clientDownloads.cliDesc", "通过命令行使用 Nolo，适合开发者。")}</p>
          
          <div className="client-download-cli-card__command-box">
            <code><span className="command-prompt">$</span> {cliInstallCommand}</code>
            <button 
              type="button"
              className={`client-download-cli-card__copy ${copiedCli ? "copied" : ""}`} 
              onClick={handleCopyCli}
              title="Copy to clipboard"
            >
              {copiedCli ? "已复制" : "复制"}
            </button>
          </div>
        </div>

        <div className="client-download-cli-card__footer">
          <span className="client-download-cli-card__requirement">
            {isMac
              ? t("clientDownloads.macCliRequirement", "macOS Apple Silicon：无需 Node / Bun / npm。")
              : isLinux
                ? t("clientDownloads.linuxCliRequirement", "Linux x86_64：无需 Node / Bun / npm。")
                : t("clientDownloads.cliRequirement", "需要 Node.js 与 npm。")}
          </span>
          <a
            href={isMac || isLinux ? "https://nolo.chat/install-nolo.sh" : NOLO_CLI_NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="client-download-cli-card__link"
          >
            {isMac || isLinux ? "安装脚本 →" : "NPM 页面 →"}
          </a>
        </div>
      </div>

      {detectedPlatform !== "ios" && (
        <div className="client-downloads-page__soon">
          <div className="client-soon__icon">
            <LuLaptop size={18} aria-hidden="true" />
          </div>
          <div className="client-soon__body">
            <strong className="client-soon__title">{t("clientDownloads.iosTitle")}</strong>
            <span className="client-soon__desc">{t("clientDownloads.iosDesc")}</span>
          </div>
          <span className="client-soon__badge">
            <LuClock size={12} aria-hidden="true" />
            {t("clientDownloads.comingSoon")}
          </span>
        </div>
      )}

      <footer className="client-downloads-page__trust-footer">
        <p className="client-downloads-page__trust-line">
          {t("clientDownloads.tagline", "客户端开源 · 发布版本可对应源码 · 用你的订阅或自带 Key")}
        </p>
      </footer>
      </div>
    </main>
  );
};

export default ClientDownloadsPage;
