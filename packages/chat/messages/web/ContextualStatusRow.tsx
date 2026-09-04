// ContextualFragment 紧凑状态行（web）。
// 系统注入 user role 的上下文片段（后台 run 终态唤醒等）不进用户气泡：
// 命中 contextualFragment.ts 注册表的消息在这里折叠为暗色小字一行，
// 点击可展开看全文。样式复用 ChildRunEventRow 的 wakeEvent* 系（同一族
// 系统行，视觉上应当一致）。
import * as stylex from "@stylexjs/stylex";
import React, { memo, useState } from "react";
import {
  describeContextualFragment,
  type ContextualFragmentKind,
} from "../contextualFragment";
import { messagesStyles as styles } from "./messagesStyles";
import { withLiteralClass } from "./toolMessageShared";

interface ContextualStatusRowProps {
  /** 消息原始全文（已通过 extractTextFromContent 归一为纯文本）。 */
  text: string;
  /** 注册表命中的片段种类。 */
  kind: ContextualFragmentKind;
}

const ContextualStatusRow: React.FC<ContextualStatusRowProps> = memo(
  function ContextualStatusRow({ text, kind }) {
    const [expanded, setExpanded] = useState(false);
    const summary = describeContextualFragment(text);
    const statusLine = summary?.statusLine ?? kind;
    const failed = summary?.failed ?? false;
    return (
      <div
        {...withLiteralClass(
          `contextual-fragment-row ${
            failed
              ? "contextual-fragment-row--failed"
              : "contextual-fragment-row--ok"
          }`,
          styles.wakeEventRow
        )}
        data-testid="contextual-fragment-row"
        data-fragment-kind={kind}
        data-fragment-failed={failed ? "true" : "false"}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          {...withLiteralClass(
            "contextual-fragment-icon",
            styles.wakeEventIcon,
            failed ? styles.wakeEventStatusFailed : styles.wakeEventStatusDone
          )}
          aria-hidden="true"
        >
          {failed ? "✗" : "✓"}
        </span>
        <span
          {...withLiteralClass(
            "contextual-fragment-text",
            styles.wakeEventText
          )}
          title={statusLine}
        >
          {statusLine}
        </span>
        {expanded && (
          <pre
            {...withLiteralClass(
              "contextual-fragment-full",
              styles.wakeEventText
            )}
            data-testid="contextual-fragment-full"
          >
            {text}
          </pre>
        )}
      </div>
    );
  }
);

export default ContextualStatusRow;
