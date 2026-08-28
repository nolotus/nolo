import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuCheck, LuCornerDownLeft, LuListOrdered, LuLoader, LuPlay } from "react-icons/lu";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { asOptionalTrimmedString } from "core/optionalString";
import type { AppendInstructionMode } from "shared/contracts/appendInstruction";
import {
  buildAppendInstructionControlUrl,
  buildAppendInstructionRequestBody,
  parseAppendInstructionResponse,
  resolveAppendInstructionMode,
} from "./childRunObserverState";
import "./ChildRunObserverPanel.css";

export type AppendInstructionControlProps = {
  /** Target dialog key / id for the run. */
  dialogKey: string;
  /** Current status of the run (running, done, failed, cancelled, etc.). */
  status: string | null | undefined;
  /** Initial queued instruction count if known. */
  queued?: number;
  /** Optional callback invoked after successful append. */
  onSuccess?: (result: {
    mode: AppendInstructionMode;
    queued?: number;
    status?: string;
  }) => void;
  /** Optional container class name. */
  className?: string;
};

export const AppendInstructionControl: React.FC<AppendInstructionControlProps> = ({
  dialogKey,
  status,
  queued: initialQueued,
  onSuccess,
  className = "",
}) => {
  const { t } = useTranslation("chat");
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);
  const inputId = useId();

  const mode = useMemo(() => resolveAppendInstructionMode(status), [status]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [localQueued, setLocalQueued] = useState<number | undefined>(initialQueued);

  useEffect(() => {
    setLocalQueued(initialQueued);
  }, [initialQueued]);

  // Reset transient feedback when status/target changes
  useEffect(() => {
    setErrorMessage(null);
    setSuccessNotice(null);
  }, [dialogKey, status]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const text = input.trim();
      if (!text || !mode || !dialogKey || isSending) return;

      setIsSending(true);
      setErrorMessage(null);
      setSuccessNotice(null);

      try {
        const url = buildAppendInstructionControlUrl(String(server ?? ""));
        const body = buildAppendInstructionRequestBody({
          dialogKey,
          userInput: text,
          mode,
        });

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const payload = await response.json().catch(() => null);
        const parsed = parseAppendInstructionResponse(payload, response.status);

        if (!parsed.ok) {
          setErrorMessage(parsed.error);
          return;
        }

        setInput("");
        const newQueued =
          parsed.queued !== undefined
            ? parsed.queued
            : mode === "enqueue"
              ? (localQueued ?? 0) + 1
              : localQueued;

        setLocalQueued(newQueued);

        if (mode === "enqueue") {
          setSuccessNotice(
            t(
              "childRunObserver.appendInstructionSuccess",
              "已加入队列，将在下一轮消费",
            ),
          );
        } else {
          setSuccessNotice(
            t(
              "childRunObserver.continueTaskSuccess",
              "已提交继续指令",
            ),
          );
        }

        onSuccess?.({
          mode,
          queued: newQueued,
          status: parsed.status,
        });
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : t("childRunObserver.appendInstructionFailed", "发送失败"),
        );
      } finally {
        setIsSending(false);
      }
    },
    [dialogKey, input, isSending, localQueued, mode, onSuccess, server, t, token],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Hidden for cancelled/orphaned/unknown statuses
  if (!mode || !asOptionalTrimmedString(dialogKey)) {
    return null;
  }

  const isEnqueue = mode === "enqueue";
  const placeholder = isEnqueue
    ? t(
        "childRunObserver.appendInstructionPlaceholder",
        "追加指令给运行中的任务…",
      )
    : t(
        "childRunObserver.continueTaskPlaceholder",
        "输入指令继续任务…",
      );

  const buttonLabel = isEnqueue
    ? t("childRunObserver.appendInstructionButton", "追加")
    : t("childRunObserver.continueTaskButton", "继续任务");

  const showQueuedBadge = isEnqueue && typeof localQueued === "number" && localQueued > 0;

  return (
    <form
      className={`AppendInstructionControl AppendInstructionControl--${mode} ${className}`.trim()}
      onSubmit={handleSubmit}
      data-testid="append-instruction-control"
      data-mode={mode}
    >
      <div className="AppendInstructionControl__header">
        <label
          htmlFor={inputId}
          className="AppendInstructionControl__label"
        >
          {isEnqueue ? (
            <>
              <LuCornerDownLeft size={13} aria-hidden="true" />
              <span>
                {t(
                  "childRunObserver.appendInstructionTitle",
                  "追加指令",
                )}
              </span>
            </>
          ) : (
            <>
              <LuPlay size={13} aria-hidden="true" />
              <span>
                {t(
                  "childRunObserver.continueTaskTitle",
                  "继续任务",
                )}
              </span>
            </>
          )}
        </label>
        {showQueuedBadge ? (
          <span
            className="AppendInstructionControl__queuedBadge"
            title={t(
              "childRunObserver.queuedCountTitle",
              "当前排队中的指令数",
            )}
            role="status"
          >
            <LuListOrdered size={12} aria-hidden="true" />
            <span>
              {t("childRunObserver.queuedCount", "{{count}} 条排队中", {
                count: localQueued,
              })}
            </span>
          </span>
        ) : null}
      </div>

      <div className="AppendInstructionControl__inputRow">
        <input
          id={inputId}
          type="text"
          className="AppendInstructionControl__input"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSending}
          aria-label={placeholder}
        />
        <button
          type="submit"
          className="AppendInstructionControl__submit"
          disabled={isSending || !input.trim()}
          aria-label={buttonLabel}
        >
          {isSending ? (
            <LuLoader
              size={13}
              className="AppendInstructionControl__spinner"
              aria-hidden="true"
            />
          ) : isEnqueue ? (
            <LuCornerDownLeft size={13} aria-hidden="true" />
          ) : (
            <LuPlay size={13} aria-hidden="true" />
          )}
          <span>
            {isSending
              ? t("childRunObserver.appendInstructionSending", "发送中…")
              : buttonLabel}
          </span>
        </button>
      </div>

      {errorMessage ? (
        <div
          className="AppendInstructionControl__error"
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </div>
      ) : null}

      {successNotice ? (
        <div
          className="AppendInstructionControl__success"
          role="status"
          aria-live="polite"
        >
          <LuCheck size={12} aria-hidden="true" />
          <span>{successNotice}</span>
        </div>
      ) : null}
    </form>
  );
};

export default AppendInstructionControl;
