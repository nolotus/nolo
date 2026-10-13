
// packages/ai/agent/getFullChatContextKeys.ts
import type { RootState } from "app/store";
import { selectAllMsgs } from "chat/messages/messageSlice";
import { extractReferenceKeysFromMessage } from "chat/dialog/actions/extractReferenceKeys";
import type { Message } from "chat/messages/types";
import type { DialogConfig } from "app/types";
import { extractCustomId } from "core/prefix";
import { attachmentKindsInContent } from "ai/attachments/toolsForAttachments";
import type { AttachmentKind } from "ai/attachments/attachmentPart";

/** 四个引用 key 集：字段语义与下游 context block 一一对应，**不塞别的类型**。 */
export type ChatContextKeySets = {
  botInstructionKeys: Set<string>;
  currentInputKeys: Set<string>;
  historyKeys: Set<string>;
  botKnowledgeKeys: Set<string>;
};

export interface FullChatContextKeys extends ChatContextKeySets {
  /**
   * 附件能力提示（kind）——**刻意放在 keys 之外**：keys 的语义是「可被
   * fetchReferenceContents 加载的引用 dbKey」，把 kind 塞进去会污染
   * deduplicateContextKeys 的优先级与下游 context block。
   * 由当前输入 + 当前仍加载在内存里的消息 content 现推（不落库）。
   */
  attachmentKinds: Set<AttachmentKind>;
  /**
   * true = 内存里已加载的消息不足以判定全部附件：摘要标记消息本身都不在内存里，
   * 说明被压缩掉的旧历史已经看不到 → 待发现。**不扫数据库、不新增持久 kind 字段**。
   */
  attachmentKindsIncomplete: boolean;
}

/** 简单的数组差集工具：返回 arrA 中不在 arrB 里的元素 */
const difference = <T>(arrA: T[], arrB: T[]): T[] => {
  if (!arrA.length) return [];
  if (!arrB.length) return [...arrA];

  const exclude = new Set(arrB);
  return arrA.filter((item) => !exclude.has(item));
};

/**
 * Collect all possible reference keys for this chat turn:
 * - botInstructionKeys: keys from agentConfig.references of type "instruction"
 * - botKnowledgeKeys: keys from agentConfig.references (non-instruction)
 * - currentInputKeys: keys referenced directly by the user's current input (array parts with pageKey)
 * - historyKeys: keys from all previous messages' content parts
 *
 * 另外单独返回 `attachmentKinds` / `attachmentKindsIncomplete`（附件能力提示，不是引用 key）。
 */
