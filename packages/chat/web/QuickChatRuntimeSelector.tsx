import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import {
  LuBox,
  LuCheck,
  LuChevronDown,
  LuExternalLink,
  LuLaptop,
  LuServer,
} from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import { useToken } from "identity";
import { selectCurrentServer, setSettings } from "app/settings/settingSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { useNavigate } from "app/routing";
import { asOptionalTrimmedString } from "core/optionalString";
import { isRecord } from "core/isRecord";
import { Popover } from "render/web/ui/Popover";
import { normalizeServerOrigin } from "core/serverOrigin";
import { agentPickerControlStyles as apStyles } from "./agentPickerControlStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";

export interface QuickChatRuntimeTargetConfig {
  kind: "server" | "machine";
  machineId?: string;
  serverOrigin?: string;
}

export interface QuickChatRuntimeSelectorProps {
  surface?: "default" | "home-primary" | "space-home-compact";
  className?: string;
}

interface MachineItem {
  machineId: string;
  name?: string;
  platform?: string;
  status?: string;
  connectorStatus?: string;
}

export const QuickChatRuntimeSelector: React.FC<
  QuickChatRuntimeSelectorProps
> = ({ surface = "default", className }) => {
  const { t } = useTranslation(["chat", "app"]);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);

  const rawRuntimeTarget = useAppSelector(
    (state) =>
      (state.settings as Record<string, unknown> | undefined)
        ?.quickChatRuntimeTarget,
  );

  const activeTarget: QuickChatRuntimeTargetConfig = useMemo(() => {
    if (isRecord(rawRuntimeTarget)) {
      const kind = asOptionalTrimmedString(rawRuntimeTarget.kind);
      const machineId = asOptionalTrimmedString(rawRuntimeTarget.machineId);
      const targetOrigin = normalizeServerOrigin(rawRuntimeTarget.serverOrigin);
      const currentOrigin = normalizeServerOrigin(server);

      // currentServer 变化时若存的 serverOrigin 不匹配则回落到默认，不下发旧 machineId
      if (kind === "machine" && machineId) {
        if (targetOrigin && currentOrigin && targetOrigin !== currentOrigin) {
          return { kind: "server", serverOrigin: currentOrigin };
        }
        return {
          kind: "machine",
          machineId,
          serverOrigin: targetOrigin || currentOrigin,
        };
      }
      if (kind === "server") {
        return { kind: "server", serverOrigin: targetOrigin || currentOrigin };
      }
    }
    return { kind: "server", serverOrigin: normalizeServerOrigin(server) };
  }, [rawRuntimeTarget, server]);

  const [isOpen, setIsOpen] = useState(false);
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadMachines = React.useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!server || !token) {
      setMachines([]);
      setMachinesError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingMachines(true);
    setMachinesError(null);

    void (async () => {
      try {
        const res = await fetch(`${server}/api/machines`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) {
            setMachines([]);
            setMachinesError(`HTTP ${res.status}`);
          }
          return;
        }
        const data = await res.json().catch(() => null);
        const list: MachineItem[] = Array.isArray(data?.machines)
          ? data.machines
          : [];
        if (!cancelled) {
          setMachines(list);
          setMachinesError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setMachines([]);
          setMachinesError(err instanceof Error ? err.message : "fetch_failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMachines(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [server, token, reloadToken]);

  const onlineMachines = useMemo(() => {
    return machines.filter(
      (m) => m.status === "online" && m.connectorStatus === "connected",
    );
  }, [machines]);

  const currentMachine = useMemo(() => {
    if (activeTarget.kind !== "machine" || !activeTarget.machineId) return null;
    return (
      machines.find((m) => m.machineId === activeTarget.machineId) || null
    );
  }, [activeTarget, machines]);

  const triggerLabel = useMemo(() => {
    if (activeTarget.kind === "machine") {
      return (
        currentMachine?.name ||
        activeTarget.machineId ||
        t("quickChat.runtime.machine", "远程机器")
      );
    }
    return t("quickChat.runtime.server", "服务器（默认）");
  }, [activeTarget, currentMachine, t]);

  const triggerIcon = useMemo(() => {
    if (activeTarget.kind === "machine") {
      return <LuLaptop size={14} aria-hidden="true" />;
    }
    return <LuServer size={14} aria-hidden="true" />;
  }, [activeTarget]);

  const handleSelectServer = () => {
    dispatch(
      setSettings({
        quickChatRuntimeTarget: {
          kind: "server",
          serverOrigin: normalizeServerOrigin(server),
        },
      }),
    );
    setIsOpen(false);
  };

  const handleSelectMachine = (m: MachineItem) => {
    dispatch(
      setSettings({
        quickChatRuntimeTarget: {
          kind: "machine",
          machineId: m.machineId,
          serverOrigin: normalizeServerOrigin(server),
        },
      }),
    );
    setIsOpen(false);
  };

  const handleOpenCloudContainer = () => {
    setIsOpen(false);
    navigate("/life/runtime");
  };

  const triggerAria = `${t("quickChat.runtime.triggerLabel", "运行环境")}：${triggerLabel}`;

  return (
    <div
      className={`quick-chat-runtime-selector ${className || ""}`.trim()}
      data-surface={surface}
      data-runtime-kind={activeTarget.kind}
    >
      <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <RACButton
          {...withLiteralClass(
            "quick-chat-runtime-selector-trigger",
            apStyles.trigger,
            isOpen && apStyles.triggerOpen,
          )}
          aria-label={triggerAria}
        >
          <span
            {...withLiteralClass(
              "quick-chat-runtime-selector-trigger-icon",
              apStyles.triggerIcon,
            )}
            aria-hidden="true"
          >
            {triggerIcon}
          </span>
          <span
            {...withLiteralClass(
              "quick-chat-runtime-selector-trigger-label",
              apStyles.triggerLabel,
            )}
          >
            {triggerLabel}
          </span>
          <LuChevronDown
            size={12}
            {...withLiteralClass(
              "quick-chat-runtime-selector-trigger-caret",
              apStyles.caret,
              isOpen && apStyles.caretOpen,
            )}
            aria-hidden="true"
          />
        </RACButton>
        <Popover
          placement="top start"
          offset={6}
          hideArrow
          {...withLiteralClass(
            "nolo-select-popup select-popover",
            apStyles.popover,
          )}
          style={{ width: 280, padding: 0 }}
        >
          <div {...stylex.props(apStyles.hint)}>
            {t("quickChat.runtime.pickerHint", "选择对话运行环境")}
          </div>

          <ul {...stylex.props(apStyles.list)} role="menu">
            {/* 服务器（默认） */}
            <li role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={activeTarget.kind === "server"}
                {...stylex.props(
                  apStyles.itemBtn,
                  activeTarget.kind === "server" && apStyles.itemBtnActive,
                )}
                onClick={handleSelectServer}
              >
                <span
                  {...stylex.props(apStyles.badge, apStyles.badgeDefault)}
                  aria-hidden="true"
                >
                  <LuServer size={12} />
                </span>
                <span {...stylex.props(apStyles.itemText)}>
                  <span {...stylex.props(apStyles.itemName)}>
                    {t("quickChat.runtime.server", "服务器（默认）")}
                  </span>
                  <span {...stylex.props(apStyles.itemIntro)}>
                    {t("quickChat.runtime.serverDesc", "在云端服务上执行")}
                  </span>
                </span>
                {activeTarget.kind === "server" && (
                  <span
                    {...stylex.props(apStyles.itemCheck)}
                    aria-hidden="true"
                  >
                    <LuCheck size={14} />
                  </span>
                )}
              </button>
            </li>

            {/* 本机已连接的远程机器列表 */}
            {onlineMachines.map((m) => {
              const isSelected =
                activeTarget.kind === "machine" &&
                activeTarget.machineId === m.machineId;
              const machineLabel = m.name || m.machineId;
              return (
                <li key={m.machineId} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    {...stylex.props(
                      apStyles.itemBtn,
                      isSelected && apStyles.itemBtnActive,
                    )}
                    onClick={() => handleSelectMachine(m)}
                  >
                    <span
                      {...stylex.props(apStyles.badge, apStyles.badgeOwned)}
                      aria-hidden="true"
                    >
                      <LuLaptop size={12} />
                    </span>
                    <span {...stylex.props(apStyles.itemText)}>
                      <span {...stylex.props(apStyles.itemName)}>
                        {machineLabel}
                      </span>
                      <span {...stylex.props(apStyles.itemIntro)}>
                        {t("quickChat.runtime.onlineMachine", "在线设备")}{" "}
                        · {m.platform || m.machineId}
                      </span>
                    </span>
                    {isSelected && (
                      <span
                        {...stylex.props(apStyles.itemCheck)}
                        aria-hidden="true"
                      >
                        <LuCheck size={14} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}

            {machinesError && !isLoadingMachines && (
              <li role="none">
                <div
                  {...stylex.props(apStyles.empty)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span data-testid="machines-error-text">
                    {t("quickChat.runtime.fetchFailed", "读取失败")}
                  </span>
                  <button
                    type="button"
                    data-testid="machines-retry-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reloadMachines();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary, #2563eb)",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "2px 6px",
                      textDecoration: "underline",
                    }}
                  >
                    {t("quickChat.runtime.retry", "重试")}
                  </button>
                </div>
              </li>
            )}

            {!machinesError &&
              onlineMachines.length === 0 &&
              !isLoadingMachines && (
                <li role="none">
                  <div {...stylex.props(apStyles.empty)}>
                    {t(
                      "quickChat.runtime.noMachines",
                      "暂无已连接的在线远程机器",
                    )}
                  </div>
                </li>
              )}

            {/* 云端容器项：明确标注尚不可选，点击跳转 /life/runtime */}
            <li role="none">
              <button
                type="button"
                role="menuitem"
                data-testid="cloud-container-option"
                {...stylex.props(apStyles.itemBtn)}
                style={{ opacity: 0.85 }}
                onClick={handleOpenCloudContainer}
              >
                <span
                  {...stylex.props(apStyles.badge, apStyles.badgePublic)}
                  aria-hidden="true"
                >
                  <LuBox size={12} />
                </span>
                <span {...stylex.props(apStyles.itemText)}>
                  <span {...stylex.props(apStyles.itemName)}>
                    {t("quickChat.runtime.cloudContainer", "云端容器")}
                  </span>
                  <span
                    {...stylex.props(apStyles.itemIntro)}
                    style={{
                      color: "var(--textTertiary, #888)",
                      fontSize: "11px",
                    }}
                  >
                    {t(
                      "quickChat.runtime.cloudContainerNotice",
                      "尚不可选 · 点击查看运行资源",
                    )}
                  </span>
                </span>
                <span
                  {...stylex.props(apStyles.itemCheck)}
                  style={{ color: "var(--textTertiary)" }}
                  aria-hidden="true"
                >
                  <LuExternalLink size={12} />
                </span>
              </button>
            </li>
          </ul>
        </Popover>
      </DialogTrigger>
    </div>
  );
};

export default QuickChatRuntimeSelector;
