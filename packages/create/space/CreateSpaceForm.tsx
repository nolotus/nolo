import { useCallback, useId, type ReactNode } from "react";
import { useTheme } from "app/theme";
import { useAppDispatch } from "app/store";
import { object, string, optional, picklist, forward, check, pipe, minLength } from "valibot";
import { useForm } from "form/useForm";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useNavigate } from "app/routing";
import { Input } from "render/web/form/Input";
import FormTitle from "render/web/form/FormTitle";
import Button from "render/web/ui/Button";
import { LuPlus } from "react-icons/lu";
import { Select, SelectItem } from "render/web/ui/Select";
import { SpaceVisibility } from "app/types";
import { addSpace, changeSpace } from "./spaceThunks";

type CreateSpaceRequest = {
  name: string;
  description?: string;
  visibility?: SpaceVisibility;
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

  const onSubmit = useCallback(
    async (data: CreateSpaceRequest) => {
      try {
        const resolvedName = data.name;
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

  const form = useForm<CreateSpaceRequest>({
    schema: pipe(
      object({
        name: string(),
        description: optional(string()),
        visibility: optional(picklist([SpaceVisibility.PRIVATE, SpaceVisibility.PUBLIC])),
      }),
      // Space name never derives from a local folder.
      forward(
        check((data) => {
          return (data.name || "").trim().length >= 2;
        }, t("space.nameRequired")),
        ["name"],
      ),
    ),
    defaultValues: {
      name: "",
      description: "",
      visibility: SpaceVisibility.PRIVATE,
    },
  });

  const {
    values,
    errors,
    submitting: isSubmitting,
    set,
    submit,
  } = form;


  return (
    <FormContainer>
      <FormTitle>{t("create")}</FormTitle>
      <form
        onSubmit={submit(onSubmit)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.space[5], // 使用主题间距系统
        }}
      >
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
            value={(values.name as string) ?? ""}
            onChange={(e) => set("name", e.target.value)}
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
              {errors.name}
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
            value={(values.description as string) ?? ""}
            onChange={(e) => set("description", e.target.value)}
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
          <Select
            id={visibilityId}
            selectedKey={
              values.visibility == null ? undefined : String(values.visibility)
            }
            onSelectionChange={(key) =>
              set(
                "visibility",
                (key == null ? SpaceVisibility.PRIVATE : String(key)) as SpaceVisibility,
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
