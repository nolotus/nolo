import {
  CUSTOM_API_KEY_TEMPLATES,
  SUBSCRIPTION_OAUTH_PROVIDERS,
  useCreateDialog
} from "/public/assets/chunks/chunk-GGBHLXJC.js";
import {
  markRecentlyCreated
} from "/public/assets/chunks/chunk-HOEAUVHJ.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import "/public/assets/chunks/chunk-CD3MPOQP.js";
import {
  localFirstLog
} from "/public/assets/chunks/chunk-JFTWAW4J.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import "/public/assets/chunks/chunk-OOUNP25R.js";
import "/public/assets/chunks/chunk-B4ZQOXFP.js";
import {
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useStore
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  createAgent,
  createAgentKey,
  scanInstalledClis
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuArrowLeft,
  LuArrowRight,
  LuClock,
  LuKey,
  LuShield,
  LuSparkles,
  LuTerminal
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  CLI_PROVIDER_VALUES
} from "/public/assets/chunks/chunk-LPS7IE46.js";
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

// packages/app/pages/LocalQuickCreateAgent.tsx
var import_react = __toESM(require_react());

// packages/ai/agent/agentSourceDescriptors.ts
var OLLAMA_DEFAULTS = {
  provider: "ollama",
  model: "llama3.2",
  customProviderUrl: "http://127.0.0.1:11434/v1"
};
var LM_STUDIO_DEFAULTS = {
  provider: "lmstudio",
  model: "local-model",
  customProviderUrl: "http://localhost:1234/v1"
};
var LATER_DEFAULTS = {
  provider: "custom",
  model: "local-model",
  customProviderUrl: null
};
var CLI_SESSION_META = {
  copilot: {
    label: "GitHub Copilot CLI",
    binaryHint: "gh copilot",
    description: "\u9700\u5DF2\u5B89\u88C5 gh + Copilot \u6269\u5C55\u5E76\u767B\u5F55"
  },
  gemini: {
    label: "Gemini CLI",
    binaryHint: "gemini",
    description: "\u9700\u5DF2\u5B89\u88C5 gemini CLI \u5E76\u767B\u5F55"
  },
  codex: {
    label: "OpenAI Codex CLI",
    binaryHint: "codex",
    description: "\u9700\u5DF2\u5B89\u88C5 codex CLI \u5E76\u767B\u5F55"
  },
  claude: {
    label: "Claude Code CLI",
    binaryHint: "claude",
    description: "\u9700\u5DF2\u5B89\u88C5 claude CLI \u5E76\u767B\u5F55\uFF08claude -p\uFF09"
  },
  agy: {
    label: "Antigravity CLI",
    binaryHint: "agy",
    description: "\u9700\u5DF2\u5B89\u88C5 agy CLI \u5E76\u767B\u5F55"
  },
  qoder: {
    label: "Qoder CLI",
    binaryHint: "qoder",
    description: "\u9700\u5DF2\u5B89\u88C5 qoder CLI \u5E76\u767B\u5F55"
  },
  opencode: {
    label: "OpenCode CLI",
    binaryHint: "opencode",
    description: "\u9700\u5DF2\u5B89\u88C5 opencode CLI \u5E76\u767B\u5F55"
  },
  grok: {
    label: "Grok CLI",
    binaryHint: "grok",
    description: "\u9700\u5DF2\u5B89\u88C5 grok CLI \u5E76\u767B\u5F55\u6216\u914D\u7F6E XAI_API_KEY"
  },
  kimi: {
    label: "Kimi Code CLI",
    binaryHint: "kimi",
    description: "\u9700\u5DF2\u5B89\u88C5 kimi CLI \u5E76\u767B\u5F55"
  }
};
function oauthDescriptor(preset) {
  return {
    sourceKey: `oauth:${preset.apiKeyRef}`,
    commercialKind: "subscription",
    accessVariant: "oauth",
    group: "subscription_oauth",
    label: preset.label,
    description: preset.description,
    registryPresetId: preset.id,
    oauthApiKeyRef: preset.apiKeyRef,
    oauthAuthCommand: `nolo auth ${preset.apiKeyRef}`,
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: preset.provider,
      model: preset.defaultModel ?? null,
      // Antigravity uses Cloud Code URL; ChatGPT/xAI leave unset for runtime resolution.
      customProviderUrl: preset.cloudCodeBaseUrl ?? null,
      apiKeyRef: preset.apiKeyRef,
      apiKeyHeader: null,
      cliProvider: null
    }
  };
}
function templateDescriptor(template) {
  const { accessVariant, commercialKind } = template;
  const isTokenPlan = accessVariant === "token_plan_endpoint";
  return {
    sourceKey: `template:${template.id}`,
    commercialKind,
    accessVariant,
    group: isTokenPlan ? "token_plan" : "metered_api",
    recommended: isTokenPlan,
    label: template.label,
    description: template.description,
    registryPresetId: template.id,
    requiresApiKey: true,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: template.provider,
      model: template.defaultModel ?? null,
      customProviderUrl: template.baseUrl,
      apiKeyRef: null,
      apiKeyHeader: template.apiKeyHeader ?? null,
      cliProvider: null
    }
  };
}
function cliDescriptor(cliProvider) {
  const meta = CLI_SESSION_META[cliProvider];
  return {
    sourceKey: `cli:${cliProvider}`,
    commercialKind: "cli",
    accessVariant: "cli_session",
    group: "cli_session",
    label: meta.label,
    description: meta.description,
    cliBinaryHint: meta.binaryHint,
    requiresApiKey: false,
    form: {
      apiSource: "cli",
      useServerProxy: false,
      provider: null,
      model: null,
      customProviderUrl: null,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider
    }
  };
}
function ollamaDescriptor() {
  return {
    sourceKey: "local:ollama",
    commercialKind: "local",
    accessVariant: "local_runtime",
    group: "local_later",
    label: "Ollama \u672C\u673A",
    description: "\u5DF2\u88C5 Ollama \u65F6\u4E00\u952E\u53EF\u7528\uFF0C\u9ED8\u8BA4 localhost",
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: OLLAMA_DEFAULTS.provider,
      model: OLLAMA_DEFAULTS.model,
      customProviderUrl: OLLAMA_DEFAULTS.customProviderUrl,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider: null
    }
  };
}
function lmStudioDescriptor() {
  return {
    sourceKey: "local:lmstudio",
    commercialKind: "local",
    accessVariant: "local_runtime",
    group: "local_later",
    label: "LM Studio \u672C\u673A",
    description: "\u5DF2\u5F00 LM Studio \u672C\u5730\u670D\u52A1\u65F6\u53EF\u7528\uFF0C\u9ED8\u8BA4 localhost:1234",
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: LM_STUDIO_DEFAULTS.provider,
      model: LM_STUDIO_DEFAULTS.model,
      customProviderUrl: LM_STUDIO_DEFAULTS.customProviderUrl,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider: null
    }
  };
}
function laterDescriptor() {
  return {
    sourceKey: "local:later",
    commercialKind: "local",
    accessVariant: "configure_later",
    group: "local_later",
    label: "\u7A0D\u540E\u914D\u7F6E",
    description: "\u5148\u5EFA\u597D Agent\uFF0C\u6A21\u578B\u7A0D\u540E\u518D\u63A5",
    requiresApiKey: false,
    form: {
      apiSource: "custom",
      useServerProxy: false,
      provider: LATER_DEFAULTS.provider,
      model: LATER_DEFAULTS.model,
      customProviderUrl: LATER_DEFAULTS.customProviderUrl,
      apiKeyRef: null,
      apiKeyHeader: null,
      cliProvider: null
    }
  };
}
function listAgentSourceDescriptors() {
  const tokenPlan = [];
  const metered = [];
  for (const template of CUSTOM_API_KEY_TEMPLATES) {
    const d = templateDescriptor(template);
    if (d.group === "token_plan") tokenPlan.push(d);
    else metered.push(d);
  }
  return [
    ...tokenPlan,
    ...SUBSCRIPTION_OAUTH_PROVIDERS.map(oauthDescriptor),
    ...metered,
    ...CLI_PROVIDER_VALUES.map(cliDescriptor),
    ollamaDescriptor(),
    lmStudioDescriptor(),
    laterDescriptor()
  ];
}
function getAgentSourceDescriptor(sourceKey) {
  return listAgentSourceDescriptors().find((d) => d.sourceKey === sourceKey);
}
function projectAgentSourceFormData(input) {
  const descriptor = getAgentSourceDescriptor(input.sourceKey);
  if (!descriptor) {
    throw new Error(`Unknown agent source descriptor: ${input.sourceKey}`);
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error("Agent name is required for form projection");
  }
  const base = {
    name,
    isPublic: false,
    tools: [],
    prompt: "",
    inputPrice: 0,
    outputPrice: 0,
    defaultInteractionMode: "text",
    hasVision: false,
    references: []
  };
  const modelOverride = (input.model ?? "").trim();
  const urlOverride = (input.customProviderUrl ?? "").trim();
  if (descriptor.accessVariant === "oauth") {
    return {
      ...base,
      apiSource: "custom",
      useServerProxy: false,
      provider: descriptor.form.provider ?? null,
      model: modelOverride || descriptor.form.model || "",
      customProviderUrl: urlOverride || descriptor.form.customProviderUrl || null,
      apiKeyRef: descriptor.form.apiKeyRef ?? descriptor.oauthApiKeyRef ?? null
    };
  }
  if (descriptor.accessVariant === "cli_session") {
    const cliProvider = descriptor.form.cliProvider;
    if (!cliProvider) {
      throw new Error(`CLI descriptor missing cliProvider: ${descriptor.sourceKey}`);
    }
    return {
      ...base,
      apiSource: "cli",
      useServerProxy: false,
      // machineId intentionally unset — advanced binding only.
      // No apiKey / apiKeyRef — session lives in the host CLI.
      cliProvider,
      ...modelOverride ? { model: modelOverride } : {}
    };
  }
  if (descriptor.accessVariant === "configure_later") {
    return {
      ...base,
      apiSource: "custom",
      useServerProxy: false,
      provider: descriptor.form.provider ?? "custom",
      model: modelOverride || descriptor.form.model || "local-model",
      customProviderUrl: urlOverride || null
    };
  }
  const projected = {
    ...base,
    apiSource: "custom",
    useServerProxy: false,
    provider: descriptor.form.provider ?? null,
    model: modelOverride || descriptor.form.model || "",
    customProviderUrl: urlOverride || descriptor.form.customProviderUrl || null,
    ...descriptor.form.apiKeyHeader ? { apiKeyHeader: descriptor.form.apiKeyHeader } : {}
  };
  if (descriptor.requiresApiKey) {
    const key = (input.apiKey ?? "").trim();
    if (key) projected.apiKey = key;
  }
  return projected;
}

