import { GUIDED_AGENT_CAPABILITIES } from "./capabilities";

const TOOL_CAPABILITY_LABELS: Record<string, string> = {
  "workspace-read": "读取工作区",
  "dialog-continuation": "延续当前对话",
  "markdown-output": "Markdown 输出",
  read: "读取内容",
  createDoc: "创建文档",
  updateDoc: "更新文档",
  exa_search: "联网搜索",
  firecrawl_search: "Firecrawl 搜索",
  firecrawl_scrape: "Firecrawl 抓取",
  fetchWebpage: "读取网页",
};

export const getGuidedCapabilityLabel = (id: string) => {
  const guidedDefinition =
    GUIDED_AGENT_CAPABILITIES[id as keyof typeof GUIDED_AGENT_CAPABILITIES];
  if (guidedDefinition) return guidedDefinition.label.zhCN;
  return TOOL_CAPABILITY_LABELS[id] ?? id;
};

export const getGuidedCapabilityLabels = (ids: readonly string[] | undefined) =>
  Array.from(
    new Set((ids ?? []).map((id) => getGuidedCapabilityLabel(id)).filter(Boolean))
  );
