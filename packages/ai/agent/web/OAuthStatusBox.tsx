// OAuthStatusBox — extracted from AdvancedSettingsTab.tsx so it can be tested
// in isolation. Renders the four states (loading / not_connected / connected /
// error) for a single subscription-OAuth provider, with a sign-in modal that
// polls the server until the user has run `nolo auth <provider> --sync-to-server`
// on another machine.
//
// Dependencies kept minimal (React + react-i18next + the shared Button) so the
// test can mock react-i18next without bringing in the entire app shell.

import { useCallback, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { isAbortError } from "core/abortError";
import { toErrorMessage } from "core/errorMessage";
import Button from "render/web/ui/Button";
import { getIsDesktopApp } from "app/utils/env";

export type OAuthConnectionState =
  | { kind: "loading" }
  | { kind: "not_connected" }
  | { kind: "connected"; email?: string; accountId?: string; expiresAt?: number }
  | { kind: "error"; message: string };

export type OAuthStatusBoxProps = {
  providerId: string;
  serverOrigin: string;
  authToken: string;
};

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TICKS = 15;
const STATUS_TIMEOUT_MS = 5000;
const EXPIRING_SOON_MINUTES = 5;

export const OAuthStatusBox = ({
  providerId,
  serverOrigin,
  authToken,
}: OAuthStatusBoxProps) => {
  const { t } = useTranslation("ai");
  const isDesktop = getIsDesktopApp();
  const [state, setState] = useState<OAuthConnectionState>({ kind: "loading" });
  const [showModal, setShowModal] = useState(false);
  const [pollAbort, setPollAbort] = useState<AbortController | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchStatus = useCallback(
    async (signal?: AbortSignal) => {
      if (!isDesktop && !serverOrigin) {
        setState({ kind: "error", message: "Server origin not configured" });
        return;
      }
      if (!isDesktop && !authToken) {
        setState({ kind: "error", message: "Not signed in" });
        return;
      }
      try {
        const res = await fetch(
          isDesktop
            ? `/api/desktop/oauth/${providerId}/status`
            : `${serverOrigin}/api/oauth/${providerId}/status`,
          {
            headers: isDesktop ? undefined : { Authorization: `Bearer ${authToken}` },
            signal: signal ?? AbortSignal.timeout(STATUS_TIMEOUT_MS),
          }
        );
        if (res.status === 404) {
          setState({ kind: "not_connected" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", message: `Status ${res.status}` });
          return;
        }
        const data = (await res.json()) as {
          connected: boolean;
          email?: string;
          accountId?: string;
          expiresAt?: number;
        };
        if (data.connected) {
          setState({
            kind: "connected",
            email: data.email,
            accountId: data.accountId,
            expiresAt: data.expiresAt,
          });
        } else {
          setState({ kind: "not_connected" });
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setState({
          kind: "error",
          message: toErrorMessage(err),
        });
      }
    },
    [providerId, serverOrigin, authToken, isDesktop]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchStatus(ctrl.signal);
    return () => ctrl.abort();
    // fetchStatus is intentionally excluded from deps; the linter would
    // re-fire on every change otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, serverOrigin, authToken]);

  const startPolling = useCallback(() => {
    if (pollAbort) pollAbort.abort();
    const ctrl = new AbortController();
    setPollAbort(ctrl);
    let ticks = 0;
    const tick = (): void => {
      if (ctrl.signal.aborted) return;
      fetchStatus(ctrl.signal).then(() => {
        if (ctrl.signal.aborted) return;

        if (stateRef.current.kind === "connected") {
          setShowModal(false);
          ctrl.abort();
          return;
        }

        ticks += 1;
        if (ticks >= POLL_MAX_TICKS) {
          ctrl.abort();
          setState({
            kind: "error" as const,
            message:
              "Still not connected. Make sure you ran the command and try again.",
          });
          return;
        }
        setTimeout(tick, POLL_INTERVAL_MS);
      });
    };
    tick();
  }, [fetchStatus, pollAbort]);

  useEffect(() => {
    return () => {
      if (pollAbort) pollAbort.abort();
    };
  }, [pollAbort]);

  const disconnect = useCallback(async () => {
    if (!isDesktop && (!serverOrigin || !authToken)) return;
    try {
      await fetch(isDesktop
        ? `/api/desktop/oauth/${providerId}`
        : `${serverOrigin}/api/oauth/${providerId}`, {
        method: "DELETE",
        headers: isDesktop ? undefined : { Authorization: `Bearer ${authToken}` },
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      setState({ kind: "not_connected" });
    } catch (err) {
      setState({
        kind: "error",
        message: toErrorMessage(err),
      });
    }
  }, [providerId, serverOrigin, authToken, isDesktop]);

  const startDesktopLogin = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch(`/api/desktop/oauth/${providerId}/start`, {
        method: "POST",
      });
      if (!response.ok) {
        setState({ kind: "error", message: `OAuth ${response.status}` });
        return;
      }
      await fetchStatus();
    } catch (err) {
      if (isAbortError(err)) return;
      setState({ kind: "error", message: toErrorMessage(err) });
    }
  }, [fetchStatus, providerId]);

  if (state.kind === "loading") {
    return (
      <div className="cli-info-box">
        <p className="cli-info-box__hint">Checking connection…</p>
      </div>
    );
  }

  if (state.kind === "connected") {
    const expiresIn = state.expiresAt
      ? Math.max(0, Math.round((state.expiresAt - Date.now()) / 60000))
      : undefined;
    const expiringSoon =
      expiresIn !== undefined && expiresIn <= EXPIRING_SOON_MINUTES;
    const label = state.email || state.accountId || providerId;
    return (
      <div className="cli-info-box">
        <p className="cli-info-box__title">Signed in as {label}</p>
        {expiresIn !== undefined && (
          <p className="cli-info-box__hint">
            {expiringSoon
              ? `⚠️ Token expires in ${expiresIn} min — re-authorize to refresh.`
              : `Token expires in ${expiresIn} min.`}
          </p>
        )}
        <p>
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              void disconnect();
            }}
            style={{ fontSize: 12 }}
          >
            Disconnect
          </a>
        </p>
      </div>
    );
  }

  const errorMessage = state.kind === "error" ? state.message : null;

  if (isDesktop) {
    return (
      <div className="cli-info-box">
        {errorMessage ? <p className="cli-info-box__hint">{errorMessage}</p> : null}
        <p className="cli-info-box__hint">
          OAuth 将在系统浏览器中完成，凭据由 Nolo Desktop 保存在本机。
        </p>
        <Button onClick={() => void startDesktopLogin()} size="small">
          Sign in with {providerId}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="cli-info-box">
        {errorMessage && (
          <p
            className="cli-info-box__hint"
            style={{ color: "var(--color-error, #d20f39)" }}
          >
            {errorMessage}
          </p>
        )}
        <p className="cli-info-box__hint">
          Run{" "}
          <code className="cli-info-box__code">
            nolo auth {providerId} --sync-to-server
          </code>{" "}
          on a machine where you've completed OAuth, then click "I've run it".
        </p>
        <p>
          <Button onClick={() => setShowModal(true)} size="small">
            Sign in on this device
          </Button>
        </p>
      </div>
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => setShowModal(false)}
            style={{
              position: "absolute",
              inset: 0,
              margin: 0,
              padding: 0,
              border: "none",
              background: "rgba(0,0,0,0.5)",
              cursor: "pointer",
            }}
          />
          {/*
            Native <dialog open> for prefer-html-dialog; keep custom backdrop
            (no showModal) so JSDOM tests and existing focus flow stay stable.
          */}
          <dialog
            open
            role="dialog"
            aria-modal="true"
            aria-label={`Sign in to ${providerId}`}
            style={{
              position: "relative",
              background: "var(--surface-card, #fff)",
              padding: 24,
              borderRadius: 8,
              maxWidth: 560,
              width: "90%",
              margin: 0,
              border: "none",
            }}
          >
            <h3>Sign in to {providerId}</h3>
            <p>Run this command in a terminal:</p>
            <pre
              style={{
                background: "var(--surface-code, #f4f4f4)",
                padding: 12,
                borderRadius: 4,
                overflowX: "auto",
                userSelect: "all",
              }}
            >
              <code>nolo auth {providerId} --sync-to-server</code>
            </pre>
            <p style={{ fontSize: 12, color: "var(--text-muted, #666)" }}>
              It opens a browser, completes the OAuth flow, then uploads the
              token to this server.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <Button onClick={() => setShowModal(false)}>Close</Button>
              <Button onClick={() => startPolling()}>I've run it</Button>
            </div>
          </dialog>
        </div>
      )}
    </>
  );

};
