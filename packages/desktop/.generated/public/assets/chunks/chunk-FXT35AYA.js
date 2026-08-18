// packages/ai/skills/skillSummaryMarker.ts
var buildSkillSummaryMarker = (meta) => {
  const skillConfig = meta?.skillConfig;
  if (meta?.kind !== "skill" && !skillConfig) {
    return null;
  }
  return {
    isSkill: true,
    ...skillConfig?.id ? { skillId: skillConfig.id } : {},
    ...skillConfig?.name ? { name: skillConfig.name } : {},
    ...skillConfig?.description ? { description: skillConfig.description } : {},
    ...skillConfig?.toolNames?.length ? { toolNames: skillConfig.toolNames } : {},
    ...skillConfig?.triggerMode ? { triggerMode: skillConfig.triggerMode } : {}
  };
};
var isSkillSummaryMarker = (value) => Boolean(value?.isSkill);

export {
  buildSkillSummaryMarker,
  isSkillSummaryMarker
};
