import type { ReferenceItem } from "app/types";
import { asOptionalTrimmedString } from "core/optionalString";

import { resolvePageSkillMetadata } from "./skillDocProtocol";
import { joinUniqueStrings, type SkillRuntimePageLike } from "./referenceRuntime";

export type SkillReferenceSummary = {
  dbKey: string;
  title: string;
  referenceType: ReferenceItem["type"];
  skillId?: string;
  skillName: string;
  description?: string;
  toolNames: string[];
  requiredSkills: string[];
  recommendedSkills: string[];
  promptPatch?: string;
};

export const summarizeSkillReferences = (
  references: ReferenceItem[] | undefined,
  contentByKey: Map<string, SkillRuntimePageLike>
): SkillReferenceSummary[] => {
  if (!Array.isArray(references) || references.length === 0) {
    return [];
  }

  return references.flatMap((reference) => {
    const content = contentByKey.get(reference.dbKey);
    const meta = resolvePageSkillMetadata(content);
    const skillConfig = meta?.skillConfig;

    if (meta?.kind !== "skill" && !skillConfig) {
      return [];
    }

    const skillName =
      asOptionalTrimmedString(skillConfig?.name) ??
      asOptionalTrimmedString(reference.title) ??
      asOptionalTrimmedString(content?.title) ??
      reference.dbKey;

    return [
      {
        dbKey: reference.dbKey,
        title:
          asOptionalTrimmedString(reference.title) ??
          asOptionalTrimmedString(content?.title) ??
          reference.dbKey,
        referenceType: reference.type,
        skillId: asOptionalTrimmedString(skillConfig?.id),
        skillName,
        description: asOptionalTrimmedString(skillConfig?.description),
        toolNames: skillConfig?.toolNames ?? [],
        requiredSkills: joinUniqueStrings(
          meta?.requiredSkills,
          skillConfig?.requiredSkills
        ),
        recommendedSkills: joinUniqueStrings(
          meta?.recommendedSkills,
          skillConfig?.recommendedSkills
        ),
        promptPatch: asOptionalTrimmedString(skillConfig?.promptPatch),
      },
    ];
  });
};
