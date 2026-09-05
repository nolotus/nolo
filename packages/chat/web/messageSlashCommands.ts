export const FRESH_DIALOG_SLASH_COMMAND = "/new";
export const COMPACT_DIALOG_SLASH_COMMAND = "/compact";

export function isFreshDialogSlashCommand(input: string): boolean {
  return input.trim() === FRESH_DIALOG_SLASH_COMMAND;
}

export function isCompactDialogSlashCommand(input: string): boolean {
  return input.trim() === COMPACT_DIALOG_SLASH_COMMAND;
}

/**
 * Presentation metadata for one completable slash command.
 * Runtime execution semantics stay in useMessageInputSend /
 * resolveChatSendDecision; this only feeds the composer suggestion menu.
 */
export interface SlashCommandSummary {
  command: string;
  name: string;
  /** i18n key resolved in the "chat" namespace with a Chinese fallback. */
  descriptionKey: string;
  descriptionFallback: string;
}

export const SLASH_COMMAND_SUMMARIES: readonly SlashCommandSummary[] = [
  {
    command: FRESH_DIALOG_SLASH_COMMAND,
    name: "new",
    descriptionKey: "slashCommandNewDescription",
    descriptionFallback: "开启新对话",
  },
  {
    command: COMPACT_DIALOG_SLASH_COMMAND,
    name: "compact",
    descriptionKey: "slashCommandCompactDescription",
    descriptionFallback: "压缩当前对话上下文",
  },
];

export interface SlashCommandTriggerState {
  active: boolean;
  kind: "slash-command" | null;
  query: string;
  startIndex: number;
}

export const createInactiveSlashCommandTriggerState =
  (): SlashCommandTriggerState => ({
    active: false,
    kind: null,
    query: "",
    startIndex: -1,
  });

/**
 * Detects an inline slash-command trigger at the cursor.
 * "/" only triggers at the very start of the input or right after
 * whitespace, so URLs (https://…), fractions (1/2) and paths (a/b) never
 * open the menu. The query must stay whitespace-free until the cursor.
 */
export const resolveSlashCommandTriggerState = (
  value: string,
  cursorIndex: number
): SlashCommandTriggerState => {
  const textValue = value ?? "";
  const cursor = Math.min(Math.max(cursorIndex, 0), textValue.length);

  for (let i = cursor - 1; i >= 0; i -= 1) {
    const ch = textValue[i];

    if (ch === "/") {
      if (i > 0 && !/\s/.test(textValue[i - 1])) {
        break;
      }

      const query = textValue.slice(i + 1, cursor);
      if (/\s/.test(query)) {
        break;
      }

      return {
        active: true,
        kind: "slash-command",
        query,
        startIndex: i,
      };
    }

    if (/\s/.test(ch)) {
      break;
    }
  }

  return createInactiveSlashCommandTriggerState();
};

/** Prefix filter over command names; empty query returns every command. */
export const filterSlashCommandsByQuery = (
  query: string
): SlashCommandSummary[] => {
  const normalizedQuery = (query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return [...SLASH_COMMAND_SUMMARIES];

  return SLASH_COMMAND_SUMMARIES.filter((summary) =>
    summary.name.startsWith(normalizedQuery)
  );
};

/**
 * Builds the fill-only insertion for a selected command: the typed
 * "/query" fragment is replaced by "<command> ". This never executes the
 * command — execution stays on the send path.
 */
export const buildSlashCommandInsertion = ({
  currentValue,
  cursorPos,
  triggerState,
  command,
}: {
  currentValue: string;
  cursorPos: number;
  triggerState: SlashCommandTriggerState;
  command: string;
}): {
  nextText: string;
  nextTriggerState: SlashCommandTriggerState;
  nextHighlightIndex: number;
  command: string;
} | null => {
  if (
    !triggerState.active ||
    triggerState.kind !== "slash-command" ||
    triggerState.startIndex < 0
  ) {
    return null;
  }

  const before = currentValue.slice(0, triggerState.startIndex);
  const after = currentValue.slice(cursorPos);
  const insertText = `${command} `;

  return {
    nextText: `${before}${insertText}${after}`,
    nextTriggerState: createInactiveSlashCommandTriggerState(),
    nextHighlightIndex: 0,
    command,
  };
};
