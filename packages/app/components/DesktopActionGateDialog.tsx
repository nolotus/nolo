// 文件路径: app/components/DesktopActionGateDialog.tsx
//
// Block 3b：桌面 action gate 面板。订阅 desktopActionGateChannel 的内存态，
// 有待决 gate 时渲染，无 gate（null）时什么都不渲染。
//
// 复用依据（docs/workflow.md「前端复用约定」）：选 `render/web/ui/modal/Dialog`
// （即 ConfirmModal 底层的同一个 Dialog）。理由：
// - Dialog 自带 portal、遮罩、焦点陷阱（BaseModal）与 modal.css 的 CSS 变量
//   通道，本组件不写自己的遮罩/焦点逻辑，样式全部走该区域既有 class。
// - ConfirmModal 虽然自带确认/取消按钮，但它的确认键 disabled 只跟 `loading`
//   绑定，无法表达「secret_request 空值禁用确认」，且 Enter 提交同样不校验
//   空值——安全输入框场景不满足，所以直接组合 Dialog 自行提供 actions。
//
// 安全不变量：value 只存在于本组件的受控 input state；提交后立即清空，
// 不进 redux、不进日志、不进任何持久化。

import React, { useState, useSyncExternalStore } from "react";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";
import {
  getSnapshot,
  getGateMeta,
  resolveGate,
  subscribe,
  type DesktopActionGate,
} from "../utils/desktopActionGateChannel";
import {
  cancelDesktopActionGate,
  isConfirmDisabled,
  isSecretRequestGate,
  submitDesktopActionGate,
} from "./desktopActionGateActions";

// 兼容重导出：谓词的真源在 desktopActionGateActions.ts（纯函数模块）。
export {
  isConfirmDisabled,
  isSecretRequestGate,
} from "./desktopActionGateActions";

export type DesktopActionGateDialogProps = Record<string, never>;


export const DesktopActionGateDialog: React.FC = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const gate = snapshot.gates.find(candidate => !(isSecretRequestGate(candidate) && getGateMeta(candidate.id))) ?? null;
  return gate ? <GateDialog key={gate.id} gate={gate} error={snapshot.errors[gate.id] ?? null} /> : null;
};

const GateDialog = ({ gate, error }: { gate: DesktopActionGate; error: string | null }) => {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!gate) return null;

  const secret = isSecretRequestGate(gate);

  const run = (promise: Promise<void>) => {
    if (submitting) return;
    setSubmitting(true);
    // 纯函数负责提交语义；这里只复位 submitting。
    // onSettled 仅在成功时被调用：value 清空、gate 随通道内存态移除而关闭。
    void promise.finally(() => setSubmitting(false));
  };

  const approve = () =>
    run(
      submitDesktopActionGate({
        gate,
        value,
        resolveGate,
        onSettled: () => setValue(""),
      }),
    );

  const cancel = () => {
    setValue("");
    run(
      cancelDesktopActionGate({
        gate,
        resolveGate,
        onSettled: () => setValue(""),
      }),
    );
  };

  const actions = (
    <>
      <Button
        variant="secondary"
        size="small"
        onClick={() => cancel()}
        disabled={submitting}
      >
        取消
      </Button>
      <Button
        variant="primary"
        size="small"
        loading={submitting}
        disabled={submitting || isConfirmDisabled(gate, value)}
        onClick={() => approve()}
      >
        确认
      </Button>
    </>
  );

  return (
    <Dialog
      isOpen
      onClose={() => cancel()}
      title={gate.title}
      status="warning"
      actions={actions}
      width={400}
      onEnterPress={() => approve()}
      isActionDisabled={submitting || isConfirmDisabled(gate, value)}
      aria-label={gate.title}
    >
      {gate.body ? <p className="ConfirmModal-message">{gate.body}</p> : null}
      {secret ? (
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{ width: "100%", marginTop: 8 }}
          aria-label={gate.title}
        />
      ) : null}
      {error ? (
        <p role="alert" style={{ marginTop: 8, color: "var(--danger, #d64545)" }}>
          {error}
        </p>
      ) : null}
    </Dialog>
  );
};

export default DesktopActionGateDialog;
