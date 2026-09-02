import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch } from "app/store";
import { resolveReferenceAssets } from "ai/agent/referenceUtils";
import { summarizeSkillReferences } from "ai/skills/skillReferenceSummary";
import { FormField } from "render/web/form/FormField";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";
import ReferencesSelector from "./ReferencesSelector";
import LinkedSpacesSelector from "./LinkedSpacesSelector";
import ContextBudgetIndicator from "./ContextBudgetIndicator";
import { LuBrain, LuLightbulb } from "react-icons/lu";
import PagePreviewDialog from "render/web/ui/modal/PagePreviewDialog";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import * as stylex from "@stylexjs/stylex";
import { referencesTabStyles as styles } from "./referencesTabStyles";
import { withLiteralClass } from "./withLiteralClass";
import { publishSettingsTabStyles as publishStyles } from "./publishSettingsTabStyles";
import type { FormData } from "../createAgentSchema";

interface ReferencesTabProps {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: unknown) => void;
}

interface Reference {
  dbKey: string;
  type: "knowledge" | "instruction";
  title?: string;
  spaceId?: string;
  spaceName?: string;
  contentType?: string;
}

type PickerMode = "knowledge" | "instruction" | null;
type PreviewPageRef = Pick<Reference, "dbKey" | "spaceId" | "contentType"> & {
  title: string;
};