export const getFullChatContextKeys = async (
  state: RootState,
  dispatch: any,
  agentConfig: any,
  userInput: string | any[],
  dialogConfig?: DialogConfig
): Promise<FullChatContextKeys> => {
  const msgs = selectAllMsgs(
    state,
    dialogConfig?.dbKey
      ? extractCustomId(dialogConfig.dbKey)
      : dialogConfig?.id
  );

  const botInstructionKeys = new Set<string>();
  const botKnowledgeKeys = new Set<string>();

  if (Array.isArray(agentConfig.references)) {
    for (const ref of agentConfig.references as Array<{
      dbKey: string;
      type: string;
    }>) {
      if (!ref?.dbKey) continue;
      if (ref.type === "instruction") {
        botInstructionKeys.add(ref.dbKey);
      } else {
        botKnowledgeKeys.add(ref.dbKey);
      }
    }
  }

  const currentInputKeys = new Set<string>();
  if (Array.isArray(userInput)) {
    for (const part of userInput) {
      if (part?.pageKey) currentInputKeys.add(part.pageKey);
      if (part?.dialogKey) currentInputKeys.add(part.dialogKey);
    }
  }

  const historyKeys = new Set<string>();

  // 1. 从 DialogConfig.referenceKeys 读取（这是主要的、持久化的引用来源）
  // 即使消息被压缩，这里的 keys 也会保留
  const savedKeys = dialogConfig?.referenceKeys;
  if (Array.isArray(savedKeys)) {
    savedKeys.forEach((k: string) => historyKeys.add(k));
  }

  // 2. 仅扫描尚未被压缩的近期消息
  const scanContentParts = (msg: Message) => {
    if (!msg) return;
    for (const key of extractReferenceKeysFromMessage(msg)) {
      historyKeys.add(key);
    }
  };

  if (msgs && msgs.length > 0) {
    const summarizedBeforeId = dialogConfig?.summarizedBeforeId;

    if (!summarizedBeforeId) {
      // 无压缩记录，扫描全部消息
      for (const msg of msgs) scanContentParts(msg);
    } else {
      let foundMarker = false;
      let startScan = false;

      for (const msg of msgs) {
        if (!startScan) {
          if (msg.id === summarizedBeforeId) {
            foundMarker = true;
            startScan = true;
            // summarizedBeforeId 那条消息本身已被压缩，keys 在 referenceKeys 里，跳过
          }
          continue;
        }
        scanContentParts(msg);
      }

      // marker 找不到说明 Redux 中的消息都是新的，应该全扫
      if (!foundMarker) {
        console.warn(`[getFullChatContextKeys] marker ${summarizedBeforeId} not found, scanning all`);
        for (const msg of msgs) scanContentParts(msg);
      }
    }
  }

  // 3. 附件 kind（**独立于 keys**）：只能从「当前输入 + 当前仍加载在内存里的消息」现推。
  // 压缩只把 page/dialog/table 引用落成 dialogConfig.referenceKeys —— 附件 kind 没有任何
  // 持久字段（契约禁止把 kind 写进 part / DialogConfig）。所以：
  //   - 压缩过但**仍加载**的消息照样推（它们还在 msgs 里，content 就带着附件 part / 旧媒体文本）；
  //   - 连摘要标记消息本身都不在内存里 ⇒ 被裁掉的旧历史已经看不到 ⇒ 报 incomplete（待发现），
  //     不扫数据库、不引入持久 kind 字段。
  const attachmentKinds = new Set<AttachmentKind>();
  for (const kind of attachmentKindsInContent(userInput)) attachmentKinds.add(kind);
  for (const msg of msgs ?? []) {
    for (const kind of attachmentKindsInContent(msg?.content)) attachmentKinds.add(kind);
  }

  const summaryMarkerId = dialogConfig?.summarizedBeforeId;
  const attachmentKindsIncomplete =
    Boolean(summaryMarkerId) &&
    !(msgs ?? []).some((msg) => msg?.id === summaryMarkerId);

  return {
    botInstructionKeys,
    currentInputKeys,
    historyKeys,
    botKnowledgeKeys,
    attachmentKinds,
    attachmentKindsIncomplete,
  };
};

/**
 * Deduplicate keys across priority levels.
 * Priority order (high -> low):
 * 1) botInstructionKeys
 * 2) currentInputKeys
 * 3) historyKeys
 * 4) botKnowledgeKeys
 *
 * Return field names match context block identifiers expected downstream.
 */
export const deduplicateContextKeys = (
  keys: ChatContextKeySets
): Record<string, string[]> => {
  const {
    botInstructionKeys,
    currentInputKeys,
    historyKeys,
    botKnowledgeKeys,
  } = keys;

  const finalBotInstructionKeys = Array.from(botInstructionKeys);

  const finalCurrentInputKeys = difference(
    Array.from(currentInputKeys),
    finalBotInstructionKeys
  );

  const finalHistoryKeys = difference(Array.from(historyKeys), [
    ...finalBotInstructionKeys,
    ...finalCurrentInputKeys,
  ]);

  const finalBotKnowledgeKeys = difference(Array.from(botKnowledgeKeys), [
    ...finalBotInstructionKeys,
    ...finalCurrentInputKeys,
    ...finalHistoryKeys,
  ]);

  return {
    botInstructionsContext: finalBotInstructionKeys,
    currentInputContext: finalCurrentInputKeys,
    historyContext: finalHistoryKeys,
    botKnowledgeContext: finalBotKnowledgeKeys,
  };
};
