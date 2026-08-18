import {
  Avatar_default,
  useImageLoadFallback
} from "/public/assets/chunks/chunk-EOM4G5HF.js";
import {
  resolveAvatarUrl
} from "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  useHasMounted
} from "/public/assets/chunks/chunk-OOUNP25R.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectCurrentServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/AgentAvatar.tsx
var import_react3 = __toESM(require_react());

// packages/ai/agent/web/useAgentModelAvatarComponent.ts
var import_react2 = __toESM(require_react());

// packages/ai/llm/modelAvatar.ts
var import_react = __toESM(require_react());
var scaleSize = (size, multiple) => typeof size === "number" ? size * multiple : `calc(${size} * ${multiple})`;
var createAvatarComponent = (Mono, styleModule) => {
  const background = styleModule.AVATAR_BACKGROUND ?? "#111";
  const color = styleModule.AVATAR_COLOR ?? "#fff";
  const iconMultiple = styleModule.AVATAR_ICON_MULTIPLE ?? 0.75;
  const AvatarComponent = (rawProps) => {
    const { size = 40, style, className } = rawProps ?? {};
    return (0, import_react.createElement)(
      "div",
      {
        "aria-hidden": "true",
        className,
        style: {
          alignItems: "center",
          background,
          borderRadius: "50%",
          color,
          display: "inline-flex",
          flex: "none",
          height: size,
          justifyContent: "center",
          lineHeight: 1,
          overflow: "hidden",
          width: size,
          ...style
        }
      },
      (0, import_react.createElement)(Mono, { size: scaleSize(size, iconMultiple), style: { flex: "none" } })
    );
  };
  return AvatarComponent;
};
var MAP = {
  // ── 国际大厂 ─────────────────────────────────────
  openai: () => Promise.all([
    import("/public/assets/chunks/Mono-5CY3ZNKX.js"),
    import("/public/assets/chunks/style-TXA5YNBM.js")
  ]).then(([mono, style]) => ({ mono, style })),
  claude: () => Promise.all([
    import("/public/assets/chunks/Mono-67M6XCB6.js"),
    import("/public/assets/chunks/style-FJIYZTG7.js")
  ]).then(([mono, style]) => ({ mono, style })),
  anthropic: () => Promise.all([
    import("/public/assets/chunks/Mono-DTTFU4MV.js"),
    import("/public/assets/chunks/style-KQNJIOOZ.js")
  ]).then(([mono, style]) => ({ mono, style })),
  gemini: () => Promise.all([
    import("/public/assets/chunks/Color-USIGQSQH.js"),
    import("/public/assets/chunks/style-XBYQNZHX.js")
  ]).then(([mono, style]) => ({ mono, style })),
  google: () => Promise.all([
    import("/public/assets/chunks/Mono-ES2JUPMI.js"),
    import("/public/assets/chunks/style-5RGULS3N.js")
  ]).then(([mono, style]) => ({ mono, style })),
  grok: () => Promise.all([
    import("/public/assets/chunks/Mono-2CPNGV36.js"),
    import("/public/assets/chunks/style-7DLZWKT2.js")
  ]).then(([mono, style]) => ({ mono, style })),
  xai: () => Promise.all([
    import("/public/assets/chunks/Mono-5AZI3YX5.js"),
    import("/public/assets/chunks/style-TWGTFFRN.js")
  ]).then(([mono, style]) => ({ mono, style })),
  mistral: () => Promise.all([
    import("/public/assets/chunks/Mono-7PN6GMVD.js"),
    import("/public/assets/chunks/style-ED7NH5CZ.js")
  ]).then(([mono, style]) => ({ mono, style })),
  llama: () => Promise.all([
    import("/public/assets/chunks/Mono-EXT4PR4D.js"),
    import("/public/assets/chunks/style-SE5RAOTQ.js")
  ]).then(([mono, style]) => ({ mono, style })),
  meta: () => Promise.all([
    import("/public/assets/chunks/Mono-EXT4PR4D.js"),
    import("/public/assets/chunks/style-SE5RAOTQ.js")
  ]).then(([mono, style]) => ({ mono, style })),
  perplexity: () => Promise.all([
    import("/public/assets/chunks/Mono-7MCFWFEZ.js"),
    import("/public/assets/chunks/style-DPBIV2Y3.js")
  ]).then(([mono, style]) => ({ mono, style })),
  cohere: () => Promise.all([
    import("/public/assets/chunks/Mono-HGDVVHWP.js"),
    import("/public/assets/chunks/style-PFSJ2B4C.js")
  ]).then(([mono, style]) => ({ mono, style })),
  gemma: () => Promise.all([
    import("/public/assets/chunks/Mono-LNM4PSFU.js"),
    import("/public/assets/chunks/style-RUEOMW3W.js")
  ]).then(([mono, style]) => ({ mono, style })),
  copilot: () => Promise.all([
    import("/public/assets/chunks/Mono-JJYYLIHB.js"),
    import("/public/assets/chunks/style-EIONF5AX.js")
  ]).then(([mono, style]) => ({ mono, style })),
  // ── 中国模型 ─────────────────────────────────────
  glm: () => Promise.all([
    import("/public/assets/chunks/Mono-SB36JEVK.js"),
    import("/public/assets/chunks/style-FZYSI3IY.js")
  ]).then(([mono, style]) => ({ mono, style })),
  chatglm: () => Promise.all([
    import("/public/assets/chunks/Mono-SB36JEVK.js"),
    import("/public/assets/chunks/style-FZYSI3IY.js")
  ]).then(([mono, style]) => ({ mono, style })),
  zhipu: () => Promise.all([
    import("/public/assets/chunks/Mono-KPNDO3XM.js"),
    import("/public/assets/chunks/style-KUX6FPNG.js")
  ]).then(([mono, style]) => ({ mono, style })),
  kimi: () => Promise.all([
    import("/public/assets/chunks/Mono-BXIZP7HB.js"),
    import("/public/assets/chunks/style-BO6LZFR5.js")
  ]).then(([mono, style]) => ({ mono, style })),
  moonshot: () => Promise.all([
    import("/public/assets/chunks/Mono-5HEIDEBK.js"),
    import("/public/assets/chunks/style-HIMIOANI.js")
  ]).then(([mono, style]) => ({ mono, style })),
  minimax: () => Promise.all([
    import("/public/assets/chunks/Mono-B2ZNGCMM.js"),
    import("/public/assets/chunks/style-LCFO7RAO.js")
  ]).then(([mono, style]) => ({ mono, style })),
  hailuo: () => Promise.all([
    import("/public/assets/chunks/Mono-C4YYW5VR.js"),
    import("/public/assets/chunks/style-7P2CVSB5.js")
  ]).then(([mono, style]) => ({ mono, style })),
  doubao: () => Promise.all([
    import("/public/assets/chunks/Mono-WLFQRAOE.js"),
    import("/public/assets/chunks/style-IXXNO6PA.js")
  ]).then(([mono, style]) => ({ mono, style })),
  hunyuan: () => Promise.all([
    import("/public/assets/chunks/Mono-7L6RGGDN.js"),
    import("/public/assets/chunks/style-L7FWWHHV.js")
  ]).then(([mono, style]) => ({ mono, style })),
  deepseek: () => Promise.all([
    import("/public/assets/chunks/Mono-2TTUZYHD.js"),
    import("/public/assets/chunks/style-ZYPZUDYV.js")
  ]).then(([mono, style]) => ({ mono, style })),
  qwen: () => Promise.all([
    import("/public/assets/chunks/Mono-ABS6NZJE.js"),
    import("/public/assets/chunks/style-PHSGFLWG.js")
  ]).then(([mono, style]) => ({ mono, style })),
  wenxin: () => Promise.all([
    import("/public/assets/chunks/Mono-TTUR3KJ3.js"),
    import("/public/assets/chunks/style-VATRCP6J.js")
  ]).then(([mono, style]) => ({ mono, style })),
  ernie: () => Promise.all([
    import("/public/assets/chunks/Mono-TTUR3KJ3.js"),
    import("/public/assets/chunks/style-VATRCP6J.js")
  ]).then(([mono, style]) => ({ mono, style })),
  baichuan: () => Promise.all([
    import("/public/assets/chunks/Mono-BPC2KU22.js"),
    import("/public/assets/chunks/style-RDXBIAFG.js")
  ]).then(([mono, style]) => ({ mono, style })),
  yi: () => Promise.all([
    import("/public/assets/chunks/Mono-CYN3FXNR.js"),
    import("/public/assets/chunks/style-IBZOKM3D.js")
  ]).then(([mono, style]) => ({ mono, style })),
  zeroone: () => Promise.all([
    import("/public/assets/chunks/Mono-LK3QRSV2.js"),
    import("/public/assets/chunks/style-BZBP5CRV.js")
  ]).then(([mono, style]) => ({ mono, style })),
  internlm: () => Promise.all([
    import("/public/assets/chunks/Mono-I72I5D3X.js"),
    import("/public/assets/chunks/style-S45GVMJM.js")
  ]).then(([mono, style]) => ({ mono, style })),
  spark: () => Promise.all([
    import("/public/assets/chunks/Mono-K6ISKELS.js"),
    import("/public/assets/chunks/style-RLTUPK5D.js")
  ]).then(([mono, style]) => ({ mono, style })),
  iflyt: () => Promise.all([
    import("/public/assets/chunks/Mono-K6ISKELS.js"),
    import("/public/assets/chunks/style-RLTUPK5D.js")
  ]).then(([mono, style]) => ({ mono, style })),
  stepfun: () => Promise.all([
    import("/public/assets/chunks/Mono-QDYBBLZ4.js"),
    import("/public/assets/chunks/style-QQUCCY5E.js")
  ]).then(([mono, style]) => ({ mono, style })),
  step: () => Promise.all([
    import("/public/assets/chunks/Mono-QDYBBLZ4.js"),
    import("/public/assets/chunks/style-QQUCCY5E.js")
  ]).then(([mono, style]) => ({ mono, style })),
  sensenova: () => Promise.all([
    import("/public/assets/chunks/Mono-DAD7TFPJ.js"),
    import("/public/assets/chunks/style-HSUMQUN4.js")
  ]).then(([mono, style]) => ({ mono, style })),
  sensetime: () => Promise.all([
    import("/public/assets/chunks/Mono-DAD7TFPJ.js"),
    import("/public/assets/chunks/style-HSUMQUN4.js")
  ]).then(([mono, style]) => ({ mono, style })),
  qingyan: () => Promise.all([
    import("/public/assets/chunks/Mono-2M47KO23.js"),
    import("/public/assets/chunks/style-ZKQVR3O7.js")
  ]).then(([mono, style]) => ({ mono, style })),
  coze: () => Promise.all([
    import("/public/assets/chunks/Mono-YO4PS6HO.js"),
    import("/public/assets/chunks/style-G2DWGETC.js")
  ]).then(([mono, style]) => ({ mono, style })),
  yuanbao: () => Promise.all([
    import("/public/assets/chunks/Mono-NEKC2G4I.js"),
    import("/public/assets/chunks/style-7OSYPKOC.js")
  ]).then(([mono, style]) => ({ mono, style })),
  tiangong: () => Promise.all([
    import("/public/assets/chunks/Mono-V22Q4XNO.js"),
    import("/public/assets/chunks/style-RMMRW2Z7.js")
  ]).then(([mono, style]) => ({ mono, style })),
  skywork: () => Promise.all([
    import("/public/assets/chunks/Mono-LDRAZKO6.js"),
    import("/public/assets/chunks/style-2PKUCCTJ.js")
  ]).then(([mono, style]) => ({ mono, style })),
  // ── 推理/托管平台 ─────────────────────────────────
  groq: () => Promise.all([
    import("/public/assets/chunks/Mono-UJOUF3CE.js"),
    import("/public/assets/chunks/style-7ZCPW32Z.js")
  ]).then(([mono, style]) => ({ mono, style })),
  together: () => Promise.all([
    import("/public/assets/chunks/Mono-I7YVL6G2.js"),
    import("/public/assets/chunks/style-GLR34AQG.js")
  ]).then(([mono, style]) => ({ mono, style })),
  deepinfra: () => Promise.all([
    import("/public/assets/chunks/Mono-RG76A2L6.js"),
    import("/public/assets/chunks/style-6QFZRE2L.js")
  ]).then(([mono, style]) => ({ mono, style })),
  fireworks: () => Promise.all([
    import("/public/assets/chunks/Mono-JY3LMUPQ.js"),
    import("/public/assets/chunks/style-LEUMWVRR.js")
  ]).then(([mono, style]) => ({ mono, style })),
  openrouter: () => Promise.all([
    import("/public/assets/chunks/Mono-OQ7P4DSA.js"),
    import("/public/assets/chunks/style-QRX6NHHD.js")
  ]).then(([mono, style]) => ({ mono, style })),
  novita: () => Promise.all([
    import("/public/assets/chunks/Mono-EDH2RVBY.js"),
    import("/public/assets/chunks/style-NRYKK4CS.js")
  ]).then(([mono, style]) => ({ mono, style })),
  sambanova: () => Promise.all([
    import("/public/assets/chunks/Mono-DCSG2EFP.js"),
    import("/public/assets/chunks/style-3MEU3GE4.js")
  ]).then(([mono, style]) => ({ mono, style })),
  cerebras: () => Promise.all([
    import("/public/assets/chunks/Mono-NNHKX75K.js"),
    import("/public/assets/chunks/style-FFARMEFI.js")
  ]).then(([mono, style]) => ({ mono, style })),
  siliconcloud: () => Promise.all([
    import("/public/assets/chunks/Mono-LEGH777H.js"),
    import("/public/assets/chunks/style-YNZI22OI.js")
  ]).then(([mono, style]) => ({ mono, style })),
  ollama: () => Promise.all([
    import("/public/assets/chunks/Mono-L7EF42XH.js"),
    import("/public/assets/chunks/style-6HK3UIJE.js")
  ]).then(([mono, style]) => ({ mono, style })),
  lmstudio: () => Promise.all([
    import("/public/assets/chunks/Mono-RCUAR6KI.js"),
    import("/public/assets/chunks/style-EWZBYWOT.js")
  ]).then(([mono, style]) => ({ mono, style })),
  huggingface: () => Promise.all([
    import("/public/assets/chunks/Mono-V2FIEZDM.js"),
    import("/public/assets/chunks/style-45RRWVOB.js")
  ]).then(([mono, style]) => ({ mono, style })),
  replicate: () => Promise.all([
    import("/public/assets/chunks/Mono-4VTHSJYX.js"),
    import("/public/assets/chunks/style-N554YODI.js")
  ]).then(([mono, style]) => ({ mono, style }))
};
var _cache = {};
var _pending = {};
async function get(key) {
  if (key in _cache) return _cache[key] ?? null;
  if (key in _pending) return _pending[key];
  const factory = MAP[key];
  if (!factory) return null;
  _pending[key] = factory().then(({ avatar, mono, style }) => {
    const builtInAvatar = avatar?.default;
    if (builtInAvatar) {
      _cache[key] = builtInAvatar;
      return builtInAvatar;
    }
    const Mono = mono?.default;
    const comp = Mono && style ? createAvatarComponent(Mono, style) : null;
    _cache[key] = comp;
    return comp;
  }).catch(() => {
    _cache[key] = null;
    return null;
  }).finally(() => {
    delete _pending[key];
  });
  return _pending[key];
}
async function getModelAvatarComponent(provider, model, cliProvider) {
  const m = (model || "").toLowerCase();
  const p = (provider || "").toLowerCase();
  const cliProviderKey = (cliProvider || "").toLowerCase();
  if (cliProviderKey === "gemini") return get("gemini");
  if (cliProviderKey === "copilot") return get("copilot");
  if (cliProviderKey === "codex") return get("openai");
  if (cliProviderKey === "claude") return get("claude");
  if (cliProviderKey === "agy") return get("gemini");
  if (cliProviderKey === "qoder") return get("openai");
  if (cliProviderKey === "opencode") return get("openai");
  if (cliProviderKey === "grok") return get("grok");
  if (m.includes("claude")) return get("claude");
  if (m.includes("gpt") || /\bo\d[-/]/.test(m)) return get("openai");
  if (m.includes("gemini") || m.includes("gemma")) return get("gemini");
  if (m.includes("deepseek")) return get("deepseek");
  if (m.includes("qwen")) return get("qwen");
  if (m.includes("grok")) return get("grok");
  if (m.includes("mistral") || m.includes("mixtral")) return get("mistral");
  if (m.includes("llama") || m.includes("meta/")) return get("llama");
  if (m.includes("kimi")) return get("kimi");
  if (m.includes("moonshot")) return get("moonshot");
  if (m.includes("minimax") || m.includes("abab")) return get("minimax");
  if (m.includes("glm") || m.includes("chatglm")) return get("glm");
  if (m.includes("doubao")) return get("doubao");
  if (m.includes("hunyuan")) return get("hunyuan");
  if (m.includes("ernie") || m.includes("wenxin")) return get("wenxin");
  if (m.includes("baichuan")) return get("baichuan");
  if (m.includes("yi-") || /^yi\d/.test(m)) return get("yi");
  if (m.includes("internlm")) return get("internlm");
  if (m.includes("spark")) return get("spark");
  if (m.includes("step-") || m.startsWith("step")) return get("stepfun");
  if (m.includes("sensenova") || m.includes("nova-")) return get("sensenova");
  if (m.includes("tiangong")) return get("tiangong");
  if (m.includes("skywork")) return get("skywork");
  if (m.includes("perplexity")) return get("perplexity");
  if (m.includes("command")) return get("cohere");
  if (p === "nolo" || p === "ollama-cloud" || p === "ollamacloud") {
    return null;
  }
  const providerKey = p.replace(/[-_\s]/g, "").toLowerCase();
  return await get(providerKey) ?? await get(p) ?? null;
}

