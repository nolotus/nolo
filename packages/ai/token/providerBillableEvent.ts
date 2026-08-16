export type ProviderBillableEventKind =
  | "llm_tokens"
  | "external_tool_tokens"
  | "image_generation"
  | "hosted_tool"
  | "storage";

export type ProviderBillableEventStatus = "unrated" | "rated" | "void";

export type ProviderBillableUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  imageCount?: number;
  toolUnits?: number;
};

export type ProviderBillableEvent = {
  id: string;
  operationId: string;
  sourceProviderCallIds: string[];
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  endpoint?: string;
  kind: ProviderBillableEventKind;
  toolId?: string;
  usage: ProviderBillableUsage;
  estimated: boolean;
  estimateReason?: string;
  needsReconciliation: boolean;
  status: ProviderBillableEventStatus;
  createdAt: string;
};

export type CreateProviderBillableEventInput = {
  eventId: string;
  operationId: string;
  sourceProviderCallIds: string[];
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  endpoint?: string;
  kind: ProviderBillableEventKind;
  toolId?: string;
  usage: ProviderBillableUsage;
  estimated?: boolean;
  estimateReason?: string;
  createdAt: string;
};

export const buildProviderBillableEventKey = (eventId: string) =>
  `provider-billable-event-${eventId}`;

export const createProviderBillableEvent = (
  input: CreateProviderBillableEventInput
): ProviderBillableEvent => {
  const estimated = input.estimated === true;
  return {
    id: input.eventId,
    operationId: input.operationId,
    sourceProviderCallIds: [...input.sourceProviderCallIds],
    userId: input.userId,
    dialogId: input.dialogId,
    agentId: input.agentId,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    kind: input.kind,
    toolId: input.toolId,
    usage: { ...input.usage },
    estimated,
    estimateReason: input.estimateReason,
    needsReconciliation: estimated,
    status: "unrated",
    createdAt: input.createdAt,
  };
};
