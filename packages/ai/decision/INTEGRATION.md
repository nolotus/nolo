# Decision layer 接线方案（本轮不实现）

统一约定：每条调用均**默认非阻塞**（不等待额外 UI/用户授权），判断层只提供建议、不掌握执行权；预算建议 `maxInputTokens: 4096, maxOutputTokens: 512, timeoutMs: 800, deadlineMs: 1200, maxConcurrency: 2, maxCalls: 1`，且可按调用方更严收紧。`abstain/unknown` 一律走下述确定性回退，不得阻止主流程。

## quick-chat 意图/复杂度

```ts
const result = await backend.judge({
  subject: { kind: "quick_chat", fields: { text: redactJudgmentText(userText) } },
  context: [], questions: [{ id: "intent", type: "choice", options: ["greeting", "task"] }, { id: "complexity", type: "score" }],
  fieldPolicy: { text: "allow" },
});
const intent = result.answers.intent.abstain ? (isShortGreeting(userText) ? "greeting" : "task") : result.answers.intent.value;
const complexity = result.answers.complexity.abstain ? estimateComplexity(userText) : result.answers.complexity.value;
```

只出站脱敏后的当前用户文本（及可选长度/语言元数据），不传历史整段对话、凭证或内部工具结果。预算同上；abstain 回退到现有 `isShortGreeting` / `estimateComplexity` 启发式。

## 请教模式触发判断

```ts
const result = await backend.judge({ subject: { kind: "consultation_trigger", fields: { summary: redactJudgmentText(failureSummary) } }, context: [], questions: [{ id: "consult", type: "choice", options: ["yes", "no"] }], fieldPolicy: { summary: "allow" } });
const shouldConsult = result.answers.consult.abstain ? deterministicSignals.highToolCallCount >= 12 || deterministicSignals.largeContextChars >= 64_000 || deterministicSignals.repeatedCallFingerprint || deterministicSignals.failedToolCallCount > 0 : result.answers.consult.value === "yes";
```

只可出站失败摘要最小字段：失败阶段、工具名（不含参数）、错误类别、重试/调用计数、截断脱敏错误摘要；不得发送完整工具参数、对话或凭证。非阻塞、建议预算同上；abstain 回退到 `packages/ai/evolution/signals.ts` 的 `highToolCallCount: 12`、`largeContextChars: 64_000`、重复调用指纹与 `failedToolCallCount` 确定性信号。接线不得改 `consultationMode.ts`。

## learn / evolution

未来由 evolution 适配处沿用当前 payload 构造，逐字保持不变，调用共享 Jev `sendRaw(body, questions)` 替代 HTTP 发送、答案解析及缺失答案处理；薄适配处把共享结果的 missing/abstain 映射成现行取值 `0`，保持 evolution 可观察行为及既有阈值不变。本轮不迁移调用点、不改 `packages/ai/evolution/decision/`。

learn 仅将明确允许的最小字段先做脱敏后放入预构造 body；不默认出站原始学习记录/用户数据。非阻塞，推荐更紧预算 `maxInputTokens: 2048, maxOutputTokens: 256, timeoutMs: 1000, deadlineMs: 1500, maxConcurrency: 1, maxCalls: 1`；abstain 回退原有 learn/evolution 确定性逻辑，不影响执行或学习状态写入。
