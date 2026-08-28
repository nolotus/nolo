import React from "react";
import { useTranslation } from "react-i18next";
import { LuClock, LuDownload, LuLaptop, LuMonitor, LuSmartphone, LuSquareTerminal, LuTerminal } from "react-icons/lu";
import { CLIENT_DOWNLOAD_META, getClientDownloadUrls } from "app/constants/clientDownloads";
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
import "./ClientDownloadsPage.css";

type LinuxPackageLinks = {
  tar: string;
  deb: string;
  rpm: string;
};

type DownloadCard = {
  id: string;
  icon: IconType;
  platform: "android" | "windows" | "linux" | "macos";
  titleKey: string;
  descKey: string;
  meta: string;
  href: string | LinuxPackageLinks;
};

function detectIsMac(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  return (
    platform.toLowerCase().startsWith("mac") ||
    /macintosh|mac os x/i.test(userAgent)
  );
}

function detectIsLinux(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  // Android UA contains "Linux" but is not a Linux desktop; exclude it.
  if (/android/i.test(userAgent)) return false;
  return /linux/i.test(platform) || /linux/i.test(userAgent);
}

const ClientDownloadsPage: React.FC = () => {
  const { t } = useTranslation();
  const [copiedCli, setCopiedCli] = React.useState(false);
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
    setIsMac(detectIsMac());
    setIsLinux(detectIsLinux());
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

  const metaWithVersion = (
    platform: "windows" | "linux" | "macos",
    base: string,
  ) => {
    const v = versionFor(platform);
    return v ? `${base} · v${v}` : base;
  };

  const downloadCards: DownloadCard[] = [
    {
      id: "android",
      icon: LuSmartphone,
      platform: "android",
      titleKey: "clientDownloads.androidTitle",
      descKey: "clientDownloads.androidDesc",
      meta: CLIENT_DOWNLOAD_META.android,
      href: downloadUrls.android,
    },
    {
      id: "windows",
      icon: LuMonitor,
      platform: "windows",
      titleKey: "clientDownloads.windowsTitle",
      descKey: "clientDownloads.windowsDesc",
      meta: metaWithVersion("windows", CLIENT_DOWNLOAD_META.windows),
      href: downloadUrls.windows,
    },
    {
      id: "linux",
      icon: LuTerminal,
      platform: "linux",
      titleKey: "clientDownloads.linuxTitle",
      descKey: "clientDownloads.linuxDesc",
      meta: metaWithVersion("linux", CLIENT_DOWNLOAD_META.linux),
      href: {
        tar: downloadUrls.linux,
        deb: downloadUrls.linuxDeb,
        rpm: downloadUrls.linuxRpm,
      } as LinuxPackageLinks,
    },
    {
      id: "macos",
      icon: LuLaptop,
      platform: "macos",
      titleKey: "clientDownloads.macosTitle",
      descKey: "clientDownloads.macosDesc",
      meta: metaWithVersion("macos", CLIENT_DOWNLOAD_META.macos),
      href: downloadUrls.macos,
    },
  ];

  return (
    <main className="client-downloads-page">
      <section className="client-downloads-page__hero">
        <div className="client-downloads-page__hero-content">
          <h1 className="client-downloads-page__title">
            {t("clientDownloads.title")}
          </h1>
          <p className="client-downloads-page__subtitle">
            {t("clientDownloads.subtitle")}
          </p>
        </div>
      </section>
      <section className="client-downloads-page__grid">
        {downloadCards.map(({ id, icon: Icon, platform, titleKey, descKey, meta, href }, i) => {
          const linuxLinks = typeof href === "object" ? (href as LinuxPackageLinks) : null;
          return (
            <article key={id} className="client-download-card" data-platform={platform}>
              <div className="client-download-card__head">
                <div className="client-download-card__icon" data-platform={platform}>
                  <Icon size={22} aria-hidden="true" />
                </div>
                <span className="client-download-card__serial" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="client-download-card__body">
                <h2 className="client-download-card__title">{t(titleKey)}</h2>
                <p className="client-download-card__meta">{meta}</p>
                <p className="client-download-card__desc">{t(descKey)}</p>
              </div>

              {linuxLinks ? (
                <div className="client-download-card__linux-options">
                  <a href={linuxLinks.tar} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                    <span className="client-download-card__linux-format">TAR.ZST</span>
                    <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxTarDesc", "通用 / 任意发行版")}</span>
                    <span className="client-download-card__linux-option__hint">
                      {t("clientDownloads.linuxTarInstallHint", "Extract and run bin/launcher — no install needed.")}
                    </span>
                    <LuDownload size={14} aria-hidden="true" />
                  </a>
                  <a href={linuxLinks.deb} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                    <span className="client-download-card__linux-format">DEB</span>
                    <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxDebDesc", "Debian / Ubuntu")}</span>
                    <span className="client-download-card__linux-option__hint">
                      <code>{t("clientDownloads.linuxDebInstallHint", "sudo apt install ./nolo-desktop_amd64.deb")}</code>
                    </span>
                    <LuDownload size={14} aria-hidden="true" />
                  </a>
                  <a href={linuxLinks.rpm} className="client-download-card__linux-option" target="_blank" rel="noreferrer">
                    <span className="client-download-card__linux-format">RPM</span>
                    <span className="client-download-card__linux-option__desc">{t("clientDownloads.linuxRpmDesc", "Fedora / RHEL")}</span>
                    <span className="client-download-card__linux-option__hint">
                      <code>{t("clientDownloads.linuxRpmInstallHint", "sudo dnf install ./nolo-desktop_x86_64.rpm")}</code>
                    </span>
                    <LuDownload size={14} aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <a href={href as string} className="client-download-card__action" target="_blank" rel="noreferrer">
                  <LuDownload size={15} aria-hidden="true" />
                  <span>{t("clientDownloads.downloadNow")}</span>
                </a>
              )}
            </article>
          );
        })}
      </section>


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
    </main>
  );
};

export default ClientDownloadsPage;
