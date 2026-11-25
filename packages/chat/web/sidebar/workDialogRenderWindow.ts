import type { WorkDialogSection, WorkDialogTreeRow } from "./workDialogHierarchyView";

export const WORK_DIALOG_RENDER_WINDOW_INITIAL = 40;
export const WORK_DIALOG_RENDER_WINDOW_STEP = 40;
export const WORK_DIALOG_AUTO_LOAD_MAX_ROUNDS = 6;

type WindowTreeEntry = {
  row: { key: string };
  isChild?: boolean;
  depth?: number;
};

const hasVisibleParent = (
  entries: readonly { depth?: number }[],
  targetIndex: number,
  visibleEndIndex: number,
): boolean => {
  const targetDepth = entries[targetIndex]?.depth ?? 0;
  if (targetDepth <= 0) return false;
  for (let i = targetIndex - 1; i >= 0; i -= 1) {
    const depth = entries[i]?.depth ?? 0;
    if (depth < targetDepth) {
      return i < visibleEndIndex;
    }
  }
  return false;
};

const detachIfParentOutsideWindow = <T extends WindowTreeEntry>(
  entries: readonly T[],
  targetIndex: number,
  visibleEndIndex: number,
): T => {
  const entry = entries[targetIndex]!;
  if (
    (entry.isChild || (entry.depth ?? 0) > 0) &&
    !hasVisibleParent(entries, targetIndex, visibleEndIndex)
  ) {
    return { ...entry, isChild: false, depth: 0 };
  }
  return entry;
};

export function projectWindowedEntries<T extends WindowTreeEntry>(
  entries: readonly T[],
  limit: number,
  activeRowKey?: string | null,
  alreadyVisibleKeys?: ReadonlySet<string>,
): {
  visibleEntries: readonly T[];
  activeOutsideWindow: T | null;
  remainingCount: number;
} {
  const safeLimit = Math.max(0, limit);
  if (entries.length <= safeLimit) {
    return {
      visibleEntries: entries,
      activeOutsideWindow: null,
      remainingCount: 0,
    };
  }
  const visibleEntries = entries.slice(0, safeLimit);
  let activeOutsideWindow: T | null = null;
  if (activeRowKey && !alreadyVisibleKeys?.has(activeRowKey)) {
    const activeIndex = entries.findIndex((entry) => entry.row.key === activeRowKey);
    if (activeIndex >= safeLimit) {
      activeOutsideWindow = detachIfParentOutsideWindow(entries, activeIndex, safeLimit);
    }
  }
  const remainingCount = Math.max(
    0,
    entries.length - visibleEntries.length - (activeOutsideWindow ? 1 : 0),
  );
  return {
    visibleEntries,
    activeOutsideWindow,
    remainingCount,
  };
}

export function projectWindowedSections(
  sections: readonly WorkDialogSection[],
  limit: number,
  activeRowKey?: string | null,
  alreadyVisibleKeys?: ReadonlySet<string>,
): {
  visibleSections: WorkDialogSection[];
  activeOutsideWindow: {
    sectionKey: string;
    groupId: WorkDialogSection["groupId"];
    entry: WorkDialogTreeRow;
  } | null;
  remainingCount: number;
} {
  const safeLimit = Math.max(0, limit);
  let totalEntries = 0;
  for (const section of sections) totalEntries += section.rows.length;
  if (totalEntries <= safeLimit) {
    return {
      visibleSections: [...sections],
      activeOutsideWindow: null,
      remainingCount: 0,
    };
  }

  const visibleSections: WorkDialogSection[] = [];
  let remainingBudget = safeLimit;
  let activeOutsideWindow: {
    sectionKey: string;
    groupId: WorkDialogSection["groupId"];
    entry: WorkDialogTreeRow;
  } | null = null;

  for (const section of sections) {
    if (remainingBudget > 0) {
      const slice = section.rows.slice(0, remainingBudget);
      if (slice.length > 0) {
        visibleSections.push({ ...section, rows: slice });
        remainingBudget -= slice.length;
      }
      if (
        slice.length < section.rows.length &&
        activeRowKey &&
        !alreadyVisibleKeys?.has(activeRowKey) &&
        !activeOutsideWindow
      ) {
        const activeLocalIndex = section.rows.findIndex(
          (entry, index) => index >= slice.length && entry.row.key === activeRowKey,
        );
        if (activeLocalIndex >= slice.length) {
          activeOutsideWindow = {
            sectionKey: section.key,
            groupId: section.groupId,
            entry: detachIfParentOutsideWindow(section.rows, activeLocalIndex, slice.length),
          };
        }
      }
    } else if (
      activeRowKey &&
      !alreadyVisibleKeys?.has(activeRowKey) &&
      !activeOutsideWindow
    ) {
      const activeLocalIndex = section.rows.findIndex((entry) => entry.row.key === activeRowKey);
      if (activeLocalIndex >= 0) {
        activeOutsideWindow = {
          sectionKey: section.key,
          groupId: section.groupId,
          entry: detachIfParentOutsideWindow(section.rows, activeLocalIndex, 0),
        };
      }
    }
  }

  const visibleCount = visibleSections.reduce((sum, section) => sum + section.rows.length, 0);
  const remainingCount = Math.max(
    0,
    totalEntries - visibleCount - (activeOutsideWindow ? 1 : 0),
  );
  return {
    visibleSections,
    activeOutsideWindow,
    remainingCount,
  };
}
