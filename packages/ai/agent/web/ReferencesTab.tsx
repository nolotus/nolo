import React, { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
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

interface ReferencesTabProps {
  control: any;
  errors: any;
  watch: (name: string) => any;
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

const ReferencesTab: React.FC<ReferencesTabProps> = ({ control, errors, watch }) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const commonProps = { horizontal: true, labelWidth: "140px" };
  const model = watch("model");
  const references: Reference[] = watch("references") || [];
  const linkedSpaces: string[] = watch("linkedSpaces") || [];
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

  const referencesError =
    errors.references?.message ||
    (Array.isArray(errors.references)
      ? errors.references.find((err: any) => err?.message)?.message
      : null);

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

  return (
    <div className="tab-content-wrapper">
      <Controller
        name="references"
        control={control}
        render={({ field }) => (
          <div className="ref-manager">
            <div className="ref-manager__grid">
              <section className="ref-manager__card ref-manager__card--knowledge">
                <header className="ref-manager__card-header">
                  <div className="ref-manager__card-headerTop">
                    <div className="ref-manager__card-heading">
                      <div className="ref-manager__card-titleWrap">
                        <span className="ref-manager__card-icon" aria-hidden="true">
                          <LuBrain size={16} aria-hidden="true" />
                        </span>
                        <div className="ref-manager__card-titleBlock">
                          <div className="ref-manager__card-titleRow">
                            <h3 className="ref-manager__card-title">
                              {t("references.knowledge")}
                            </h3>
                            <span className="ref-manager__card-count">{knowledgeCount}</span>
                          </div>
                          <p className="ref-manager__card-subtitle">
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

                <div className="ref-manager__card-body">
                  {knowledgeRefs.length > 0 ? (
                    <div className="ref-manager__list">
                      {knowledgeRefs.map((ref) => (
                        <div key={ref.dbKey} className="ref-manager__item">
                          <a
                            href={buildPageLink(ref)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ref-manager__item-main ref-manager__item-link"
                            onClick={(e) => handleItemClick(e, ref)}
                          >
                            <div className="ref-manager__item-title">{ref.title || ref.dbKey}</div>
                            <div className="ref-manager__item-meta">{ref.dbKey}</div>
                          </a>
                          <button
                            type="button"
                            className="ref-manager__remove"
                            onClick={() =>
                              field.onChange(
                                (field.value || []).filter(
                                  (item: Reference) => item.dbKey !== ref.dbKey
                                )
                              )
                            }
                          >
                            {t("references.remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ref-manager__empty">
                      <div className="ref-manager__empty-title">
                        {t("references.noKnowledgeYet")}
                      </div>
                      <div className="ref-manager__empty-tip">
                        {t("references.knowledgeEmptyHint")}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="ref-manager__card ref-manager__card--instruction">
                <header className="ref-manager__card-header">
                  <div className="ref-manager__card-headerTop">
                    <div className="ref-manager__card-heading">
                      <div className="ref-manager__card-titleWrap">
                        <span className="ref-manager__card-icon" aria-hidden="true">
                          <LuLightbulb size={16} aria-hidden="true" />
                        </span>
                        <div className="ref-manager__card-titleBlock">
                          <div className="ref-manager__card-titleRow">
                            <h3 className="ref-manager__card-title">
                              {t("references.instruction")}
                            </h3>
                            <span className="ref-manager__card-count">
                              {instructionCount}
                            </span>
                          </div>
                          <p className="ref-manager__card-subtitle">
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

                <div className="ref-manager__card-body">
                  {instructionRefs.length > 0 ? (
                    <div className="ref-manager__list">
                      {instructionRefs.map((ref) => (
                        <div key={ref.dbKey} className="ref-manager__item">
                          <a
                            href={buildPageLink(ref)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ref-manager__item-main ref-manager__item-link"
                            onClick={(e) => handleItemClick(e, ref)}
                          >
                            <div className="ref-manager__item-title">{ref.title || ref.dbKey}</div>
                            <div className="ref-manager__item-meta">{ref.dbKey}</div>
                          </a>
                          <button
                            type="button"
                            className="ref-manager__remove"
                            onClick={() =>
                              field.onChange(
                                (field.value || []).filter(
                                  (item: Reference) => item.dbKey !== ref.dbKey
                                )
                              )
                            }
                          >
                            {t("references.remove")}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ref-manager__empty">
                      <div className="ref-manager__empty-title">
                        {t("references.noInstructionsYet")}
                      </div>
                      <div className="ref-manager__empty-tip">
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
              className="ref-manager__dialog"
            >
              <div className="ref-manager__dialogBody">
                <div className="ref-manager__dialogHelp">{pickerHelp}</div>
                {referencesError ? (
                  <div className="ref-manager__dialogError">
                    {referencesError as string}
                  </div>
                ) : null}
                <ReferencesSelector
                  value={field.value || []}
                  onChange={field.onChange}
                  pickerMode={activePicker || "knowledge"}
                />
              </div>
            </Dialog>
          </div>
        )}
      />

      <FormField
        label={t("references.linkedSpaces")}
        helperText={t("references.linkedSpacesHelp")}
        {...commonProps}
      >
        <Controller
          name="linkedSpaces"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <LinkedSpacesSelector
              value={field.value || []}
              onChange={field.onChange}
            />
          )}
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
