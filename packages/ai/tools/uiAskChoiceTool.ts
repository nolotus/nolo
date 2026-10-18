// 文件: ai/tools/uiAskChoiceTool.ts

export const uiAskChoiceFunctionSchema = {
    name: "ask_user",
    description: "让用户在一组选项之间做选择（单选或多选）的通用“出选项”工具（需求模糊、分支决策、问卷等）。本工具用于纯提问、等待用户回答的场景（blocking:false 时不暂停等待）；若需要同时展示结构化对比/指标并让用户在同一块里选择，走 show_interaction。调用前须先在普通回复文本里解释背景与权衡（先解释，再调用）。多问题传 questions，单问题传 question+choices。界面默认提供“其他”自由输入行（可用 allowOther:false 关闭），用户输入的文字会随答案回传；不要自建“其他/自己写”之类的选项——点击普通选项只回传该选项文案，用户无处填写。",
    parameters: {
        type: "object",
        properties: {
            question: {
                type: "string",
                description:
                    "展示给用户的问题文案（单问题模式）。与 questions 二选一。"
            },
            choices: {
                type: "array",
                description:
                    "备选项列表，渲染为按钮供用户点击。",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "选项标识。"
                        },
                        label: {
                            type: "string",
                            description: "按钮文字，如“生成本周周报”。"
                        },
                        detail: {
                            type: "string",
                            description:
                                "简短补充（建议一句话），长解释写进调用前的回复文本。"
                        },
                        userMessage: {
                            type: "string",
                            description:
                                "点击后作为下一条 user 消息发送的文案（留空默认用 label）。"
                        }
                    },
                    required: ["id", "label"]
                }
            },
            questions: {
                type: "array",
                description:
                    "多问题模式（多 tab 渲染，与 question+choices 二选一）。",
                items: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            description: "问题标识。"
                        },
                        header: {
                            type: "string",
                            description:
                                "多问题 tab 栏显示的短标签（≤12 字符，如“格式/语言/范围”），缺省用 Qn。"
                        },
                        question: {
                            type: "string",
                            description: "问题文案。"
                        },
                        choices: {
                            type: "array",
                            description: "该问题的备选项。",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    label: { type: "string" },
                                    detail: {
                                        type: "string",
                                        description: "简短补充（建议一句话），长解释写进调用前的回复文本。"
                                    },
                                    userMessage: { type: "string" }
                                },
                                required: ["id", "label"]
                            }
                        },
                        multiSelect: {
                            type: "boolean",
                            description: "允许多选，默认 false。"
                        },
                        allowOther: {
                            type: "boolean",
                            description: "显示“其他”自由输入行，默认 true。"
                        },
                        required: {
                            type: "boolean",
                            description: "是否必须回答才能提交，默认 true。"
                        }
                    },
                    required: ["id", "question", "choices"]
                }
            },
            blocking: {
                type: "boolean",
                description: "是否等待用户选择后再继续流程，默认 true。"
            }
        },
        required: []
    }
};
/**
 * ask_user 入参的语义校验：JSON schema 表达不了的约束（元素形状、空题干、
 * 重复 id、纯 Other 题的合法性）在这里兜住。
 *
 * **两个入口都必须调用**：除了 uiAskChoiceFunc，CLI 的本地执行器会自行解析
 * arguments、不经过共享 executor，漏接就留了一条绕过校验的路径。
 *
 * 返回 null 表示通过；否则返回可展示给模型的原因。缺省 id 不在这里补——
 * askChoiceState 的归一化负责兼容历史 payload，这里只拒绝显式给出的非法值。
 */
/**
 * 选项列表的形状校验，多题与 legacy 单题共用——两条入口漏掉任何一条，
 * 都能把空文案选项喂进消费端。显式给出的 id 必须是字符串：消费端会对 id
 * 做 String()，放行数字会让「7」和「7」这种重复在归一化后才出现。
 */
function validateChoiceList(
    choices: unknown[],
    scopeLabel: string,
): string | null {
    const seenChoiceIds = new Set<string>();
    for (let index = 0; index < choices.length; index += 1) {
        const entry = choices[index];
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return `${scopeLabel}.choices[${index}] 必须是对象。`;
        }
        const choice = entry as Record<string, unknown>;
        if (typeof choice.label !== "string" || !choice.label.trim()) {
            return `${scopeLabel}.choices[${index}].label 必须是非空字符串。`;
        }
        if (choice.id !== undefined && typeof choice.id !== "string") {
            return `${scopeLabel}.choices[${index}].id 必须是字符串。`;
        }
        const choiceId = typeof choice.id === "string" ? choice.id.trim() : "";
        if (choiceId && seenChoiceIds.has(choiceId)) {
            return `${scopeLabel} 内的选项 id "${choiceId}" 重复。`;
        }
        if (choiceId) seenChoiceIds.add(choiceId);
    }
    return null;
}

