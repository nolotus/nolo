import React, { useState } from "react";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";

import { LuInfo } from "react-icons/lu";
import { Input } from "render/web/form/Input";
import { Select, SelectItem } from "render/web/ui/Select";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (identifier: string, role: string) => void;
  loading?: boolean;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  loading = false,
}) => {
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState("viewer");

  const handleInvite = () => {
    onInvite(identifier, role);
  };

  const actions = (
    <>
      <Button
        onClick={onClose}
        variant="secondary"
        size="small"
        disabled={loading}
      >
        取消
      </Button>
      <Button
        onClick={handleInvite}
        size="small"
        loading={loading}
        disabled={loading}
      >
        邀请
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="邀请成员"
      icon={<LuInfo size={16} />}
      actions={actions}
      status="info"
      width={400}
    >
      <div className="invite-form">
        <div className="form-group">
          <label htmlFor="identifier">用户名或用户 ID</label>
          <Input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="输入用户名或用户 ID"
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">角色</label>
          <Select
            className="invite-role-select"
            selectedKey={role}
            onSelectionChange={(key) =>
              setRole(key == null ? "viewer" : String(key))
            }
            aria-label="角色"
          >
            <SelectItem id="viewer" textValue="查看者">
              查看者
            </SelectItem>
            <SelectItem id="editor" textValue="编辑者">
              编辑者
            </SelectItem>
          </Select>
        </div>
      </div>

      <style jsx>{`
        .invite-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-weight: 500;
        }

        input {
          padding: 8px 12px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: var(--radius-md);
          font-size: var(--fontSize-base);
          width: 100%;
        }

        input:focus {
          outline: none;
          border-color: var(--primary-color, #0066ff);
          box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.1);
        }

        .invite-role-select {
          width: 100%;
        }
      `}</style>
    </Dialog>
  );
};
