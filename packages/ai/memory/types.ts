export type MemoryOwnerType = "user" | "space" | "system";
export type MemoryVisibility = "private" | "shared" | "public";
export type MemorySubjectType = "user" | "agent" | "space" | "project" | "system";
export type MemoryKind = "episodic" | "semantic" | "procedural";
export type MemoryFacet =
  | "preference"
  | "tension"
  | "unfinished"
  | "goal"
  | "style";

export type MemorySourceKind =
  | "explicit-user-directive"
  | "agent-tool"
  | "inferred-understanding"
  | "dialog-learning";

export interface MemoryItem {
  id: string;
  ownerType: MemoryOwnerType;
  ownerId: string;
  visibility: MemoryVisibility;
  subjectType: MemorySubjectType;
  subjectId: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
  /** Legacy storage name: this is a RETRIEVAL timestamp, set whenever the item is selected into the prompt overlay. Retrieval ≠ use — see touchMemoryItemsInDb. */
  lastActivatedAt: string;
  /** Legacy storage name: this is a RETRIEVAL count (times injected into overlay), not a usage or usefulness count. Weak retrieval-relevance signal only. */
  activationCount: number;
  importance: number;
  confidence: number;
  tags?: string[];
  facet?: MemoryFacet;
  patternKey?: string;
  /**
   * procedural 专用：这个流程此前在什么时候遇到过（复现证据）。
   * 写入侧硬门要求 procedural 必须给出，缺失则降级 episodic——见 remember.ts。
   * 历史条目没有此字段（存量 procedural 均为硬门上线前写入）。
   */
  recurrenceEvidence?: string;
  /**
   * 常驻偏好（resident preferences）：无条件进入 prompt overlay 的常驻区，
   * 不参与话题相关性排序。
   *
   * 写入侧有硬门（remember.ts）：仅当 subjectType=user ∧
   * sourceKind=explicit-user-directive（source="user-directive" 或内容带
   * EXPLICIT_REMEMBER_PREFIX_REGEX 显式前缀）∧ content ≤240 字符，三者全满足
   * 才落 resident:true；否则忽略（降级为普通条目）并在结果里说明原因。
   *
   * 装配/渲染侧（runtime.ts / overlay.ts）：resident 条目按 createdAt 新→旧
   * 无条件入选（上限 10 条），独立成节渲染在检索区之前、使用独立 token 预算，
   * 不占检索区 per-kind 名额（避免同一条注入两次）。
   */
  resident?: boolean;
  sourceKind?: MemorySourceKind;
  sourceDialogId?: string;
  sourceMessageId?: string;
  /**
   * 语义内容标识——跨实例去重用。
   *
   * 同一条记忆无论在本地还是远程生成，只要 ownerType/ownerId/
   * subjectType/subjectId/kind/content 相同，contentKey 就相同。
   * `mergeAndDedupUserData` 用它识别"同一条记忆"，避免重复。
   *
   * 格式：`mem-{sha256前16字符hex}`
   * 旧记录迁移前可能缺失，读取时按 undefined 处理（不影响已有去重逻辑）。
   */
  contentKey?: string;
}

export interface MemoryOwnerRef {
  ownerType: MemoryOwnerType;
  ownerId: string;
}

export interface MemorySubjectRef {
  subjectType: MemorySubjectType;
  subjectId: string;
}

export interface MemoryRuntimeResolution {
  selectedItems: MemoryItem[];
  promptBlock: string | null;
}
