import { evaluateRequestBudget } from "ai/context/requestBudget";
import { estimateTokenCount } from "ai/context/tokenUtils";

type HistoryMessage = { id?: string; role?: string; [key: string]: any };

/** Only a persisted summary with a resolvable anchor may replace original history.
 * Keep the newest user verbatim, and never begin inside its tool-result chain.
 */
export function projectSummaryHistory<T extends HistoryMessage>(messages: T[], summary?: string | null, anchor?: string): T[] {
    if (!summary || !anchor) return messages;
    const covered = messages.findIndex(message => message.id === anchor);
    if (covered < 0) return messages;
    let start = covered + 1;
    while (start > 0 && messages[start]?.role === "tool") start--;
    const latestUser = messages.map(message => message.role).lastIndexOf("user");
    const suffix = messages.slice(start);
    return latestUser >= 0 && latestUser < start ? [messages[latestUser], ...suffix] : suffix;
}

/** Explicit local heuristic for unknown provider vision accounting, NOT a pixel
 * tokenizer or an upper bound. URL length/base64 bytes do not determine vision
 * tokens. Existing missingUsageEstimate.stringifyContent likewise treats image
 * parts as non-text, but supplies no input-image estimator to reuse.
 */
export const UNKNOWN_IMAGE_RESERVE_TOKENS = 4096;

function projectWireImageCosts(items: unknown): { projected: unknown; imageCount: number } {
    let imageCount = 0;
    if (!Array.isArray(items)) return { projected: items, imageCount };
    const projected = items.map(message => {
        if (!message || !Array.isArray(message.content)) return message;
        return { ...message, content: message.content.map((part: any) => {
            // Only typed multimodal content parts, never arbitrary strings,
            // tool arguments/results or objects elsewhere in the request.
            if (part?.type === "image_url" && typeof part.image_url?.url === "string") {
                imageCount++;
                return { type: "image_url", image_url: { detail: part.image_url.detail } };
            }
            if (part?.type === "input_image" && (typeof part.image_url === "string" || typeof part.file_id === "string")) {
                imageCount++;
                return { type: "input_image", detail: part.detail };
            }
            return part;
        }) };
    });
    return { projected, imageCount };
}

/** Heuristic serialized-wire estimate, NOT a tokenizer or provider guarantee.
 * Messages already contain all system/context/summary blocks; count each once.
 * Output semantics are unknown on these routes; explicit wire caps are reserved
 * conservatively, never replaced by model metadata ceilings.
 */
export function estimateWebRequestBudget(body: any, contextWindow: number) {
    const { messages, input, instructions, tools, ...other } = body;
    const count = (value: unknown) => value == null ? 0 : estimateTokenCount(JSON.stringify(value));
    const projectedMessages = projectWireImageCosts(messages);
    const projectedInput = projectWireImageCosts(input);
    const unknownImageCount = projectedMessages.imageCount + projectedInput.imageCount;
    const heuristicImageReserveTokens = unknownImageCount * UNKNOWN_IMAGE_RESERVE_TOKENS;
    const cap = body.max_output_tokens ?? body.max_completion_tokens ?? body.max_tokens;
    const decision = evaluateRequestBudget({
        contextWindow,
        messageTokens: count(projectedMessages.projected) + count(projectedInput.projected) + count(instructions),
        toolSchemaTokens: count(tools),
        otherInputTokens: count(other) + heuristicImageReserveTokens,
        protocolReserveTokens: 1024,
        output: { semantics: "unknown", fallbackReserveTokens: cap === undefined ? 8192 : Number(cap) },
    });
    return { ...decision, unknownImageCount, heuristicImageReserveTokens, imageCostBasis: "unknown-provider-heuristic" as const };
}

/** Rebuild after exactly one awaited rescue; never fall back to head trimming. */
export async function admitWebRequest<T>(options: {
    build(): Promise<{ value: T; wireBodies: any[] }>;
    contextWindow: number;
    rescue(availableHistoryTokens: number): Promise<unknown>;
    signal: AbortSignal;
}): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
        if (options.signal.aborted) {
            const error = new Error("Request admission aborted");
            error.name = "AbortError";
            throw options.signal.reason ?? error;
        }
        const request = await options.build();
        if (options.signal.aborted) {
            const error = new Error("Request admission aborted");
            error.name = "AbortError";
            throw options.signal.reason ?? error;
        }
        const decisions = request.wireBodies.map(body => estimateWebRequestBudget(body, options.contextWindow));
        if (decisions.length && decisions.every(decision => decision.fitsEstimate)) return request.value;
        if (attempt) throw new Error("Context budget exceeded after budget_rescue; request not sent (heuristic estimate)");
        // Protect NEW summary space as part of the history allowance. External
        // input costs are estimated using an otherwise identical empty-history wire.
        const allowances = request.wireBodies.map(body => {
            const systemOnly = (items: any) => Array.isArray(items) ? items.filter(item => item.role === "system" || item.role === "developer") : items;
            const external = estimateWebRequestBudget({ ...body, messages: systemOnly(body.messages), input: systemOnly(body.input) }, options.contextWindow);
            return Math.max(0, external.availableInputTokens - external.estimatedInputTokens);
        });
        await options.rescue(Math.min(...allowances));
    }
    throw new Error("Context budget admission failed");
}
