import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { readAndWait } from "database/dbSlice";
import { selectCurrentSpace, selectViewMode } from "create/space/spaceCurrentSelectors";
import { fetchSpace } from "create/space/spaceThunks";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { resolvePageSkillMetadata } from "ai/skills/skillDocProtocol";
import { LuEye, LuExternalLink, LuBrain, LuLightbulb } from "react-icons/lu";
import { Tooltip } from "render/web/ui/Tooltip";
import SearchInput from "render/web/ui/SearchInput";
import Combobox from "render/web/ui/Combobox";
import DocxPreviewDialog from "render/web/ui/modal/DocxPreviewDialog";
import {
  ALL_SPACES_ID,
  buildReferencePickerContents,
  buildReferencePickerSpaceItems,
  collectPendingSkillCandidates,
  filterReferencePickerContents,
  type ReferencePickerContentItem,
  type ReferencePickerSpaceItem,
} from "./referencePickerUtils";
import { PUBLIC_CATALOG_SPACE_ID } from "create/space/publicCatalogSpace";
import { useViewMode } from "create/space/spaceCurrentStore";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";
import * as stylex from "@stylexjs/stylex";
import { referencesSelectorStyles as styles } from "./referencesSelectorStyles";

// The shared cooperation space is our canonical source of public agents / public skills.
// However, `space.visibility = "public"` does not yet imply anonymous DB reads for its
// `space-*` / `page-*` records, so the picker keeps a small built-in fallback catalog
// until server-side guest-readable public-space rules are implemented explicitly.
const GLOBAL_RECOMMENDED_SKILL_FALLBACKS: ReferencePickerContentItem[] = [
  {
    dbKey: "page-0e95801d90-01KMADTHRRCHFVS884SGQXGADP",
    title: "Demo Root Skill",
    spaceId: PUBLIC_CATALOG_SPACE_ID,
    spaceName: "",
    contentType: "page",
    skillSummary: {
      isSkill: true,
      skillId: "demo-root-skill",
      name: "demo-root-skill",
      description: "Demo composition skill for required vs recommended loading.",
      toolNames: ["readPage"],
      triggerMode: "recommended",
    },
  },
  {
    dbKey: "page-0e95801d90-01KMADTHRGYJWRREW3BV2B55ED",
    title: "Demo Recommended Page Skill",
    spaceId: PUBLIC_CATALOG_SPACE_ID,
    spaceName: "",
    contentType: "page",
    skillSummary: {
      isSkill: true,
      skillId: "demo-recommended-page",
      name: "demo-recommended-page",
      description: "Recommended: inspect referenced local pages.",
      toolNames: ["readPage"],
      triggerMode: "recommended",
    },
  },
  {
    dbKey: "page-0e95801d90-01KMADTHQMSX5PT9WW4ZZD7Z7M",
    title: "Demo Must Web Skill",
    spaceId: PUBLIC_CATALOG_SPACE_ID,
    spaceName: "",
    contentType: "page",
    skillSummary: {
      isSkill: true,
      skillId: "demo-must-web",
      name: "demo-must-web",
      description: "Hard requirement: current web lookup.",
      toolNames: ["exa_search", "fetchWebpage"],
      triggerMode: "required",
    },
  },
];

function dedupeContentItems(items: ReferencePickerContentItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dbKey)) return false;
    seen.add(item.dbKey);
    return true;
  });
}

interface Reference {
  dbKey: string;
  type: "knowledge" | "instruction";
  [key: string]: any;
}

interface ReferencesSelectorProps {
  value?: Reference[];
  onChange: (value: Reference[]) => void;
  pickerMode?: "skill" | "knowledge" | "instruction";
  renderItemExtra?: (ref: Reference) => React.ReactNode;
}

