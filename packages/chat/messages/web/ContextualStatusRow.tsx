// ContextualFragment 状态行（web）。
// 系统注入 user role 的上下文片段（后台任务 / 后台 run 终态通知等）不进用户
// 气泡：命中 contextualFragment.ts 注册表的消息在这里折叠为系统行。
// 文案与层级全部来自共享展示模型（../contextualFragment.ts），本组件只负责
// 排版：标题可换行（长标题窄屏不截断）、逐任务行、耗时次级、详情入口可发现。
import * as stylex from "@stylexjs/stylex";
import React, { memo, useMemo, useState } from "react";
import {
  describeContextualNotice,
  formatContextualNoticeMeta,
  formatContextualNoticeTitle,
  formatContextualOutcomeIcon,
  formatContextualTaskMeta,
  type ContextualFragmentKind,
  type ContextualNoticeGroup,
  type ContextualOutcome,
  type ContextualTaskDisplay,
} from "../contextualFragment";
import { messagesStyles as styles } from "./messagesStyles";
import { withLiteralClass } from "./toolMessageShared";

interface ContextualStatusRowProps {
  /** 消息原始全文（已通过 extractTextFromContent 归一为纯文本）。 */
  text: string;
  /** 注册表命中的片段种类。 */
  kind: ContextualFragmentKind;
  /**
   * 相邻后台完成消息的分组信息（可选，由列表层按展示顺序算出）。
   * size > 1 时本行按「组内条目」渲染：组头只由组首条目渲染一次。
   */
  group?: ContextualNoticeGroup;
}

/** 结果语义 → 既有 wakeEvent* 色调 token（不另造颜色体系）。 */
const outcomeTone = (outcome: ContextualOutcome) => {
  if (outcome === "failure") return styles.wakeEventStatusFailed;
  if (outcome === "cancelled") return styles.wakeEventStatusCancelled;
  if (outcome === "partial") return styles.wakeEventStatusPartial;
  return styles.wakeEventStatusDone;
};

const ContextualStatusRow: React.FC<ContextualStatusRowProps> = memo(
  function ContextualStatusRow({ text, kind, group }) {
    const [expanded, setExpanded] = useState(false);
    const display = useMemo(() => describeContextualNotice(text), [text]);

    if (!display) {
      return (
        <div
          {...withLiteralClass("contextual-fragment-row", styles.wakeEventRow)}
          data-testid="contextual-fragment-row"
          data-fragment-kind={kind}
        >
          {kind}
        </div>
      );
    }

    const failed =
      display.outcome === "failure" || display.outcome === "partial";
    const title = formatContextualNoticeTitle(display);
    const meta = formatContextualNoticeMeta(display);
    const isGroup = display.tasks.length > 1;
    // 相邻后台完成消息合组（列表层算好）：组头只由组首条目渲染一次，
    // 组内条目不重复主体，但各自的标题、次要信息与详情都保留。
    const grouped = !!group && group.size > 1;
    const groupHead = grouped && group?.index === 0 ? group : undefined;
    const headOutcome = groupHead ? groupHead.outcome : display.outcome;
    // 成组时：组首条目渲染组头，其余条目不渲染头（不重复主体）。
    const headTitle = grouped ? (groupHead ? groupHead.title : "") : title;
    const headMeta = grouped ? (groupHead ? groupHead.meta : "") : meta;
    const groupMemberRows: ContextualTaskDisplay[] =
      grouped && display.tasks.length === 0
        ? [
            {
              title: display.headline ?? display.subject,
              outcome: display.outcome,
              outcomeLabel: display.outcomeLabel,
            },
          ]
        : display.tasks;

    return (
      <div
        {...withLiteralClass(
          `contextual-fragment-row contextual-fragment-row--${display.outcome}`,
          styles.wakeEventRow,
          styles.contextualFragmentRow
        )}
        data-testid="contextual-fragment-row"
        data-fragment-kind={kind}
        data-fragment-failed={failed ? "true" : "false"}
        data-fragment-outcome={display.outcome}
        onClick={() => setExpanded((v) => !v)}
      >
        {headTitle || headMeta ? (
          <div
            {...withLiteralClass(
              "contextual-fragment-head",
              styles.contextualFragmentHead
            )}
            data-testid={
              groupHead ? "contextual-fragment-group-head" : undefined
            }
          >
            <span
              {...withLiteralClass(
                "contextual-fragment-icon",
                styles.wakeEventIcon,
                outcomeTone(headOutcome)
              )}
              aria-hidden="true"
            >
              {formatContextualOutcomeIcon(headOutcome)}
            </span>
            <span
              {...withLiteralClass(
                "contextual-fragment-headline",
                styles.contextualFragmentHeadline
              )}
            >
              <span
                {...withLiteralClass(
                  "contextual-fragment-title",
                  styles.contextualFragmentTitle
                )}
                title={headTitle}
              >
                {headTitle}
              </span>
              {headMeta ? (
                <span
                  {...withLiteralClass(
                    "contextual-fragment-meta",
                    styles.contextualFragmentMeta
                  )}
                >
                  {headMeta}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
        {grouped || isGroup ? (
          <ul
            {...withLiteralClass(
              grouped
                ? "contextual-fragment-group-tasks"
                : "contextual-fragment-tasks",
              styles.contextualFragmentTasks
            )}
            data-testid={
              grouped ? "contextual-fragment-group-tasks" : undefined
            }
          >
            {(grouped ? groupMemberRows : display.tasks).map((task, index) => (
              <li
                key={`${task.title}-${index}`}
                {...withLiteralClass(
                  "contextual-fragment-task",
                  styles.contextualFragmentTask
                )}
                data-testid="contextual-fragment-task"
              >
                <span
                  {...withLiteralClass(
                    "contextual-fragment-icon",
                    styles.wakeEventIcon,
                    outcomeTone(task.outcome)
                  )}
                  aria-hidden="true"
                >
                  {formatContextualOutcomeIcon(task.outcome)}
                </span>
                <span
                  {...withLiteralClass(
                    "contextual-fragment-task-title",
                    styles.contextualFragmentTitle
                  )}
                >
                  {task.title}
                </span>
                <span
                  {...withLiteralClass(
                    "contextual-fragment-meta",
                    styles.contextualFragmentMeta
                  )}
                >
                  {formatContextualTaskMeta(task)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          {...withLiteralClass(
            "contextual-fragment-detail",
            styles.contextualFragmentDetail
          )}
          data-testid="contextual-fragment-detail"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "收起详情" : "详情"}
        </button>
        {expanded ? (
          <pre
            {...withLiteralClass(
              "contextual-fragment-full",
              styles.contextualFragmentFull
            )}
            data-testid="contextual-fragment-full"
          >
            {text}
          </pre>
        ) : null}
      </div>
    );
  }
);

export default ContextualStatusRow;
