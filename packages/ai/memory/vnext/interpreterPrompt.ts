import { buildMemoryInterpreterWireContract } from "./interpreterWireProtocol";

export const MEMORY_VNEXT_ENTITY_CREATION_CONTRACT = `
Entity creation is NOT named-entity recognition.

Create a new long-lived Entity only when the subject has future continuity value.
A mention alone is insufficient.

Prefer leaving information as Evidence until at least one strong continuity signal exists:
1. The subject recurs across independent dialogs, or the user explicitly describes it as enduring.
2. The user connects it to their own preferences, relationships, goals, identity, worldview, ongoing work, or repeated activity.
3. Future conversations are likely to refer back to it under different wording, so a stable anchor materially improves cross-dialog continuity.
4. Creating the anchor is necessary to update or relate existing long-lived State.

Do NOT create an Entity merely because the text contains a named person, product, place, historical event, book, philosopher, food, device, or concept.
When uncertain, keep Evidence and defer Entity creation.

Concept-specific rule:
- concept is for abstract subjects that become part of the user's personal meaning world, such as freedom, absurdism, privacy, modernity, beauty, loneliness, safety, or maintainability.
- Do not create a Concept Entity for every topic discussed or external fact queried.
- Promote a concept only when it recurs, carries a durable user stance/interest/tension, connects multiple memories, or is likely to become a future recall/navigation anchor.
- A one-off question such as "when was Kant born?" should normally create no long-lived Concept or Person Entity. Repeated discussion about Kant, freedom, and the user's own values may justify them.
`.trim();

export const MEMORY_VNEXT_THIRD_PARTY_RELEVANCE_CONTRACT = `
Third-party relevance test:
- A fact about another person is durable only when it concerns the user's own world. Observation-only third-party facts — someone's appearance, news, habits, or the doings of a person the user merely encounters — stay Evidence, no matter how often they recur.
- Closeness of that person, and repeated mentions across independent dialogs, do not by themselves make such an observation durable: never invent a user-world consequence to justify promotion (for example "the user keeps watching this person").
- Matters that are part of the user's own shared life — household or family arrangements the user takes part in, a family member's health, or what the user relies on someone for — do belong to the user's world: state the user-world side (caregiving, changed time, changed plans, a sustained constraint) instead of a chronicle of the other person's doings.
`.trim();

export const MEMORY_VNEXT_RECONCILIATION_CONTRACT = `
When durable understanding changes, choose the smallest correct reconciliation:
- no_op: no durable change.
- create: genuinely new durable state/entity.
- update: advance an existing state without changing its scope.
- specialize: add a scoped exception/qualification; do not replace the broader state.
- supersede: a newer statement explicitly replaces old current state. Emit the replacement as a NEW State and name the replaced current State in its supersedes field; runtime retires the old one (kept as recoverable history, no longer current).
- ambiguous: evidence conflicts with current state, but replacement vs exception cannot be determined reliably.

Examples:
- "回答简单" then "安全和 bug 排查详细" => specialize, not supersede.
- "我有 Ollama Pro" then "我已经不用 Ollama Pro 了" => supersede.
- Repeatedly choosing thin noodles without explicitly rejecting thick noodles => update or ambiguous, not automatic supersession.

Preserve ambiguity. Do not ask the user merely to clean memory. A later task may ask only if the unresolved state materially changes the answer.
`.trim();

export const buildMemoryVNextInterpreterPrompt = (): string =>
  [
    "You maintain long-lived adaptive relationship memory backed by evidence.",
    "External dialogs/files/web facts remain authoritative outside memory.",
    "Prefer a small stable set of Entities and updateable States over an ever-growing bag of facts.",
    MEMORY_VNEXT_ENTITY_CREATION_CONTRACT,
    MEMORY_VNEXT_THIRD_PARTY_RELEVANCE_CONTRACT,
    MEMORY_VNEXT_RECONCILIATION_CONTRACT,
    buildMemoryInterpreterWireContract(),
  ].join("\n\n");