export function validateAskChoiceInput(raw: unknown): string | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return "ask_user 需要一个对象参数。";
    }
    const args = raw as Record<string, unknown>;

    if (args.blocking !== undefined && typeof args.blocking !== "boolean") {
        return "ask_user 的 blocking 必须是布尔值。";
    }

    const rawQuestions = args.questions;
    if (rawQuestions !== undefined && !Array.isArray(rawQuestions)) {
        return "ask_user 的 questions 必须是数组。";
    }
    const questions = rawQuestions as unknown[] | undefined;

    // 空数组等同于没给（现有 executor 只在 length > 0 时走多题），继续按
    // legacy 单题校验，避免把「questions: [] + 顶层 question」判死。
    if (questions && questions.length > 0) {
        const seenQuestionIds = new Set<string>();
        for (let index = 0; index < questions.length; index += 1) {
            const entry = questions[index];
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                return `questions[${index}] 必须是对象。`;
            }
            const question = entry as Record<string, unknown>;
            if (question.id !== undefined && typeof question.id !== "string") {
                return `questions[${index}].id 必须是字符串。`;
            }
            const questionId =
                typeof question.id === "string" ? question.id.trim() : "";
            if (questionId && seenQuestionIds.has(questionId)) {
                return `问题 id "${questionId}" 重复。`;
            }
            if (questionId) seenQuestionIds.add(questionId);
            if (
                typeof question.question !== "string" ||
                !question.question.trim()
            ) {
                return `questions[${index}].question 必须是非空字符串。`;
            }
            for (const flag of ["multiSelect", "allowOther", "required"] as const) {
                if (
                    question[flag] !== undefined &&
                    typeof question[flag] !== "boolean"
                ) {
                    return `questions[${index}].${flag} 必须是布尔值。`;
                }
            }
            const choices = question.choices;
            if (!Array.isArray(choices)) {
                return `questions[${index}].choices 必须是数组。`;
            }
            const choiceError = validateChoiceList(choices, `questions[${index}]`);
            if (choiceError) return choiceError;
            // 空选项只在允许自由输入时才是可作答的题面；否则用户无处输入。
            if (choices.length === 0 && question.allowOther === false) {
                return `questions[${index}] 没有任何选项且 allowOther 为 false，用户无法作答。`;
            }
        }
        return null;
    }

    // Legacy 单题：顶层 question + choices（生产代码仍直接调用这一形态）。
    if (typeof args.question !== "string" || !args.question.trim()) {
        return "ask_user 需要 question（非空字符串）与 choices。";
    }
    if (!Array.isArray(args.choices) || args.choices.length === 0) {
        return "ask_user 需要 question（非空字符串）与 choices。";
    }
    return validateChoiceList(args.choices, "ask_user");
}

export async function uiAskChoiceFunc(
    args: any,
    _thunkApi: any
): Promise<{
    rawData: {
        type: "ask_user";
        question: string;
        choices: any[];
        blocking: boolean;
        questions?: any[];
    };
    displayData: string;
}> {
    const invalid = validateAskChoiceInput(args);
    if (invalid) throw new Error(invalid);

    const blocking = args?.blocking !== false;

    // New multi-question format
    if (Array.isArray(args?.questions) && args.questions.length > 0) {
        const firstQ = args.questions[0];
        return {
            rawData: {
                type: "ask_user",
                question: firstQ?.question ?? "",
                choices: firstQ?.choices ?? [],
                blocking,
                questions: args.questions,
            },
            displayData: args.questions.map((q: any) => q.question).join(" / "),
        };
    }

    // Legacy single-question format
    const question = String(args?.question ?? "").trim();
    const choices = Array.isArray(args?.choices) ? args.choices : [];

    if (!question || choices.length === 0) {
        throw new Error("ask_user 需要 question+choices 或 questions。");
    }

    return {
        rawData: {
            type: "ask_user",
            question,
            choices,
            blocking,
        },
        displayData: question,
    };
}

// ============================================================================
// Shared ask_user payload contract — single source of truth.
// Consumed by: the executor above, the CLI local executor, the CLI tool-output
// renderer, and the server saveDialog choice-selection lookup. Any change to
// the wire shape (type / question / choices / blocking / selected / cancelled)
// lands here so all readers stay in sync.
// ============================================================================

export type UiAskChoiceOption = {
    id?: string;
    label: string;
    detail?: string;
    /**
     * 仅用于读取历史 payload：不再向模型声明。ask_user 面板不渲染推荐标记，
     * normalizeQuestion 也会丢弃它；推荐请用「选项顺序 + detail」表达。
     */
    recommended?: boolean;
    userMessage?: string;
};

export type UiAskChoiceQuestionPayload = {
    id: string;
    header?: string;
    question: string;
    choices: UiAskChoiceOption[];
    multiSelect?: boolean;
    allowOther?: boolean;
    required?: boolean;
};

export type UiAskChoicePayload = {
    type: "ask_user";
    question: string;
    choices: UiAskChoiceOption[];
    blocking: boolean;
    /** Multi-question mode: present when the LLM sent a questions array. */
    questions?: UiAskChoiceQuestionPayload[];
    /** Present when the tool was resolved interactively (CLI select dialog). */
    selected?: {
        label: string;
        userMessage: string;
    };
    /** Multi-question resolved result. */
    answers?: Array<{
        questionId: string;
        selectedIds: string[];
        otherText: string;
        userMessage: string;
    }>;
    /** Present when the user dismissed the select dialog without choosing. */
    cancelled?: boolean;
    /** Server-side error marker (mirrors the executor's error shape). */
    error?: string;
    detail?: string;
};

/**
 * Parse a raw tool result into a typed UiAskChoicePayload, or null when the
 * content is not a ask_user payload. Accepts both a JSON string (the wire
 * format stored on tool messages) and an already-parsed object.
 *
 * Does NOT trim/filter — callers validate question/choices for their own
 * display needs. Returns the parsed object as-is so readers that need raw
 * fields (selected/cancelled/error) get them.
 */
export function parseUiAskChoiceContent(
    rawContent: unknown,
): UiAskChoicePayload | null {
    const parsed =
        typeof rawContent === "string"
            ? (() => {
                  try {
                      return JSON.parse(rawContent);
                  } catch {
                      return null;
                  }
              })()
            : rawContent;
    if (!parsed || typeof parsed !== "object") return null;
    if ((parsed as any).type !== "ask_user") return null;
    return parsed as UiAskChoicePayload;
}