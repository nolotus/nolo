import { useCallback, useId, useState, type ReactNode } from "react";
import { useTheme } from "app/theme";
import { useAppDispatch } from "app/store";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useNavigate } from "app/routing";
import { Input } from "render/web/form/Input";
import FormTitle from "render/web/form/FormTitle";
import Button from "render/web/ui/Button";
import { LuPlus, LuFolderOpen, LuFolder, LuX } from "react-icons/lu";
import { Select, SelectItem } from "render/web/ui/Select";
import { SpaceVisibility } from "app/types";
import { addSpace, changeSpace } from "./spaceSlice";
import { getIsDesktopApp } from "app/utils/env";

type CreateSpaceRequest = {
  name: string;
  description?: string;
  visibility?: SpaceVisibility;
  boundFolder?: string;
};

const FormContainer = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 20,
        color: theme.text,
      }}
    >
      {children}
    </div>
  );
};
export default FormContainer;
export const CreateSpaceForm = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const nameId = useId();
  const descriptionId = useId();
  const visibilityId = useId();
  const boundFolderId = useId();

  const onSubmit = useCallback(
    async (data: CreateSpaceRequest) => {
      try {
        // 名称未填但已绑定文件夹：回退到文件夹名作为空间名
        let resolvedName = data.name;
        if ((!resolvedName || !resolvedName.trim()) && data.boundFolder) {
          resolvedName =
            data.boundFolder.split("/").filter(Boolean).pop() || data.boundFolder;
        }
        console.info("[space/create] submit", {
          name: resolvedName,
          visibility: data.visibility || SpaceVisibility.PRIVATE,
          path: window.location.pathname,
        });
        const result = await (dispatch as any)(
          (addSpace as any)({
            name: resolvedName,
            description: data.description,
            visibility: data.visibility || SpaceVisibility.PRIVATE,
            ...(data.boundFolder ? { boundFolder: data.boundFolder } : {}),
          })
        ).unwrap();
        await (dispatch as any)((changeSpace as any)(result.spaceId)).unwrap();
        navigate(`/space/${result.spaceId}`);
        toast.success(t("create_success"));
        onClose();
      } catch (error) {
        console.error("Error creating space:", error);
        toast.error(t("create_error"));
      }
    },
    [dispatch, navigate, onClose, t]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSpaceRequest>();

  const isDesktop = getIsDesktopApp();
  const boundFolder = watch("boundFolder") || "";
  const [pickingFolder, setPickingFolder] = useState(false);

  const handlePickFolder = useCallback(async () => {
    if (!isDesktop) return;
    setPickingFolder(true);
    try {
      const res = await fetch("/api/desktop/pick-folder", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok && data.path) {
        setValue("boundFolder", data.path);
        // 未填名称时，用文件夹名作为空间名（满足「文件夹名字就是空间名字」）
        const currentName = watch("name") || "";
        if (!currentName.trim()) {
          const folderBasename = data.path.split("/").filter(Boolean).pop() || data.path;
          setValue("name", folderBasename);
        }
      } else if (data.error) {
        toast.error(data.error);
      } else if (data.ok === false) {
        toast.error(t("pick_folder_failed"));
      }
      // data.path === null means user cancelled — no feedback needed
    } catch (err) {
      console.warn("[CreateSpaceForm] pick-folder failed:", err);
      toast.error(t("pick_folder_failed"));
    } finally {
      setPickingFolder(false);
    }
  }, [isDesktop, setValue, watch]);

  return (
    <FormContainer>
      <FormTitle>{t("create")}</FormTitle>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.space[5], // 使用主题间距系统
        }}
      >
        {isDesktop && (
          <div>
            <label
              htmlFor={boundFolderId}
              style={{
                display: "block",
                marginBottom: theme.space[2],
                fontSize: "var(--fontSize-base)",
                fontWeight: 500,
                color: theme.text,
              }}
            >
              {t("bound_folder")}
            </label>

            {boundFolder ? (
              // ── 已选择：紧凑卡片，突出文件夹名 ──
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.space[3],
                  padding: `${theme.space[3]} ${theme.space[4]}`,
                  borderRadius: "var(--radius-md, 10px)",
                  background: theme.accentSoft,
                  border: `1px solid ${theme.primaryBorder}`,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-sm, 8px)",
                    background: theme.primaryBgStrong,
                    color: theme.primary,
                  }}
                >
                  <LuFolder size={20} aria-hidden="true" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--fontSize-sm)",
                      fontWeight: 600,
                      color: theme.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={boundFolder}
                  >
                    {boundFolder.split("/").filter(Boolean).pop() || boundFolder}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fontSize-xs)",
                      color: theme.textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                    title={boundFolder}
                  >
                    {boundFolder}
                  </div>
                </div>
                <button
                  id={boundFolderId}
                  type="button"
                  onClick={handlePickFolder}
                  disabled={pickingFolder}
                  style={{
                    flexShrink: 0,
                    background: "none",
                    border: "none",
                    color: theme.primary,
                    cursor: pickingFolder ? "wait" : "pointer",
                    fontSize: "var(--fontSize-sm)",
                    fontWeight: 500,
                    padding: `${theme.space[1]} ${theme.space[2]}`,
                    borderRadius: "var(--radius-sm, 6px)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = theme.primaryBgStrong)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  {t("change_folder")}
                </button>
                <button
                  type="button"
                  onClick={() => setValue("boundFolder", undefined)}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    background: "none",
                    border: "none",
                    color: theme.textMuted,
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm, 6px)",
                  }}
                  title={t("clear")}
                  aria-label={t("clear")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = theme.text;
                    e.currentTarget.style.background = theme.primaryBgStrong;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = theme.textMuted;
                    e.currentTarget.style.background = "none";
                  }}
                >
                  <LuX size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              // ── 未选择：虚线放区域，引导点击 ──
              <button
                id={boundFolderId}
                type="button"
                onClick={handlePickFolder}
                disabled={pickingFolder}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: theme.space[2],
                  width: "100%",
                  padding: `${theme.space[6]} ${theme.space[4]}`,
                  borderRadius: "var(--radius-md, 10px)",
                  background: "transparent",
                  border: `1.5px dashed ${theme.primaryBorder}`,
                  cursor: pickingFolder ? "wait" : "pointer",
                  color: theme.textMuted,
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.primary;
                  e.currentTarget.style.background = theme.accentSoft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.primaryBorder;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: theme.primaryBgStrong,
                    color: theme.primary,
                  }}
                >
                  <LuFolderOpen size={24} aria-hidden="true" />
                </span>
                <span
                  style={{
                    fontSize: "var(--fontSize-sm)",
                    fontWeight: 500,
                    color: theme.text,
                  }}
                >
                  {pickingFolder
                    ? t("creating", { ns: "common" })
                    : t("choose_folder")}
                </span>
                <span
                  style={{
                    fontSize: "var(--fontSize-xs)",
                    color: theme.textMuted,
                  }}
                >
                  {t("bound_folder_hint")}
                </span>
              </button>
            )}

            {/* 分组分隔：空间来源（文件夹）与空间信息（名称/描述/可见性）之间 */}
            <div
              style={{
                marginTop: theme.space[5],
                borderTop: `1px solid ${theme.borderFaint}`,
                height: 0,
              }}
              aria-hidden="true"
            />
          </div>
        )}

        <div>
          <label
            htmlFor={nameId}
            style={{
              display: "block",
              marginBottom: theme.space[2],
              fontSize: "var(--fontSize-base)",
              fontWeight: 500,
              color: theme.text,
            }}
          >
            {t("name")}
          </label>
          <Input
            {...register("name", {
              validate: (value: string) => {
                // 绑定文件夹时允许名称为空（回退到文件夹名）
                const hasBound = (watch("boundFolder") || "").trim().length > 0;
                if (!value || !value.trim()) {
                  return hasBound ? true : t("name_required");
                }
                if (value.trim().length < 2) {
                  return t("name_min_length");
                }
                return true;
              },
            })}
            id={nameId}
            placeholder={t("name_placeholder")}
          />
          {errors.name && (
            <div
              style={{
                marginTop: theme.space[2],
                color: theme.error,
                fontSize: "var(--fontSize-sm)",
              }}
            >
              {errors.name.message}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor={descriptionId}
            style={{
              display: "block",
              marginBottom: theme.space[2],
              fontSize: "var(--fontSize-base)",
              fontWeight: 500,
              color: theme.text,
            }}
          >
            {t("description")}
          </label>
          <Input
            {...register("description")}
            id={descriptionId}
            placeholder={t("description_placeholder")}
          />
        </div>

        <div>
          <label
            htmlFor={visibilityId}
            style={{
              display: "block",
              marginBottom: theme.space[2],
              fontSize: "var(--fontSize-base)",
              fontWeight: 500,
              color: theme.text,
            }}
          >
            {t("visibility")}
          </label>
          <Controller
            name="visibility"
            control={control}
            defaultValue={SpaceVisibility.PRIVATE}
            render={({ field }) => (
              <Select
                id={visibilityId}
                selectedKey={
                  field.value == null ? undefined : String(field.value)
                }
                onSelectionChange={(key) =>
                  field.onChange(
                    (key == null ? SpaceVisibility.PRIVATE : String(key)) as SpaceVisibility
                  )
                }
                style={{ width: "100%" }}
                aria-label={t("visibility")}
              >
                <SelectItem
                  id={String(SpaceVisibility.PRIVATE)}
                  textValue={t("private")}
                >
                  {t("private")}
                </SelectItem>
                <SelectItem
                  id={String(SpaceVisibility.PUBLIC)}
                  textValue={t("public")}
                >
                  {t("public")}
                </SelectItem>
              </Select>
            )}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          block
          size="large"
          loading={isSubmitting}
          disabled={isSubmitting}
          icon={<LuPlus aria-hidden="true" />}
        >
          {isSubmitting ? t("submitting", { ns: "common" }) : t("create")}
        </Button>
      </form>
    </FormContainer>
  );
};
