import { LuMessageCirclePlus } from "react-icons/lu";
import { useCreateDialog } from "./useCreateDialog";
import { Tooltip } from "render/web/ui/Tooltip";
import { useTranslation } from "react-i18next";

const Spinner = () => {
  const spinnerStyle = {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #ccc",
    borderTop: "2px solid #333",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div style={spinnerStyle} />
    </>
  );
};

const CreateDialogButton = ({ dialogConfig }: { dialogConfig: any }) => {
  const { isLoading, createNewDialog } = useCreateDialog();
  const { t } = useTranslation("chat");
  const handleCreateClick = () => {
    createNewDialog({
      agentMode: dialogConfig.agentMode,
      agents: dialogConfig.cybots,
    });
  };

  return (
    <>
      <style>
        {`
          .icon-button {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: inherit;
            border-radius: 4px;
            flex-shrink: 0;
          }
          .icon-button:hover {
            background-color: #f0f0f0;
          }
        `}
      </style>
      <Tooltip content={t("newchat")} placement="bottom">
        <button
          type="button"
          onClick={handleCreateClick}
          disabled={isLoading}
          className="icon-button"
          aria-label={t("newchat")}
        >
          {isLoading ? (
            <Spinner />
          ) : (
            <LuMessageCirclePlus size={16} aria-hidden="true" />
          )}
        </button>
      </Tooltip>
    </>
  );
};

export default CreateDialogButton;
