import React, { useRef, useState, useSyncExternalStore } from "react";
import Button from "render/web/ui/Button";
import { Input } from "render/web/form/Input";
import {
  getGateMeta, getSnapshot, resolveGate, subscribe,
  type DesktopActionGate,
} from "app/utils/desktopActionGateChannel";
import {
  cancelDesktopActionGate, isConfirmDisabled, isSecretRequestGate, submitDesktopActionGate,
} from "app/components/desktopActionGateActions";

export function hasSecretInputAnchor(dialogId?: string, messageId?: string): boolean {
  const snapshot = getSnapshot();
  return snapshot.gates.some(gate => {
    const meta = getGateMeta(gate.id);
    return isSecretRequestGate(gate) && !!meta && meta.dialogId === dialogId && meta.messageId === messageId;
  }) || snapshot.failures.some(({ meta }) => meta.dialogId === dialogId && meta.messageId === messageId);
}

/** Only the stream-created anchor can claim a gate. Never match model-provided arguments. */
export function SecretInputPanelWeb({ dialogId, messageId }: { dialogId?: string; messageId?: string }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const gate = snapshot.gates.find(candidate => {
    const meta = getGateMeta(candidate.id);
    return isSecretRequestGate(candidate) && !!meta && meta.dialogId === dialogId && meta.messageId === messageId;
  });
  if (!gate) {
    const failure = snapshot.failures.find(({ meta }) => meta.dialogId === dialogId && meta.messageId === messageId);
    return failure ? <section aria-label="凭据请求失败"><p role="alert">{failure.message}</p><p>此请求未保存凭据。请登录后重新发起请求。</p></section> : null;
  }
  return <SecretGateCard key={gate.id} gate={gate} error={snapshot.errors[gate.id]} />;
}

function SecretGateCard({ gate, error }: { gate: DesktopActionGate; error?: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const storage = getGateMeta(gate.id)?.storage;
  const act = async (cancel: boolean) => {
    if (inFlight.current || (!cancel && isConfirmDisabled(gate, value))) return;
    inFlight.current = true;
    setBusy(true);
    // Cancel clears even when the network fails; successful submit clears/unmounts.
    if (cancel) setValue("");
    try {
      if (cancel) await cancelDesktopActionGate({ gate, resolveGate });
      else await submitDesktopActionGate({ gate, value, resolveGate, onSettled: () => setValue("") });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-label="安全凭据输入" style={{ padding: "var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", color: "var(--text)" }}>
      <form onSubmit={event => { event.preventDefault(); void act(false); }}>
        <strong>{gate.title}</strong>
        {gate.body ? <p>{gate.body}</p> : null}
        <p>{storage === "web" ? "保存到 Web 服务端加密凭据库，不保存到此浏览器。" : "保存到 Desktop 本机凭据库，不上传到 Web 服务端。"}</p>
        <Input type="password" label="凭据值" aria-label="凭据值" value={value} disabled={busy}
          autoComplete="off" onChange={event => setValue(event.target.value)} />
        {error ? <p role="alert">{error}</p> : null}
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          <Button type="button" variant="secondary" size="small" disabled={busy} onClick={() => void act(true)}>取消</Button>
          <Button type="submit" size="small" loading={busy} disabled={isConfirmDisabled(gate, value)}>保存并继续</Button>
        </div>
      </form>
    </section>
  );
}
