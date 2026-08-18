import {
  buildSkillDocMarkdown,
  resolvePageSkillMetadata
} from "/public/assets/chunks/chunk-DFTLAEUX.js";
import {
  asNonEmptyStringArray,
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";

// packages/agent-runtime/toolNameAliases.ts
var LEGACY_TOOL_NAME_ALIASES = {
  createPage: "createDoc",
  updatePage: "updateDoc",
  update_page: "updateDoc",
  create_page: "createDoc",
  fetchwebpage: "fetchWebpage",
  fetch_webpage: "fetchWebpage",
  "fetch-page": "fetchWebpage",
  exasearch: "exa_search",
  "exa-search": "exa_search",
  exa_search: "exa_search",
  firecrawlscrape: "firecrawl_scrape",
  "firecrawl-scrape": "firecrawl_scrape",
  firecrawl_scrape: "firecrawl_scrape",
  firecrawlsearch: "firecrawl_search",
  "firecrawl-search": "firecrawl_search",
  firecrawl_search: "firecrawl_search",
  readDoc: "readDoc",
  readpage: "readDoc",
  read_page: "readDoc",
  read_doc: "readDoc",
  createdoc: "createDoc",
  updateDocTool: "updateDoc",
  terminalCommand: "execShell",
  terminal_command: "execShell",
  runCommand: "execShell",
  run_command: "execShell",
  runInBash: "execShell",
  run_in_bash: "execShell",
  executeCommand: "execShell",
  execute_command: "execShell",
  // Codex CLI 风格工具名 → nolo 原生工具名
  bash: "execShell",
  shell: "execShell",
  read: "readFile",
  edit: "editFile",
  write: "writeFile",
  glob: "globFiles",
  grep: "searchFiles",
  // 联网搜索别名
  web_search: "exa_search",
  websearch: "exa_search",
  search_web: "exa_search",
  searchweb: "exa_search",
  webfetch: "fetchWebpage",
  web_fetch: "fetchWebpage",
  fetchweb: "fetchWebpage",
  fetch_web: "fetchWebpage",
  // 模型偶尔会把 loadSkill 幻觉成 readSkill（参数风格 name= 一致），
  // 规范化到 loadSkill，避免 localToolPolicy 把这种调用直接拦死。
  readSkill: "loadSkill"
};
var normalizeToolName = (name) => name.replace(/[-_]/g, "").toLowerCase();
var canonicalizeToolName = (rawName) => {
  const trimmedName = rawName.trim();
  if (!trimmedName) return rawName;
  if (LEGACY_TOOL_NAME_ALIASES[trimmedName]) {
    return LEGACY_TOOL_NAME_ALIASES[trimmedName];
  }
  const normalizedRawName = normalizeToolName(trimmedName);
  const matchedAlias = Object.entries(LEGACY_TOOL_NAME_ALIASES).find(
    ([alias]) => normalizeToolName(alias) === normalizedRawName
  );
  return matchedAlias?.[1] ?? trimmedName;
};
var canonicalizeToolNames = (toolNames) => Array.from(
  new Set(
    toolNames.filter((toolName) => typeof toolName === "string").map(canonicalizeToolName)
  )
);
var prioritizeToolNames = (toolNames, preferredToolNames) => {
  const canonicalTools = canonicalizeToolNames(toolNames);
  const preferred = new Set(canonicalizeToolNames(preferredToolNames));
  const prioritized = canonicalTools.filter((toolName) => preferred.has(toolName));
  const remaining = canonicalTools.filter((toolName) => !preferred.has(toolName));
  return [...prioritized, ...remaining];
};

// packages/ai/skills/referenceRuntime.ts
var joinUniqueStrings = (...groups) => Array.from(new Set(groups.flatMap((items) => asNonEmptyStringArray(items))));
var extractRuntimePageCapabilities = (content) => {
  const meta = resolvePageSkillMetadata(content);
  const directTools = asNonEmptyStringArray(content?.tools);
  const skillConfig = meta?.skillConfig;
  const skillTools = skillConfig?.toolNames ?? [];
  const softSkillHints = asNonEmptyStringArray([
    skillConfig?.name,
    ...meta?.recommendedSkills ?? []
  ]);
  return {
    directTools,
    hardSkillKeys: meta?.requiredSkills ?? [],
    softSkillKeys: meta?.recommendedSkills ?? [],
    hardSkillTools: meta?.kind === "skill" ? skillTools : [],
    softSkillHints,
    promptPatches: skillConfig?.promptPatch ? [skillConfig.promptPatch] : [],
    shouldUpgradeReference: directTools.length > 0 || meta?.kind === "skill" || !!skillConfig?.promptPatch
  };
};
var buildSkillGuidancePromptBlock = (options) => {
  const title = asOptionalTrimmedString(options.title) ?? "--- \u6280\u80FD\u63D0\u793A ---";
  const recommendedSkillHints = joinUniqueStrings(options.recommendedSkillHints);
  const skillPromptPatches = joinUniqueStrings(options.skillPromptPatches);
  if (recommendedSkillHints.length === 0 && skillPromptPatches.length === 0) {
    return "";
  }
  return [
    title,
    recommendedSkillHints.length > 0 ? `\u4EE5\u4E0B\u6280\u80FD\u4E0E\u5F53\u524D\u4EFB\u52A1\u66F4\u76F8\u5173\uFF0C\u53EF\u4F18\u5148\u8003\u8651\uFF1A${recommendedSkillHints.join("\u3001")}` : "",
    ...skillPromptPatches
  ].filter(Boolean).join("\n");
};
var buildIdentifierCandidates = (identifier, contentByKey) => {
  const trimmed = identifier.trim();
  if (!trimmed || contentByKey.has(trimmed)) return trimmed;
  const candidateToKey = /* @__PURE__ */ new Map();
  for (const [key, page] of Array.from(contentByKey.entries())) {
    const meta = resolvePageSkillMetadata(page);
    for (const value of [key, page?.dbKey, page?.title, meta?.skillConfig?.id, meta?.skillConfig?.name]) {
      const trimmedValue = asOptionalTrimmedString(value);
      if (trimmedValue) {
        candidateToKey.set(trimmedValue, key);
      }
    }
  }
  return candidateToKey.get(trimmed) ?? trimmed;
};
async function resolveSkillGraphFromRoots(options) {
  const contentByKey = new Map(options.contentByKey ?? []);
  const requiredTools = /* @__PURE__ */ new Set();
  const recommendedTools = /* @__PURE__ */ new Set();
  const recommendedSkillHints = /* @__PURE__ */ new Set();
  const skillPromptPatches = /* @__PURE__ */ new Set();
  const visits = [];
  const visited = /* @__PURE__ */ new Set();
  const loadPageCached = async (identifier) => {
    const resolvedIdentifier = buildIdentifierCandidates(identifier, contentByKey);
    if (!resolvedIdentifier) return null;
    if (contentByKey.has(resolvedIdentifier)) {
      return contentByKey.get(resolvedIdentifier) ?? null;
    }
    const page = await options.loadPage(resolvedIdentifier);
    if (page) {
      contentByKey.set(resolvedIdentifier, page);
      if (page.dbKey) {
        contentByKey.set(page.dbKey, page);
      }
    }
    return page ?? null;
  };
  const visit = async (identifier, mode, sourceLabel) => {
    const page = await loadPageCached(identifier);
    if (!page?.dbKey) return;
    const visitKey = `${mode}:${page.dbKey}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    const meta = resolvePageSkillMetadata(page);
    const directTools = canonicalizeToolNames(page.tools ?? []);
    const skillTools = canonicalizeToolNames(meta?.skillConfig?.toolNames ?? []);
    const mergedTools = joinUniqueStrings(directTools, skillTools);
    visits.push({
      dbKey: page.dbKey,
      title: page.title,
      mode,
      sourceLabel,
      meta
    });
    if (mode === "required") {
      mergedTools.forEach((toolName) => requiredTools.add(toolName));
      if (meta?.skillConfig?.promptPatch) {
        skillPromptPatches.add(meta.skillConfig.promptPatch);
      }
    } else {
      mergedTools.forEach((toolName) => recommendedTools.add(toolName));
      if (meta?.skillConfig?.name) {
        recommendedSkillHints.add(meta.skillConfig.name);
      }
    }
    const nextHard = meta?.requiredSkills ?? meta?.skillConfig?.requiredSkills ?? [];
    const nextSoft = meta?.recommendedSkills ?? meta?.skillConfig?.recommendedSkills ?? [];
    if (mode === "required") {
      await Promise.all(nextHard.map((childKey) => visit(childKey, "required", page.dbKey)));
      await Promise.all(nextSoft.map((childKey) => visit(childKey, "recommended", page.dbKey)));
      return;
    }
    await Promise.all([...nextHard, ...nextSoft].map((childKey) => visit(childKey, "recommended", page.dbKey)));
  };
  await Promise.all(options.roots.map((root) => visit(root.identifier, root.mode, root.sourceLabel)));
  return {
    requiredTools: Array.from(requiredTools),
    recommendedTools: Array.from(recommendedTools),
    recommendedSkillHints: Array.from(recommendedSkillHints),
    skillPromptPatches: Array.from(skillPromptPatches),
    contentByKey,
    visits
  };
}

// packages/ai/skills/codingSkills.ts
var CODING_SKILL_SLUGS = [
  "coding",
  "coding-review",
  "coding-review-code-quality",
  "coding-review-architecture",
  "coding-review-security",
  "coding-review-frontend-ux",
  "coding-review-backend-data"
];
var CODING_ROOT_SKILL_SLUG = "coding";
function deterministicId(prefix, seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = h * 16777619 >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}
function normalizeSkillSeed(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "");
}
function buildCodingSkillId(slug) {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}
function buildCodingSkillPageKey(userId, slug) {
  return `page-${userId}-${buildCodingSkillId(slug)}`;
}
var CODING_ROOT_SKILL_ID = buildCodingSkillId(CODING_ROOT_SKILL_SLUG);
var CODING_SKILL_SEEDS = [
  {
    slug: "coding",
    title: "coding",
    description: "Root coding skill: methodology, code-modification discipline, and review discipline. Load this when the conversation turns to writing code.",
    body: [
      "# coding",
      "",
      "Root coding skill. Loaded by the agent when it decides to write code.",
      "Children load via requiredSkills (review roles).",
      "Until runtimes expand skill pages, Agent seed also carries a compiled snapshot."
    ].join("\n"),
    triggerMode: "required",
    requiredSkillSlugs: ["coding-review"],
    toolNames: [
      "readFile",
      "writeFile",
      "editFile",
      "applyEdit",
      "applyLineEdits",
      "codeSearch",
      "globFiles",
      "searchFiles",
      "listFiles",
      "execShell",
      "launchProcess",
      "listProcesses",
      "startAgentRun",
      "controlAgentRun",
      "listAgents"
    ],
    promptPatch: [
      "# \u5199\u4EE3\u7801\u7EAA\u5F8B",
      "",
      "## \u6548\u7387\u4F18\u5148\uFF08\u7701 token\uFF09",
      "- \u4E0D\u590D\u8FF0\u9700\u6C42\uFF0C\u4E0D\u89E3\u91CA\u300C\u6253\u7B97\u600E\u4E48\u505A\u300D\uFF0C\u76F4\u63A5\u52A8\u624B\u3002\u6539\u5B8C\u53EA\u7528\u4E00\u4E24\u53E5\u8BDD\u8BF4\u6E05\u300C\u6539\u4E86\u4EC0\u4E48\u3001\u53BB\u54EA\u770B\u300D\u3002",
      "- \u601D\u8003\u7B80\u77ED\uFF1A\u5B9A\u4F4D\u95EE\u9898\u5373\u53EF\uFF0C\u4E0D\u505A\u957F\u7BC7\u63A8\u6F14\u3002",
      "- \u5C0F\u6539\u52A8\u8D70\u6700\u77ED\u8DEF\u5F84\uFF1AsearchFiles/globFiles \u5B9A\u4F4D \u2192 readFile \u786E\u8BA4 \u2192 editFile \u7CBE\u786E\u66FF\u6362\u3002\u80FD\u4E00\u6B21\u547D\u4E2D\u5C31\u4E0D\u8981\u53CD\u590D\u8BFB\u6587\u4EF6\u3002",
      "- \u5DF2\u7ECF\u77E5\u9053\u6587\u4EF6\u548C\u4F4D\u7F6E\u65F6\uFF0C\u8DF3\u8FC7\u591A\u4F59\u7684 search/read\uFF0C\u76F4\u63A5 edit\u3002",
      "- \u7981\u6B62\u4E3A\u4E00\u4E2A\u5C0F\u6539\u52A8\u6574\u9875\u91CD\u5199\u6216\u8FDE\u5E26\u6539\u52A8\u672A\u547D\u4E2D\u7684\u90E8\u5206\u3002",
      "",
      "## \u4EE3\u7801\u4FEE\u6539\u7EAA\u5F8B",
      "- \u7F16\u8F91\u524D\u5148 readFile \u786E\u8BA4\u5F53\u524D\u5185\u5BB9\uFF0C\u907F\u514D stale hash \u9519\u8BEF\u3002",
      "- \u53EA\u78B0\u4EFB\u52A1\u4E66\u5217\u51FA\u7684\u6587\u4EF6\uFF1B\u6539\u5B8C\u7528 `git status --short` \u81EA\u67E5\uFF0C\u82E5\u6539\u5230\u6E05\u5355\u5916\u6587\u4EF6\uFF0C\u5982\u5B9E\u62A5\u544A\u3002",
      "- \u4E0D\u8981 `git add` / `git commit` / `git push` / `git stash` / `git reset` / `git checkout` / `git clean`\u2014\u2014\u6539\u52A8\u7559\u5728\u5DE5\u4F5C\u533A\uFF0C\u63D0\u4EA4\u7531\u8C03\u7528\u65B9\u9A8C\u6536\u540E\u5904\u7406\u3002",
      "- \u53EA\u8DD1\u4EFB\u52A1\u91CC\u5217\u51FA\u7684\u6D4B\u8BD5\u6587\u4EF6\uFF0C\u4E0D\u8981\u8DD1 broader \u6D4B\u8BD5\u3002",
      "- **\u5EFA\u8BAE\u6C47\u62A5**\uFF1A\u4EA4\u4ED8\u65F6\u628A\u8FC7\u7A0B\u4E2D\u53D1\u73B0\u7684**\u4EFB\u4F55\u503C\u5F97\u7528\u6237\u77E5\u9053\u7684\u4E8B**\u90FD\u5217\u51FA\u6765\uFF08\u9884\u5B58\u65E0\u5173\u6539\u52A8\u3001\u65E2\u6709\u6D4B\u8BD5\u9694\u79BB\u95EE\u9898\u3001\u6F5C\u5728\u98CE\u9669\u3001\u540E\u7EED\u53EF\u4F18\u5316\u70B9\u3001\u9700\u7528\u6237\u51B3\u7B56\u7684\u4E8B\u9879\uFF09\uFF0C\u4E0D\u8981\u53EA\u62A5\u300C\u505A\u5B8C\u4E86\u300D\u3002",
      "",
      "## Review \u7EAA\u5F8B\uFF08commit \u524D\u786C\u95E8\uFF09",
      "- \u9664 \u22642 \u6B65\u96F6\u903B\u8F91\u98CE\u9669\u7684\u673A\u68B0\u6539\u52A8\uFF08\u9519\u522B\u5B57/\u683C\u5F0F/CSS \u5FAE\u8C03\uFF09\u5916\uFF0C\u6240\u6709\u4EE3\u7801\u53D8\u66F4 commit \u524D\u5FC5\u987B\u5148\u6D3E**\u5176\u4ED6 agent**\uFF08\u4E0D\u540C\u6A21\u578B\u5BB6\u65CF\u4F18\u5148\uFF09review \u5DE5\u4F5C\u533A diff\uFF08`git diff`\uFF0C\u672A\u63D0\u4EA4\u7684\u6539\u52A8\uFF09\u3002reviewer \u4E0D\u53EF\u662F\u81EA\u5DF1\u3002\u65E0 review \u4E0D commit\u2014\u2014\u8FD9\u662F\u786C\u95E8\uFF0C\u4E0D\u662F\u5EFA\u8BAE\u3002",
      "- \u6D3E\u53D1\u8D70 `startAgentRun(agentKey, task, { ephemeral: true })`\uFF08web/\u684C\u9762\u7AEF\u6CA1\u6709 nolo CLI\uFF0C\u6240\u6709 host \u90FD\u6709\u8FD9\u4E2A\u5DE5\u5177\uFF09\u3002ephemeral \u8BA9 review \u5B8C\u6210\u540E\u4E0D\u7559 dialog \u8BB0\u5F55\u3002",
      "- task \u91CC\u5FC5\u987B\u5199\u660E\u5BA1\u67E5\u5BF9\u8C61\uFF08`git diff` \u770B\u5DE5\u4F5C\u533A\u6539\u52A8\uFF0C\u6216 `git diff alpha...HEAD` \u770B\u5DF2\u63D0\u4EA4\u6539\u52A8\uFF09\uFF0C\u5426\u5219 reviewer \u4E0D\u77E5\u9053\u5BA1\u4EC0\u4E48\u3002",
      '- \u6309\u89D2\u8272\u52A0\u8F7D\u5BF9\u5E94 skill\uFF1Areviewer \u5148 `loadSkill("coding-review")` \u62FF\u901A\u7528\u6D41\u7A0B\uFF0C\u518D\u6309\u89D2\u8272 `loadSkill("coding-review-<role>")` \u62FF\u68C0\u67E5\u9879\u3002\u89D2\u8272\u6E05\u5355\uFF1Acode-quality\uFF08**\u5FC5\u8DD1**\uFF09/ architecture\uFF08**\u5355\u72EC\u6D3E\u53D1**\uFF0C\u4E2D\u7EA7\u4EE5\u4E0A\u95EE\u9898\uFF09/ security\uFF08\u6309\u9700 + \u5B89\u5168\u654F\u611F\u89E6\u53D1\u5FC5\u8DD1\uFF09/ frontend-ux\uFF08\u6D89\u53CA UI \u65F6\uFF09/ backend-data\uFF08\u6D89\u53CA server \u65F6\uFF09\u3002\u89D2\u8272\u5207\u5272\u7684\u76EE\u7684\u662F\u6CE8\u610F\u529B\u9694\u79BB\u2014\u2014\u6BCF\u4E2A\u89D2\u8272\u53EA\u76EF\u81EA\u5DF1\u7684\u68C0\u67E5\u9762\uFF0C\u6309\u9700\u542F\u7528\uFF0C\u907F\u514D\u4E00\u4E2A reviewer \u80CC\u6240\u6709\u89D2\u8272\u5BFC\u81F4\u6CE8\u610F\u529B\u7A00\u91CA\u3002',
      "- Verdict \u6807\u51C6\uFF1AAPPROVE\uFF08\u65E0 CRITICAL \u6216 HIGH\uFF09\u2192 \u53EF commit\uFF1BWARNING\uFF08\u4EC5 HIGH\uFF09\u2192 \u62A5\u544A owner \u51B3\u5B9A\uFF1BBLOCK\uFF08\u6709 CRITICAL\uFF09\u2192 \u5FC5\u987B\u5148\u4FEE\u3002",
      "- review \u53EF\u80FD\u591A\u8F6E\u6536\u655B\uFF08\u6709 finding\u2192\u4FEE\u2192\u518D\u5BA1\u2192\u76F4\u5230 APPROVE\uFF09\u3002\u6BCF\u8F6E review \u662F\u65E0\u4E0A\u4E0B\u6587\u7684\u2014\u2014reviewer \u53EA\u770B\u5F53\u524D\u5DE5\u4F5C\u533A diff\uFF0C\u4E0D\u5E26\u4E0A\u4E00\u8F6E finding \u8BB0\u5FC6\u3002",
      "- **\u81EA\u52A8 review \u5FAA\u73AF**\uFF1A\u4EFB\u52A1\u5B8C\u6210\u540E**\u81EA\u52A8\u8FDB\u5165 review \u5FAA\u73AF**\uFF0C\u4E0D\u8981\u505C\u5728\u300C\u6539\u5B8C\u4EA4\u4ED8\u300D\u5C31\u7B49\u8C03\u7528\u65B9\u3002\u6D41\u7A0B\uFF1A\u6539\u5B8C \u2192 \u6D3E reviewer \u5BA1\u5DE5\u4F5C\u533A diff \u2192 \u82E5\u51FA finding \u5C31\u4FEE\u590D \u2192 \u590D\u5BA1 \u2192 \u76F4\u5230 APPROVE \u624D\u63D0\u4EA4\u3002\u9664\u975E\u8C03\u7528\u65B9\u660E\u786E\u8BF4\u300C\u53EA\u6539\u4E0D\u5BA1\u300D\uFF0C\u5426\u5219\u9ED8\u8BA4\u8D70\u5B8C\u6574\u5FAA\u73AF\u3002",
      "- \u82E5\u5904\u4E8E\u5355 Agent \u72EC\u5360\u73AF\u5883\u3001\u5176\u4ED6 agent \u4E0D\u53EF\u8FBE\u3001\u6216\u7528\u6237\u660E\u786E\u8981\u6C42\u76F4\u63A5\u63D0\u4EA4\uFF0C\u5141\u8BB8\u5E26\u539F\u56E0\u8DF3\u8FC7\uFF08commit message \u6CE8\u660E [no-review: \u539F\u56E0]\uFF09\uFF0C\u4F46\u9ED8\u8BA4\u5FC5\u987B\u6D3E review\u3002"
    ].join("\n")
  },
  {
    slug: "coding-review",
    title: "coding-review",
    description: "Reviewer-side rule payload: review flow, finding quality gate, false-positive list, AI-generated-code concerns, output format, Verdict. Load this first, then load the matching role skill.",
    body: [
      "# coding-review",
      "",
      "Reviewer-side rule payload. Load this first, then load the matching role skill."
    ].join("\n"),
    triggerMode: "required",
    requiredSkillSlugs: [
      "coding-review-code-quality",
      "coding-review-architecture",
      "coding-review-security",
      "coding-review-frontend-ux",
      "coding-review-backend-data"
    ],
    promptPatch: [
      "# Review \u901A\u7528\u6D41\u7A0B\uFF08\u5B8C\u6574\u7248\uFF09",
      "",
      "**\u4F60\u662F reviewer\u3002** \u672C\u6587\u4EF6\u662F\u4F60\u8FD9\u4E00\u8F6E\u7684\u5168\u90E8\u89C4\u5219\uFF1Bspec \u53EA\u8865\u4EFB\u52A1\u7279\u5B9A\u5185\u5BB9\u3002",
      "**\u4F60\u4E0D\u6D3E\u53D1\u3001\u4E0D\u505A\u5019\u9009\u9009\u62E9\u3001\u4E0D\u6539\u6587\u4EF6\u3002** \u53EA\u5BA1 spec \u7ED9\u4F60\u7684 diff\uFF0C\u4EA7\u51FA finding \u6216 `Clean review`\u3002",
      "",
      "## Review Dispatch Contract\uFF08\u89C4\u5212\u8005\u6D3E\u53D1\u524D\u8BFB\u53D6\uFF09",
      "- reviewer \u4E0D\u5F97\u662F\u4EA7\u51FA\u8BE5 diff \u7684\u540C\u4E00 agent\uFF1B\u89C4\u5212\u8005\u4EB2\u81EA\u5B9E\u73B0\u7684 diff \u4E5F\u5FC5\u987B\u4EA4\u7ED9\u53E6\u4E00\u4E2A reviewer\u3002",
      "- \u4ECE `listAgents` \u9009\u62E9 reviewer\uFF1A\u5148\u8FC7\u6EE4\u4E0D\u53EF\u7528\u5019\u9009\uFF0C\u80DC\u4EFB\u8005\u4E2D\u4F18\u5148\u81EA\u5EFA agent\uFF08\u8D70\u7528\u6237\u81EA\u5DF1\u7684 API/OAuth\uFF0C\u4E0D\u8017\u5E73\u53F0 credits\uFF09\uFF0C\u5176\u6B21\u7528\u6237\u6536\u85CF\uFF1B\u6709\u5408\u9002\u5019\u9009\u65F6\u5C3D\u91CF\u6362\u6A21\u578B\u5BB6\u65CF\u3002",
      "- \u6210\u672C\u7EAA\u5F8B\uFF1A\u5E38\u89C4 review \u4F18\u5148\u4F4E\u4EF7\u80DC\u4EFB\u5019\u9009\uFF1B\u9876\u6863\u6A21\u578B\u53EA\u7528\u4E8E\u5927\u578B\u6DF1 review \u6216\u67B6\u6784/\u8BA1\u8D39/\u5B89\u5168/\u6570\u636E\u9AD8\u98CE\u9669\u5BA1\u67E5\uFF0C\u9009\u62E9\u524D\u8BF4\u660E\u7406\u7531\u3002\u7528\u6237\u70B9\u540D reviewer \u4E0D\u53D7\u9650\u5236\u3002",
      "- \u5C0F\u4EFB\u52A1\u22651 \u975E\u4F5C\u8005 reviewer\uFF1B\u4E2D\u4EFB\u52A1\u22651 \u4E14\u5C3D\u91CF\u6362\u5BB6\u65CF\uFF1B\u5927\u4EFB\u52A1\uFF08\u67B6\u6784/\u8BA1\u8D39/\u5B89\u5168/\u6570\u636E/\u53D1\u5E03/\u9AD8\u5E76\u53D1\uFF09\u22652 \u4E0D\u540C\u5BB6\u65CF\u5E76\u884C + owner \u6700\u7EC8\u786E\u8BA4\u3002",
      "- \u81EA\u5EFA/\u6536\u85CF\u4F18\u5148\u662F\u504F\u597D\uFF0C\u4E0D\u5F97\u8986\u76D6\u4EFB\u52A1\u517C\u5BB9\u6027\u3001\u6743\u9650\u3001\u8FD0\u884C\u65F6\u53EF\u7528\u6027\u6216\u4F5C\u8005\u56DE\u907F\u89C4\u5219\u3002",
      "",
      "## read-only \u884C\u4E3A\u7EA6\u675F",
      "reviewer \u4E0D\u5F97\u4FEE\u6539\u88AB\u5BA1\u6587\u4EF6\u3001\u5207\u5206\u652F\u3001\u56DE\u6EDA\u4ED6\u4EBA\u6539\u52A8\u3001\u8FD0\u884C\u4F1A\u5199\u5165\u5DE5\u4F5C\u533A/\u8FDC\u7AEF\u7684\u547D\u4EE4\u3002\u4E0D\u8981\u6574\u4F53\u7981\u7528 shell/\u6587\u4EF6\u5DE5\u5177\u2014\u2014review \u9700\u901A\u8FC7 `git diff`/`git status`/\u641C\u7D22/\u8BFB\u53D6\u53D6\u8BC1\u3002\u5141\u8BB8\u53EA\u8BFB Git/shell \u547D\u4EE4\u3002\u82E5 reviewer \u8FDD\u53CD\u4EA7\u751F\u6587\u4EF6\u6539\u52A8\uFF0C\u89C4\u5212\u8005\u89C6\u8BE5 review \u65E0\u6548\u5E76\u505C\u6B62 run\uFF0C\u4E0D\u5F97\u81EA\u52A8\u56DE\u6EDA\uFF08\u5DE5\u4F5C\u6811\u53EF\u80FD\u542B\u4ED6\u4EBA\u6539\u52A8\uFF09\u3002",
      "",
      "## \u6D3E\u53D1\u4E0E\u5B8C\u6210\u6761\u4EF6",
      "- \u4E00\u5F8B\u975E\u6301\u4E45\u5316\uFF08ephemeral\uFF09\u6D3E\u53D1\uFF0C\u5B8C\u6210\u540E\u4E0D\u7559 dialog \u8BB0\u5F55\uFF1A`startAgentRun(agentKey, task, { ephemeral: true })`\uFF1B\u5BBF\u4E3B\u5DE5\u5177\u4E0D\u53EF\u7528\u65F6\u7528 CLI \u5E26 `--ephemeral`\u3002",
      "- \u89C4\u5212\u8005\u53EA\u628A diff/\u80CC\u666F/\u68C0\u67E5\u8303\u56F4/\u9A8C\u6536\u8BC1\u636E/\u89D2\u8272\u5199\u8FDB spec\uFF1B\u89C4\u5219\u7531\u672C\u6587\u4EF6\u63D0\u4F9B\uFF0C\u4E0D\u8981\u590D\u5236\u8FDB prompt\u3002",
      "- \u53EA\u6709\u5E26\u5B9E\u9645\u68C0\u67E5\u8BC1\u636E\u7684 finding \u6216 `Clean review` \u624D\u7B97\u5B8C\u6210\u3002\u7A7A\u54CD\u5E94\u3001\u53EA\u8BF4\u300C\u6211\u5148\u68C0\u67E5\u300D\u3001timeout \u90FD\u4E0D\u662F\u8BC1\u636E\uFF1B\u6700\u591A\u91CD\u8BD5\u4E00\u6B21\uFF0C\u4ECD\u65E0\u7ED3\u8BBA\u5C31\u6807\u8BB0 `review incomplete` \u4EA4 owner\uFF0C\u7981\u6B62\u65E0\u9650\u6362 agent\u3002",
      "",
      "## \u6D41\u7A0B",
      "1. Gather\uFF1A\u8BFB spec \u7ED9\u7684\u5BA1\u67E5\u547D\u4EE4\uFF08`git diff` \u6216 `git diff alpha...HEAD`\uFF09\uFF0C\u62FF\u5230 diff\uFF1B\u65E0\u6539\u52A8\u76F4\u63A5 Clean review\u3002",
      "2. Scope\uFF1A\u786E\u8BA4\u6539\u52A8\u8303\u56F4\uFF0C\u53EA\u5BA1 diff \u89E6\u53CA\u7684\u6587\u4EF6\uFF0C\u5F04\u6E05\u5BF9\u5E94\u4EC0\u4E48\u529F\u80FD/\u4FEE\u590D\u3002",
      "3. Context\uFF1A\u4E0D\u8981\u53EA\u770B hunk\uFF1B\u8BFB\u5468\u56F4\u5B9E\u73B0\u3001imports\u3001\u8C03\u7528\u65B9\u3002",
      "4. Checklist\uFF1A\u6309\u89D2\u8272\u4ECE CRITICAL \u2192 LOW\uFF1B\u53EA\u62A5 >80% \u6709\u628A\u63E1\u7684\u771F\u5B9E\u95EE\u9898\u3002",
      "5. Report\uFF1A\u4EA7\u51FA finding \u8868 + Verdict\uFF1B\u540C\u7C7B\u95EE\u9898\u5408\u5E76\u3002",
      "",
      "\u989D\u5916\u8FC7\u6EE4\uFF1A\u8DF3\u8FC7\u7EAF\u98CE\u683C\u504F\u597D\uFF08\u9664\u975E\u8FDD\u53CD\u9879\u76EE\u7EA6\u5B9A\uFF09\uFF1B\u672A\u6539\u52A8\u7684\u65E7\u4EE3\u7801\u9664\u975E CRITICAL \u5B89\u5168\u5426\u5219\u4E0D\u62A5\uFF1B\u4F18\u5148\u62A5\u4F1A\u5BFC\u81F4 bug/\u5B89\u5168\u6F0F\u6D1E/\u6570\u636E\u4E22\u5931\u7684\u95EE\u9898\u3002",
      "",
      "## Finding \u8D28\u91CF\u95E8\uFF08\u786C\u89C4\u5219\uFF0C\u6BCF\u6761 finding \u62A5\u51FA\u524D\u8FC7\u56DB\u95EE\uFF09",
      "\u4EFB\u4E00\u7B54\u300C\u5426\u300D\u6216\u300C\u4E0D\u786E\u5B9A\u300D\u5219\u964D\u7EA7\u6216\u4E22\u5F03\uFF1A",
      "1. \u80FD\u5F15\u7528\u786E\u5207\u884C\u53F7\uFF1F\uFF08\u6A21\u7CCA\u53D1\u73B0\u4E0D actionable\uFF09",
      "2. \u80FD\u63CF\u8FF0\u5177\u4F53\u5931\u8D25\u6A21\u5F0F\uFF1F\uFF08\u547D\u540D\u8F93\u5165\u3001\u72B6\u6001\u3001\u574F\u7ED3\u679C\uFF1B\u8BF4\u4E0D\u51FA\u89E6\u53D1\u6761\u4EF6 = \u6A21\u5F0F\u5339\u914D\uFF09",
      "3. \u80FD\u7ED9\u51FA\u5177\u4F53\u4FEE\u590D\u5EFA\u8BAE\uFF1F\uFF08\u4EE3\u7801\u7EA7\uFF0C\u4E0D\u662F\u9AD8\u5C42\u5EFA\u8BAE\uFF09",
      "4. \u5224\u65AD\u6807\u5C3A\u2014\u2014**\u8FD9\u4E2A\u56E2\u961F\u7684\u9AD8\u7EA7\u5DE5\u7A0B\u5E08\u771F\u4F1A\u5728 review \u91CC\u6539\u8FD9\u4E2A\u5417?** \u4E0D\u4F1A\u5C31\u8DF3\u8FC7\u3002",
      "",
      "## \u5047\u9633\u6027\u6E05\u5355\uFF08\u8FD9\u4E9B\u4E0D\u62A5\uFF09",
      "- \u300C\u8003\u8651\u52A0\u9519\u8BEF\u5904\u7406\u300D\uFF1A\u5148\u67E5\u8C03\u7528\u65B9/\u6846\u67B6\u662F\u5426\u5DF2\u5904\u7406\u3002",
      "- \u300C\u7F3A\u5C11\u8F93\u5165\u9A8C\u8BC1\u300D\uFF1A\u51FD\u6570\u662F\u5185\u90E8\u8C03\u7528\u4E14\u8C03\u7528\u65B9\u5DF2\u6821\u9A8C\u3002",
      "- \u300C\u53EF\u80FD\u7A7A\u6307\u9488\u300D\uFF1A\u4E0A\u4E00\u884C\u5DF2\u7C7B\u578B\u6536\u7A84\u6216\u6709 if guard\u3002",
      "- \u300C\u9B54\u6CD5\u6570\u5B57\u300D\uFF1AHTTP \u72B6\u6001\u7801\u30011000ms\u300160\u300124\u30011024 \u7B49\u5DF2\u77E5\u5E38\u91CF\u8DF3\u8FC7\u3002",
      "- \u300CN+1 \u67E5\u8BE2\u300D\uFF1A\u56FA\u5B9A\u57FA\u6570\u5FAA\u73AF\u6216\u5DF2\u7528 DataLoader/batching \u4E0D\u7B97\u3002",
      "- \u300C\u51FD\u6570\u592A\u957F\u300D\uFF1A\u7A77\u4E3E switch\u3001\u914D\u7F6E\u5BF9\u8C61\u3001\u6D4B\u8BD5\u8868\u3001\u751F\u6210\u4EE3\u7801\u4E0D\u7B97\u3002",
      "- \u300C\u7F3A\u5C11 await\u300D\uFF1A\u6709\u610F fire-and-forget\uFF08\u65E5\u5FD7/\u6307\u6807/\u540E\u53F0\u961F\u5217\uFF09\u3002",
      "- \u300C\u5E94\u8BE5\u7528 TypeScript\u300D\uFF1AJS-only \u6587\u4EF6\u4E0D\u62A5\u3002",
      "- \u300C\u786C\u7F16\u7801\u503C\u300D\uFF1A\u6D4B\u8BD5 fixture\u3001\u793A\u4F8B\u4EE3\u7801\u3001\u6587\u6863\u7247\u6BB5\u91CC\u7684\u786C\u7F16\u7801\u662F\u6B63\u786E\u7684\u3002",
      "- \u300C\u5B89\u5168\u620F\u300D\uFF1A\u975E\u5BC6\u7801\u5B66\u573A\u666F\u7684 `Math.random()` \u4E0D\u62A5\u3002",
      "- \u300CPrefer const over let\u300D\uFF1A\u53D8\u91CF\u88AB\u91CD\u65B0\u8D4B\u503C\u65F6\u4E0D\u62A5\u3002",
      "- \u300CMissing JSDoc\u300D\uFF1A\u5355\u7528\u9014\u5185\u90E8 helper \u4E14\u540D\u79F0+\u7B7E\u540D\u81EA\u89E3\u91CA\u7684\u4E0D\u62A5\u3002",
      "- \u300C\u5E94\u52A0 useMemo/useCallback\u300D\uFF1AReact Compiler \u8DEF\u5F84\u9ED8\u8BA4\u4E0D\u62A5\u3002",
      "",
      "## AI \u751F\u6210\u4EE3\u7801 review \u5173\u6CE8\u70B9\uFF08\u6240\u6709\u89D2\u8272\u901A\u7528\uFF09",
      "1. **\u884C\u4E3A\u56DE\u5F52**\uFF1A\u6539 A \u5904\u65F6\u662F\u5426\u7834\u574F\u4E86\u4F9D\u8D56 A \u65E7\u884C\u4E3A\u7684 B \u5904\uFF1FAI \u4E0D\u8FFD\u8E2A\u5168\u8C03\u7528\u94FE\uFF0Creviewer \u8981\u8865\u67E5\u3002",
      "2. **\u4FE1\u4EFB\u8FB9\u754C**\uFF1A\u65B0\u4EE3\u7801\u662F\u5426\u5047\u8BBE\u8F93\u5165\u6765\u81EA\u53EF\u4FE1\u6E90\uFF1F\u5916\u90E8\u8F93\u5165\uFF08\u7528\u6237/API/DB \u8BFB\u51FA\uFF09\u662F\u5426\u9A8C\u8BC1\u540E\u624D\u7528\uFF1F",
      "3. **\u9690\u85CF\u8026\u5408**\uFF1A\u662F\u5426\u65B0\u589E\u4E86\u4E0E\u73B0\u6709\u62BD\u8C61\u91CD\u590D\u7684\u80FD\u529B\uFF1F**\u662F\u5426\u5236\u9020\u4E86\u7B2C\u4E8C\u4EFD\u771F\u503C\uFF1F**",
      "4. **\u6210\u672C\u590D\u6742\u5EA6**\uFF1A\u662F\u5426\u8FC7\u5EA6\u5DE5\u7A0B\uFF1F\u5355\u8C03\u7528\u573A\u666F\u662F\u5426\u52A0\u4E86\u62BD\u8C61\u5C42/retry/\u914D\u7F6E\u9879\uFF1F",
      "> \u770B\u5230\u7B2C\u4E8C\u4EFD\u771F\u503C\u5C31\u62A5\uFF0C\u522B\u5F53\u98CE\u683C\u95EE\u9898\u2014\u2014\u5B83\u6709\u5B9E\u6D4B\u4EE3\u4EF7\uFF1A\u540C\u4E00\u4E2A\u5224\u5B9A\u903B\u8F91\u5728\u4E24\u4E2A\u5305\u5404\u5B58\u4E00\u4EFD\u6084\u6084\u6F02\u79FB\uFF0C\u4F1A\u5BFC\u81F4\u7EBF\u4E0A\u6545\u969C\u88AB\u4F2A\u88C5\u6210\u65E0\u5173\u73B0\u8C61\u3002",
      "",
      "## \u8F93\u51FA\u683C\u5F0F",
      "\u6309\u4E25\u91CD\u5EA6\u7EC4\u7EC7\uFF0C\u6BCF\u6761 finding\uFF1A",
      "`[CRITICAL] \u6807\u9898` / `File: path/to/file.ts:42` / `Issue: \u5177\u4F53\u95EE\u9898` / `Fix: \u4EE3\u7801\u7EA7\u4FEE\u590D\u5EFA\u8BAE`",
      "",
      "### \u7ED3\u5C3E\u5FC5\u987B\u5E26 Summary",
      "```",
      "## Review Summary",
      "| Severity | Count | Status |",
      "|----------|-------|--------|",
      "| CRITICAL | 0     | pass   |",
      "| HIGH     | 2     | warn   |",
      "| MEDIUM   | 3     | info   |",
      "| LOW      | 1     | note   |",
      "",
      "Verdict: APPROVE / WARNING / BLOCK",
      "```",
      "- APPROVE\uFF1A\u65E0 CRITICAL \u6216 HIGH\uFF0C\u542B\u96F6 finding \u5E72\u51C0 review\uFF1BWARNING\uFF1A\u4EC5 HIGH\uFF1BBLOCK\uFF1A\u6709 CRITICAL\u3002",
      "\u4E0D\u8981\u4E3A\u4E86\u663E\u5F97\u4E25\u683C\u800C\u62D2\u7EDD\u6279\u51C6\u3002diff \u5E72\u51C0\u5C31 APPROVE\u3002"
    ].join("\n")
  },
  {
    slug: "coding-review-code-quality",
    title: "coding-review-code-quality",
    description: "Code-quality review role: readability, maintainability, composability, duplication, deletability, missing tests, dead code, in-place mutation. **Mandatory role** \u2014 always dispatched, never skipped.",
    body: [
      "# coding-review-code-quality",
      "",
      "Code-quality review role. Mandatory \u2014 always dispatched."
    ].join("\n"),
    triggerMode: "required",
    promptPatch: [
      "# \u4EE3\u7801\u8D28\u91CF\u68C0\u67E5\u9879\uFF08\u5FC5\u8DD1\uFF09",
      "",
      "### \u53EF\u8BFB\u6027",
      "- \u4E4B\u540E\u7684 AI / \u65B0\u4EBA\u80FD\u5426\u770B\u61C2\u8FD9\u6BB5\u4EE3\u7801\uFF1F\u547D\u540D\u662F\u5426\u81EA\u89E3\u91CA\uFF1F",
      "- \u662F\u5426\u5BB9\u6613\u641C\u7D22\uFF08\u51FD\u6570/\u53D8\u91CF\u540D\u662F\u5426\u7528\u8BCD\u51C6\u786E\u3001\u53EF grep \u5230\uFF09\uFF1F",
      "- \u63A7\u5236\u6D41\u662F\u5426\u6E05\u6670\uFF0C\u6709\u6CA1\u6709\u7ED5\u5F2F\u7684\u5199\u6CD5\uFF1F",
      "",
      "### \u53EF\u7EF4\u62A4\u6027",
      "- \u5047\u8BBE\u4E4B\u540E\u8981\u5220\u9664\u6216\u6539\u52A8\u8FD9\u4E2A\u529F\u80FD\uFF0C\u662F\u5426\u5BB9\u6613\u6539\uFF1F",
      "- \u6539\u52A8\u662F\u5426\u88AB\u786C\u7F16\u7801/\u9B54\u6CD5\u503C/\u6563\u843D\u7684\u91CD\u590D\u903B\u8F91\u9501\u6B7B\uFF1F",
      "- \u662F\u5426\u8FC7\u5EA6\u8026\u5408\uFF0C\u6539\u4E00\u5904\u8981\u8FDE\u5E26\u6539\u591A\u5904\uFF1F",
      "",
      "### \u53EF\u7EC4\u5408\u6027",
      "- \u662F\u5426\u51FD\u6570\u5F0F\u3001\u7EAF\u51FD\u6570\u4F18\u5148\uFF1F\u526F\u4F5C\u7528\u662F\u5426\u9694\u79BB\uFF1F",
      "- \u65B0\u529F\u80FD\u80FD\u5426\u590D\u7528\u5DF2\u6709\u51FD\u6570\uFF0C\u800C\u4E0D\u662F\u590D\u5236\u7C98\u8D34\u518D\u6539\uFF1F",
      "- \u662F\u5426\u628A\u53EF\u590D\u7528\u7684\u903B\u8F91\u5185\u8054\u8FDB\u4E86\u5355\u4E00\u8C03\u7528\u70B9\uFF0C\u5BFC\u81F4\u65E0\u6CD5\u4E8C\u6B21\u4F7F\u7528\uFF1F",
      "",
      "### \u91CD\u590D\u6027",
      "- \u662F\u5426\u6709\u76F8\u540C\u4EE3\u7801\u5728\u5E72\u76F8\u540C\u4E8B\u60C5\uFF08DRY\uFF09\uFF1F",
      "- \u80FD\u5426\u62BD\u53D6\u4E3A\u540C\u4E00\u4E2A\u51FD\u6570/\u5DE5\u5177\uFF0C\u800C\u4E0D\u662F\u591A\u5904\u5404\u5199\u4E00\u4EFD\uFF1F",
      "- \u6CE8\u610F\uFF1A\u91CD\u590D\u7684**\u6D4B\u8BD5** fixture \u4E0D\u7B97\u3002",
      "",
      "### \u53EF\u5220\u9664\u6027",
      "- \u54EA\u4E9B\u4EE3\u7801\u4E0D\u518D\u4F7F\u7528\uFF08\u6B7B\u4EE3\u7801\u3001\u672A\u4F7F\u7528 import\u3001\u4E0D\u53EF\u8FBE\u5206\u652F\u3001\u6CE8\u91CA\u6389\u7684\u5927\u5757\uFF09\uFF1F",
      "- \u54EA\u4E9B\u4EE3\u7801\u6709\u66F4\u597D\u7684\u8868\u8FBE\u65B9\u5F0F\uFF08\u66F4\u77ED\u3001\u66F4\u6E05\u6670\u3001\u7528\u6807\u51C6\u5E93\u66FF\u4EE3\u624B\u5199\uFF09\uFF1F",
      "",
      "### \u5176\u4ED6",
      "- \u65B0\u4EE3\u7801\u8DEF\u5F84\u660E\u663E\u7F3A\u6D4B\u8BD5\uFF08\u6709\u53EF\u6D4B\u884C\u4E3A\u5374\u65E0\u5BF9\u5E94\u7528\u4F8B\uFF09",
      "- \u539F\u5730 mutation\uFF08\u5E94 immutable \u66F4\u65B0\u65F6\uFF09"
    ].join("\n")
  },
  {
    slug: "coding-review-architecture",
    title: "coding-review-architecture",
    description: "Architecture review role: design boundaries, circular deps, maintainability, second source of truth, API compatibility, file/function size. **Dispatch separately** for mid-level+ issues.",
    body: [
      "# coding-review-architecture",
      "",
      "Architecture review role. Dispatch separately for mid-level+ issues."
    ].join("\n"),
    triggerMode: "required",
    promptPatch: [
      "# \u67B6\u6784\u5BA1\u8BA1\u5458\u68C0\u67E5\u9879",
      "",
      "- \u8BBE\u8BA1\u8FB9\u754C\uFF08\u65B0\u589E\u8026\u5408\u662F\u5426\u5408\u7406\uFF09",
      "- \u5FAA\u73AF\u4F9D\u8D56",
      "- \u53EF\u7EF4\u62A4\u6027\uFF08\u662F\u5426\u8FC7\u5EA6\u5DE5\u7A0B\u3001\u5355\u5B9E\u73B0\u62BD\u8C61\u3001\u65E0\u4EBA config\uFF09",
      "- \u662F\u5426\u4E0E\u73B0\u6709\u62BD\u8C61\u91CD\u590D\uFF08**\u5236\u9020\u7B2C\u4E8C\u4EFD\u771F\u503C**\uFF09",
      "- API \u517C\u5BB9\u6027\uFF08\u7B7E\u540D\u53D8\u66F4\u662F\u5426\u7834\u574F\u8C03\u7528\u65B9\uFF09",
      "- \u6587\u4EF6/\u51FD\u6570\u4F53\u91CF\uFF1A\u5178\u578B 200\u2013400 \u884C\u3001\u5355\u6587\u4EF6 >800 / \u51FD\u6570 >50 \u4E14\u53EF\u62C6\u65F6\u518D\u62A5\uFF08\u7A77\u4E3E switch/\u914D\u7F6E\u8868\u9664\u5916\uFF09"
    ].join("\n")
  },
  {
    slug: "coding-review-security",
    title: "coding-review-security",
    description: "Security review role: hardcoded credentials, injection, XSS, path traversal, CSRF, auth bypass, log leakage, vulnerable deps, error-info leakage. On-demand + mandatory when diff touches security-sensitive surfaces.",
    body: [
      "# coding-review-security",
      "",
      "Security review role. On-demand + mandatory on security-sensitive diffs."
    ].join("\n"),
    triggerMode: "required",
    promptPatch: [
      "# \u5B89\u5168\u5BA1\u8BA1\u5458\u68C0\u67E5\u9879",
      "",
      "- \u786C\u7F16\u7801\u51ED\u8BC1\uFF08API key/password/token/connection string in source\uFF09",
      "- SQL \u6CE8\u5165\uFF08\u5B57\u7B26\u4E32\u62FC\u63A5 vs \u53C2\u6570\u5316\u67E5\u8BE2\uFF09",
      "- XSS\uFF08\u672A\u8F6C\u4E49\u7684\u7528\u6237\u8F93\u5165\u6E32\u67D3\u5230 HTML/JSX\uFF09",
      "- \u8DEF\u5F84\u7A7F\u8D8A\uFF08\u7528\u6237\u63A7\u5236\u7684\u6587\u4EF6\u8DEF\u5F84\u672A\u6D88\u6BD2\uFF09",
      "- CSRF\uFF08\u72B6\u6001\u53D8\u66F4\u7AEF\u70B9\u7F3A CSRF \u4FDD\u62A4\uFF09",
      "- \u8BA4\u8BC1\u7ED5\u8FC7\uFF08\u53D7\u4FDD\u62A4\u8DEF\u7531\u7F3A auth \u68C0\u67E5\uFF09",
      "- \u65E5\u5FD7\u6CC4\u9732\u654F\u611F\u6570\u636E\uFF08token/password/PII \u51FA\u73B0\u5728\u65E5\u5FD7\u91CC\uFF09",
      "- \u5DF2\u77E5\u8106\u5F31\u4F9D\u8D56\uFF08\u82E5 diff \u5347\u7EA7\u4E86\u6709\u516C\u5F00 CVE \u7684\u5305\u4E14\u53EF\u8BC1\u5B9E\uFF09",
      "- \u9519\u8BEF\u4FE1\u606F\u628A\u5185\u90E8\u5806\u6808/\u5BC6\u94A5\u7EC6\u8282\u8FD4\u56DE\u7ED9\u5BA2\u6237\u7AEF",
      "",
      "## \u5B89\u5168\u654F\u611F\u89E6\u53D1\uFF08\u5FC5\u8DD1\uFF09",
      "diff \u89E6\u53CA\u4E0B\u5217\u4EFB\u4E00\u7C7B\u65F6\uFF0C\u5B89\u5168\u5BA1\u8BA1\u5458\u68C0\u67E5\u9879\u89C6\u4E3A**\u5FC5\u8DD1**\uFF08\u5373\u4F7F spec \u672A\u70B9\u540D\u5B89\u5168\u89D2\u8272\uFF09\uFF1A",
      "- \u8BA4\u8BC1 / \u6388\u6743 / session / token",
      "- \u7528\u6237\u8F93\u5165\u8FDB\u5165\u67E5\u8BE2\u3001HTML\u3001shell\u3001\u6587\u4EF6\u8DEF\u5F84",
      "- \u652F\u4ED8 / \u8BA1\u8D39 / \u914D\u989D",
      "- \u5BC6\u94A5\u3001\u51ED\u8BC1\u3001`.env`\u3001\u5BC6\u94A5\u5B58\u50A8",
      "- \u6587\u4EF6\u7CFB\u7EDF\u8BFB\u5199\u3001\u4EFB\u610F URL fetch\uFF08SSRF \u9762\uFF09"
    ].join("\n")
  },
  {
    slug: "coding-review-frontend-ux",
    title: "coding-review-frontend-ux",
    description: "Frontend/UX review role: React implementation (index key, setState during render, loading/error/empty, stale closure) + UX (i18n, stuck state, error handling, accessibility). On-demand when diff touches UI.",
    body: [
      "# coding-review-frontend-ux",
      "",
      "Frontend/UX review role. On-demand when diff touches UI."
    ].join("\n"),
    triggerMode: "required",
    promptPatch: [
      "# \u524D\u7AEF / UX \u68C0\u67E5\u9879\uFF08\u6D89\u53CA `packages/**` UI \u65F6\uFF09",
      "",
      "### \u524D\u7AEF / React",
      "- \u53EF\u91CD\u6392\u5217\u8868\u7528 index \u5F53 key",
      "- render \u671F\u95F4 setState",
      "- \u7F3A loading/error/empty\uFF0C\u6613 stuck",
      "- \u4E8B\u4EF6\u5904\u7406\u5668\u660E\u663E stale closure\uFF08\u6709\u8BC1\u636E\u518D\u62A5\uFF09",
      "- \u786C\u7F16\u7801\u7528\u6237\u53EF\u89C1\u6587\u6848\uFF08\u5E94\u8D70 i18n\uFF09",
      "",
      "### \u7528\u6237\u4F53\u9A8C",
      "- i18n\uFF08\u786C\u7F16\u7801\u7528\u6237\u53EF\u89C1\u5B57\u7B26\u4E32\uFF09",
      "- stuck state\uFF08loading/error/empty \u72B6\u6001\u662F\u5426\u8986\u76D6\uFF09",
      "- error handling\uFF08\u7528\u6237\u53EF\u89C1\u9519\u8BEF\u662F\u5426\u53CB\u597D\u4E14\u4E0D\u6CC4\u9732\u5185\u90E8\u7EC6\u8282\uFF09",
      "- \u53EF\u8BBF\u95EE\u6027\uFF08ARIA\u3001\u952E\u76D8\u5BFC\u822A\u3001\u8BED\u4E49 HTML\uFF09"
    ].join("\n")
  },
  {
    slug: "coding-review-backend-data",
    title: "coding-review-backend-data",
    description: "Backend/data-integrity review role: request validation, unbounded scans, missing timeout, missing rate limit, CORS + idempotency, race conditions, transaction atomicity, data-loss risk, cross-boundary leakage + silent failure (empty catch, dangerous fallback, lost stack, missing rollback, log-and-forget, debug residue). On-demand when diff touches server.",
    body: [
      "# coding-review-backend-data",
      "",
      "Backend/data-integrity review role. On-demand when diff touches server."
    ].join("\n"),
    triggerMode: "required",
    promptPatch: [
      "# \u540E\u7AEF / \u6570\u636E\u5B8C\u6574\u6027\u68C0\u67E5\u9879\uFF08\u6D89\u53CA server/cli/handlers \u65F6\uFF09",
      "",
      "### \u540E\u7AEF / API",
      "- \u8BF7\u6C42\u4F53/\u53C2\u6570\u672A\u6821\u9A8C\u5373\u4F7F\u7528",
      "- \u9762\u5411\u7528\u6237\u7684\u67E5\u8BE2\u65E0 LIMIT / \u65E0\u754C\u626B\u63CF",
      "- \u5916\u90E8 HTTP/DB \u8C03\u7528\u7F3A timeout",
      "- \u516C\u5F00\u7AEF\u70B9\u7F3A\u5408\u7406\u9650\u6D41\uFF08\u82E5\u8BE5\u9762\u672C\u5E94\u6709\uFF09",
      "- CORS / \u8DE8\u6E90\u7B56\u7565\u660E\u663E\u8FC7\u5BBD\u4E14\u5728\u672C\u6B21 diff \u5F15\u5165",
      "",
      "### \u6570\u636E\u5B8C\u6574\u6027",
      "- \u5E42\u7B49\u6027\uFF08\u91CD\u590D\u8C03\u7528\u662F\u5426\u5B89\u5168\uFF09",
      "- \u7ADE\u6001\u6761\u4EF6\uFF08TOCTOU\u3001\u5E76\u53D1\u5199\u3001\u7F3A\u9501\uFF09",
      "- \u4E8B\u52A1\u539F\u5B50\u6027\uFF08\u90E8\u5206\u5931\u8D25\u662F\u5426\u56DE\u6EDA\uFF09",
      "- \u6570\u636E\u4E22\u5931\u98CE\u9669\uFF08\u5220\u9664\u8DEF\u5F84\u3001\u8D26\u53F7\u5207\u6362\u3001\u8FC1\u79FB\uFF09",
      "- \u8DE8\u8FB9\u754C\u6CC4\u6F0F\uFF08\u5185\u90E8 ID/\u72B6\u6001\u66B4\u9732\u5230\u5916\u90E8 API\uFF09",
      "",
      "### \u9759\u9ED8\u5931\u8D25",
      "- \u7A7A catch \u5757\uFF08`catch {}` \u6216\u5FFD\u7565\u5F02\u5E38\uFF09",
      "- \u5371\u9669\u964D\u7EA7\uFF08`.catch(() => [])`\u3001\u9ED8\u8BA4\u503C\u63A9\u76D6\u771F\u5B9E\u5931\u8D25\uFF09",
      "- \u4E22\u5931\u5806\u6808\uFF08generic rethrow\u3001\u7F3A async \u5904\u7406\uFF09",
      "- \u7F3A\u8D85\u65F6\uFF08\u5916\u90E8 HTTP/DB \u8C03\u7528\u65E0 timeout\uFF09",
      "- \u7F3A\u56DE\u6EDA\uFF08\u4E8B\u52A1\u6027\u64CD\u4F5C\u5931\u8D25\u540E\u4E0D\u56DE\u6EDA\uFF09",
      "- log-and-forget\uFF08\u8BB0\u4E86\u65E5\u5FD7\u4F46\u6CA1\u4F20\u64AD\u9519\u8BEF\uFF09",
      "- \u5408\u5E76\u524D\u9057\u7559\u7684 `console.log` / \u8C03\u8BD5\u6B8B\u7559\uFF08\u6D4B\u8BD5/\u811A\u672C\u9664\u5916\uFF09"
    ].join("\n")
  }
];
function seedBySlug(slug) {
  const seed = CODING_SKILL_SEEDS.find((item) => item.slug === slug);
  if (!seed) {
    throw new Error(`Unknown Coding skill slug: ${slug}`);
  }
  return seed;
}
function collectCodingReachableSkillSlugs(rootSlug = CODING_ROOT_SKILL_SLUG) {
  const ordered = [];
  const seen = /* @__PURE__ */ new Set();
  const visit = (slug) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    ordered.push(slug);
    for (const child of seedBySlug(slug).requiredSkillSlugs ?? []) {
      visit(child);
    }
  };
  visit(rootSlug);
  return ordered;
}
function compileCodingEffectiveTools() {
  const tools = [];
  const seen = /* @__PURE__ */ new Set();
  for (const slug of collectCodingReachableSkillSlugs()) {
    for (const toolName of seedBySlug(slug).toolNames ?? []) {
      if (seen.has(toolName)) continue;
      seen.add(toolName);
      tools.push(toolName);
    }
  }
  return tools;
}
function compileCodingEffectivePromptPatches() {
  const patches = [];
  for (const slug of collectCodingReachableSkillSlugs()) {
    const patch = seedBySlug(slug).promptPatch;
    if (patch) patches.push(patch);
  }
  return patches;
}
var CODING_COMPILED_EFFECTIVE_TOOLS = compileCodingEffectiveTools();
function buildCodingSkillConfig(slug, options) {
  const seed = seedBySlug(slug);
  const requiredSkills = options?.requiredSkills ?? seed.requiredSkillSlugs?.map((childSlug) => buildCodingSkillId(childSlug));
  return {
    version: "0.1",
    kind: "skill",
    id: buildCodingSkillId(slug),
    name: seed.title,
    description: seed.description,
    ...seed.triggerMode ? { triggerMode: seed.triggerMode } : {},
    ...seed.toolNames?.length ? { toolNames: [...seed.toolNames] } : {},
    ...requiredSkills?.length ? { requiredSkills: [...requiredSkills] } : {},
    ...seed.promptPatch ? { promptPatch: seed.promptPatch } : {}
  };
}
function buildCodingSkillPageRecords(userId) {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("buildCodingSkillPageRecords requires userId");
  }
  return CODING_SKILL_SEEDS.map((seed) => {
    const skillId = buildCodingSkillId(seed.slug);
    const dbKey = buildCodingSkillPageKey(trimmedUserId, seed.slug);
    const requiredSkills = seed.requiredSkillSlugs?.map(
      (childSlug) => buildCodingSkillPageKey(trimmedUserId, childSlug)
    );
    const skillConfig = buildCodingSkillConfig(seed.slug, {
      requiredSkills
    });
    return {
      slug: seed.slug,
      skillId,
      dbKey,
      title: seed.title,
      content: buildSkillDocMarkdown({
        body: seed.body,
        skillConfig
      }),
      meta: {
        kind: "skill",
        skillConfig
      },
      ...skillConfig.toolNames?.length ? { tools: [...skillConfig.toolNames] } : {}
    };
  });
}
function buildCodingRootSkillReference(userId) {
  return {
    dbKey: buildCodingSkillPageKey(userId, CODING_ROOT_SKILL_SLUG),
    title: CODING_ROOT_SKILL_SLUG,
    type: "instruction"
  };
}
function buildCodingSkillContentBySlug(slug) {
  const seed = seedBySlug(slug);
  const skillConfig = buildCodingSkillConfig(slug);
  return buildSkillDocMarkdown({
    body: seed.body,
    skillConfig
  });
}
var CODING_ROOT_SKILL_REFERENCE = {
  dbKey: CODING_ROOT_SKILL_ID,
  title: CODING_ROOT_SKILL_SLUG,
  type: "instruction"
};
function resolveCodingBuiltinSlug(requestedName) {
  const found = CODING_SKILL_SLUGS.find((slug) => slug === requestedName);
  return found ?? null;
}
function buildCodingSkillContentByKey(userId) {
  const contentByKey = /* @__PURE__ */ new Map();
  for (const page of buildCodingSkillPageRecords(userId)) {
    const runtimePage = {
      dbKey: page.dbKey,
      title: page.title,
      content: page.content,
      meta: page.meta,
      tools: page.tools
    };
    contentByKey.set(page.dbKey, runtimePage);
    contentByKey.set(page.skillId, runtimePage);
    contentByKey.set(page.slug, runtimePage);
  }
  return contentByKey;
}
async function resolveCodingEffectiveTools(userId) {
  const contentByKey = buildCodingSkillContentByKey(userId);
  const resolved = await resolveSkillGraphFromRoots({
    roots: [{ identifier: CODING_ROOT_SKILL_ID, mode: "required" }],
    contentByKey,
    loadPage: async (identifier) => contentByKey.get(identifier) ?? null
  });
  return resolved.requiredTools;
}
function ensureCodingSkills(userId) {
  return async (dispatch) => {
    const { readAndWait, write } = await import("/public/assets/chunks/dbSlice-KCSAFONH.js");
    const { DataType } = await import("/public/assets/chunks/types-H3G6PBU5.js");
    const now = Date.now();
    const pages = buildCodingSkillPageRecords(userId);
    for (const page of pages) {
      try {
        const existing = await dispatch(readAndWait(page.dbKey)).unwrap().catch(() => null);
        if (!existing) {
          await dispatch(
            write({
              data: {
                id: page.skillId,
                dbKey: page.dbKey,
                type: DataType.DOC,
                userId,
                title: page.title,
                content: page.content,
                created: new Date(now).toISOString(),
                createdAt: now,
                updatedAt: String(now)
              },
              customKey: page.dbKey
            })
          ).unwrap();
        }
      } catch {
      }
    }
  };
}

export {
  canonicalizeToolName,
  canonicalizeToolNames,
  prioritizeToolNames,
  joinUniqueStrings,
  extractRuntimePageCapabilities,
  buildSkillGuidancePromptBlock,
  resolveSkillGraphFromRoots,
  CODING_SKILL_SLUGS,
  CODING_ROOT_SKILL_SLUG,
  buildCodingSkillId,
  buildCodingSkillPageKey,
  CODING_ROOT_SKILL_ID,
  CODING_SKILL_SEEDS,
  collectCodingReachableSkillSlugs,
  compileCodingEffectiveTools,
  compileCodingEffectivePromptPatches,
  CODING_COMPILED_EFFECTIVE_TOOLS,
  buildCodingSkillConfig,
  buildCodingSkillPageRecords,
  buildCodingRootSkillReference,
  buildCodingSkillContentBySlug,
  CODING_ROOT_SKILL_REFERENCE,
  resolveCodingBuiltinSlug,
  buildCodingSkillContentByKey,
  resolveCodingEffectiveTools,
  ensureCodingSkills
};
