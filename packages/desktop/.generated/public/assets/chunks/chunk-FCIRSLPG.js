import {
  buildBuiltinObjectSkillReference
} from "/public/assets/chunks/chunk-SSBU25HK.js";
import {
  addContentToSpace,
  createAgentKey,
  createDialogKey,
  createMemoryKey,
  dialogMessageRange,
  format,
  formatISO,
  memoryOwnerRange,
  memorySubjectKindRange,
  prepareAndPersistMessage,
  read,
  readAndWait,
  removeCachedEntity,
  selectIdentityUserId,
  uiAskChoiceFunc,
  uiAskChoiceFunctionSchema,
  upsertSSREntity,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  isDevelopment
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  APP_BUILDER_PUBLIC_AGENT_KEY
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  extractCustomId
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  asOptionalPositiveFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  PLATFORM_HOSTED_GLM_52_MODEL,
  PLATFORM_HOSTED_GLM_PRICE,
  PLATFORM_HOSTED_KIMI_PROVIDER
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";

// packages/chat/dialog/objectAssistantRegistry.ts
var OBJECT_ASSISTANT_TO_SKILL = {
  page: "doc",
  table: "table",
  image: "image",
  file: "file"
};
var OBJECT_ASSISTANT_SIDEBAR_PREFIX = "objectAssistant";
var BUILTIN_OBJECT_ASSISTANT_IDS = {
  page: "builtin-doc-assistant-v1",
  table: "builtin-table-assistant-v1",
  image: "builtin-image-assistant-v1",
  file: "builtin-file-assistant-v1"
};
var OBJECT_ASSISTANT_UI = {
  app: {
    panelTitle: "\u5E94\u7528\u52A9\u624B",
    activePanelTitle: "\u5E94\u7528\u52A9\u624B",
    loginMessage: "\u767B\u5F55\u540E\u53EF\u5728\u4FA7\u8FB9\u680F\u4F7F\u7528\u52A9\u624B\u7EE7\u7EED\u4FEE\u6539\u5F53\u524D\u5E94\u7528",
    emptyMessage: "\u8FD8\u6CA1\u6709\u6536\u85CF AI \u52A9\u624B\uFF0C\u5148\u53BB AI \u5E7F\u573A\u901B\u901B\u5427"
  },
  page: {
    panelTitle: "\u6587\u6863\u52A9\u624B",
    activePanelTitle: "\u6587\u6863\u52A9\u624B",
    loginMessage: "\u767B\u5F55\u540E\u53EF\u5728\u4FA7\u8FB9\u680F\u4F7F\u7528\u6587\u6863\u52A9\u624B",
    emptyMessage: "\u6587\u6863\u52A9\u624B\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
  },
  table: {
    panelTitle: "\u8868\u683C\u52A9\u624B",
    activePanelTitle: "\u8868\u683C\u52A9\u624B",
    loginMessage: "\u767B\u5F55\u540E\u53EF\u5728\u4FA7\u8FB9\u680F\u4F7F\u7528\u8868\u683C\u52A9\u624B",
    emptyMessage: "\u8868\u683C\u52A9\u624B\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
  },
  image: {
    panelTitle: "\u56FE\u7247\u52A9\u624B",
    activePanelTitle: "\u56FE\u7247\u52A9\u624B",
    loginMessage: "\u767B\u5F55\u540E\u53EF\u5728\u4FA7\u8FB9\u680F\u4F7F\u7528\u56FE\u7247\u52A9\u624B",
    emptyMessage: "\u56FE\u7247\u52A9\u624B\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
  },
  file: {
    panelTitle: "\u6587\u4EF6\u52A9\u624B",
    activePanelTitle: "\u6587\u4EF6\u52A9\u624B",
    loginMessage: "\u767B\u5F55\u540E\u53EF\u5728\u4FA7\u8FB9\u680F\u4F7F\u7528\u6587\u4EF6\u52A9\u624B",
    emptyMessage: "\u6587\u4EF6\u52A9\u624B\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
  }
};
var getObjectAssistantUiConfig = (kind) => OBJECT_ASSISTANT_UI[kind];
var getPreferredObjectAssistantKey = (kind, userId) => {
  if (kind === "app") return [APP_BUILDER_PUBLIC_AGENT_KEY];
  if (!userId) return [];
  return [createAgentKey.private(userId, BUILTIN_OBJECT_ASSISTANT_IDS[kind])];
};
var buildObjectAssistantSidebarId = (kind, contentKey) => `${OBJECT_ASSISTANT_SIDEBAR_PREFIX}:${kind}:${contentKey ?? "current"}`;
var isObjectAssistantSidebarId = (id) => typeof id === "string" && id.startsWith(`${OBJECT_ASSISTANT_SIDEBAR_PREFIX}:`);
var resolveBuiltinObjectAssistantKindByKey = (agentKey, userId) => {
  if (!agentKey || !userId) return null;
  const entries = Object.entries(BUILTIN_OBJECT_ASSISTANT_IDS);
  for (const [kind, id] of entries) {
    if (agentKey === createAgentKey.private(userId, id)) {
      return kind;
    }
  }
  return null;
};
var buildBuiltinObjectAssistantAgent = (kind, userId) => {
  const id = BUILTIN_OBJECT_ASSISTANT_IDS[kind];
  const dbKey = createAgentKey.private(userId, id);
  const now = Date.now();
  const common = {
    id,
    dbKey,
    type: "agent" /* AGENT */,
    userId,
    isPublic: false,
    provider: PLATFORM_HOSTED_KIMI_PROVIDER,
    model: PLATFORM_HOSTED_GLM_52_MODEL,
    apiSource: "platform",
    useServerProxy: true,
    inputPrice: PLATFORM_HOSTED_GLM_PRICE.input,
    outputPrice: PLATFORM_HOSTED_GLM_PRICE.output,
    createdAt: now,
    updatedAt: String(now),
    dialogCount: 0,
    messageCount: 0,
    tokenCount: 0,
    tags: ["builtin", "sidebar-assistant", kind],
    references: [buildBuiltinObjectSkillReference(OBJECT_ASSISTANT_TO_SKILL[kind], userId)]
  };
  switch (kind) {
    case "page":
      return {
        ...common,
        name: "\u6587\u6863\u52A9\u624B",
        introduction: "\u5E2E\u4F60\u6DA6\u8272\u3001\u6539\u5199\u3001\u7EED\u5199\u3001\u6574\u7406\u7ED3\u6784\u4E0E\u6392\u7248\u7684\u6587\u6863\u52A9\u624B\u3002",
        greeting: {
          text: "\u4F60\u597D\uFF0C\u6211\u662F\u6587\u6863\u52A9\u624B \u270D\uFE0F\n\n\u4F60\u53EF\u4EE5\u76F4\u63A5\u5BF9\u6211\u8BF4\uFF1A\n\u2022 \u5E2E\u6211\u6DA6\u8272\u8FD9\u7BC7\u6587\u7AE0\n\u2022 \u628A\u7ED3\u6784\u6574\u7406\u5F97\u66F4\u6E05\u695A\n\u2022 \u7ED9\u8FD9\u4E00\u6BB5\u6539\u6210\u66F4\u53E3\u8BED/\u66F4\u4E13\u4E1A\n\u2022 \u5E2E\u6211\u8865\u4E00\u4E2A\u5F00\u5934\u6216\u7ED3\u5C3E",
          menu: [
            { id: "polish", label: "\u6DA6\u8272\u5F53\u524D\u6587\u6863", userMessage: "\u5E2E\u6211\u6DA6\u8272\u5F53\u524D\u6587\u6863\uFF0C\u8BA9\u8868\u8FBE\u66F4\u987A" },
            { id: "structure", label: "\u6574\u7406\u7ED3\u6784", userMessage: "\u5E2E\u6211\u6574\u7406\u5F53\u524D\u6587\u6863\u7ED3\u6784\uFF0C\u770B\u770B\u6807\u9898\u548C\u6BB5\u843D\u600E\u4E48\u66F4\u6E05\u695A" },
            { id: "continue", label: "\u7EE7\u7EED\u5199", userMessage: "\u57FA\u4E8E\u5F53\u524D\u6587\u6863\u7EE7\u7EED\u5F80\u4E0B\u5199" }
          ]
        },
        prompt: "\u4F60\u662F\u4E00\u4E2A\u6587\u6863\u7F16\u8F91\u52A9\u624B\u3002\u4F18\u5148\u57FA\u4E8E\u5F53\u524D\u6587\u6863\u505A\u589E\u91CF\u4FEE\u6539\uFF0C\u4E0D\u8981\u8131\u79BB\u73B0\u6709\u5185\u5BB9\u7A7A\u60F3\u91CD\u5199\u3002\u91CD\u70B9\u5E2E\u52A9\u7528\u6237\u6DA6\u8272\u3001\u6539\u5199\u3001\u7EED\u5199\u3001\u91CD\u7EC4\u7ED3\u6784\u3001\u751F\u6210\u6807\u9898\u548C\u6458\u8981\u3002\u6D89\u53CA\u4FEE\u6539\u65F6\uFF0C\u4F18\u5148\u8BFB\u53D6\u5F53\u524D\u6587\u6863\u771F\u503C\uFF0C\u518D\u8FDB\u884C\u5B9A\u70B9\u7F16\u8F91\u3002"
      };
    case "table":
      return {
        ...common,
        name: "\u8868\u683C\u52A9\u624B",
        introduction: "\u5E2E\u4F60\u7406\u89E3\u8868\u7ED3\u6784\u3001\u8865\u6570\u636E\u3001\u6539\u6570\u636E\u548C\u6574\u7406\u5B57\u6BB5\u7684\u8868\u683C\u52A9\u624B\u3002",
        greeting: {
          text: "\u4F60\u597D\uFF0C\u6211\u662F\u8868\u683C\u52A9\u624B \u{1F4CA}\n\n\u4F60\u53EF\u4EE5\u76F4\u63A5\u5BF9\u6211\u8BF4\uFF1A\n\u2022 \u5E2E\u6211\u770B\u770B\u8FD9\u5F20\u8868\u8FD8\u7F3A\u4EC0\u4E48\u5B57\u6BB5\n\u2022 \u7ED9\u8868\u91CC\u52A0\u4E00\u6761\u8BB0\u5F55\n\u2022 \u628A\u67D0\u4E00\u5217\u7EDF\u4E00\u6539\u4E00\u4E0B\n\u2022 \u6309\u8FD9\u4E2A\u6761\u4EF6\u5E2E\u6211\u6574\u7406\u6570\u636E",
          menu: [
            { id: "inspect", label: "\u770B\u770B\u8FD9\u5F20\u8868", userMessage: "\u5E2E\u6211\u770B\u770B\u5F53\u524D\u8FD9\u5F20\u8868\u7684\u7ED3\u6784\u548C\u53EF\u6539\u8FDB\u70B9" },
            { id: "add-row", label: "\u65B0\u589E\u6570\u636E", userMessage: "\u6211\u60F3\u5F80\u5F53\u524D\u8868\u91CC\u65B0\u589E\u4E00\u6761\u6570\u636E" },
            { id: "fix-data", label: "\u6279\u91CF\u6539\u6570\u636E", userMessage: "\u6211\u60F3\u4FEE\u6539\u5F53\u524D\u8868\u91CC\u7684\u90E8\u5206\u6570\u636E" }
          ]
        },
        prompt: "\u4F60\u662F\u4E00\u4E2A\u8868\u683C\u7F16\u8F91\u52A9\u624B\u3002\u4F18\u5148\u5E2E\u52A9\u7528\u6237\u7406\u89E3\u5F53\u524D\u8868\u7684\u5B57\u6BB5\u3001\u8BB0\u5F55\u548C\u7ED3\u6784\uFF0C\u7136\u540E\u518D\u505A\u65B0\u589E\u3001\u67E5\u8BE2\u3001\u66F4\u65B0\u6216\u5220\u9664\u3002\u5BF9\u7528\u6237\u8BF4\u201C\u8FD9\u4E2A\u8868\u91CC\u7684 xxx \u600E\u4E48\u600E\u4E48\u6539\u201D\u65F6\uFF0C\u9ED8\u8BA4\u7406\u89E3\u4E3A\u5F53\u524D\u805A\u7126\u6216\u6700\u8FD1\u63D0\u5230\u7684\u8868\uFF1B\u5FC5\u8981\u65F6\u5148\u786E\u8BA4\u76EE\u6807\u884C/\u5B57\u6BB5\u3002"
      };
    case "image":
      return {
        ...common,
        name: "\u56FE\u7247\u52A9\u624B",
        introduction: "\u5F53\u524D\u5148\u4F5C\u4E3A\u56FE\u7247\u5206\u6790\u4E0E\u5904\u7406\u5EFA\u8BAE\u5165\u53E3\uFF0C\u540E\u7EED\u53EF\u6269\u5C55\u4E3A\u66F4\u5B8C\u6574\u7684\u56FE\u7247\u5DE5\u4F5C\u6D41\u52A9\u624B\u3002",
        greeting: "\u4F60\u597D\uFF0C\u6211\u662F\u56FE\u7247\u52A9\u624B \u{1F5BC}\uFE0F\n\n\u76EE\u524D\u6211\u53EF\u4EE5\u5148\u5E2E\u4F60\u5206\u6790\u56FE\u7247\u5185\u5BB9\u3001\u63D0\u70BC\u91CD\u70B9\u3001\u7ED9\u51FA\u547D\u540D/\u6574\u7406\u5EFA\u8BAE\u3002\u540E\u7EED\u6211\u4EEC\u518D\u628A\u66F4\u6DF1\u7684\u56FE\u7247\u7F16\u8F91\u5DE5\u4F5C\u6D41\u63A5\u4E0A\u3002",
        prompt: "\u4F60\u662F\u4E00\u4E2A\u56FE\u7247\u52A9\u624B\u3002\u5F53\u524D\u9636\u6BB5\u91CD\u70B9\u662F\u56F4\u7ED5\u5F53\u524D\u56FE\u7247\u505A\u7406\u89E3\u3001\u63CF\u8FF0\u3001\u6574\u7406\u5EFA\u8BAE\u548C\u540E\u7EED\u5904\u7406\u5EFA\u8BAE\u3002\u4E0D\u8981\u5047\u88C5\u5DF2\u7ECF\u5177\u5907\u590D\u6742\u56FE\u7247\u7F16\u8F91\u80FD\u529B\uFF1B\u5982\u679C\u7528\u6237\u8981\u66F4\u5F3A\u64CD\u4F5C\uFF0C\u660E\u786E\u8BF4\u660E\u5F53\u524D\u53EF\u505A\u7684\u662F\u5206\u6790\u4E0E\u7EC4\u7EC7\u3002"
      };
    case "file":
      return {
        ...common,
        name: "\u6587\u4EF6\u52A9\u624B",
        introduction: "\u5F53\u524D\u5148\u4F5C\u4E3A\u6587\u4EF6\u7406\u89E3\u4E0E\u5904\u7406\u5EFA\u8BAE\u5165\u53E3\uFF0C\u540E\u7EED\u53EF\u6269\u5C55\u4E3A\u66F4\u5B8C\u6574\u7684\u6587\u4EF6\u5DE5\u4F5C\u6D41\u52A9\u624B\u3002",
        greeting: "\u4F60\u597D\uFF0C\u6211\u662F\u6587\u4EF6\u52A9\u624B \u{1F4CE}\n\n\u76EE\u524D\u6211\u53EF\u4EE5\u5148\u5E2E\u4F60\u7406\u89E3\u8FD9\u4E2A\u6587\u4EF6\u9002\u5408\u600E\u4E48\u5904\u7406\u3001\u600E\u4E48\u63D0\u53D6\u4FE1\u606F\u3001\u4E0B\u4E00\u6B65\u5E94\u8BE5\u505A\u4EC0\u4E48\u3002\u540E\u7EED\u6211\u4EEC\u518D\u628A\u66F4\u5B8C\u6574\u7684\u6587\u4EF6\u5904\u7406\u6D41\u7A0B\u63A5\u4E0A\u3002",
        prompt: "\u4F60\u662F\u4E00\u4E2A\u6587\u4EF6\u52A9\u624B\u3002\u5F53\u524D\u9636\u6BB5\u91CD\u70B9\u662F\u56F4\u7ED5\u5F53\u524D\u6587\u4EF6\u63D0\u4F9B\u7406\u89E3\u3001\u6574\u7406\u3001\u63D0\u53D6\u4E0E\u540E\u7EED\u5904\u7406\u5EFA\u8BAE\u3002\u4E0D\u8981\u5047\u88C5\u5DF2\u7ECF\u5B8C\u6210\u6587\u4EF6\u5185\u5BB9\u89E3\u6790\uFF1B\u5FC5\u8981\u65F6\u660E\u786E\u544A\u8BC9\u7528\u6237\u5F53\u524D\u66F4\u591A\u662F\u5360\u4F4D\u578B\u5DE5\u4F5C\u6D41\u5165\u53E3\u3002"
      };
  }
};
var buildBuiltinObjectAssistantAgentFromKey = (agentKey, userId) => {
  const kind = resolveBuiltinObjectAssistantKindByKey(agentKey, userId);
  if (!kind || !userId) return null;
  return buildBuiltinObjectAssistantAgent(kind, userId);
};
var buildObjectAssistantRuntimeOptions = (args) => {
  const { kind, contentKey, title, summary, metadata = {} } = args;
  if (kind === "app") {
    return {
      extraTools: [
        "appRead",
        "appFileList",
        "appFileSearch",
        "appFileRead",
        "appFileWrite",
        "appFileReplace",
        "appPreflight",
        "appDeploy",
        "openAIGptImage"
      ],
      editingTarget: {
        kind: "app",
        key: contentKey ?? void 0,
        title: title ?? void 0,
        summary: summary ?? "\u5F53\u524D\u5E94\u7528\u53EF\u901A\u8FC7 AI \u7EE7\u7EED\u4FEE\u6539\u4E0E\u91CD\u65B0\u90E8\u7F72\uFF0C\u8BF7\u56F4\u7ED5\u5DF2\u6709\u5B9E\u73B0\u505A\u589E\u91CF\u8FED\u4EE3\u3002",
        metadata
      }
    };
  }
  if (kind === "table") {
    return {
      editingTarget: {
        kind: "table",
        key: contentKey ?? void 0,
        title: title ?? void 0,
        summary: summary ?? "\u5F53\u524D\u5BF9\u8C61\u662F\u4E00\u5F20\u6570\u636E\u8868\u3002\u4F18\u5148\u5E2E\u52A9\u7528\u6237\u7406\u89E3\u5B57\u6BB5\u3001\u8BB0\u5F55\u548C\u7ED3\u6784\uFF0C\u518D\u505A\u65B0\u589E\u6216\u4FEE\u6539\u3002",
        metadata
      }
    };
  }
  if (kind === "page") {
    return {
      editingTarget: {
        kind: "page",
        key: contentKey ?? void 0,
        title: title ?? void 0,
        summary: summary ?? "\u5F53\u524D\u5BF9\u8C61\u662F\u4E00\u7BC7\u6587\u6863\u3002\u4F18\u5148\u56F4\u7ED5\u73B0\u6709\u5185\u5BB9\u505A\u6DA6\u8272\u3001\u6539\u5199\u3001\u7EED\u5199\u3001\u91CD\u7EC4\u548C\u6392\u7248\u5EFA\u8BAE\u3002",
        metadata
      }
    };
  }
  return {
    editingTarget: {
      kind,
      key: contentKey ?? void 0,
      title: title ?? void 0,
      summary: summary ?? (kind === "image" ? "\u5F53\u524D\u5BF9\u8C61\u662F\u4E00\u5F20\u56FE\u7247\uFF0C\u5F53\u524D\u9636\u6BB5\u4F18\u5148\u505A\u7406\u89E3\u3001\u63CF\u8FF0\u548C\u6574\u7406\u5EFA\u8BAE\u3002" : "\u5F53\u524D\u5BF9\u8C61\u662F\u4E00\u4E2A\u6587\u4EF6\uFF0C\u5F53\u524D\u9636\u6BB5\u4F18\u5148\u505A\u7406\u89E3\u3001\u6574\u7406\u548C\u5904\u7406\u5EFA\u8BAE\u3002"),
      metadata
    }
  };
};

// packages/ai/memory/policy.ts
function isPublicAgentKey(agentKey) {
  return typeof agentKey === "string" && /^agent-pub-/i.test(agentKey.trim());
}
function resolveAgentMemoryPolicy(input) {
  const publicAgent = input.isPublicAgent === true || isPublicAgentKey(input.agentKey);
  if (publicAgent) {
    return {
      includeUserSubject: false,
      ownerFallback: "onSubjectMiss",
      allowDynamicGreetingMemory: false
    };
  }
  return {
    includeUserSubject: true,
    ownerFallback: "always",
    allowDynamicGreetingMemory: true
  };
}

// packages/ai/memory/recentRelationshipRecap.ts
var MIN_RECAP_LENGTH = 12;
var MIN_RECAP_GAP_MS = 30 * 60 * 1e3;
var shouldUseRecentRelationshipRecap = (input) => {
  if (!input.userId || !input.agentKey) return false;
  if (!resolveAgentMemoryPolicy({ agentKey: input.agentKey }).allowDynamicGreetingMemory) {
    return false;
  }
  if ((input.agentsCount ?? 0) !== 1) return false;
  if (input.inheritFromDialogKey) return false;
  if (input.skipGreeting) return false;
  if (input.triggerType && input.triggerType !== "user") return false;
  return true;
};
var CONTINUATION_CUE_PATTERNS = [
  "\u8FD8\u6CA1",
  "\u8FD8\u5728",
  "\u7EE7\u7EED",
  "\u63A5\u7740",
  "\u4E0B\u4E00\u6B65",
  "\u540E\u9762",
  "\u4E4B\u540E",
  "\u6253\u7B97",
  "\u51C6\u5907",
  "\u60F3",
  "\u7EA0\u7ED3",
  "\u5361\u4F4F",
  "\u6CA1\u60F3\u597D",
  "\u4E0D\u786E\u5B9A",
  "\u5982\u4F55",
  "\u600E\u4E48",
  "?",
  "\uFF1F"
];
var clip = (text, max = 140) => text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}\u2026`;
var normalizeText = (value) => asTrimmedString(value);
var contentToText = (content) => {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map(
      (part) => part && typeof part === "object" && "text" in part ? normalizeText(part.text) : ""
    ).filter(Boolean).join("\n").trim();
  }
  return "";
};
var toTimestamp = (record) => {
  return asOptionalPositiveFiniteNumber(
    Date.parse(normalizeText(record.updatedAt))
  ) ?? asOptionalPositiveFiniteNumber(
    Date.parse(normalizeText(record.createdAt))
  ) ?? 0;
};
var chooseRecapText = (record) => {
  const summary = normalizeText(record.summary);
  if (isMeaningfulRecapText(summary)) return clip(summary, 160);
  const title = normalizeText(record.title);
  if (isMeaningfulRecapText(title)) return clip(title, 80);
  return "";
};
var loadLastAssistantMessageText = async (db, dialogKey) => {
  const dialogId = extractCustomId(dialogKey);
  if (!dialogId) return "";
  const range = dialogMessageRange(dialogId);
  let iterator = db.iterator({
    gte: range.start,
    lte: range.end,
    reverse: true
  });
  if (iterator && typeof iterator.then === "function") {
    iterator = await iterator;
  }
  for await (const [, value] of iterator) {
    const message = value ?? {};
    const role = normalizeText(message.role ?? message.authorRole);
    if (role !== "assistant") continue;
    const text = contentToText(message.content);
    if (isMeaningfulRecapText(text)) return clip(text, 160);
  }
  return "";
};
var isLikelyTimestampTitle = (text) => /^\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}$/.test(text);
var isMeaningfulRecapText = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (normalized.length < MIN_RECAP_LENGTH) return false;
  if (isLikelyTimestampTitle(normalized)) return false;
  if (/^(继续|新对话|测试|test|hello|hi)$/i.test(normalized)) return false;
  return true;
};
var resolveRecentRelationshipRecap = async (input) => {
  const { db, userId, agentKey, currentSpaceId, limit = 40 } = input;
  if (!db) return { recap: null, reason: "no-db" };
  if (!userId || !agentKey) return { recap: null, reason: "missing-input" };
  const range = createDialogKey.rangeOfUser(userId);
  const matches = [];
  let scanned = 0;
  let iterator = db.iterator({
    gte: range.start,
    lte: range.end,
    reverse: true
  });
  if (iterator && typeof iterator.then === "function") {
    iterator = await iterator;
  }
  for await (const [, value] of iterator) {
    scanned += 1;
    const record = value ?? {};
    if (!Array.isArray(record.cybots) || !record.cybots.includes(agentKey)) {
      if (scanned >= limit && matches.length > 0) break;
      continue;
    }
    matches.push(record);
    if (matches.length >= limit) break;
  }
  if (matches.length === 0) return { recap: null, reason: "no-match" };
  const sorted = [...matches].sort((a, b) => {
    const aSameSpace = currentSpaceId && a.spaceId === currentSpaceId ? 1 : 0;
    const bSameSpace = currentSpaceId && b.spaceId === currentSpaceId ? 1 : 0;
    if (aSameSpace !== bSameSpace) return bSameSpace - aSameSpace;
    return toTimestamp(b) - toTimestamp(a);
  });
  let sawTooRecent = false;
  let sawLowQuality = false;
  for (const record of sorted) {
    const ts = toTimestamp(record);
    if (ts > 0 && Date.now() - ts < MIN_RECAP_GAP_MS) {
      sawTooRecent = true;
      continue;
    }
    let recap = chooseRecapText(record);
    if (!recap) {
      const dialogKey = normalizeText(record.dbKey);
      if (dialogKey) {
        recap = await loadLastAssistantMessageText(db, dialogKey);
      }
    }
    if (recap) {
      return {
        recap,
        reason: "selected",
        sourceDialogKey: normalizeText(record.dbKey) || void 0,
        sourceUpdatedAt: normalizeText(record.updatedAt) || void 0
      };
    }
    sawLowQuality = true;
  }
  if (sawTooRecent) return { recap: null, reason: "too-recent" };
  if (sawLowQuality) return { recap: null, reason: "low-quality" };
  return { recap: null, reason: "no-match" };
};
var mergeGreetingWithRelationshipRecap = (input) => {
  const greetingText = normalizeText(input.greetingText);
  const recentRecap = normalizeText(input.recentRecap);
  if (!greetingText && !recentRecap) return null;
  if (!recentRecap) return greetingText || null;
  const continuationLike = CONTINUATION_CUE_PATTERNS.some(
    (pattern) => recentRecap.includes(pattern)
  );
  if (!continuationLike) return greetingText || null;
  if (!greetingText) {
    return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21\u5728\u804A\uFF1A${recentRecap}

\u5982\u679C\u4F60\u8FD8\u60F3\u63A5\u7740\u90A3\u4E2A\u70B9\u7EE7\u7EED\uFF0C\u6211\u4EEC\u53EF\u4EE5\u4ECE\u90A3\u91CC\u5F80\u4E0B\u8D70\uFF1B\u5982\u679C\u60F3\u6362\u4E2A\u65B9\u5411\u4E5F\u53EF\u4EE5\u3002`;
  }
  return `${greetingText}

\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21\u5728\u804A\uFF1A${recentRecap}
\u5982\u679C\u4F60\u8FD8\u60F3\u63A5\u7740\u90A3\u4E2A\u70B9\u7EE7\u7EED\uFF0C\u6211\u4EEC\u53EF\u4EE5\u4ECE\u90A3\u91CC\u5F80\u4E0B\u8D70\uFF1B\u5982\u679C\u60F3\u6362\u4E2A\u65B9\u5411\u4E5F\u53EF\u4EE5\u3002`;
};

