import { sha256Hex } from "core/sha256";
import { normalizeTopicKey } from "../topicKey";
import type { MemoryItem } from "../types";
import type { MemoryRelationVNext } from "./types";
import { applyMemoryInterpreterMutation } from "./applyMutation";
import {
  getMemoryEntityVNext,
  getMemoryStateVNext,
  getMemoryEvidenceVNextStrict,
  listMemoryStatesForEntityVNext,
} from "./store";

export { normalizeTopicKey };

/** Explicit saves are native vNext writes, not a legacy migration or dual write. */
export async function rememberExplicitVNext(
  db: any,
  item: MemoryItem,
): Promise<MemoryItem> {
  const ownerId = `${item.ownerType}:${encodeURIComponent(item.ownerId)}`;
  const topicKey = normalizeTopicKey(item.topicKey);

  if (!topicKey) {
    const digest = sha256Hex(
      JSON.stringify([
        ownerId,
        item.subjectType,
        item.subjectId,
        item.kind,
        item.content,
      ]),
    );
    const entityId = `explicit-${digest}`;
    const stateId = `explicit-${digest}`;
    let saved!: MemoryItem;
    await applyMemoryInterpreterMutation(db, ownerId, async () => {
      const existing = await getMemoryStateVNext(db, ownerId, stateId);
      if (existing?.retiredAt)
        throw new Error("Explicit memory conflicts with a retired state");
      const entity = await getMemoryEntityVNext(db, ownerId, entityId);
      const createdAt = existing?.createdAt ?? item.createdAt;
      const oldValue =
        existing?.value && typeof existing.value === "object"
          ? (existing.value as Record<string, unknown>)
          : {};
      // State retains the existing max aggregation; evidence describes only this write.
      const confidence = Math.max(
        Number(oldValue.confidence) || 0,
        item.confidence ?? 0,
      );
      const resident = oldValue.resident === true || item.resident === true;
      const evidenceId = `explicit-${digest}-${sha256Hex(
        JSON.stringify([
          item.confidence,
          item.sourceDialogId ?? null,
          item.provenance ?? null,
        ]),
      ).slice(0, 24)}`;
      const evidence = await getMemoryEvidenceVNextStrict(
        db,
        ownerId,
        evidenceId,
      );
      saved = {
        ...item,
        id: `vnext-state-${stateId}`,
        createdAt,
        confidence,
        ...(resident ? { resident: true } : {}),
      };
      return {
        action: existing ? "update" : "create",
        reason: "Explicit memory save",
        entities: entity
          ? []
          : [
              {
                id: entityId,
                ownerId,
                type: "concept",
                name: item.content,
                createdAt,
                updatedAt: createdAt,
              },
            ],
        evidence: evidence
          ? []
          : [
              {
                id: evidenceId,
                ownerId,
                text: item.content,
                confidence: item.confidence,
                ...(item.provenance ? { provenance: item.provenance } : {}),
                sourceRef: item.sourceDialogId
                  ? `dialog:${item.sourceDialogId}`
                  : `explicit:${digest}`,
                createdAt,
              },
            ],
        states: [
          {
            id: stateId,
            ownerId,
            entityId,
            facet: "explicit-memory",
            text: item.content,
            value: {
              ...oldValue,
              kind: item.kind,
              subjectType: item.subjectType,
              subjectId: item.subjectId,
              confidence,
              resident,
              visibility: item.visibility,
              tags: item.tags,
              importance: item.importance,
              patternKey: item.patternKey,
              recurrenceEvidence: item.recurrenceEvidence,
              provenance: item.provenance,
              sourceKind: item.sourceKind,
              sourceDialogId: item.sourceDialogId,
            },
            evidenceIds: [
              ...new Set([...(existing?.evidenceIds ?? []), evidenceId]),
            ],
            createdAt,
            updatedAt: item.createdAt,
          },
        ],
      };
    });
    return saved;
  }

  const topicDigest = sha256Hex(
    JSON.stringify([
      ownerId,
      item.subjectType,
      item.subjectId,
      item.kind,
      topicKey,
    ]),
  );
  const entityId = `explicit-topic-${topicDigest}`;
  const contentDigest = sha256Hex(
    JSON.stringify([
      ownerId,
      item.subjectType,
      item.subjectId,
      item.kind,
      item.content,
    ]),
  );

  let saved!: MemoryItem;
  await applyMemoryInterpreterMutation(db, ownerId, async () => {
    const entity = await getMemoryEntityVNext(db, ownerId, entityId);
    const entityStates = (
      await listMemoryStatesForEntityVNext(db, ownerId, entityId)
    ).filter((state) => state.facet === "explicit-memory");
    const activeStates = entityStates.filter((state) => !state.retiredAt);
    const matchingCurrent = activeStates.find(
      (state) => state.text === item.content,
    );

    if (matchingCurrent) {
      const stateId = matchingCurrent.id;
      const createdAt = matchingCurrent.createdAt;
      const oldValue =
        matchingCurrent.value && typeof matchingCurrent.value === "object"
          ? (matchingCurrent.value as Record<string, unknown>)
          : {};
      const confidence = Math.max(
        Number(oldValue.confidence) || 0,
        item.confidence ?? 0,
      );
      const resident = oldValue.resident === true || item.resident === true;
      const existingSupersedes = Array.isArray(oldValue.supersedesStateIds)
        ? oldValue.supersedesStateIds.map(String)
        : undefined;
      const evidenceId = `${stateId}-${sha256Hex(
        JSON.stringify([
          item.confidence,
          item.sourceDialogId ?? null,
          item.provenance ?? null,
        ]),
      ).slice(0, 24)}`;
      const evidence = await getMemoryEvidenceVNextStrict(
        db,
        ownerId,
        evidenceId,
      );
      saved = {
        ...item,
        topicKey,
        ...(existingSupersedes?.length
          ? { supersedesStateIds: existingSupersedes }
          : {}),
        id: `vnext-state-${stateId}`,
        createdAt,
        confidence,
        ...(resident ? { resident: true } : {}),
      };
      return {
        action: "update",
        reason: "Explicit memory save (topicKey idempotent update)",
        entities: entity
          ? []
          : [
              {
                id: entityId,
                ownerId,
                type: "concept",
                subtype: "explicit-topic",
                name: topicKey,
                createdAt,
                updatedAt: createdAt,
              },
            ],
        evidence: evidence
          ? []
          : [
              {
                id: evidenceId,
                ownerId,
                text: item.content,
                confidence: item.confidence,
                ...(item.provenance ? { provenance: item.provenance } : {}),
                sourceRef: item.sourceDialogId
                  ? `dialog:${item.sourceDialogId}`
                  : `explicit:${topicDigest}`,
                createdAt: item.createdAt,
              },
            ],
        states: [
          {
            id: stateId,
            ownerId,
            entityId,
            facet: "explicit-memory",
            text: item.content,
            value: {
              ...oldValue,
              kind: item.kind,
              subjectType: item.subjectType,
              subjectId: item.subjectId,
              confidence,
              resident,
              visibility: item.visibility,
              tags: item.tags,
              importance: item.importance,
              patternKey: item.patternKey,
              recurrenceEvidence: item.recurrenceEvidence,
              provenance: item.provenance,
              sourceKind: item.sourceKind,
              sourceDialogId: item.sourceDialogId,
              topicKey,
              ...(existingSupersedes?.length
                ? { supersedesStateIds: existingSupersedes }
                : {}),
            },
            evidenceIds: [
              ...new Set([...matchingCurrent.evidenceIds, evidenceId]),
            ],
            createdAt,
            updatedAt: item.createdAt,
          },
        ],
      };
    }

    const supersededIds = activeStates.map((state) => state.id);
    const isSupersede = supersededIds.length > 0;
    const version = entityStates.length + 1;
    const stateId = `explicit-topic-${topicDigest.slice(0, 24)}-v${version}-${contentDigest.slice(0, 16)}`;
    const createdAt = item.createdAt;
    const confidence = item.confidence ?? 0;
    const resident = item.resident === true;
    const evidenceId = `${stateId}-${sha256Hex(
      JSON.stringify([
        item.confidence,
        item.sourceDialogId ?? null,
        item.provenance ?? null,
      ]),
    ).slice(0, 24)}`;
    const evidence = await getMemoryEvidenceVNextStrict(
      db,
      ownerId,
      evidenceId,
    );
    const relations: MemoryRelationVNext[] = supersededIds.map(
      (oldId, idx) => ({
        id: `rel-supersedes-${stateId}-${idx}`,
        ownerId,
        from: stateId,
        type: "supersedes",
        to: oldId,
        createdAt,
      }),
    );
    saved = {
      ...item,
      topicKey,
      ...(isSupersede ? { supersedesStateIds: supersededIds } : {}),
      id: `vnext-state-${stateId}`,
      createdAt,
      confidence,
      ...(resident ? { resident: true } : {}),
    };
    return {
      action: isSupersede ? "supersede" : "create",
      reason: isSupersede
        ? "Explicit memory topicKey supersede"
        : "Explicit memory save (topicKey)",
      entities: entity
        ? []
        : [
            {
              id: entityId,
              ownerId,
              type: "concept",
              subtype: "explicit-topic",
              name: topicKey,
              createdAt,
              updatedAt: createdAt,
            },
          ],
      evidence: evidence
        ? []
        : [
            {
              id: evidenceId,
              ownerId,
              text: item.content,
              confidence: item.confidence,
              ...(item.provenance ? { provenance: item.provenance } : {}),
              sourceRef: item.sourceDialogId
                ? `dialog:${item.sourceDialogId}`
                : `explicit:${topicDigest}`,
              createdAt,
            },
          ],
      states: [
        {
          id: stateId,
          ownerId,
          entityId,
          facet: "explicit-memory",
          text: item.content,
          value: {
            kind: item.kind,
            subjectType: item.subjectType,
            subjectId: item.subjectId,
            confidence,
            resident,
            visibility: item.visibility,
            tags: item.tags,
            importance: item.importance,
            patternKey: item.patternKey,
            recurrenceEvidence: item.recurrenceEvidence,
            provenance: item.provenance,
            sourceKind: item.sourceKind,
            sourceDialogId: item.sourceDialogId,
            topicKey,
            ...(isSupersede ? { supersedesStateIds: supersededIds } : {}),
          },
          evidenceIds: [evidenceId],
          createdAt,
          updatedAt: item.createdAt,
        },
      ],
      ...(isSupersede ? { supersededStateIds: supersededIds, relations } : {}),
    };
  });
  return saved;
}
