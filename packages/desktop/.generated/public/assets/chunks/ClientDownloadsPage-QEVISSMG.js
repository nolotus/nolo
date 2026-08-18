import {
  copyTextToClipboard
} from "/public/assets/chunks/chunk-AOBBTRZH.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  selectById
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuClock,
  LuDownload,
  LuLaptop,
  LuMonitor,
  LuSmartphone,
  LuSquareTerminal,
  LuTerminal
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/pages/ClientDownloadsPage.tsx
var import_react = __toESM(require_react());

// packages/app/constants/desktopReleaseManifest.ts
var DESKTOP_RELEASE_MANIFEST_DB_KEY = "desktop-release-manifest";
function desktopReleaseManifestDbKey(channel) {
  if (channel === "alpha" || channel === "stable") {
    return `desktop-release-manifest.${channel}`;
  }
  return DESKTOP_RELEASE_MANIFEST_DB_KEY;
}
function resolveDesktopManifestChannelFromOrigin(origin) {
  if (typeof origin !== "string") return "stable";
  const trimmed = origin.trim();
  if (!trimmed) return "stable";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.hostname === "us.nolo.chat") return "alpha";
  } catch {
  }
  return "stable";
}
function isDesktopReleaseChannel(value) {
  return value === "alpha" || value === "stable";
}
function normalizeDesktopReleaseManifest(value) {
  if (!value || typeof value !== "object") return null;
  const manifest = value;
  if (manifest.schemaVersion !== 1 || !isDesktopReleaseChannel(manifest.channel)) {
    return null;
  }
  if (!manifest.artifacts || typeof manifest.artifacts !== "object") {
    return null;
  }
  const artifacts = {};
  for (const platform of ["windows", "linux", "macos"]) {
    const artifact = manifest.artifacts[platform];
    if (!artifact || typeof artifact !== "object") continue;
    if (typeof artifact.url !== "string" || typeof artifact.size !== "number") continue;
    let updateMeta;
    const rawUpdateMeta = artifact.updateMeta;
    if (rawUpdateMeta && typeof rawUpdateMeta === "object" && typeof rawUpdateMeta.url === "string" && typeof rawUpdateMeta.sha256 === "string" && typeof rawUpdateMeta.size === "number" && typeof rawUpdateMeta.version === "string" && typeof rawUpdateMeta.hash === "string") {
      const meta = rawUpdateMeta;
      updateMeta = {
        url: meta.url,
        sha256: meta.sha256,
        size: meta.size,
        version: meta.version,
        hash: meta.hash
      };
    }
    artifacts[platform] = {
      url: artifact.url,
      size: artifact.size,
      ...typeof artifact.sha256 === "string" ? { sha256: artifact.sha256 } : {},
      ...typeof artifact.version === "string" ? { version: artifact.version } : {},
      ...typeof artifact.buildSha === "string" ? { buildSha: artifact.buildSha } : {},
      ...typeof artifact.publishedAt === "string" ? { publishedAt: artifact.publishedAt } : {},
      ...updateMeta ? { updateMeta } : {}
    };
  }
  return {
    schemaVersion: 1,
    channel: manifest.channel,
    updatedAt: typeof manifest.updatedAt === "string" ? manifest.updatedAt : (/* @__PURE__ */ new Date(0)).toISOString(),
    artifacts
  };
}

// packages/app/constants/clientDownloads.ts
var STABLE_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
  linux: "/public/downloads/stable-linux-x64-NoloDesktop.tar.zst",
  linuxDeb: "/public/downloads/nolo-desktop_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop_x86_64.rpm",
  macos: "/public/downloads/stable-macos-arm64-NoloDesktop.dmg"
};
var ALPHA_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
  linux: "/public/downloads/canary-linux-x64-NoloDesktop-canary.tar.zst",
  linuxDeb: "/public/downloads/nolo-desktop-canary_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop-canary_x86_64.rpm",
  macos: "/public/downloads/canary-macos-arm64-NoloDesktop-canary.dmg"
};
var hasHttpOrigin = (value) => {
  if (typeof value !== "string") return false;
  return /^https?:\/\//.test(value.trim());
};
var getClientDownloadChannel = (origin) => {
  return resolveDesktopManifestChannelFromOrigin(origin);
};
var getClientDownloadUrls = (origin, manifest) => {
  const channel = !hasHttpOrigin(origin) && manifest ? manifest.channel : getClientDownloadChannel(origin);
  const fallback = channel === "alpha" ? ALPHA_CLIENT_DOWNLOAD_URLS : STABLE_CLIENT_DOWNLOAD_URLS;
  const manifestArtifacts = manifest?.channel === channel ? manifest.artifacts : void 0;
  return {
    android: fallback.android,
    windows: manifestArtifacts?.windows?.url ?? fallback.windows,
    linux: manifestArtifacts?.linux?.url ?? fallback.linux,
    linuxDeb: fallback.linuxDeb,
    linuxRpm: fallback.linuxRpm,
    macos: manifestArtifacts?.macos?.url ?? fallback.macos
  };
};
var CLIENT_DOWNLOAD_META = {
  android: "APK \xB7 Android 8+",
  windows: "EXE \xB7 x64 \xB7 Win 10+",
  linux: "TAR.ZST / DEB / RPM \xB7 x64",
  linuxDeb: "DEB \xB7 Debian/Ubuntu",
  linuxRpm: "RPM \xB7 Fedora/RHEL",
  macos: "DMG \xB7 Apple Silicon"
};

