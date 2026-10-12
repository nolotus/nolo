import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as stylex from "@stylexjs/stylex";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { asOptionalTrimmedString } from "core/optionalString";
import { isRecord } from "core/isRecord";
import { dialogRuntimeTargetBadgeStyles } from "./dialogRuntimeTargetBadgeStyles";

/**
 * F1 (dialog-level INTENT surface). Shows the runtime target the user *chose*
 * for this dialog — `runtimeBinding.target` resolved to a machine name via
 * GET /api/machines. This is the requested placement, NOT the verified actual
 * execution host; per-tool/per-run actual location is rendered separately from
 * server-projected `executionLocation`. The two are deliberately labeled
 * differently ("目标" intent vs "执行位置" actual) so intent is never read as
 * fact. Renders nothing when the target is not a machine (server/local/absent).
 */

type RuntimeMachine = { machineId?: string; name?: string };

export type DialogRuntimeTargetBadgeProps = {
  /** The dialog's runtimeBinding record (may be undefined). */
  runtimeBinding?: Record<string, unknown> | null;
};

export const DialogRuntimeTargetBadge: React.FC<
  DialogRuntimeTargetBadgeProps
> = ({ runtimeBinding }) => {
  const { t } = useTranslation("chat");
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);

  const target = isRecord(runtimeBinding?.target)
    ? runtimeBinding.target
    : undefined;
  const kind = asOptionalTrimmedString(target?.kind);
  const machineId = asOptionalTrimmedString(target?.machineId);
  const isMachineTarget = kind === "machine" && !!machineId;

  const [machineName, setMachineName] = useState<string | null>(null);

  useEffect(() => {
    if (!isMachineTarget || !server || !token) {
      setMachineName(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${server}/api/machines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        const machines: RuntimeMachine[] = Array.isArray(body?.machines)
          ? body.machines
          : [];
        const found = machines.find(
          (m) => asOptionalTrimmedString(m?.machineId) === machineId,
        );
        if (!cancelled) {
          setMachineName(asOptionalTrimmedString(found?.name) ?? null);
        }
      } catch {
        if (!cancelled) setMachineName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMachineTarget, machineId, server, token]);

  const label = useMemo(() => {
    if (!isMachineTarget) return null;
    // Intent surface: name is best-effort (machines join); the machineId is the
    // authoritative intent id and always shown so a missing name never blanks.
    const device = machineName ? `${machineName}(${machineId})` : machineId;
    return t(
      "runtimeTarget.intentBadge",
      "目标：{{device}}（意图）",
      { device },
    );
  }, [isMachineTarget, machineId, machineName, t]);

  if (!label) return null;

  return (
    <div
      data-hook="dialog-runtime-target-badge"
      role="status"
      {...stylex.props(dialogRuntimeTargetBadgeStyles.badge)}
    >
      {label}
    </div>
  );
};

export default DialogRuntimeTargetBadge;
