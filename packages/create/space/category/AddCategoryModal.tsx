import { useRef, useState } from "react";
import { Dialog } from "render/web/ui/modal/Dialog";

import Button from "render/web/ui/Button";
import { Input } from "render/web/form/Input";
interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCategory: (name: string) => void | Promise<void>;
}

export const AddCategoryModal = ({
  isOpen,
  onClose,
  onAddCategory,
}: AddCategoryModalProps) => {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const handleConfirmAdd = async () => {
    const name = newCategoryName.trim();
    if (!name || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onAddCategory(name);
      setNewCategoryName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "添加分类失败，请重试。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const close = () => { if (!savingRef.current) onClose(); };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      title="添加新分类"
      status="neutral"
      actions={
        <>
          <Button variant="secondary" size="small" onClick={close} disabled={saving}>
            取消
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => { void handleConfirmAdd(); }}
            disabled={!newCategoryName.trim() || saving}
            loading={saving}
          >
            {saving ? "保存中…" : "添加"}
          </Button>
        </>
      }
      width={400}
    >
      <Input
        type="text"
        label="分类名称"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        onInput={(e) => setNewCategoryName((e.target as HTMLInputElement).value)}
        placeholder="请输入分类名称"
        autoFocus
        disabled={saving}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void handleConfirmAdd();
          }
        }}
      />
      {error && <p role="alert" style={{ color: "var(--danger, var(--text))" }}>{error}</p>}
    </Dialog>
  );
};
