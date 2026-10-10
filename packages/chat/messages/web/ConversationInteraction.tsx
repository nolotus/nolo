import React from "react";
import { parseUiCard, uiCardFallback, type UiCardBlock } from "ai/tools/uiCardSchema";
import AskChoicePanelWeb from "./AskChoicePanelWeb";
import { normalizeAskChoiceArgs } from "ai/tools/askChoiceState";
import type { AskChoiceResolution } from "../askChoicePersistence";

export function ConversationInteraction({ rawData, interactive = false, onResolve }: { rawData: unknown; interactive?: boolean; onResolve?: (resolution: AskChoiceResolution) => void | Promise<void> }) {
  const record = rawData && typeof rawData === "object" ? rawData as Record<string, unknown> : {};
  const parsed = parseUiCard(record.card);
  if (!parsed.ok) return <p role="alert">交互内容无法显示：{parsed.error}</p>;
  const card = parsed.value;
  const fallback = uiCardFallback(card);
  const questions = card.blocks.filter((block) => block.type === "choice").map((block) => block.question);
  const questionIds = questions.map((question) => question.id);
  const duplicateIds = new Set(questionIds).size !== questionIds.length || questions.some((question) => new Set(question.choices.map((choice) => choice.id)).size !== question.choices.length);
  const normalized = normalizeAskChoiceArgs({ questions });
  const canInteract = interactive && questions.length > 0 && !duplicateIds && normalized.questions.length === questions.length;
  const showResolved = record.phase === "submitted" || (Array.isArray(record.answers) && record.answers.length > 0);
  const choiceData = {
    type: "ask_user",
    questions,
    ...(Array.isArray(record.answers) ? { answers: record.answers } : {}),
    ...(typeof record.phase === "string" ? { phase: record.phase } : {}),
    ...(record.phase === "submitted" ? { selected: { label: "submitted", userMessage: "submitted" } } : {}),
  };
  let insertedPanel = false;
  return <div data-hook="conversation-interaction">
    {card.blocks.map((block, index) => {
      if (block.type !== "choice") return <InteractionBlock key={`${card.id}-${index}`} block={block} />;
      if (!canInteract && !duplicateIds) return null;
      if (insertedPanel) return null;
      insertedPanel = true;
      return <React.Fragment key={`${card.id}-${index}`}>
        {duplicateIds ? <p role="alert">交互问题 ID 重复，无法安全提交选择。</p> : <AskChoicePanelWeb rawData={choiceData} interactive={canInteract && !showResolved} onResolve={canInteract && !showResolved ? onResolve : undefined} variant="inline" />}
      </React.Fragment>;
    })}
    {!card.blocks.length && fallback ? <p>{fallback}</p> : null}
  </div>;
}

function InteractionBlock({ block }: { block: UiCardBlock }) {
  switch (block.type) {
    case "text": return <p>{block.text}</p>;
    case "metric": return <p><strong>{block.label}：</strong>{block.value}{block.detail ? ` · ${block.detail}` : ""}</p>;
    case "list": return <section>{block.title ? <p>{block.title}</p> : null}<ul>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul></section>;
    case "table": return <div style={{ maxWidth: "100%", overflowX: "auto" }}><table><thead><tr>{block.columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
    // "choice" blocks are rendered by AskChoicePanelWeb above and never reach here.
    case "action": return block.action.type === "submit" ? null : <p>{`打开应用：${block.action.appId}`}</p>;
    default: return null;
  }
}

export default ConversationInteraction;