// packages/ai/agent/web/useAgentModelAvatarComponent.ts
var useAgentModelAvatarComponent = ({
  cliProvider,
  model,
  provider
}) => {
  const [modelAvatarStyle, setModelAvatarStyle] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    let cancelled = false;
    setModelAvatarStyle(null);
    getModelAvatarComponent(provider, model, cliProvider).then((avatar) => {
      if (!cancelled) {
        setModelAvatarStyle(() => avatar);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cliProvider, model, provider]);
  return modelAvatarStyle;
};

// packages/ai/agent/web/AgentAvatar.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
var AgentAvatar = ({
  agent,
  size = 40,
  avatarSize = "large",
  className = "agent__avatar-img"
}) => {
  const currentServer = useAppSelector(selectCurrentServer);
  const server = agent.authorityServer || agent.originServer || currentServer;
  const hasMounted = useHasMounted();
  const customAvatarUrl = resolveAvatarUrl(agent.avatarFileId, hasMounted ? server : null);
  const {
    shouldRenderImage: shouldRenderCustomAvatar,
    handleImageError: handleCustomAvatarError
  } = useImageLoadFallback(customAvatarUrl);
  const modelAvatarStyle = useAgentModelAvatarComponent({
    cliProvider: agent.cliProvider,
    model: agent.model,
    provider: agent.provider
  });
  if (shouldRenderCustomAvatar && customAvatarUrl) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: customAvatarUrl,
        alt: agent.name || "",
        className,
        style: { width: size, height: size, objectFit: "cover" },
        onError: handleCustomAvatarError
      }
    );
  }
  if (modelAvatarStyle) {
    const ModelAvatar = modelAvatarStyle;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelAvatar, { size });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Avatar_default,
    {
      name: agent.name,
      type: "agent",
      size: avatarSize,
      className,
      style: { width: size, height: size }
    }
  );
};
var AgentAvatar_default = AgentAvatar;

export {
  AgentAvatar_default
};
