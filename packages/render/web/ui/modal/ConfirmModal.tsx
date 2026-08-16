// 文件路径: render/web/ui/modal/ConfirmModal.tsx

import "../../modal.css"
import React from "react";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";
import {
  LuCircleX,
  LuTriangleAlert,
  LuCircleCheck,
  LuInfo,
} from "react-icons/lu";

type ConfirmType = "info" | "warning" | "error" | "success";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  loading?: boolean;
  showCancel?: boolean;
  allowCancelWhileLoading?: boolean;
  children?: React.ReactNode;
}

type ConfirmIcon = React.ComponentType<{ size?: number }>;

const ICON_MAP: Record<ConfirmType, ConfirmIcon> = {
  error: LuCircleX,
  warning: LuTriangleAlert,
  success: LuCircleCheck,
  info: LuInfo,
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  type = "warning",
  loading = false,
  showCancel = true,
  allowCancelWhileLoading = false,
  children,
}) => {
  const IconComponent = ICON_MAP[type];

  const actions = (
    <>
      {showCancel && (
        <Button
          onClick={onClose}
          variant="secondary"
          size="small"
          className="ConfirmModal__button ConfirmModal__button--cancel"
          disabled={loading && !allowCancelWhileLoading}
        >
          {cancelText}
        </Button>
      )}
      <Button
        onClick={onConfirm}
        variant={type === "error" ? "danger" : "primary"}
        size="small"
        className="ConfirmModal__button ConfirmModal__button--confirm"
        loading={loading}
        disabled={loading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<IconComponent size={16} />}
      status={type}
      actions={actions}
      width={400}
      onEnterPress={onConfirm}
      isActionDisabled={loading}
    >
      <p className="ConfirmModal-message">{message}</p>
      {children}
    </Dialog>
  );
};