const ReferencesSelector: React.FC<ReferencesSelectorProps> = ({
  value = [],
  onChange,
  pickerMode = "knowledge",
  renderItemExtra,
}) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const currentSpace = useCurrentSpaceFromEntity();
  const allMemberSpaces = useAllMemberSpaces() as Array<{ spaceId: string; spaceName: string }>;
  const viewMode = useViewMode();

  const fetchedSpacesRef = useRef(new Set<string>());
  const [activeSpaceId, setActiveSpaceId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [spacesData, setSpacesData] = useState<
    Map<string, ReferencePickerContentItem[]>
  >(() => new Map());
  const [spaceContentSources, setSpaceContentSources] = useState<
    Map<string, Record<string, any>>
  >(() => new Map());
  const [loading, setLoading] = useState(false);
  const [loadingSkillCandidates, setLoadingSkillCandidates] = useState(false);
  const [loadingGlobalSkills, setLoadingGlobalSkills] = useState(false);
  const [globalSkillsUnavailable, setGlobalSkillsUnavailable] = useState(false);
  const [skillCandidateMap, setSkillCandidateMap] = useState<Map<string, boolean>>(
    () => new Map()
  );
  const [globalSkillContents, setGlobalSkillContents] = useState<
    ReferencePickerContentItem[]
  >([]);
  const fetchedGlobalSkillsRef = useRef(false);

  const [previewPageKey, setPreviewPageKey] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");

  const { items: spaceItems, nameMap: spaceNameMap } = useMemo(
    () =>
      buildReferencePickerSpaceItems({
        currentSpace,
        allMemberSpaces,
        allSpacesLabel: t("references.allSpaces", "All Spaces"),
      }),
    [currentSpace, allMemberSpaces, t]
  );

  const cacheSpaceContents = useCallback(
    (id: string, contentsObj: any) => {
      const list = buildReferencePickerContents({
        contentsObj,
        spaceId: id,
        spaceName: spaceNameMap.get(id) ?? "",
        unnamedLabel: t("unnamed"),
      });

      setSpacesData((prev) => {
        const next = new Map(prev);
        next.set(id, list);
        return next;
      });
      setSpaceContentSources((prev) => {
        const next = new Map(prev);
        next.set(id, contentsObj || {});
        return next;
      });

      fetchedSpacesRef.current.add(id);
    },
    [spaceNameMap, t]
  );

  const cacheGlobalSkillContents = useCallback(
    (contentsObj: any) => {
      const list = buildReferencePickerContents({
        contentsObj,
        spaceId: PUBLIC_CATALOG_SPACE_ID,
        spaceName: t("references.globalRecommendedSkills"),
        unnamedLabel: t("unnamed"),
      });
      setGlobalSkillContents(
        list.length > 0
          ? list
          : GLOBAL_RECOMMENDED_SKILL_FALLBACKS.map((item) => ({
              ...item,
              spaceName: t("references.globalRecommendedSkills"),
            }))
      );
      setGlobalSkillsUnavailable(false);
      setSpaceContentSources((prev) => {
        const next = new Map(prev);
        next.set(PUBLIC_CATALOG_SPACE_ID, contentsObj || {});
        return next;
      });
      fetchedGlobalSkillsRef.current = true;
    },
    [t]
  );

  useEffect(() => {
    if (!activeSpaceId) {
      setActiveSpaceId(viewMode === "all" ? ALL_SPACES_ID : currentSpace?.id || ALL_SPACES_ID);
    }
  }, [activeSpaceId, currentSpace?.id, viewMode]);

  const fetchSpacesData = async (
    id: string,
    callback: (id: string, contentsObj: any) => void
  ) => {
    try {
      const res: any = await dispatch((fetchSpace as any)({ spaceId: id })).unwrap();
      callback(id, res.contents || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!activeSpaceId) return;

    if (activeSpaceId === ALL_SPACES_ID) {
      const loadAllSpaces = async () => {
        setLoading(true);
        const ids = Array.from(
          new Set(
            [currentSpace?.id, ...spaceItems.map((item) => item.id)]
              .filter((id): id is string => Boolean(id) && id !== ALL_SPACES_ID)
          )
        );

        if (currentSpace?.id && currentSpace?.contents) {
          cacheSpaceContents(currentSpace.id, currentSpace.contents);
        }

        await Promise.all(
          ids
            .filter((id) => id !== currentSpace?.id && !fetchedSpacesRef.current.has(id))
            .map((id) => fetchSpacesData(id, cacheSpaceContents))
        );
        setLoading(false);
      };

      void loadAllSpaces();
      return;
    }

    if (fetchedSpacesRef.current.has(activeSpaceId)) return;

    if (activeSpaceId === currentSpace?.id && currentSpace?.contents) {
      cacheSpaceContents(activeSpaceId, currentSpace.contents);
      return;
    }

    setLoading(true);
    void fetchSpacesData(activeSpaceId, cacheSpaceContents).finally(() => setLoading(false));
  }, [activeSpaceId, cacheSpaceContents, currentSpace, dispatch, spaceItems]);

  useEffect(() => {
    if (pickerMode !== "skill") return;
    if (fetchedGlobalSkillsRef.current) return;

    if (
      currentSpace?.id === PUBLIC_CATALOG_SPACE_ID &&
      currentSpace?.contents
    ) {
      cacheGlobalSkillContents(currentSpace.contents);
      return;
    }

    let cancelled = false;
    setLoadingGlobalSkills(true);

    void dispatch((fetchSpace as any)({ spaceId: PUBLIC_CATALOG_SPACE_ID, fresh: true }))
      .unwrap()
      .then((res: any) => {
        if (cancelled) return;
        cacheGlobalSkillContents(res.contents || {});
      })
      .catch(() => {
        if (cancelled) return;
        setGlobalSkillContents(
          GLOBAL_RECOMMENDED_SKILL_FALLBACKS.map((item) => ({
            ...item,
            spaceName: t("references.globalRecommendedSkills"),
          }))
        );
        setGlobalSkillsUnavailable(true);
        fetchedGlobalSkillsRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoadingGlobalSkills(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    cacheGlobalSkillContents,
    currentSpace?.contents,
    currentSpace?.id,
    dispatch,
    pickerMode,
    t,
  ]);

  const baseContents = useMemo(() => {
    return filterReferencePickerContents({
      spacesData,
      activeSpaceId,
      searchQuery,
      pickerMode: "knowledge",
      skillCandidateMap: new Map(),
    });
  }, [spacesData, activeSpaceId, searchQuery]);

  const globalBaseContents = useMemo(() => {
    return filterReferencePickerContents({
      spacesData: new Map([[PUBLIC_CATALOG_SPACE_ID, globalSkillContents]]),
      activeSpaceId: PUBLIC_CATALOG_SPACE_ID,
      searchQuery,
      pickerMode: "knowledge",
      skillCandidateMap: new Map(),
    });
  }, [globalSkillContents, searchQuery]);

  useEffect(() => {
    if (pickerMode !== "skill") {
      setLoadingSkillCandidates(false);
      return;
    }

    const candidates = collectPendingSkillCandidates({
      contents: dedupeContentItems([...baseContents, ...globalBaseContents]),
      skillCandidateMap,
    });

    if (candidates.length === 0) {
      setLoadingSkillCandidates(false);
      return;
    }

    let cancelled = false;
    setLoadingSkillCandidates(true);

    const loadSkillCandidates = async () => {
      const results = await Promise.all(
        candidates.map(async (item) => {
          try {
            const cachedPage = spaceContentSources.get(item.spaceId)?.[item.dbKey];
            const pageLike =
              cachedPage &&
              (typeof cachedPage.content === "string" ||
                cachedPage.meta ||
                Array.isArray(cachedPage.tools))
                ? cachedPage
                : await dispatch(readAndWait(item.dbKey)).unwrap();
            const meta = resolvePageSkillMetadata(pageLike);
            return [item.dbKey, Boolean(meta?.kind === "skill" || meta?.skillConfig)] as const;
          } catch {
            return [item.dbKey, false] as const;
          }
        })
      );

      if (cancelled) return;

      setSkillCandidateMap((prev) => {
        const next = new Map(prev);
        for (const [dbKey, isSkill] of results) {
          next.set(dbKey, isSkill);
        }
        return next;
      });
      setLoadingSkillCandidates(false);
    };

    void loadSkillCandidates();

    return () => {
      cancelled = true;
    };
  }, [
    baseContents,
    dispatch,
    globalBaseContents,
    pickerMode,
    skillCandidateMap,
    spaceContentSources,
  ]);

  const filteredContents = useMemo(() => {
    return filterReferencePickerContents({
      spacesData,
      activeSpaceId,
      searchQuery,
      pickerMode,
      skillCandidateMap,
    });
  }, [spacesData, activeSpaceId, searchQuery, pickerMode, skillCandidateMap]);

  const filteredGlobalSkillContents = useMemo(() => {
    if (pickerMode !== "skill") return [];
    return filterReferencePickerContents({
      spacesData: new Map([[PUBLIC_CATALOG_SPACE_ID, globalSkillContents]]),
      activeSpaceId: PUBLIC_CATALOG_SPACE_ID,
      searchQuery,
      pickerMode: "skill",
      skillCandidateMap,
    });
  }, [globalSkillContents, pickerMode, searchQuery, skillCandidateMap]);

  const globalSkillKeySet = useMemo(
    () => new Set(filteredGlobalSkillContents.map((item) => item.dbKey)),
    [filteredGlobalSkillContents]
  );

  const filteredViewSkillContents = useMemo(() => {
    if (pickerMode !== "skill") return [];
    return filteredContents.filter((item) => !globalSkillKeySet.has(item.dbKey));
  }, [filteredContents, globalSkillKeySet, pickerMode]);

  const toggleRef = (item: ReferencePickerContentItem) => {
    const exists = value.some((r) => r.dbKey === item.dbKey);
    const defaultType = pickerMode === "skill" ? "instruction" : pickerMode;
    onChange(
      exists
        ? value.filter((r) => r.dbKey !== item.dbKey)
        : [...value, { ...item, type: defaultType }]
    );
  };

  const toggleType = (e: React.MouseEvent, dbKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(
      value.map((r) =>
        r.dbKey === dbKey
          ? {
              ...r,
              type: r.type === "instruction" ? "knowledge" : "instruction",
            }
          : r
      )
    );
  };

  const selectedSpaceItem =
    spaceItems.find((s) => s.id === activeSpaceId) ?? null;

  const handleOpenPreview = (e: React.MouseEvent, item: ReferencePickerContentItem) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewPageKey(item.dbKey);
    setPreviewFileName(item.title || "");
  };

  const handleOpenInNewTab = (
    e: React.MouseEvent,
    item: ReferencePickerContentItem
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `/${encodeURIComponent(item.dbKey)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleClosePreview = () => {
    setPreviewPageKey(null);
    setPreviewFileName("");
  };

  const skillListLoading =
    pickerMode === "skill" &&
    (loadingSkillCandidates ||
      (loadingGlobalSkills && filteredGlobalSkillContents.length === 0) ||
      (loading && filteredViewSkillContents.length === 0));

  const showSkillEmpty =
    pickerMode === "skill" &&
    !skillListLoading &&
    filteredGlobalSkillContents.length === 0 &&
    filteredViewSkillContents.length === 0;

  const renderItems = (items: ReferencePickerContentItem[]) =>
    items.map((item) => {
      const selected = value.find((r) => r.dbKey === item.dbKey);
      return (
        <label
            key={item.dbKey}
            className="agent-create-esc-rs-item"
            data-selected={!!selected}
            {...stylex.props(styles.item, selected && styles.itemSelected)}
          >
          <div>
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => toggleRef(item)}
              {...stylex.props(styles.checkInput)}
            />
            <div
              className="agent-create-esc-rs-check"
              data-checked={!!selected}
              {...stylex.props(styles.checkboxUi)}
            />
          </div>

          <div {...stylex.props(styles.itemBody)}>
            <div
              {...stylex.props(
                styles.itemTitle,
                selected && styles.itemTitleSelected
              )}
            >
              {item.title}
            </div>
            {(searchQuery || activeSpaceId === ALL_SPACES_ID) && (
              <div {...stylex.props(styles.itemMeta)}>
                {t("references.fromSpace", {
                  spaceName: item.spaceName || "",
                })}
              </div>
            )}
          </div>

          <div
              className="agent-create-esc-rs-item-actions"
              {...stylex.props(styles.itemActions)}
            >
            <Tooltip content={t("references.previewDoc", "预览文档")} delay={200}>
              <button
                type="button"
                {...stylex.props(styles.iconBtn, styles.iconBtnGhost)}
                onClick={(e) => handleOpenPreview(e, item)}
                title={t("references.previewDoc", "预览文档")}
                aria-label={t("references.previewDoc", "预览文档")}
              >
                <LuEye size={16} aria-hidden="true" />
              </button>
            </Tooltip>

            <Tooltip
              content={t("references.openInNewTab", "在新标签页打开")}
              delay={200}
            >
              <button
                type="button"
                {...stylex.props(styles.iconBtn, styles.iconBtnGhost)}
                onClick={(e) => handleOpenInNewTab(e, item)}
                title={t("references.openInNewTab", "在新标签页打开")}
                aria-label={t("references.openInNewTab", "在新标签页打开")}
              >
                <LuExternalLink size={16} aria-hidden="true" />
              </button>
            </Tooltip>

            {selected && (
              <Tooltip
                content={
                  selected.type === "knowledge"
                    ? t("references.toInstruction")
                    : t("references.toKnowledge")
                }
              >
                <button
                  type="button"
                  {...stylex.props(
                    styles.iconBtn,
                    styles.iconBtnType,
                    selected.type === "knowledge"
                      ? styles.iconBtnTypeKnowledge
                      : styles.iconBtnTypeInstruction
                  )}
                  onClick={(e) => toggleType(e, item.dbKey)}
                  title={
                    selected.type === "knowledge"
                      ? t("references.toInstruction")
                      : t("references.toKnowledge")
                  }
                  aria-label={
                    selected.type === "knowledge"
                      ? t("references.toInstruction")
                      : t("references.toKnowledge")
                  }
                >
                  {selected.type === "knowledge" ? (
                    <LuBrain size={16} aria-hidden="true" />
                  ) : (
                    <LuLightbulb size={16} aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
            )}

            {renderItemExtra && selected && renderItemExtra(selected)}
          </div>
        </label>
      );
    });

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.search)}>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={() => undefined}
          onClear={() => setSearchQuery("")}
          placeholder={
            activeSpaceId === ALL_SPACES_ID
              ? t("references.searchAllSpaces")
              : t("references.searchCurrentSpace")
          }
        />
      </div>

      {spaceItems.length > 0 && (
        <div {...stylex.props(styles.spaceCombobox)}>
          <Combobox<ReferencePickerSpaceItem>
            items={spaceItems}
            selectedItem={selectedSpaceItem}
            onChange={(item) => {
              if (!item) return;
              setActiveSpaceId(item.id);
            }}
            labelField="name"
            valueField="id"
            placeholder={t("references.selectSpace")}
            searchable
            clearable={false}
            size="small"
            variant="filled"
          />
        </div>
      )}

      <div {...stylex.props(styles.list)}>
        {pickerMode === "skill" ? (
          skillListLoading ? (
          <div {...stylex.props(styles.status)}>
            <div {...stylex.props(styles.spinner)} />
            {t("loading")}
          </div>
        ) : showSkillEmpty ? (
          <div {...stylex.props(styles.status)}>
            {t("references.noSkillContent")}
          </div>
        ) : (
          <>
            <section {...stylex.props(styles.section)}>
              <header {...stylex.props(styles.sectionHeader)}>
                <div {...stylex.props(styles.sectionTitle)}>
                  {t("references.globalRecommendedSkills")}
                </div>
                <div {...stylex.props(styles.sectionCount)}>
                  {filteredGlobalSkillContents.length}
                </div>
              </header>
              {filteredGlobalSkillContents.length > 0 ? (
                <div>{renderItems(filteredGlobalSkillContents)}</div>
              ) : (
                <div {...stylex.props(styles.sectionEmpty)}>
                  {t("references.noGlobalRecommendedSkills")}
                </div>
              )}
              {globalSkillsUnavailable ? (
                <div {...stylex.props(styles.sectionHint)}>
                  {t("references.globalRecommendedSkillsFallback")}
                </div>
              ) : null}
            </section>

            <section
              {...stylex.props(styles.section, styles.sectionAdjacent)}
            >
              <header {...stylex.props(styles.sectionHeader)}>
                <div {...stylex.props(styles.sectionTitle)}>
                  {t("references.currentViewSkills")}
                </div>
                <div {...stylex.props(styles.sectionCount)}>{filteredViewSkillContents.length}</div>
              </header>
              {filteredViewSkillContents.length > 0 ? (
                <div>{renderItems(filteredViewSkillContents)}</div>
              ) : (
                <div {...stylex.props(styles.sectionEmpty)}>
                  {t("references.noCurrentViewSkills")}
                </div>
              )}
            </section>
          </>
        )
        ) : loading || loadingSkillCandidates ? (
          <div {...stylex.props(styles.status)}>
            <div {...stylex.props(styles.spinner)} />
            {t("loading")}
          </div>
        ) : filteredContents.length === 0 ? (
          <div {...stylex.props(styles.status)}>
            {t(
              searchQuery
                ? "references.noResults"
                : "references.noContent"
             )}
           </div>
         ) : (
          renderItems(filteredContents)
        )}
      </div>

      {value.length > 0 && (
        <div {...stylex.props(styles.summary)}>
          {t("references.selected", { count: value.length })}
          <span {...stylex.props(styles.summaryDetail)}>
            (K: {value.filter((r) => r.type === "knowledge").length}, I:{" "}
            {value.filter((r) => r.type === "instruction").length})
          </span>
        </div>
      )}

      <DocxPreviewDialog
        isOpen={!!previewPageKey}
        onClose={handleClosePreview}
        pageKey={previewPageKey || ""}
        fileName={previewFileName || ""}
      />
    </div>
  );
};

export default ReferencesSelector;
