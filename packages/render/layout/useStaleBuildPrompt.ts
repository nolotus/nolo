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