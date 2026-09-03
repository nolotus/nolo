import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 5 * 60 * 1000;

const readBootBuildSha = (): string => {
  const assets = window.__NOLO_ASSETS__;
  if (!assets || typeof assets !== "object") return "";
  if (!("buildSha" in assets)) return "";
  const buildSha = assets.buildSha;
  return typeof buildSha === "string" ? buildSha : "";
};

const readRemoteBuildSha = async (): Promise<string | null> => {
  const response = await fetch("/api/core/meta", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("buildSha" in body)) return null;
  const buildSha = body.buildSha;
  return typeof buildSha === "string" && buildSha.length > 0 ? buildSha : null;
};

// ── 点红点后的安全 reload ────────────────────────────────────────────────────
//
// 红点亮只代表「有新版本」，但点击时刻可能仍在 drain 窗口内（另一次部署进行中）。
// window.location.reload() 是浏览器顶层导航，没有 JS 重试层，撞进窗口会把
// 503 core_draining 的 body 原样渲染成页面。因此先轮询 /api/core/meta：该端点
// 不访问 DB，drain 期间被 admission gate 拒成 503；拿到 200 即代表新进程已从
// reusePort 组接管流量，此刻 reload 不会再撞 drain。
// 超时兜底与客户端 drain 重试预算（30×1.5s≈45s）同量级，超时照常 reload，
// 最坏退回与旧行为一致。
const WAIT_READY_POLL_MS = 1_000;
const WAIT_READY_TIMEOUT_MS = 45_000;

export const waitUntilServerReadyThenReload = async (): Promise<void> => {
  const deadline = Date.now() + WAIT_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    let remoteSha: string | null = null;
    try {
      remoteSha = await readRemoteBuildSha();
    } catch {
      // 网络错误：视同尚未就绪，下一拍重试
    }
    if (remoteSha) return;
    await new Promise((resolve) => setTimeout(resolve, WAIT_READY_POLL_MS));
  }
};

/**
 * Production: compare boot-time buildSha with /api/core/meta; user reloads manually.
 * Dev bootSha is empty — badge stays hidden.
 */
export const useStaleBuildPrompt = (): boolean => {
  const bootShaRef = useRef("");
  const [stale, setStale] = useState(false);

  const check = useCallback(async () => {
    if (!bootShaRef.current) {
      bootShaRef.current = readBootBuildSha();
    }
    const bootSha = bootShaRef.current;
    if (!bootSha) {
      setStale(false);
      return;
    }

    try {
      const remoteSha = await readRemoteBuildSha();
      if (remoteSha && remoteSha !== bootSha) {
        setStale(true);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    bootShaRef.current = readBootBuildSha();
    void check();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => void check(), POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [check]);

  return stale;
};