const ReferencesTab: React.FC<ReferencesTabProps> = ({ errors, values, set }) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const commonProps = { horizontal: true, labelWidth: "140px" };
  const model = values.model;
  const references: Reference[] = (values.references || []) as Reference[];
  const linkedSpaces: string[] = (values.linkedSpaces || []) as string[];
  const [activePicker, setActivePicker] = useState<PickerMode>(null);
  const [skillSummaries, setSkillSummaries] = useState<
    ReturnType<typeof summarizeSkillReferences>
  >([]);
  const [previewPage, setPreviewPage] = useState<PreviewPageRef | null>(null);

  const buildPageLink = (ref: Pick<Reference, "dbKey" | "spaceId" | "contentType">): string => {
    if (!ref.dbKey) return "";
    return buildRoutableContentPath({
      contentKey: ref.dbKey,
      type: ref.contentType || "page",
      spaceId: ref.spaceId,
    });
  };

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, ref: Reference) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      return;
    }
    e.preventDefault();
    setPreviewPage({
      dbKey: ref.dbKey,
      title: ref.title || ref.dbKey,
      spaceId: ref.spaceId,
      contentType: ref.contentType,
    });
  };

  const referencesError = errors.references;

  useEffect(() => {
    let cancelled = false;

    const loadSkillSummaries = async () => {
      if (!references.length) {
        if (!cancelled) setSkillSummaries([]);
        return;
      }

      try {
        const resolved = await resolveReferenceAssets(references as any, dispatch);
        if (cancelled) return;
        setSkillSummaries(
          summarizeSkillReferences(resolved.references, resolved.contentByKey)
        );
      } catch {
        if (!cancelled) setSkillSummaries([]);
      }
    };

    void loadSkillSummaries();

    return () => {
      cancelled = true;
    };
  }, [dispatch, JSON.stringify(references.map((ref) => [ref.dbKey, ref.type]))]);

  const skillKeySet = useMemo(
    () => new Set(skillSummaries.map((skill) => skill.dbKey)),
    [skillSummaries]
  );

  const knowledgeRefs = references.filter(
    (reference) => reference.type === "knowledge" && !skillKeySet.has(reference.dbKey)
  );
  const instructionRefs = references.filter(
    (reference) => reference.type === "instruction" && !skillKeySet.has(reference.dbKey)
  );

  const pickerTitle =
    activePicker === "instruction"
        ? t("references.addInstruction")
        : t("references.addKnowledge");

  const pickerHelp =
    activePicker === "instruction"
        ? t("references.instructionHelp")
        : t("references.knowledgeHelp");

  const knowledgeCount = knowledgeRefs.length;
  const instructionCount = instructionRefs.length;

  const setReferences = (next: Reference[]) => set("references", next);

  return (
    <div {...stylex.props(publishStyles.tabContentWrapper)}>
      <div {...stylex.props(styles.manager)}>
        <div {...stylex.props(styles.grid)}>
          <section
            {...stylex.props(styles.card)}
          >
            <header {...stylex.props(styles.cardHeader)}>
              <div {...stylex.props(styles.cardHeaderTop)}>
                <div {...stylex.props(styles.cardHeading)}>
                  <div {...stylex.props(styles.cardTitleWrap)}>
                    <span
                      aria-hidden="true"
                      {...stylex.props(styles.cardIcon, styles.cardIconKnowledge)}
                    >
                      <LuBrain size={16} aria-hidden="true" />
                    </span>
                    <div {...stylex.props(styles.cardTitleBlock)}>
                      <div {...stylex.props(styles.cardTitleRow)}>
                        <h3 {...stylex.props(styles.cardTitle)}>
                          {t("references.knowledge")}
                        </h3>
                        <span
                          {...stylex.props(styles.cardCount)}
                        >{knowledgeCount}</span>
                      </div>
                      <p {...stylex.props(styles.cardSubtitle)}>
                        {t("references.knowledgeHelp")}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    setActivePicker((prev) => (prev === "knowledge" ? null : "knowledge"))
                  }
                >
                  {t("references.addKnowledge")}
                </Button>
              </div>
            </header>

            <div {...stylex.props(styles.cardBody)}>
              {knowledgeRefs.length > 0 ? (
                <div {...stylex.props(styles.list)}>
                  {knowledgeRefs.map((ref) => (
                    <div
                        key={ref.dbKey}
                        {...stylex.props(styles.item)}
                      >
                      <a
                        href={buildPageLink(ref)}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...withLiteralClass("agent-create-esc-ref-link", styles.itemMain, styles.itemLink)}
                        onClick={(e) => handleItemClick(e, ref)}
                      >
                        <div
                          {...withLiteralClass("agent-create-esc-ref-title", styles.itemTitle)}
                        >{ref.title || ref.dbKey}</div>
                        <div {...stylex.props(styles.itemMeta)}>{ref.dbKey}</div>
                      </a>
                      <button
                        type="button"
                        {...stylex.props(styles.remove)}
                        onClick={() =>
                          setReferences(
                            references.filter((item) => item.dbKey !== ref.dbKey)
                          )
                        }
                      >
                        {t("references.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  {...stylex.props(styles.empty)}
                >
                  <div {...stylex.props(styles.emptyTitle)}>
                    {t("references.noKnowledgeYet")}
                  </div>
                  <div {...stylex.props(styles.emptyTip)}>
                    {t("references.knowledgeEmptyHint")}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            {...stylex.props(styles.card)}
          >
            <header {...stylex.props(styles.cardHeader)}>
              <div {...stylex.props(styles.cardHeaderTop)}>
                <div {...stylex.props(styles.cardHeading)}>
                  <div {...stylex.props(styles.cardTitleWrap)}>
                    <span
                      aria-hidden="true"
                      {...stylex.props(styles.cardIcon, styles.cardIconInstruction)}
                    >
                      <LuLightbulb size={16} aria-hidden="true" />
                    </span>
                    <div {...stylex.props(styles.cardTitleBlock)}>
                      <div {...stylex.props(styles.cardTitleRow)}>
                        <h3 {...stylex.props(styles.cardTitle)}>
                          {t("references.instruction")}
                        </h3>
                        <span
                          {...stylex.props(styles.cardCount)}
                        >
                          {instructionCount}
                        </span>
                      </div>
                      <p {...stylex.props(styles.cardSubtitle)}>
                        {t("references.instructionHelp")}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    setActivePicker((prev) =>
                      prev === "instruction" ? null : "instruction"
                    )
                  }
                >
                  {t("references.addInstruction")}
                </Button>
              </div>
            </header>

            <div {...stylex.props(styles.cardBody)}>
              {instructionRefs.length > 0 ? (
                <div {...stylex.props(styles.list)}>
                  {instructionRefs.map((ref) => (
                    <div
                        key={ref.dbKey}
                        {...stylex.props(styles.item)}
                      >
                      <a
                        href={buildPageLink(ref)}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...withLiteralClass("agent-create-esc-ref-link", styles.itemMain, styles.itemLink)}
                        onClick={(e) => handleItemClick(e, ref)}
                      >
                        <div
                          {...withLiteralClass("agent-create-esc-ref-title", styles.itemTitle)}
                        >{ref.title || ref.dbKey}</div>
                        <div {...stylex.props(styles.itemMeta)}>{ref.dbKey}</div>
                      </a>
                      <button
                        type="button"
                        {...stylex.props(styles.remove)}
                        onClick={() =>
                          setReferences(
                            references.filter((item) => item.dbKey !== ref.dbKey)
                          )
                        }
                      >
                        {t("references.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  {...stylex.props(styles.empty)}
                >
                  <div {...stylex.props(styles.emptyTitle)}>
                    {t("references.noInstructionsYet")}
                  </div>
                  <div {...stylex.props(styles.emptyTip)}>
                    {t("references.instructionEmptyHint")}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <Dialog
          isOpen={!!activePicker}
          onClose={() => setActivePicker(null)}
          title={pickerTitle}
          size="large"
          className={stylex.props(styles.dialog).className}
        >
          <div {...stylex.props(styles.dialogBody)}>
            <div {...stylex.props(styles.dialogHelp)}>{pickerHelp}</div>
            {referencesError ? (
              <div {...stylex.props(styles.dialogError)}>
                {referencesError as string}
              </div>
            ) : null}
            <ReferencesSelector
              value={references}
              onChange={setReferences}
              pickerMode={activePicker || "knowledge"}
            />
          </div>
        </Dialog>
      </div>

      <FormField
        label={t("references.linkedSpaces")}
        helperText={t("references.linkedSpacesHelp")}
        {...commonProps}
      >
        <LinkedSpacesSelector
          value={linkedSpaces}
          onChange={(v) => set("linkedSpaces", v)}
        />
      </FormField>

      {model && (
        <ContextBudgetIndicator
          modelName={model}
          referencesCount={references.length}
          linkedSpacesCount={linkedSpaces.length}
        />
      )}

      {previewPage && (
        <PagePreviewDialog
          isOpen={!!previewPage}
          onClose={() => setPreviewPage(null)}
          pageKey={previewPage.dbKey}
          pageTitle={previewPage.title}
          onOpenPage={() => {
            window.open(buildPageLink(previewPage), "_blank", "noopener,noreferrer");
            setPreviewPage(null);
          }}
        />
      )}
    </div>
  );
};

export default ReferencesTab;