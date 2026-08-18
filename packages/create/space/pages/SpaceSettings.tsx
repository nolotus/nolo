/* render/web/pages/SpaceSettings.tsx */
import "./SpaceSettings.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  updateSpace,
  deleteSpace,
} from "create/space/spaceSlice";
import { useViewMode, setViewMode } from "create/space/spaceCurrentStore";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { createSpaceKey, normalizeSpaceId } from "../spaceKeys";
import { useSpaceData } from "../hooks/useSpaceData";
import { useTranslation } from "react-i18next";
import { useIsLoggedIn, useUserId } from "identity";
import { toErrorMessage } from "core/errorMessage";
import { asTrimmedString } from "core/trimmedString";
import { resolveSpaceLocalAgentsSyncActionVisibility } from "../spaceLocalAgentsSyncActionVisibility";
import { formatUnsupportedTypeCountLines } from "../formatSpaceLocalAgentsUnsupported";
import {
  runPreflightAccountSpaceLocalAgents,
  runSyncAccountSpaceLocalAgentsToAccount,
} from "../runSyncAccountSpaceLocalAgentsToAccount";
import type { PreflightAccountSpaceLocalAgentsReject } from "database/sync/preflightAccountSpaceLocalAgents";
import {
  SpaceLocalAgentsSyncError,
} from "database/sync/syncAccountSpaceLocalAgentsToAccount";

// UI Components
import Button from "render/web/ui/Button";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { Dialog } from "render/web/ui/modal/Dialog";
import { toast } from "app/utils/toast"
import { Input } from "render/web/form/Input";
import { TextArea } from "render/web/form/TextArea";

// Icons (已核对参考列表，确保全部存在)
import {
  LuSettings,
  LuLock,
  LuGlobe,
  LuTriangleAlert,
  LuTrash2,
  LuArchiveRestore,
  LuBan,
  LuFolderOutput,
  LuCloudUpload,
} from "react-icons/lu";
import type { DeleteSpaceStrategy } from "create/space/deleteSpaceAction";

type UnwrapDispatch = {
  (action: unknown): { unwrap: () => Promise<unknown> };
};

