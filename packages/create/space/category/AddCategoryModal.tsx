import { useState } from "react";
import { Dialog } from "render/web/ui/modal/Dialog";

import Button from "render/web/ui/Button";
import { Input } from "render/web/form/Input";
interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (name: string) => void;
}

export const AddCategoryModal = ({
  isOpen,
  onClose,
  onAddCategory,
}: AddCategoryModalProps) => {
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleConfirmAdd = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName("");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="添加新分类"
      status="neutral"
      actions={
        <>
          <Button variant="secondary" size="small" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleConfirmAdd}
            disabled={!newCategoryName.trim()}
          >
            添加
          </Button>
        </>
      }
      width={400}
    >
      <Input
        type="text"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        placeholder="请输入分类名称"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleConfirmAdd();
        }}
      />
    </Dialog>
  );
};

