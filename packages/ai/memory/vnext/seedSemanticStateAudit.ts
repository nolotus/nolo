import { loadMemoryVNextCatalog, putMemoryEntityVNext, putMemoryStateVNext, putMemoryEvidenceVNext } from "./store";
import { buildLegacyMemoryEvidence } from "./legacyMigration";
import type { MemoryEntityVNext, MemoryStateVNext } from "./types";

// Two remaining semantic memories from legacy audit:
// 1. "01M33X0C25R5TVRWA57S1VDRXW": "bun-nolo 部署链路：push alpha 触发 webhook → nolo-ci alpha-deploy job → build + test + deploy → /ready 验证"
// 2. "01KRV3ZJEBCRJ9B0WJJ11DSG9B": "以后我希望你回答时先给结论，再给必要说明。完成后只回复：已处理"

const USER = "0e95801d90";
const OWNER = `user:${USER}`;

export async function checkAndSeedMissingSemanticStates(db: any) {
  const catalog = await loadMemoryVNextCatalog(db, OWNER);
  // H2 fix: Idempotency by State ID and Evidence ID existence, NEVER by text equality.
  // This ensures updated/evolved States with new text or retired States are NEVER overwritten or resurrected.
  const existingStateIds = new Set(catalog.states.map((s: MemoryStateVNext) => s.id));
  const entityByName = new Map(catalog.entities.map((e: MemoryEntityVNext) => [e.name, e]));

  const now = new Date().toISOString();

  // 1. Deploy workflow state
  const deployStateId = "st-deploy-pipeline";
  if (!existingStateIds.has(deployStateId)) {
    let noloEntity = entityByName.get("bun-nolo");
    if (!noloEntity) {
      noloEntity = {
        id: "ent-bun-nolo-deploy",
        ownerId: OWNER,
        type: "project",
        name: "bun-nolo",
        aliases: ["nolo"],
        createdAt: now,
        updatedAt: now,
      };
      await putMemoryEntityVNext(db, noloEntity);
    }
    const legacyItem = {
      id: "01M33X0C25R5TVRWA57S1VDRXW",
      ownerType: "user" as const,
      ownerId: USER,
      content: "bun-nolo 部署链路：push alpha 触发 webhook → nolo-ci alpha-deploy job → build + test + deploy → /ready 验证。",
      createdAt: now,
    };
    const ev = buildLegacyMemoryEvidence(legacyItem as any);
    await putMemoryEvidenceVNext(db, ev);
    await putMemoryStateVNext(db, {
      id: deployStateId,
      ownerId: OWNER,
      entityId: noloEntity.id,
      facet: "deploy_pipeline",
      value: { autoDeployAlpha: true },
      text: legacyItem.content,
      evidenceIds: [ev.id],
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2. Direct concise answer style
  const styleStateId = "st-conclusion-first-style";
  if (!existingStateIds.has(styleStateId)) {
    let commEntity = entityByName.get("技术沟通风格偏好");
    if (!commEntity) {
      commEntity = {
        id: "ent-tech-comm",
        ownerId: OWNER,
        type: "concept",
        name: "技术沟通风格偏好",
        createdAt: now,
        updatedAt: now,
      };
      await putMemoryEntityVNext(db, commEntity);
    }
    const legacyItem = {
      id: "01KRV3ZJEBCRJ9B0WJJ11DSG9B",
      ownerType: "user" as const,
      ownerId: USER,
      content: "以后回答时先给结论，再给必要说明。",
      createdAt: now,
    };
    const ev = buildLegacyMemoryEvidence(legacyItem as any);
    await putMemoryEvidenceVNext(db, ev);
    await putMemoryStateVNext(db, {
      id: styleStateId,
      ownerId: OWNER,
      entityId: commEntity.id,
      facet: "style",
      value: { conclusionFirst: true },
      text: legacyItem.content,
      evidenceIds: [ev.id],
      createdAt: now,
      updatedAt: now,
    });
  }
}
