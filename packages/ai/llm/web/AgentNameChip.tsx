import "./styles.css";
import { LuX, LuTerminal } from "react-icons/lu";
import { useFetchData } from "app/hooks";
import { useCouldEdit } from "identity";
import React from "react";
import { Dialog as EditDialog } from "render/web/ui/modal/Dialog";
import { useModal } from "render/ui/Modal";
import AgentForm from "ai/agent/web/AgentForm";
import { Agent } from "app/types";
import { useAppSelector } from "app/store";
import { selectById } from "database/dbSlice";

interface AgentNameChipProps {
  agentKey: string;
  onRemove?: (agentKey: string) => void;
  className?: string; // 支持外部传入类名
}

const AgentNameChip: React.FC<AgentNameChipProps> = React.memo(
  ({ agentKey, onRemove, className = "" }) => {
    // useFetchData 负责触发初始加载，把数据放入 Redux store
    const { isLoading } = useFetchData<Agent>(agentKey);
    // selectById 从 Redux store 读取，updateAgent 后自动拿到最新值
    const agent = useAppSelector((state) => selectById(state, agentKey) as Agent | undefined);
    const {
      visible: editVisible,
      open: openEdit,
      close: closeEdit,
    } = useModal();
    const allowEdit = useCouldEdit(agentKey);

    const displayName = agent?.name || agentKey;
    const isCli = agent?.apiSource === "cli";

    const handleChipClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      openEdit(agent);
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.(agentKey);
    };

    const dialogTitle = allowEdit ? `编辑 ${displayName}` : `${displayName} (只读)`;

    return (
      <>
        {/* Shell stays a div so nested remove button is valid HTML;
            open/edit is a real <button>, not div-onClick. */}
        <div
          className={`agent-chip-wrapper ${className} ${allowEdit ? "editable" : "readonly"} ${onRemove ? "has-remove" : ""}`}
        >
          <button
            type="button"
            className="agent-chip-main"
            onClick={handleChipClick}
            title={allowEdit ? "点击编辑" : "点击查看详情"}
          >
            <span className="agent-chip-label">
              {isCli && (
                <LuTerminal
                  size={12}
                  style={{ marginRight: 4, flexShrink: 0 }}
                  aria-hidden="true"
                />
              )}
              {isLoading ? "Loading..." : displayName}
            </span>
          </button>

          {onRemove && (
            <button
              className="agent-chip-remove-button"
              onClick={handleRemoveClick}
              aria-label={`移除 ${displayName}`}
              type="button"
            >
              <LuX size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* 编辑弹窗 */}
        {editVisible && agent && (
          <EditDialog
            isOpen={editVisible}
            onClose={closeEdit}
            title={dialogTitle}
            // 使用之前优化过的 Dialog，size 可以设为 medium
            size="medium"
          >
            <AgentForm
              mode="edit"
              initialValues={agent}
              onClose={closeEdit}
              readOnly={!allowEdit}
            />
          </EditDialog>
        )}

        
      </>
    );
  }
);

export default AgentNameChip;