// packages/ai/memory/queryShared.ts
var chooseMemoryOwners = (input) => {
  const owners = [];
  if (input.userId) {
    owners.push({ ownerType: "user", ownerId: input.userId });
  }
  if (input.spaceId) {
    owners.push({ ownerType: "space", ownerId: input.spaceId });
  }
  return owners;
};
var loadOwnerItemsFromDb = async (db, owner, limit) => {
  const range = memoryOwnerRange(owner.ownerType, owner.ownerId);
  const refs = [];
  for await (const [, value] of db.iterator({
    gte: range.start,
    lte: range.end,
    reverse: true
  })) {
    refs.push(value ?? {});
    if (refs.length >= limit) break;
  }
  const items = await Promise.all(
    refs.map(
      (ref) => typeof ref?.memoryId === "string" ? db.get(createMemoryKey(owner.ownerType, owner.ownerId, ref.memoryId)).catch(() => null) : Promise.resolve(null)
    )
  );
  return items.filter((item) => !!item);
};
var loadSubjectKindItemsFromDb = async (db, subject, kind, limit) => {
  const range = memorySubjectKindRange(subject.subjectType, subject.subjectId, kind);
  const refs = [];
  for await (const [, value] of db.iterator({
    gte: range.start,
    lte: range.end,
    reverse: true
  })) {
    refs.push(value ?? {});
    if (refs.length >= limit) break;
  }
  const items = await Promise.all(
    refs.map(
      (ref) => typeof ref?.memoryKey === "string" ? db.get(ref.memoryKey).catch(() => null) : Promise.resolve(null)
    )
  );
  return items.filter((item) => !!item);
};
var loadMemoryCandidatesFromDb = async (db, input) => {
  const kinds = input.kinds ?? ["episodic", "semantic", "procedural"];
  const ownerLimit = input.ownerLimit ?? 12;
  const ownerFallback = input.ownerFallback ?? "onSubjectMiss";
  const ownerKeySet = new Set(
    input.owners.filter((owner) => owner.ownerId).map((owner) => `${owner.ownerType}:${owner.ownerId}`)
  );
  const subjects = input.subjects.filter(
    (subject) => !!subject.subjectId
  );
  const subjectResults = subjects.length > 0 ? await Promise.all(
    subjects.flatMap(
      (subject) => kinds.map(
        (kind) => loadSubjectKindItemsFromDb(db, subject, kind, ownerLimit)
      )
    )
  ) : [];
  const subjectHitCount = subjectResults.reduce((sum, items) => sum + items.length, 0);
  const shouldLoadOwnerFallback = ownerFallback !== "never" && (subjects.length === 0 || subjectHitCount === 0 || ownerFallback === "always");
  const results = shouldLoadOwnerFallback ? await Promise.all(
    [
      ...subjectResults,
      ...input.owners.map((owner) => loadOwnerItemsFromDb(db, owner, ownerLimit))
    ]
  ) : subjectResults;
  const kindSet = new Set(kinds);
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const items of results) {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      if (!kindSet.has(item.kind)) continue;
      if (ownerKeySet.size > 0 && !ownerKeySet.has(`${item.ownerType}:${item.ownerId}`)) {
        continue;
      }
      if (!shouldLoadOwnerFallback && subjects.length > 0 && !subjects.some(
        (subject) => subject.subjectType === item.subjectType && subject.subjectId === item.subjectId
      )) {
        continue;
      }
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
};