// packages/app/pages/LocalQuickCreateAgent.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime());
function resolveAgentDbKey(agent, ownerUserId) {
  const id = asTrimmedString(agent.id);
  if (!id) return "";
  if (agent.isPublic) return createAgentKey.public(id);
  const owner = asOptionalTrimmedString(agent.userId) ?? ownerUserId;
  return createAgentKey.private(owner, id);
}
function parsePath(raw) {
  if (raw === "byo" || raw === "membership") return raw;
  return null;
}
function filterByPath(path, membershipAccess) {
  const all = listAgentSourceDescriptors();
  if (path === "byo") {
    return all.filter(
      (d) => d.accessVariant === "metered_key" || d.accessVariant === "local_runtime" || d.accessVariant === "configure_later"
    );
  }
  if (membershipAccess === "cli") {
    return all.filter((d) => d.accessVariant === "cli_session");
  }
  if (membershipAccess === "oauth") {
    return all.filter((d) => d.accessVariant === "oauth");
  }
  if (membershipAccess === "api_key") {
    return all.filter((d) => d.accessVariant === "token_plan_endpoint");
  }
  return [];
}
function iconForDescriptor(d) {
  switch (d.accessVariant) {
    case "oauth":
      return LuShield;
    case "cli_session":
      return LuTerminal;
    case "local_runtime":
      return LuSparkles;
    case "configure_later":
      return LuClock;
    default:
      return LuKey;
  }
}
function orderSourcesWithInstalledCli(candidates, installed) {
  if (installed.length === 0) return candidates;
  const installedSet = new Set(installed);
  const detected = [];
  const rest = [];
  for (const d of candidates) {
    const provider = d.form.cliProvider;
    if (provider && installedSet.has(provider)) {
      detected.push(d);
    } else {
      rest.push(d);
    }
  }
  return [...detected, ...rest];
}
var LocalQuickCreateAgent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const store = useStore();
  const { createNewDialog } = useCreateDialog();
  const accountUserId = useUserId();
  const ownerUserId = asOptionalTrimmedString(accountUserId) ?? "local";
  const initialPath = parsePath(searchParams.get("path"));
  const [path, setPath] = (0, import_react.useState)(initialPath);
  const [membershipAccess, setMembershipAccess] = (0, import_react.useState)(null);
  const [sourceKey, setSourceKey] = (0, import_react.useState)(null);
  const [name, setName] = (0, import_react.useState)("");
  const [apiKey, setApiKey] = (0, import_react.useState)("");
  const [model, setModel] = (0, import_react.useState)("");
  const [baseUrl, setBaseUrl] = (0, import_react.useState)("");
  const [showEndpointFields, setShowEndpointFields] = (0, import_react.useState)(false);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [installedClis, setInstalledClis] = (0, import_react.useState)([]);
  const [cliScanBusy, setCliScanBusy] = (0, import_react.useState)(false);
  const step = !path ? "path" : path === "membership" && !membershipAccess ? "membership" : !sourceKey ? "source" : "form";
  const candidates = (0, import_react.useMemo)(() => {
    if (!path) return [];
    if (path === "membership" && !membershipAccess) return [];
    const base = filterByPath(path, membershipAccess);
    if (membershipAccess === "cli" && installedClis.length > 0) {
      return orderSourcesWithInstalledCli(base, installedClis);
    }
    return base;
  }, [path, membershipAccess, installedClis]);
  const installedCliSet = (0, import_react.useMemo)(
    () => new Set(installedClis),
    [installedClis]
  );
  (0, import_react.useEffect)(() => {
    if (step !== "source" || membershipAccess !== "cli") return;
    if (!getIsDesktopApp()) return;
    let cancelled = false;
    setCliScanBusy(true);
    localFirstLog("quickCreate.cliScan.start", {});
    void scanInstalledClis({ getState: () => store.getState() }).then((list) => {
      if (cancelled) return;
      setInstalledClis(list);
      localFirstLog("quickCreate.cliScan.done", {
        count: list.length,
        providers: list.join(",")
      });
    }).catch(() => {
      if (cancelled) return;
      setInstalledClis([]);
    }).finally(() => {
      if (!cancelled) setCliScanBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [membershipAccess, store, step]);
  const selected = (0, import_react.useMemo)(
    () => sourceKey ? getAgentSourceDescriptor(sourceKey) : void 0,
    [sourceKey]
  );
  const pickSource = (0, import_react.useCallback)((key) => {
    const d = getAgentSourceDescriptor(key);
    setSourceKey(key);
    setError(null);
    setShowEndpointFields(false);
    if (!d) return;
    setModel(d.form.model ?? "");
    setBaseUrl(d.form.customProviderUrl ?? "");
    if (!d.requiresApiKey) setApiKey("");
  }, []);
  const choosePath = (0, import_react.useCallback)((next) => {
    setPath(next);
    setMembershipAccess(null);
    setSourceKey(null);
    setApiKey("");
    setError(null);
    setShowEndpointFields(false);
    localFirstLog("quickCreate.path", { path: next });
  }, []);
  const chooseMembershipAccess = (0, import_react.useCallback)((access) => {
    setMembershipAccess(access);
    setSourceKey(null);
    setApiKey("");
    setError(null);
    setShowEndpointFields(false);
    localFirstLog("quickCreate.membershipAccess", { access });
  }, []);
  const goBack = (0, import_react.useCallback)(() => {
    setError(null);
    if (step === "form") {
      setSourceKey(null);
      return;
    }
    if (step === "source") {
      if (path === "membership") {
        setMembershipAccess(null);
      } else {
        setPath(null);
      }
      return;
    }
    if (step === "membership") {
      setPath(null);
    }
  }, [step, path]);
  const displayName = (0, import_react.useMemo)(() => {
    const trimmed = name.trim();
    if (trimmed) return trimmed;
    if (!selected) return t("localFirst.quickCreate.defaultLaterName", "\u6211\u7684\u672C\u5730\u52A9\u624B");
    if (selected.accessVariant === "local_runtime")
      return t("localFirst.quickCreate.defaultOllamaName", "\u672C\u673A Ollama");
    if (selected.accessVariant === "configure_later")
      return t("localFirst.quickCreate.defaultLaterName", "\u6211\u7684\u672C\u5730\u52A9\u624B");
    return t("localFirst.quickCreate.defaultNamed", {
      label: selected.label,
      defaultValue: `\u6211\u7684${selected.label}`
    });
  }, [name, selected, t]);
  const needsApiKey = Boolean(selected?.requiresApiKey);
  const isOAuth = selected?.accessVariant === "oauth";
  const isCli = selected?.accessVariant === "cli_session";
  const isOllama = selected?.accessVariant === "local_runtime";
  const isLater = selected?.accessVariant === "configure_later";
  const onSubmit = (0, import_react.useCallback)(
    async (event) => {
      event?.preventDefault();
      if (busy || !sourceKey || !selected) return;
      setBusy(true);
      setError(null);
      localFirstLog("quickCreate.submit", {
        path: path || "",
        sourceKey,
        owner: ownerUserId,
        hasApiKey: Boolean(apiKey.trim())
        // never log apiKey contents
      });
      try {
        if (needsApiKey && !apiKey.trim()) {
          setError(t("localFirst.quickCreate.apiKeyRequired", "\u8BF7\u7C98\u8D34 API Key\u3002"));
          setBusy(false);
          return;
        }
        const formData = projectAgentSourceFormData({
          sourceKey,
          name: displayName,
          apiKey: needsApiKey ? apiKey : null,
          model,
          customProviderUrl: baseUrl
        });
        const agent = await dispatch(
          createAgent({
            userId: ownerUserId,
            formData,
            spaceId: void 0
          })
        ).unwrap();
        setApiKey("");
        const agentDbKey = resolveAgentDbKey(agent, ownerUserId);
        if (!agentDbKey) {
          throw new Error(
            t(
              "localFirst.quickCreate.missingAgentId",
              "\u521B\u5EFA\u6210\u529F\u4F46\u7F3A\u5C11 Agent \u6807\u8BC6\uFF0C\u65E0\u6CD5\u6253\u5F00\u5BF9\u8BDD\u3002"
            )
          );
        }
        localFirstLog("quickCreate.done", {
          owner: ownerUserId,
          key: agentDbKey,
          sourceKey
        });
        markRecentlyCreated(agentDbKey);
        await createNewDialog({ agents: [agentDbKey] });
      } catch (err) {
        const message = err instanceof Error ? err.message : t("localFirst.quickCreate.failed", "\u521B\u5EFA\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
        setError(message);
        localFirstLog("quickCreate.error", { message: message.slice(0, 120) });
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      sourceKey,
      selected,
      path,
      ownerUserId,
      apiKey,
      needsApiKey,
      displayName,
      model,
      baseUrl,
      dispatch,
      createNewDialog,
      t
    ]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "local-quick-create", "data-testid": "local-quick-create", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "local-quick-create__card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "local-quick-create__header", children: [
      step !== "path" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: "local-quick-create__back",
          onClick: goBack,
          "data-testid": "local-quick-create-back",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowLeft, { size: 16, "aria-hidden": true }),
            t("localFirst.quickCreate.back", "\u8FD4\u56DE")
          ]
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "local-quick-create__title", children: step === "path" ? t("localFirst.quickCreate.titlePath", "\u600E\u4E48\u5F00\u59CB\uFF1F") : step === "membership" ? t(
        "localFirst.quickCreate.titleMembership",
        "\u4F60\u7684\u4F1A\u5458\u600E\u4E48\u8FDE\u8FDB\u6765\uFF1F"
      ) : step === "source" ? path === "byo" ? t(
        "localFirst.quickCreate.titleSourceByo",
        "\u586B Key \u6216\u672C\u5730\u5730\u5740"
      ) : t("localFirst.quickCreate.titleSource", "\u7528\u54EA\u4E00\u5BB6\uFF1F") : t("localFirst.quickCreate.titleForm", "\u5DEE\u4E0D\u591A\u597D\u4E86") }),
      step === "path" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__desc", children: t(
        "localFirst.quickCreate.descPath",
        "\u9009\u6700\u63A5\u8FD1\u4F60\u7684\u4E00\u9879\uFF0C\u6211\u4EEC\u4E00\u6B65\u6B65\u5E26\u4F60\u5EFA\u597D\u52A9\u624B\u3002"
      ) }) : null,
      step === "membership" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__desc", children: t(
        "localFirst.quickCreate.descMembership",
        "\u4E0D\u7528\u61C2\u6280\u672F\u540D\uFF0C\u6309\u4F60\u5E73\u65F6\u600E\u4E48\u7528\u90A3\u4E2A\u4F1A\u5458\u6765\u9009\u3002"
      ) }) : null,
      step === "source" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__desc", children: path === "byo" ? t(
        "localFirst.quickCreate.descSourceByo",
        "\u9009 API Key \u6A21\u677F\uFF0C\u6216\u672C\u673A Ollama / LM Studio\uFF0C\u540E\u9762\u8FD8\u80FD\u6539\u3002"
      ) : t(
        "localFirst.quickCreate.descSource",
        "\u70B9\u4E00\u4E0B\u5C31\u80FD\u7EE7\u7EED\uFF0C\u540E\u9762\u8FD8\u80FD\u6539\u3002"
      ) }) : null
    ] }),
    step === "path" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "local-quick-create__intent-list",
        "data-testid": "local-quick-create-path",
        role: "listbox",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              role: "option",
              "aria-selected": false,
              className: "local-quick-create__intent",
              "data-testid": "local-quick-create-path-byo",
              onClick: () => choosePath("byo"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-num", children: "1" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "local-quick-create__intent-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-title", children: t(
                    "localFirst.quickCreate.path.byo",
                    "\u6211\u6709 API Key / \u672C\u5730\u6A21\u578B"
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-hint", children: t(
                    "localFirst.quickCreate.path.byoHint",
                    "OpenAI Key\u3001Ollama\u3001LM Studio\u3001\u517C\u5BB9\u7AEF\u70B9"
                  ) })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              role: "option",
              "aria-selected": false,
              className: "local-quick-create__intent",
              "data-testid": "local-quick-create-path-membership",
              onClick: () => choosePath("membership"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-num", children: "2" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "local-quick-create__intent-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-title", children: t(
                    "localFirst.quickCreate.path.membership",
                    "\u6211\u5728\u7528\u67D0\u5BB6 AI \u4F1A\u5458/\u8BA2\u9605"
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-hint", children: t(
                    "localFirst.quickCreate.path.membershipHint",
                    "Claude\u3001ChatGPT\u3001Grok\u3001Token Plan\u2026"
                  ) })
                ] })
              ]
            }
          )
        ]
      }
    ) : null,
    step === "membership" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "local-quick-create__intent-list",
        "data-testid": "local-quick-create-membership-access",
        role: "listbox",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              role: "option",
              "aria-selected": false,
              className: "local-quick-create__intent",
              "data-testid": "local-quick-create-membership-cli",
              onClick: () => chooseMembershipAccess("cli"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-num", children: "1" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "local-quick-create__intent-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-title", children: t(
                    "localFirst.quickCreate.membership.cli",
                    "\u672C\u673A\u7EC8\u7AEF / CLI \u5DF2\u7ECF\u767B\u5F55"
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-hint", children: t(
                    "localFirst.quickCreate.membership.cliHint",
                    "Claude Code\u3001Codex\u3001Grok CLI \u7B49"
                  ) })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              role: "option",
              "aria-selected": false,
              className: "local-quick-create__intent",
              "data-testid": "local-quick-create-membership-api-key",
              onClick: () => chooseMembershipAccess("api_key"),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-num", children: "2" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "local-quick-create__intent-body", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-title", children: t(
                    "localFirst.quickCreate.membership.apiKey",
                    "\u4F1A\u5458\u53D1\u4E86 Key \u548C\u63A5\u53E3\u5730\u5740"
                  ) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__intent-hint", children: t(
                    "localFirst.quickCreate.membership.apiKeyHint",
                    "\u4F8B\u5982 Token Plan \u8FD9\u7C7B\u5957\u9910"
                  ) })
                ] })
              ]
            }
          )
        ]
      }
    ) : null,
    step === "source" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "local-quick-create__presets",
        role: "listbox",
        "data-testid": "local-quick-create-source-list",
        children: [
          membershipAccess === "cli" && cliScanBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "p",
            {
              className: "local-quick-create__scan-hint",
              "data-testid": "local-quick-create-cli-scan",
              children: t(
                "localFirst.quickCreate.cliScanning",
                "\u6B63\u5728\u68C0\u6D4B\u672C\u673A\u5DF2\u5B89\u88C5\u7684 CLI\u2026"
              )
            }
          ) : null,
          candidates.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__defaults-hint", children: t("localFirst.quickCreate.emptySources", "\u6682\u65E0\u53EF\u7528\u9009\u9879") }) : candidates.map((d) => {
            const Icon = iconForDescriptor(d);
            const detected = Boolean(
              d.form.cliProvider && installedCliSet.has(d.form.cliProvider)
            );
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                role: "option",
                "aria-selected": false,
                className: detected ? "local-quick-create__preset is-detected" : "local-quick-create__preset",
                onClick: () => pickSource(d.sourceKey),
                "data-testid": `local-quick-create-source-${d.sourceKey}`,
                "data-source-key": d.sourceKey,
                "data-cli-detected": detected ? "true" : void 0,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 16, "aria-hidden": true }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "local-quick-create__preset-label", children: [
                    d.label,
                    detected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__preset-badge", children: t(
                      "localFirst.quickCreate.cliDetected",
                      "\u5DF2\u68C0\u6D4B\u5230"
                    ) }) : null
                  ] })
                ]
              },
              d.sourceKey
            );
          })
        ]
      }
    ) : null,
    step === "form" && selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "local-quick-create__form", onSubmit, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "local-quick-create__field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__label", children: t("localFirst.quickCreate.nameLabel", "\u7ED9\u52A9\u624B\u8D77\u4E2A\u540D\u5B57\uFF08\u53EF\u8DF3\u8FC7\uFF09") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: "local-quick-create__input",
            value: name,
            onChange: (e) => setName(e.target.value),
            placeholder: displayName,
            maxLength: 50,
            autoFocus: true,
            "data-testid": "local-quick-create-name"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__chosen", "data-testid": "local-quick-create-chosen", children: selected.label }),
      isOAuth && selected.oauthAuthCommand ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "p",
        {
          className: "local-quick-create__defaults-hint",
          "data-testid": "local-quick-create-oauth-hint",
          children: selected.oauthAuthCommand
        }
      ) : null,
      isCli ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "p",
        {
          className: "local-quick-create__defaults-hint",
          "data-testid": "local-quick-create-cli-hint",
          children: selected.cliBinaryHint || selected.label
        }
      ) : null,
      needsApiKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "local-quick-create__field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__label", children: "API Key" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: "local-quick-create__input",
            type: "password",
            autoComplete: "off",
            value: apiKey,
            onChange: (e) => setApiKey(e.target.value),
            placeholder: "sk-...",
            "data-testid": "local-quick-create-api-key"
          }
        )
      ] }) : null,
      needsApiKey || isOllama && showEndpointFields ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "local-quick-create__field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__label", children: t("localFirst.quickCreate.modelLabel", "\u6A21\u578B") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              className: "local-quick-create__input",
              value: model,
              onChange: (e) => setModel(e.target.value),
              "data-testid": "local-quick-create-model"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "local-quick-create__field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "local-quick-create__label", children: t("localFirst.quickCreate.endpointLabel", "\u63A5\u53E3\u5730\u5740") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              className: "local-quick-create__input",
              value: baseUrl,
              onChange: (e) => setBaseUrl(e.target.value),
              "data-testid": "local-quick-create-endpoint"
            }
          )
        ] })
      ] }) : null,
      isOllama && !showEndpointFields ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "local-quick-create__advanced",
          onClick: () => setShowEndpointFields(true),
          children: t("localFirst.quickCreate.changeDefaults", "\u6539\u5730\u5740/\u6A21\u578B")
        }
      ) : null,
      isLater ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__defaults-hint", children: t("localFirst.quickCreate.laterHint", "\u4E4B\u540E\u518D\u63A5\u6A21\u578B") }) : null,
      error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "local-quick-create__error", role: "alert", children: error }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "local-quick-create__actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        Button_default,
        {
          type: "submit",
          variant: "primary",
          size: "large",
          disabled: busy,
          icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuArrowRight, { size: 18 }),
          "data-testid": "local-quick-create-submit",
          children: busy ? t("localFirst.quickCreate.creating", "\u521B\u5EFA\u4E2D\u2026") : t("localFirst.quickCreate.submit", "\u521B\u5EFA\uFF0C\u5F00\u59CB\u804A\u5929")
        }
      ) })
    ] }) : null,
    step === "path" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "local-quick-create__advanced",
        onClick: () => navigate("/create/agent"),
        "data-testid": "local-quick-create-advanced",
        children: t("localFirst.quickCreate.advanced", "\u6211\u66F4\u60F3\u81EA\u5DF1\u586B\u5B8C\u6574\u914D\u7F6E")
      }
    ) : null
  ] }) });
};
var LocalQuickCreateAgent_default = LocalQuickCreateAgent;
export {
  LocalQuickCreateAgent_default as default,
  orderSourcesWithInstalledCli
};