// packages/app/constants/cliDownloads.ts
var NOLO_CLI_PACKAGE_NAME = "nolo-cli";
var NOLO_CLI_VERSION = "0.16.0-alpha.25";
var NOLO_CLI_NPM_URL = "https://www.npmjs.com/package/nolo-cli";
var getCliInstallTag = (origin) => getClientDownloadChannel(origin) === "alpha" ? "alpha" : "latest";
var getCliInstallCommand = (origin) => {
  const tag = getCliInstallTag(origin);
  return tag === "latest" ? `npm install -g ${NOLO_CLI_PACKAGE_NAME}` : `npm install -g ${NOLO_CLI_PACKAGE_NAME}@${tag}`;
};
var getCurlCliInstallCommand = (origin) => {
  const channel = getClientDownloadChannel(origin);
  const base = channel === "alpha" ? "https://us.nolo.chat" : "https://nolo.chat";
  return `curl -fsSL ${base}/install-nolo.sh | sh`;
};
var getCliDownloadMeta = () => `v${NOLO_CLI_VERSION}`;

// packages/app/pages/ClientDownloadsPage.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
function detectIsMac() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  return platform.toLowerCase().startsWith("mac") || /macintosh|mac os x/i.test(userAgent);
}
function detectIsLinux() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  if (/android/i.test(userAgent)) return false;
  return /linux/i.test(platform) || /linux/i.test(userAgent);
}
var ClientDownloadsPage = () => {
  const { t } = useTranslation();
  const [copiedCli, setCopiedCli] = import_react.default.useState(false);
  const [isMac, setIsMac] = import_react.default.useState(false);
  const [isLinux, setIsLinux] = import_react.default.useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : void 0;
  const manifestChannel = resolveDesktopManifestChannelFromOrigin(origin);
  const manifestDbKey = desktopReleaseManifestDbKey(manifestChannel);
  const manifestEntity = useAppSelector(
    (state) => selectById(state, manifestDbKey)
  );
  const altManifestDbKey = desktopReleaseManifestDbKey(
    manifestChannel === "alpha" ? "stable" : "alpha"
  );
  const altManifestEntity = useAppSelector(
    (state) => selectById(state, altManifestDbKey)
  );
  const desktopReleaseManifest = normalizeDesktopReleaseManifest(
    manifestEntity?.data ?? altManifestEntity?.data
  );
  const downloadUrls = getClientDownloadUrls(origin, desktopReleaseManifest);
  const cliInstallCommand = isMac || isLinux ? getCurlCliInstallCommand(origin) : getCliInstallCommand(origin);
  const cliDownloadMeta = getCliDownloadMeta();
  import_react.default.useEffect(() => {
    setIsMac(detectIsMac());
    setIsLinux(detectIsLinux());
  }, []);
  const handleCopyCli = async () => {
    try {
      await copyTextToClipboard(cliInstallCommand);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2e3);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };
  const versionFor = (platform) => desktopReleaseManifest?.artifacts?.[platform]?.version ?? null;
  const metaWithVersion = (platform, base) => {
    const v = versionFor(platform);
    return v ? `${base} \xB7 v${v}` : base;
  };
  const downloadCards = [
    {
      id: "android",
      icon: LuSmartphone,
      platform: "android",
      titleKey: "clientDownloads.androidTitle",
      descKey: "clientDownloads.androidDesc",
      meta: CLIENT_DOWNLOAD_META.android,
      href: downloadUrls.android
    },
    {
      id: "windows",
      icon: LuMonitor,
      platform: "windows",
      titleKey: "clientDownloads.windowsTitle",
      descKey: "clientDownloads.windowsDesc",
      meta: metaWithVersion("windows", CLIENT_DOWNLOAD_META.windows),
      href: downloadUrls.windows
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
        rpm: downloadUrls.linuxRpm
      }
    },
    {
      id: "macos",
      icon: LuLaptop,
      platform: "macos",
      titleKey: "clientDownloads.macosTitle",
      descKey: "clientDownloads.macosDesc",
      meta: metaWithVersion("macos", CLIENT_DOWNLOAD_META.macos),
      href: downloadUrls.macos
    }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { className: "client-downloads-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "client-downloads-page__hero", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-downloads-page__hero-content", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "client-downloads-page__title", children: t("clientDownloads.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "client-downloads-page__subtitle", children: t("clientDownloads.subtitle") })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "client-downloads-page__grid", children: downloadCards.map(({ id, icon: Icon, platform, titleKey, descKey, meta, href }, i) => {
      const linuxLinks = typeof href === "object" ? href : null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "client-download-card", "data-platform": platform, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-card__head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "client-download-card__icon", "data-platform": platform, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 22, "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__serial", "aria-hidden": "true", children: String(i + 1).padStart(2, "0") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-card__body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "client-download-card__title", children: t(titleKey) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "client-download-card__meta", children: meta }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "client-download-card__desc", children: t(descKey) })
        ] }),
        linuxLinks ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-card__linux-options", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", { href: linuxLinks.tar, className: "client-download-card__linux-option", target: "_blank", rel: "noreferrer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-format", children: "TAR.ZST" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-option__desc", children: t("clientDownloads.linuxTarDesc", "\u901A\u7528 / \u4EFB\u610F\u53D1\u884C\u7248") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-option__hint", children: t("clientDownloads.linuxTarInstallHint", "Extract and run bin/launcher \u2014 no install needed.") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 14, "aria-hidden": "true" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", { href: linuxLinks.deb, className: "client-download-card__linux-option", target: "_blank", rel: "noreferrer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-format", children: "DEB" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-option__desc", children: t("clientDownloads.linuxDebDesc", "Debian / Ubuntu") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-option__hint", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: t("clientDownloads.linuxDebInstallHint", "sudo apt install ./nolo-desktop_amd64.deb") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 14, "aria-hidden": "true" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", { href: linuxLinks.rpm, className: "client-download-card__linux-option", target: "_blank", rel: "noreferrer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-format", children: "RPM" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-option__desc", children: t("clientDownloads.linuxRpmDesc", "Fedora / RHEL") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-card__linux-option__hint", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: t("clientDownloads.linuxRpmInstallHint", "sudo dnf install ./nolo-desktop_x86_64.rpm") }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 14, "aria-hidden": "true" })
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", { href, className: "client-download-card__action", target: "_blank", rel: "noreferrer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuDownload, { size: 15, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("clientDownloads.downloadNow") })
        ] })
      ] }, id);
    }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-cli-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-cli-card__head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "client-download-cli-card__icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSquareTerminal, { size: 22, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-cli-card__badges", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-cli-card__badge", children: "CLI" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-cli-card__badge", children: cliDownloadMeta })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-cli-card__body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "client-download-cli-card__title", children: t("clientDownloads.cliTitle", "\u547D\u4EE4\u884C\u5DE5\u5177 (Nolo CLI)") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "client-download-cli-card__desc", children: t("clientDownloads.cliDesc", "\u901A\u8FC7\u547D\u4EE4\u884C\u4F7F\u7528 Nolo\uFF0C\u9002\u5408\u5F00\u53D1\u8005\u3002") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-cli-card__command-box", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "command-prompt", children: "$" }),
            " ",
            cliInstallCommand
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: `client-download-cli-card__copy ${copiedCli ? "copied" : ""}`,
              onClick: handleCopyCli,
              title: "Copy to clipboard",
              children: copiedCli ? "\u5DF2\u590D\u5236" : "\u590D\u5236"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-download-cli-card__footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-download-cli-card__requirement", children: isMac ? t("clientDownloads.macCliRequirement", "macOS Apple Silicon\uFF1A\u65E0\u9700 Node / Bun / npm\u3002") : isLinux ? t("clientDownloads.linuxCliRequirement", "Linux x86_64\uFF1A\u65E0\u9700 Node / Bun / npm\u3002") : t("clientDownloads.cliRequirement", "\u9700\u8981 Node.js \u4E0E npm\u3002") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "a",
          {
            href: isMac || isLinux ? "https://nolo.chat/install-nolo.sh" : NOLO_CLI_NPM_URL,
            target: "_blank",
            rel: "noreferrer",
            className: "client-download-cli-card__link",
            children: isMac || isLinux ? "\u5B89\u88C5\u811A\u672C \u2192" : "NPM \u9875\u9762 \u2192"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-downloads-page__soon", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "client-soon__icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLaptop, { size: 18, "aria-hidden": "true" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "client-soon__body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: "client-soon__title", children: t("clientDownloads.iosTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "client-soon__desc", children: t("clientDownloads.iosDesc") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "client-soon__badge", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuClock, { size: 12, "aria-hidden": "true" }),
        t("clientDownloads.comingSoon")
      ] })
    ] })
  ] });
};
var ClientDownloadsPage_default = ClientDownloadsPage;
export {
  ClientDownloadsPage_default as default
};