// packages/ai/memory/understandingGreeting.ts
var UNDERSTANDING_TAG = "understanding-memory";
var facetPriority = {
  unfinished: 5,
  tension: 4,
  preference: 3,
  style: 2,
  goal: 1
};
var anchorFacetPriority = {
  preference: 3,
  style: 2,
  goal: 1,
  tension: 0,
  unfinished: 0
};
var normalizeText2 = (value) => value.trim().replace(/[。！？!?]+$/u, "").trim();
var stripPrefix = (text, prefix) => text.startsWith(prefix) ? text.slice(prefix.length).trim() : text;
var toTimestamp2 = (item) => {
  const parsed = Date.parse(item.lastActivatedAt || item.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
};
var isUnderstandingItem = (item) => Array.isArray(item.tags) && item.tags.includes(UNDERSTANDING_TAG);
var GREETING_MIN_CONFIDENCE = 0.75;
var isGreetingEligible = (item) => item.kind === "semantic" && (item.confidence ?? 0) >= GREETING_MIN_CONFIDENCE;
var sortByKindAndTime = (left, right) => {
  if (left.kind !== right.kind) return left.kind === "semantic" ? -1 : 1;
  return toTimestamp2(right) - toTimestamp2(left);
};
var sameNormalizedContent = (left, right) => normalizeText2(left).toLowerCase() === normalizeText2(right).toLowerCase();
var pickAnchorItems = (items) => {
  const ranked = [...items].filter((item) => item.facet ? anchorFacetPriority[item.facet] > 0 : false).sort((left, right) => {
    const leftFacet = left.facet ? anchorFacetPriority[left.facet] ?? 0 : 0;
    const rightFacet = right.facet ? anchorFacetPriority[right.facet] ?? 0 : 0;
    if (leftFacet !== rightFacet) return rightFacet - leftFacet;
    if (left.kind !== right.kind) return left.kind === "semantic" ? -1 : 1;
    if (left.content.length !== right.content.length) {
      return left.content.length - right.content.length;
    }
    return toTimestamp2(right) - toTimestamp2(left);
  });
  const selected = [];
  for (const item of ranked) {
    if (selected.some(
      (existing) => sameNormalizedContent(existing.content, item.content) || existing.facet && item.facet && existing.facet === item.facet
    )) {
      continue;
    }
    selected.push(item);
    if (selected.length >= 2) break;
  }
  return selected;
};
var pickFollowUpItem = (items) => [...items].filter((item) => item.facet === "unfinished" || item.facet === "tension").sort((left, right) => {
  const leftFacet = left.facet ? facetPriority[left.facet] ?? 0 : 0;
  const rightFacet = right.facet ? facetPriority[right.facet] ?? 0 : 0;
  if (leftFacet !== rightFacet) return rightFacet - leftFacet;
  return sortByKindAndTime(left, right);
})[0] ?? null;
var resolveUnderstandingGreetingMemory = async (input) => {
  const owners = chooseMemoryOwners({
    userId: input.userId,
    spaceId: input.spaceId
  });
  if (owners.length === 0) {
    return { item: null, anchorItems: [], followUpItem: null };
  }
  const items = await loadMemoryCandidatesFromDb(input.db, {
    owners,
    subjects: [{ subjectType: "agent", subjectId: input.agentKey }],
    kinds: ["semantic", "episodic"],
    ownerLimit: 40,
    // Greeting memory must stay agent-scoped: a brand-new agent has zero
    // subject hits, and the owner fallback would surface user-level memories
    // from other agents/spaces as this agent's "memory".
    ownerFallback: "never"
  });
  const understandingItems = items.filter(
    (item2) => isUnderstandingItem(item2) && isGreetingEligible(item2)
  );
  if (understandingItems.length === 0) {
    return { item: null, anchorItems: [], followUpItem: null };
  }
  const ranked = [...understandingItems].sort((left, right) => {
    const leftFacet = left.facet ? facetPriority[left.facet] ?? 0 : 0;
    const rightFacet = right.facet ? facetPriority[right.facet] ?? 0 : 0;
    if (leftFacet !== rightFacet) return rightFacet - leftFacet;
    return sortByKindAndTime(left, right);
  });
  const anchorItems = pickAnchorItems(understandingItems);
  const followUpItem = pickFollowUpItem(understandingItems);
  const item = followUpItem ?? anchorItems[0] ?? ranked[0] ?? null;
  return {
    item,
    anchorItems,
    followUpItem
  };
};
var renderLeadClause = (item) => {
  const content = normalizeText2(item.content);
  switch (item.facet) {
    case "unfinished":
      return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21\u8FD8\u6CA1\u5B9A\u4E0B\u6765\uFF1A${stripPrefix(content, "\u8FD8\u6CA1\u51B3\u5B9A")}`;
    case "tension":
      return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21\u8FD8\u5728\u6743\u8861${stripPrefix(content, "\u5728\u6743\u8861")}`;
    case "style":
    case "preference":
      return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21${content}`;
    case "goal":
      return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21\u60F3\u63A8\u8FDB\u7684\u662F${content}`;
    default:
      return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21\u63D0\u8FC7${content}`;
  }
};
var renderAnchorFragment = (item) => {
  const content = normalizeText2(item.content);
  switch (item.facet) {
    case "preference":
      if (content.startsWith("\u66F4\u5728\u610F")) {
        return `\u66F4\u5728\u610F\u7684\u662F${stripPrefix(content, "\u66F4\u5728\u610F")}`;
      }
      if (content.startsWith("\u66F4\u5173\u5FC3")) {
        return `\u66F4\u5173\u5FC3\u7684\u662F${stripPrefix(content, "\u66F4\u5173\u5FC3")}`;
      }
      if (content.startsWith("\u66F4\u6015")) {
        return `\u66F4\u6015${stripPrefix(content, "\u66F4\u6015")}`;
      }
      if (content.startsWith("\u4E0D\u60F3")) {
        return `\u4E0D\u60F3${stripPrefix(content, "\u4E0D\u60F3")}`;
      }
      if (content.startsWith("\u4E0D\u5E0C\u671B")) {
        return `\u4E0D\u5E0C\u671B${stripPrefix(content, "\u4E0D\u5E0C\u671B")}`;
      }
      return content;
    case "style":
      if (content.startsWith("\u4E0D\u559C\u6B22")) {
        return `\u4E0D\u592A\u559C\u6B22${stripPrefix(content, "\u4E0D\u559C\u6B22")}`;
      }
      if (content.startsWith("\u66F4\u559C\u6B22")) {
        return `\u66F4\u559C\u6B22${stripPrefix(content, "\u66F4\u559C\u6B22")}`;
      }
      return content;
    case "goal":
      if (content.startsWith("\u60F3\u5148")) {
        return `\u60F3\u5148${stripPrefix(content, "\u60F3\u5148")}`;
      }
      return `\u60F3\u63A8\u8FDB\u7684\u662F${content}`;
    default:
      return content;
  }
};
var renderAnchorSentence = (items) => {
  if (items.length === 0) return null;
  const fragments = items.map(renderAnchorFragment).map((fragment) => fragment.trim()).filter(Boolean);
  if (fragments.length === 0) return null;
  if (fragments.length === 1) {
    return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21${fragments[0]}\u3002`;
  }
  return `\u6211\u8BB0\u5F97\u4F60\u4E0A\u6B21${fragments[0]}\uFF0C\u4E5F${fragments[1]}\u3002`;
};
var splitTradeoff = (value) => {
  const normalized = normalizeText2(value).replace(/^在权衡/u, "").replace(/^还没决定/u, "").replace(/^还不确定/u, "").replace(/^还没想好/u, "").trim();
  if (!normalized.includes("\u8FD8\u662F")) return null;
  const [left, right] = normalized.split(/\s*还是/u, 2);
  const normalizedLeft = normalizeText2((left ?? "").replace(/[，,：:]+$/u, "").trim());
  const normalizedRight = normalizeText2((right ?? "").trim());
  if (!normalizedLeft || !normalizedRight) return null;
  return [normalizedLeft, normalizedRight];
};
var renderFollowUpLine = (item) => {
  if (!item) {
    return "\u5982\u679C\u4F60\u60F3\uFF0C\u6211\u4EEC\u53EF\u4EE5\u63A5\u7740\u4E0A\u6B21\u90A3\u4E2A\u70B9\uFF1B\u5982\u679C\u4ECA\u5929\u662F\u65B0\u95EE\u9898\uFF0C\u4E5F\u76F4\u63A5\u8BF4\u3002";
  }
  const tradeoff = splitTradeoff(item.content);
  if (tradeoff) {
    return `\u5982\u679C\u4F60\u613F\u610F\uFF0C\u6211\u4EEC\u53EF\u4EE5\u63A5\u7740\u770B\uFF1A${tradeoff[0]}\uFF0C\u8FD8\u662F${tradeoff[1]}\u3002\u5982\u679C\u4ECA\u5929\u662F\u65B0\u95EE\u9898\uFF0C\u4E5F\u76F4\u63A5\u8BF4\u3002`;
  }
  const content = normalizeText2(item.content);
  switch (item.facet) {
    case "unfinished":
      return `\u5982\u679C\u4F60\u613F\u610F\uFF0C\u6211\u4EEC\u53EF\u4EE5\u63A5\u7740\u628A${stripPrefix(content, "\u8FD8\u6CA1\u51B3\u5B9A")}\u5B9A\u4E0B\u6765\uFF1B\u5982\u679C\u4ECA\u5929\u662F\u65B0\u95EE\u9898\uFF0C\u4E5F\u76F4\u63A5\u8BF4\u3002`;
    case "tension":
      return `\u5982\u679C\u4F60\u613F\u610F\uFF0C\u6211\u4EEC\u53EF\u4EE5\u63A5\u7740\u770B${stripPrefix(content, "\u5728\u6743\u8861")}\uFF1B\u5982\u679C\u4ECA\u5929\u662F\u65B0\u95EE\u9898\uFF0C\u4E5F\u76F4\u63A5\u8BF4\u3002`;
    case "goal":
      return `\u5982\u679C\u4F60\u613F\u610F\uFF0C\u6211\u4EEC\u53EF\u4EE5\u7EE7\u7EED\u63A8\u8FDB${stripPrefix(content, "\u60F3\u5148")}\uFF1B\u5982\u679C\u4ECA\u5929\u662F\u65B0\u95EE\u9898\uFF0C\u4E5F\u76F4\u63A5\u8BF4\u3002`;
    default:
      return "\u5982\u679C\u4F60\u60F3\uFF0C\u6211\u4EEC\u53EF\u4EE5\u63A5\u7740\u4E0A\u6B21\u90A3\u4E2A\u70B9\uFF1B\u5982\u679C\u4ECA\u5929\u662F\u65B0\u95EE\u9898\uFF0C\u4E5F\u76F4\u63A5\u8BF4\u3002";
  }
};
var mergeGreetingWithUnderstandingMemory = (input) => {
  const greetingText = asTrimmedString(input.greetingText);
  const resolution = input.resolution ?? null;
  const item = input.item ?? resolution?.item ?? null;
  if (!greetingText && !item) return null;
  if (!item) return greetingText || null;
  const anchorItems = resolution?.anchorItems ?? [];
  const followUpItem = resolution?.followUpItem ?? item;
  const leadLine = renderAnchorSentence(anchorItems) ?? `${renderLeadClause(item)}\u3002`;
  const suffix = renderFollowUpLine(followUpItem);
  const memoryBlock = `\u6B22\u8FCE\u56DE\u6765\u3002${leadLine}
${suffix}`;
  if (!greetingText) {
    return memoryBlock;
  }
  return `${greetingText}

${memoryBlock}`;
};

// packages/chat/dialog/actions/createDialogAction.ts
var LOCAL_OWNER_DIALOG_PREFIXES = ["agent-local-", "cybot-local-"];
var isLocalOwnerDialogAgents = (cybots) => {
  if (!Array.isArray(cybots)) return false;
  for (const agentKey of cybots) {
    if (typeof agentKey !== "string") continue;
    for (const prefix of LOCAL_OWNER_DIALOG_PREFIXES) {
      if (agentKey.startsWith(prefix)) return true;
    }
  }
  return false;
};
var notifyUserDataUpdated = () => {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof window.Event === "function") {
    window.dispatchEvent(new window.Event("nolo-user-data-updated"));
  }
};
var createDialogAction = async (args, thunkApi) => {
  const {
    cybots: requestedCybots = [],
    agentMode: requestedAgentMode,
    autoRoute,
    category,
    spaceId: explicitSpaceId,
    inheritFromDialogKey,
    title: titleOverride,
    triggerType,
    schedule,
    taskPrompt,
    skipAgentConfigRead,
    optimisticReturnBeforeWrite,
    preferredServerOrigin
  } = args;
  const { dispatch: dispatchRaw, getState, extra } = thunkApi;
  const dispatch = dispatchRaw;
  const agentMode = requestedAgentMode ?? (requestedCybots.length > 0 ? "fixed" : "auto");
  const cybots = agentMode === "auto" ? [] : requestedCybots;
  const agentKey = cybots[0];
  const currentUserId = selectIdentityUserId(getState()) ?? null;
  const isDeviceLocalDialog = isLocalOwnerDialogAgents(cybots);
  const userId = isDeviceLocalDialog ? "local" : currentUserId && currentUserId.trim().length > 0 ? currentUserId : "local";
  try {
    const { localFirstLog } = await import("/public/assets/chunks/localFirstLog-HBUWUDON.js");
    localFirstLog("dialog.create", {
      owner: userId,
      agentKey: typeof agentKey === "string" ? agentKey : "",
      isDeviceLocal: isDeviceLocalDialog,
      hasSpace: Boolean(args.spaceId)
    });
  } catch {
  }
  const readAgentConfig = async () => {
    if (!agentKey) return null;
    const existing = await dispatch(
      readAndWait({
        dbKey: agentKey,
        preferredServerOrigin
      })
    ).unwrap().catch(() => null);
    if (existing) return existing;
    const recoveredBuiltinAgent = buildBuiltinObjectAssistantAgentFromKey(
      agentKey,
      userId
    );
    if (!recoveredBuiltinAgent) {
      return null;
    }
    await dispatch(
      write({
        data: recoveredBuiltinAgent,
        customKey: recoveredBuiltinAgent.dbKey,
        userId
      })
    ).unwrap();
    return recoveredBuiltinAgent;
  };
  const canSkipAgentConfigRead = agentMode === "auto" || !!skipAgentConfigRead && !!args.skipGreeting && !!titleOverride;
  const agentConfig = canSkipAgentConfigRead ? null : await readAgentConfig();
  if (agentMode === "fixed" && !agentConfig && !canSkipAgentConfigRead) {
    throw new Error(`Agent with key ${agentKey} not found.`);
  }
  const shouldUseRelationshipGreeting = shouldUseRecentRelationshipRecap({
    userId,
    agentKey,
    agentsCount: cybots.length,
    inheritFromDialogKey,
    skipGreeting: args.skipGreeting,
    triggerType
  });
  const understandingGreetingResolution = shouldUseRelationshipGreeting ? await resolveUnderstandingGreetingMemory({
    db: extra?.db,
    userId,
    spaceId: explicitSpaceId,
    agentKey
  }).catch(() => ({ item: null, anchorItems: [], followUpItem: null })) : { item: null, anchorItems: [], followUpItem: null };
  const recentRelationshipRecapResolution = shouldUseRelationshipGreeting && !understandingGreetingResolution.item ? await resolveRecentRelationshipRecap({
    db: extra?.db,
    userId,
    agentKey,
    currentSpaceId: explicitSpaceId
  }).catch(() => ({ recap: null, reason: "no-db", sourceDialogKey: void 0 })) : null;
  if (typeof window !== "undefined" && recentRelationshipRecapResolution && // 浏览器端没有 process：走 app/utils/env 的安全读法。
  isDevelopment) {
    console.debug("[dialog] recent relationship recap", {
      agentKey,
      userId,
      reason: recentRelationshipRecapResolution.reason,
      sourceDialogKey: recentRelationshipRecapResolution.sourceDialogKey ?? null,
      preview: recentRelationshipRecapResolution.recap ?? null
    });
  }
  const time = format(/* @__PURE__ */ new Date(), "MM-dd HH:mm");
  const title = titleOverride || (agentMode === "auto" ? "\u65B0\u5BF9\u8BDD" : agentConfig?.name || "Agent") + "  " + time;
  const spaceId = explicitSpaceId;
  const dialogPath = createDialogKey(userId);
  const dialogId = extractCustomId(dialogPath);
  let referenceKeys;
  let inheritedFromDialogKey;
  let inheritedFromDialogTitle;
  if (inheritFromDialogKey) {
    inheritedFromDialogKey = inheritFromDialogKey;
    const sourceDialog = await dispatch(
      read({
        dbKey: inheritFromDialogKey
      })
    ).unwrap();
    if (isRecord(sourceDialog)) {
      const sourceDbKey = sourceDialog.dbKey;
      if (typeof sourceDbKey === "string" && sourceDbKey.trim().length > 0) {
        inheritedFromDialogKey = sourceDbKey;
      }
      const sourceTitle = asOptionalTrimmedString(
        sourceDialog.title
      );
      if (sourceTitle) {
        inheritedFromDialogTitle = sourceTitle;
      }
      const candidate = sourceDialog.referenceKeys;
      if (Array.isArray(candidate) && candidate.every((key) => typeof key === "string")) {
        referenceKeys = candidate;
      }
    }
  }
  const dialogData = {
    id: dialogId,
    dbKey: dialogPath,
    userId,
    agentMode,
    cybots,
    ...agentMode === "fixed" && agentKey ? { primaryAgentKey: agentKey } : {},
    ...agentMode === "auto" && autoRoute ? { autoRoute } : {},
    title,
    type: "dialog" /* DIALOG */,
    createdAt: formatISO(/* @__PURE__ */ new Date()),
    ...spaceId && { spaceId },
    category,
    referenceKeys,
    ...args.extraReferences && args.extraReferences.length > 0 && { extraReferences: args.extraReferences },
    ...inheritedFromDialogKey && { inheritedFromDialogKey },
    ...inheritedFromDialogTitle && { inheritedFromDialogTitle },
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    ...triggerType && { triggerType },
    ...triggerType === "scheduled_run" || triggerType === "automation_run" ? {
      executionMode: "background",
      status: "pending"
    } : {},
    ...schedule && { schedule },
    ...taskPrompt && { taskPrompt }
  };
  const canReturnBeforeWrite = canSkipAgentConfigRead && !!optimisticReturnBeforeWrite && !spaceId;
  if (canReturnBeforeWrite) {
    const optimisticDialogData = {
      ...dialogData,
      dbKey: dialogPath,
      userId
    };
    dispatch(upsertSSREntity(optimisticDialogData));
    notifyUserDataUpdated();
    void dispatch(
      write({
        data: { ...dialogData, userId },
        customKey: dialogPath,
        userId
      })
    ).unwrap().catch((error) => {
      console.error("[createDialogAction] optimistic dialog write failed", {
        dialogPath,
        error
      });
      dispatch(removeCachedEntity(dialogPath));
      notifyUserDataUpdated();
    });
    return optimisticDialogData;
  }
  const result = await dispatch(
    write({
      data: { ...dialogData, userId },
      customKey: dialogPath,
      userId
    })
  ).unwrap();
  if (spaceId) {
    await dispatch(
      addContentToSpace({
        spaceId,
        contentKey: dialogPath,
        type: "dialog" /* DIALOG */,
        title,
        categoryId: category,
        ...triggerType && { triggerType }
      })
    );
  }
  notifyUserDataUpdated();
  const rawGreeting = agentConfig?.greeting;
  if (rawGreeting && !args.skipGreeting) {
    const cfg = typeof rawGreeting === "string" ? { text: rawGreeting } : isRecord(rawGreeting) ? rawGreeting : { text: String(rawGreeting) };
    const mergedGreetingText = understandingGreetingResolution?.item ? mergeGreetingWithUnderstandingMemory({
      greetingText: cfg.text,
      resolution: understandingGreetingResolution
    }) : mergeGreetingWithRelationshipRecap({
      greetingText: cfg.text,
      recentRecap: recentRelationshipRecapResolution?.recap
    });
    const effectiveCfg = {
      ...cfg,
      ...mergedGreetingText ? { text: mergedGreetingText } : {}
    };
    const hasMenu = Array.isArray(effectiveCfg.menu) && effectiveCfg.menu.length > 0;
    if (hasMenu) {
      const question = asOptionalTrimmedString(effectiveCfg.text) ?? "\u63A5\u4E0B\u6765\u4F60\u66F4\u5E0C\u671B\u6211\u5E2E\u4F60\u505A\u54EA\u4EF6\u4E8B\uFF1F";
      const choices = effectiveCfg.menu.map((item, idx) => ({
        id: item.id || `choice_${idx + 1}`,
        label: item.label,
        userMessage: item.userMessage ?? item.label
      }));
      const toolResult = await uiAskChoiceFunc(
        {
          question,
          choices,
          blocking: true
        },
        thunkApi
      );
      await dispatch(
        prepareAndPersistMessage({
          message: {
            role: "tool",
            toolName: uiAskChoiceFunctionSchema.name,
            cybotKey: agentKey,
            content: toolResult.rawData,
            displayData: toolResult.displayData
          },
          dialogConfig: {
            id: dialogId,
            dbKey: dialogPath,
            userId
          }
        })
      );
    } else if (effectiveCfg.text) {
      await dispatch(
        prepareAndPersistMessage({
          message: {
            content: effectiveCfg.text,
            role: "assistant",
            cybotKey: agentKey
          },
          dialogConfig: {
            id: dialogId,
            dbKey: dialogPath,
            userId
          }
        })
      );
    }
  }
  return result;
};

export {
  OBJECT_ASSISTANT_TO_SKILL,
  getObjectAssistantUiConfig,
  getPreferredObjectAssistantKey,
  buildObjectAssistantSidebarId,
  isObjectAssistantSidebarId,
  buildBuiltinObjectAssistantAgent,
  buildObjectAssistantRuntimeOptions,
  isLocalOwnerDialogAgents,
  createDialogAction
};
