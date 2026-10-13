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
 *
 * Identity invariant: the displayed name is stored as
 * `{ machineId, server, name }` and only rendered while it matches the
 * *current* `machineId`/`server` — so a target switch can never paint machine
 * A's name next to machine B's id, and a failed lookup on B can never
 * resurrect a stale name. While the name for the current target is unknown
 * (in-flight, non-2xx, not listed, logged out) the badge shows the bare
 * machineId, never another machine's name.
 */

type RuntimeMachine = { machineId?: string; name?: string };

/** Resolved name bound to the exact target it was fetched for. */
type MachineNameResolution = {
  machineId: string;
  server: string;
  name: string;
};

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

  const [resolution, setResolution] = useState<MachineNameResolution | null>(
    null,
  );

  useEffect(() => {
    if (!isMachineTarget || !server || !token) {
      setResolution(null);
      return;
    }
    const requestMachineId = machineId;
    const requestServer = server;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${requestServer}/api/machines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        const machines: RuntimeMachine[] = Array.isArray(body?.machines)
          ? body.machines
          : [];
        const found = machines.find(
          (m) => asOptionalTrimmedString(m?.machineId) === requestMachineId,
        );
        const name = asOptionalTrimmedString(found?.name);
        if (!cancelled && name) {
          // Bind the name to the exact (machineId, server) it was resolved for;
          // the render guard below drops it the moment the target moves on.
          setResolution({
            machineId: requestMachineId,
            server: requestServer,
            name,
          });
        }
      } catch {
        // Lookup failure must not clear a name that is still valid for the
        // current target (transient errors shouldn't flicker the badge); the
        // identity guard below is what prevents stale-name display, so no
        // state reset is needed here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMachineTarget, machineId, server, token]);

  const label = useMemo(() => {
    if (!isMachineTarget) return null;
    // The name may only be shown while it is bound to the target currently on
    // screen — a mismatched resolution (previous machine, previous server) is
    // treated as "no name" and the bare machineId is rendered instead.
    const name =
      resolution &&
      resolution.machineId === machineId &&
      resolution.server === server
        ? resolution.name
        : null;
    // Intent surface: name is best-effort (machines join); the machineId is the
    // authoritative intent id and always shown so a missing name never blanks.
    const device = name ? `${name}(${machineId})` : machineId;
    return t(
      "runtimeTarget.intentBadge",
      "目标：{{device}}（意图）",
      { device },
    );
  }, [isMachineTarget, machineId, server, resolution, t]);

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
