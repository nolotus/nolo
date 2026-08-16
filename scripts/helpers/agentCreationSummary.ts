import { asOptionalTrimmedString } from "core/optionalString";
import type { AgentCreationSpec } from "./agentCreationSpec";

export type AgentCreationHumanSummary = {
  title: string;
  lines: string[];
  markdown: string;
};

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function stepReport(closedLoop: any, stepName: string) {
  return asArray(closedLoop?.steps).find((step) => step?.name === stepName)?.report;
}

function statusLabel(ok: unknown) {
  return ok ? "通过" : "未通过";
}

function formatSummaryCounts(summary: any) {
  if (!summary || typeof summary !== "object") return "";
  const parts: string[] = [];
  if (typeof summary.ok === "number") parts.push(`${summary.ok} ok`);
  if (typeof summary.warn === "number") parts.push(`${summary.warn} warn`);
  if (typeof summary.fail === "number") parts.push(`${summary.fail} fail`);
  if (typeof summary.cases === "number") parts.push(`${summary.cases} case`);
  if (typeof summary.turns === "number") parts.push(`${summary.turns} turns`);
  if (typeof summary.failedCases === "number") parts.push(`${summary.failedCases} failed`);
  return parts.length ? `（${parts.join(" / ")}）` : "";
}

function referenceLabel(reference: AgentCreationSpec["references"][number]) {
  return asOptionalTrimmedString(reference.title) ?? reference.dbKey;
}

export function buildAgentCreationHumanSummary(args: {
  spec: AgentCreationSpec;
  specFile: string;
  closedLoop: any;
  writeWiring: boolean;
  runLive: boolean;
}): AgentCreationHumanSummary {
  const wiringReport = stepReport(args.closedLoop, "agent-doc-wiring");
  const evalReport = stepReport(args.closedLoop, "agent-multiturn-eval");
  const title = args.spec.name || args.spec.agent;
  const mode = [
    args.writeWiring ? "已写入 agent 配置" : "只检查，不写入",
    args.runLive ? "已跑真实多轮对话" : "未调用模型，只做干跑",
  ].join("；");

  const lines = [
    `Agent：${args.spec.agent}`,
    `Spec：${args.specFile}`,
    `资料入口：${args.spec.references.length} 个（${args.spec.references.map(referenceLabel).join("；")}）`,
    `配置检查：${statusLabel(wiringReport?.ok)}${formatSummaryCounts(wiringReport?.summary)}`,
    `多轮验收：${statusLabel(evalReport?.ok)}${formatSummaryCounts(evalReport?.summary)}`,
    `运行方式：${mode}`,
  ];

  const markdown = [
    `### ${title}`,
    "",
    ...lines.map((line) => `- ${line}`),
  ].join("\n");

  return { title, lines, markdown };
}