const SpaceSettings: React.FC = () => {
  const { spaceId } = useParams<"spaceId">();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation("space");
  const memberSpaces = useAllMemberSpaces();
  const viewMode = useViewMode();
  const accountUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();

  const { spaceData, loading, error } = useSpaceData(spaceId!);
  const normalizedSpaceId = spaceId ? normalizeSpaceId(spaceId) : undefined;
  const spaceKey = useMemo(
    () => (spaceId ? createSpaceKey.space(spaceId) : ""),
    [spaceId]
  );
  const localAgentsSyncVisibility = useMemo(
    () =>
      resolveSpaceLocalAgentsSyncActionVisibility({
        accountUserId,
        isLoggedIn,
        spaceOwnerId: spaceData?.ownerId,
      }),
    [accountUserId, isLoggedIn, spaceData?.ownerId]
  );
  const canCleanupMissingSpaceMembership =
    !loading &&
    !spaceData &&
    !!normalizedSpaceId &&
    memberSpaces.some(
      (memberSpace) =>
        memberSpace.spaceId === normalizedSpaceId ||
        memberSpace.spaceId === spaceId ||
        `space-${memberSpace.spaceId}` === spaceId
    );
  const [name, setSpaceName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingSpace, setIsDeletingSpace] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [inputErrors, setInputErrors] = useState({ name: "", description: "" });
  const [localAgentsPreflighting, setLocalAgentsPreflighting] = useState(false);
  const [localAgentsSyncing, setLocalAgentsSyncing] = useState(false);
  const [localAgentsConfirmOpen, setLocalAgentsConfirmOpen] = useState(false);
  const [localAgentsBlockedOpen, setLocalAgentsBlockedOpen] = useState(false);
  const [localAgentsQueuedCount, setLocalAgentsQueuedCount] = useState(0);
  const [localAgentsBlocked, setLocalAgentsBlocked] =
    useState<PreflightAccountSpaceLocalAgentsReject | null>(null);
  const localAgentsInFlightRef = useRef(false);


  useEffect(() => {
    if (spaceData) {
      setSpaceName(spaceData.name || "");
      setDescription(spaceData.description || "");
      setVisibility(spaceData.visibility || "private");
    }
  }, [spaceData?.id, spaceData?.name, spaceData?.description, spaceData?.visibility]);

  useEffect(() => {
    if (spaceData) {
      const changed =
        name !== spaceData.name ||
        description !== spaceData.description ||
        visibility !== spaceData.visibility;
      setHasChanges(changed);
    }
  }, [name, description, visibility, spaceData]);



  const handleDelete = async (strategy: DeleteSpaceStrategy = "delete-space-only") => {
    if (!spaceId || !normalizedSpaceId) return;
    const previousViewMode = viewMode;
    const settingsPath = `/space/${encodeURIComponent(spaceId)}/settings`;
    setIsDeletingSpace(true);
    setViewMode("all");
    navigate("/", { replace: true });
    try {
      await (dispatch as any)(
        deleteSpace(
          canCleanupMissingSpaceMembership
            ? normalizedSpaceId
            : { spaceId: normalizedSpaceId, strategy }
        )
      ).unwrap();
        toast.success(
          canCleanupMissingSpaceMembership
            ? t("remove_space_membership_success")
            : strategy === "move-owned-to-all"
              ? t("delete_space_move_to_all_success")
              : strategy === "delete-owned-content"
                ? t("delete_space_delete_owned_success")
                : t("delete_success")
        );
    } catch (err) {
      setViewMode(previousViewMode);
      navigate(settingsPath, { replace: true });
      const errorTitle = canCleanupMissingSpaceMembership
        ? t("remove_space_membership_error")
        : t("delete_error");
      toast.error(`${errorTitle}: ${toErrorMessage(err) || t("try_later")}`);
    } finally {
      setIsDeletingSpace(false);
      setShowDeleteModal(false);
    }
  };

  const validateInputs = () => {
    let isValid = true;
    const errors = { name: "", description: "" };
    if (!name.trim()) {
      errors.name = t("name_required");
      isValid = false;
    }
    if (description.length > 500) {
      errors.description = t("description_too_long");
      isValid = false;
    }
    setInputErrors(errors);
    return isValid;
  };

  const handleUpdate = async () => {
    if (!spaceData || !spaceId || !validateInputs() || !hasChanges) return;
    setUpdating(true);
    try {
      await (dispatch as any)(updateSpace({
        spaceId,
        name: name,
        description,
        visibility,
      })).unwrap();
      toast.success(t("save_success"));
      setHasChanges(false);
    } catch (err) {
      toast.error(`${t("update_error")}: ${toErrorMessage(err) || t("try_later")}`);
    } finally {
      setUpdating(false);
    }
  };

  const labelUnsupportedType = useCallback(
    (type: string) => {
      const key = `syncLocalAgentsType_${type}`;
      const labeled = t(key, type);
      return labeled;
    },
    [t]
  );

  const blockedTypeLines = useMemo(
    () =>
      formatUnsupportedTypeCountLines(
        localAgentsBlocked?.unsupportedByType,
        labelUnsupportedType
      ),
    [localAgentsBlocked?.unsupportedByType, labelUnsupportedType]
  );

  const handleLocalAgentsEntryClick = useCallback(async () => {
    if (
      localAgentsInFlightRef.current ||
      localAgentsSyncVisibility.kind !== "sync" ||
      !spaceKey
    ) {
      return;
    }
    // Capture active account at click; confirmed path re-validates current account.
    const accountAtClick = asTrimmedString(accountUserId);
    if (!accountAtClick || accountAtClick === "local") {
      return;
    }
    localAgentsInFlightRef.current = true;
    setLocalAgentsPreflighting(true);
    setLocalAgentsBlocked(null);
    setLocalAgentsBlockedOpen(false);
    setLocalAgentsConfirmOpen(false);
    try {
      const preflight = await runPreflightAccountSpaceLocalAgents(
        { spaceKey, accountUserId: accountAtClick },
        dispatch as UnwrapDispatch
      );
      if (!preflight.ok) {
        setLocalAgentsBlocked(preflight);
        setLocalAgentsBlockedOpen(true);
        return;
      }
      const queued = preflight.queuedLocalAgents.length;
      if (queued === 0) {
        toast(
          t(
            "syncLocalAgentsNoop",
            "此 Space 没有需要同步的本机 Agent（无上传）"
          )
        );
        return;
      }
      setLocalAgentsQueuedCount(queued);
      setLocalAgentsConfirmOpen(true);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("syncLocalAgentsError", "同步失败，请稍后重试");
      toast.error(message);
    } finally {
      localAgentsInFlightRef.current = false;
      setLocalAgentsPreflighting(false);
    }
  }, [accountUserId, dispatch, localAgentsSyncVisibility.kind, spaceKey, t]);

  const handleLocalAgentsConfirmClose = useCallback(() => {
    if (localAgentsSyncing) return;
    setLocalAgentsConfirmOpen(false);
  }, [localAgentsSyncing]);

  const handleLocalAgentsBlockedClose = useCallback(() => {
    setLocalAgentsBlockedOpen(false);
    setLocalAgentsBlocked(null);
  }, []);

  const handleLocalAgentsConfirm = useCallback(async () => {
    if (localAgentsInFlightRef.current) return;
    const account = asTrimmedString(accountUserId);
    if (!account || account === "local" || !spaceKey) return;

    localAgentsInFlightRef.current = true;
    setLocalAgentsSyncing(true);
    try {
      const result = await runSyncAccountSpaceLocalAgentsToAccount(
        { spaceKey, accountUserId: account },
        dispatch as UnwrapDispatch
      );
      if (result.noop) {
        toast(
          t(
            "syncLocalAgentsNoop",
            "此 Space 没有需要同步的本机 Agent（无上传）"
          )
        );
      } else {
        toast.success(
          t("syncLocalAgentsSuccess", {
            count: result.rewrittenCount,
            defaultValue: `已改写 ${result.rewrittenCount} 个本机 Agent 引用到账号快照（本机 Agent 仍保留）`,
          })
        );
      }
      setLocalAgentsConfirmOpen(false);
    } catch (err) {
      if (
        err instanceof SpaceLocalAgentsSyncError &&
        err.code === "PREFLIGHT_REJECTED" &&
        err.preflight
      ) {
        setLocalAgentsConfirmOpen(false);
        setLocalAgentsBlocked(err.preflight);
        setLocalAgentsBlockedOpen(true);
        return;
      }
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("syncLocalAgentsError", "同步失败，请稍后重试");
      toast.error(message);
    } finally {
      localAgentsInFlightRef.current = false;
      setLocalAgentsSyncing(false);
    }
  }, [accountUserId, dispatch, spaceKey, t]);

  const localAgentsConfirmFacts = [
    t(
      "syncLocalAgentsFactLocalRemains",
      "本机 Agent 会继续留在全局/本机视图中。"
    ),
    t(
      "syncLocalAgentsFactSnapshot",
      "会为这些本机 Agent 创建或复用账号侧配置快照。"
    ),
    t(
      "syncLocalAgentsFactCatalogRewrite",
      "此 Space 目录中的引用会切换为账号 Agent 键。"
    ),
    t(
      "syncLocalAgentsFactNoDialogs",
      "不会上传对话、消息、附件、文档、表格或文件。"
    ),
    t(
      "syncLocalAgentsFactNoSecrets",
      "不会上传本机 API 密钥或令牌。"
    ),
    t(
      "syncLocalAgentsFactNoContinuous",
      "这是一次性操作，不会持续同步。"
    ),
  ];

  if (loading) {
    return (
      <div className="space-settings__loading">
        <div className="space-settings__spinner"></div>
        <span>{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-settings">
      

      {canCleanupMissingSpaceMembership ? (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => handleDelete()}
          title={t("remove_space_membership_title")}
          message={t("remove_space_membership_confirm_message")}
          type="error"
          confirmText={t("delete")}
          cancelText={t("cancel")}
          loading={isDeletingSpace}
        />
      ) : (
        <Dialog
          isOpen={showDeleteModal}
          onClose={() => !isDeletingSpace && setShowDeleteModal(false)}
          title={t("delete_space_options_title")}
          size="small"
        >
          <div className="space-settings__delete-options">
            <p className="space-settings__delete-options-desc">
              {t("delete_space_options_desc")}
            </p>

            <button
              type="button"
              className="space-settings__delete-option space-settings__delete-option--recommended"
              onClick={() => handleDelete("move-owned-to-all")}
              disabled={isDeletingSpace}
            >
              <span className="space-settings__delete-option-icon" aria-hidden="true">
                <LuFolderOutput aria-hidden="true" />
              </span>
              <span className="space-settings__delete-option-body">
                <span className="space-settings__delete-option-title">
                  {t("delete_space_move_to_all")}
                </span>
                <span className="space-settings__delete-option-text">
                  {t("delete_space_move_to_all_desc")}
                </span>
              </span>
            </button>

            <button
              type="button"
              className="space-settings__delete-option"
              onClick={() => handleDelete("delete-owned-content")}
              disabled={isDeletingSpace}
            >
              <span className="space-settings__delete-option-icon" aria-hidden="true">
                <LuArchiveRestore aria-hidden="true" />
              </span>
              <span className="space-settings__delete-option-body">
                <span className="space-settings__delete-option-title">
                  {t("delete_space_with_owned")}
                </span>
                <span className="space-settings__delete-option-text">
                  {t("delete_space_with_owned_desc")}
                </span>
              </span>
            </button>

            <button
              type="button"
              className="space-settings__delete-option"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeletingSpace}
            >
              <span className="space-settings__delete-option-icon" aria-hidden="true">
                <LuBan aria-hidden="true" />
              </span>
              <span className="space-settings__delete-option-body">
                <span className="space-settings__delete-option-title">
                  {t("cancel")}
                </span>
                <span className="space-settings__delete-option-text">
                  {t("delete_space_cancel_desc")}
                </span>
              </span>
            </button>
          </div>

          
        </Dialog>
      )}



      <ConfirmModal
        isOpen={localAgentsConfirmOpen}
        onClose={handleLocalAgentsConfirmClose}
        onConfirm={() => {
          void handleLocalAgentsConfirm();
        }}
        title={t("syncLocalAgentsTitle", "同步此 Space 中的本机 Agent")}
        message={t("syncLocalAgentsConfirmLead", {
          count: localAgentsQueuedCount,
          defaultValue: `检测到 ${localAgentsQueuedCount} 个本机 Agent 引用。确认同步到当前账号并改写此 Space 目录？`,
        })}
        confirmText={t("syncLocalAgentsConfirm", "确认同步")}
        cancelText={t("cancel")}
        type="info"
        loading={localAgentsSyncing}
        allowCancelWhileLoading={false}
      >
        <ul className="space-settings__sync-local-agents-facts">
          {localAgentsConfirmFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </ConfirmModal>

      <ConfirmModal
        isOpen={localAgentsBlockedOpen}
        onClose={handleLocalAgentsBlockedClose}
        onConfirm={handleLocalAgentsBlockedClose}
        title={t("syncLocalAgentsBlockedTitle", "无法同步本机 Agent")}
        message={t(
          "syncLocalAgentsBlockedLead",
          "预检发现不支持或缺失的本机内容，已阻止上传。请先处理下列类型后再试。"
        )}
        confirmText={t("syncLocalAgentsBlockedOk", "知道了")}
        type="warning"
        showCancel={false}
      >
        <ul className="space-settings__sync-local-agents-blocked">
          {blockedTypeLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {localAgentsBlocked?.reason ? (
          <p className="space-settings__sync-local-agents-blocked-reason">
            {t(`syncLocalAgentsBlockedReason_${localAgentsBlocked.reason}`, {
              defaultValue:
                localAgentsBlocked.reason === "missing_or_tombstoned_record"
                  ? "部分引用的记录缺失或已删除。"
                  : localAgentsBlocked.reason === "authoritative_type_mismatch"
                    ? "目录标注与真实记录类型不一致。"
                    : "包含尚不支持同步的本机内容类型。",
            })}
          </p>
        ) : null}
      </ConfirmModal>

      <header className="space-settings__header">
        <LuSettings aria-hidden="true" className="space-settings__header-icon" />
        <h2 className="space-settings__title">{t("space_settings")}</h2>
        {hasChanges && (
          <span className="space-settings__badge">{t("unsaved_changes")}</span>
        )}
      </header>

      {error || !spaceData ? (
        <div className="space-settings__error-state">
          <LuTriangleAlert size={48} aria-hidden="true" />
          <h3>{t("load_error_title")}</h3>
          <p>{(error && toErrorMessage(error)) || t("no_space_data")}</p>
          {canCleanupMissingSpaceMembership && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              icon={<LuTrash2 aria-hidden="true" />}
              className="space-settings__error-action"
            >
              {t("remove_space_membership_action")}
            </Button>
          )}
        </div>
      ) : (
        <>
          <section className="space-settings__section">
            <div className="space-settings__form-group">
              <Input
                label={t("name")}
                value={name}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder={t("name_placeholder")}
                error={!!inputErrors.name}
                helperText={inputErrors.name}
              />
            </div>
            <div className="space-settings__form-group">
              <TextArea
                label={t("description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description_placeholder")}
                rows={3}
                error={!!inputErrors.description}
                helperText={inputErrors.description}
              />
            </div>

            <div className="space-settings__form-group">
              <label className="space-settings__label">{t("access_permission")}</label>
              <div className="space-settings__visibility-list">
                <button
                  type="button"
                  className={`space-settings__visibility-item ${visibility === "private" ? "space-settings__visibility-item--selected" : ""}`}
                  onClick={() => setVisibility("private")}
                  aria-pressed={visibility === "private"}
                >
                  <LuLock aria-hidden="true" className="space-settings__visibility-icon" />
                  <span>{t("private")}</span>
                </button>
                <button
                  type="button"
                  className={`space-settings__visibility-item ${visibility === "public" ? "space-settings__visibility-item--selected" : ""}`}
                  onClick={() => setVisibility("public")}
                  aria-pressed={visibility === "public"}
                >
                  <LuGlobe aria-hidden="true" className="space-settings__visibility-icon" />
                  <span>{t("public")}</span>
                </button>
              </div>
            </div>
          </section>

          <div className="space-settings__actions">
            <Button
              onClick={handleUpdate}
              loading={updating}
              disabled={!hasChanges || updating}
              variant={hasChanges ? "primary" : "secondary"}
              className={hasChanges ? "space-settings__save-btn--active" : ""}
            >
              {t("save_changes")}
            </Button>

            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (spaceData) {
                    setSpaceName(spaceData.name || "");
                    setDescription(spaceData.description || "");
                    setVisibility(spaceData.visibility || "private");
                  }
                }}
              >
                {t("cancel_changes")}
              </Button>
            )}
          </div>

          <div className="space-settings__divider" />

          <section className="space-settings__meta">
            <div className="space-settings__meta-item">
              <span className="space-settings__meta-label">{t("space_id")}</span>
              <span className="space-settings__meta-value space-settings__meta-value--code">{spaceData.id}</span>
            </div>
            <span className="space-settings__meta-sep">·</span>
            <div className="space-settings__meta-item">
              <span className="space-settings__meta-label">{t("created_at")}</span>
              <span className="space-settings__meta-value">
                {new Date(spaceData.createdAt).toLocaleDateString()}
              </span>
            </div>
            <span className="space-settings__meta-sep">·</span>
            <div className="space-settings__meta-item">
              <span className="space-settings__meta-label">{t("member_count")}</span>
              <span className="space-settings__meta-value">
                {spaceData.members?.length || 0} {t("people")}
              </span>
            </div>
          </section>

          {localAgentsSyncVisibility.kind === "sync" && (
            <section className="space-settings__section space-settings__section--sync">
              <div className="space-settings__section-header">
                <h3 className="space-settings__section-title">
                  {t("syncLocalAgentsSectionTitle", "本机 Agent 与此 Space")}
                </h3>
                <p className="space-settings__section-desc">
                  {t(
                    "syncLocalAgentsSectionDesc",
                    "把此账号 Space 目录里引用的本机 Agent 对账到账号快照。不会创建新 Space，也不会做完整 Space 云同步。"
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                icon={<LuCloudUpload aria-hidden="true" />}
                loading={localAgentsPreflighting || localAgentsSyncing}
                disabled={localAgentsPreflighting || localAgentsSyncing}
                onClick={() => {
                  void handleLocalAgentsEntryClick();
                }}
              >
                {t("syncLocalAgents", "同步此 Space 中的本机 Agent")}
              </Button>
            </section>
          )}

          <footer className="space-settings__danger-zone">
            <div className="space-settings__danger-content">
              <div className="space-settings__danger-title">{t("delete_space")}</div>
              <p className="space-settings__danger-desc">{t("delete_description")}</p>
            </div>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              icon={<LuTrash2 aria-hidden="true" />}
            >
              {t("delete_space")}
            </Button>
          </footer>
        </>
      )}
    </div>
  );
};

export default SpaceSettings;
