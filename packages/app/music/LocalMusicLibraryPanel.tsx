import React, { useCallback, useEffect, useState } from "react";
import {
  DESKTOP_FOLDER_SELECTION_EVENT,
  readSelectedDesktopFolderProject,
  type DesktopFolderProject,
} from "chat/web/desktopFolderProjects";

export interface MusicRoot {
  path: string;
  addedAt: number;
}

export interface MusicStats {
  roots: number;
  tracks: number;
  unavailable: number;
  lastScannedAt?: number;
}

export interface ScanResult {
  added: number;
  reused: number;
  removed: number;
  skipped: number;
  truncated: boolean;
  durationMs: number;
}

export type FetchLike = typeof globalThis.fetch;

let customFetchImpl: FetchLike | null = null;

export function setLocalMusicLibraryFetchImpl(impl: FetchLike | null): void {
  customFetchImpl = impl;
}

function getFetch(propFetch?: FetchLike): FetchLike {
  return propFetch ?? customFetchImpl ?? globalThis.fetch;
}

function safeGetStorage(): Pick<Storage, "getItem"> | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage !== null) {
      return localStorage;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Return null if storage is inaccessible
  }
  return null;
}

function readCurrentProject(): DesktopFolderProject | null {
  const storage = safeGetStorage();
  if (!storage) return null;
  try {
    return readSelectedDesktopFolderProject(storage);
  } catch {
    return null;
  }
}

export function formatLastScannedAt(timestamp?: number): string {
  if (!timestamp || typeof timestamp !== "number" || timestamp <= 0) {
    return "尚未扫描";
  }
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 0) {
    return "刚刚";
  }
  if (diffSec < 60) {
    return "刚刚";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} 分钟前`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} 小时前`;
  }
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} 天前`;
}

export function formatMusicErrorMessage(
  status?: number,
  reason?: string,
  serverMessage?: string,
): string {
  if (status === 409 || reason === "busy") {
    return "正在扫描中，请稍候";
  }
  if (status === 403 || reason === "permission-denied") {
    return "没有访问该目录的权限";
  }
  if (status === 404 || reason === "no-source") {
    return "未找到指定资源或文件夹不存在";
  }
  if (status === 400) {
    return "请求参数错误或目录无效";
  }
  if (serverMessage && typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage;
  }
  return "操作失败，请重试";
}

export interface LocalMusicLibraryPanelProps {
  fetchImpl?: FetchLike;
  /**
   * 受控注入当前项目；不传时从 localStorage 读取选中项目。
   * 传 null 表示未选中项目（显示绑定引导）。
   */
  project?: DesktopFolderProject | null;
}

/**
 * 项目内本地音乐面板：所有 local 接口都带 projectId，与全局设置无关。
 * 未选中项目时不发任何 local 请求。
 */
export const LocalMusicLibraryPanel: React.FC<LocalMusicLibraryPanelProps> = ({
  fetchImpl,
  project: projectProp,
}) => {
  const fetchFn = getFetch(fetchImpl);

  const [internalProject, setInternalProject] = useState<DesktopFolderProject | null>(
    () => readCurrentProject(),
  );

  useEffect(() => {
    const update = () => setInternalProject(readCurrentProject());
    update();
    const win = typeof window !== "undefined" ? window : null;
    win?.addEventListener(DESKTOP_FOLDER_SELECTION_EVENT, update);
    return () => {
      win?.removeEventListener(DESKTOP_FOLDER_SELECTION_EVENT, update);
    };
  }, []);

  const project = projectProp !== undefined ? projectProp : internalProject;
  const projectId = project?.id ?? null;

  const [stats, setStats] = useState<MusicStats | null>(null);
  const [roots, setRoots] = useState<MusicRoot[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetchFn(
        `/api/desktop/music/local/status?projectId=${encodeURIComponent(projectId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setStats(data.stats ?? null);
        setRoots(Array.isArray(data.roots) ? data.roots : []);
      } else {
        const errorText = formatMusicErrorMessage(
          res.status,
          data?.reason,
          data?.message,
        );
        setErrorMessage(errorText);
      }
    } catch {
      setErrorMessage("无法连接到本地音乐服务");
    }
  }, [fetchFn, projectId]);

  useEffect(() => {
    if (!projectId) {
      // 未绑定项目：清空状态，且不发任何 local 请求
      setStats(null);
      setRoots([]);
      setScanSummary(null);
      setErrorMessage(null);
      return;
    }
    void fetchStatus();
  }, [fetchStatus, projectId]);

  const triggerScan = useCallback(async () => {
    if (!projectId) return;
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const res = await fetchFn("/api/desktop/music/local/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const r: ScanResult = data.result;
        if (data.stats) {
          setStats(data.stats);
        } else {
          void fetchStatus();
        }
        const summary = `扫描完成：新增 ${r.added} 首，复用 ${r.reused} 首，跳过 ${r.skipped} 首${
          r.truncated ? "（已达到扫描上限，部分文件被截断）" : ""
        }`;
        setScanSummary(summary);
      } else {
        const errorText = formatMusicErrorMessage(
          res.status,
          data?.reason,
          data?.message,
        );
        setErrorMessage(errorText);
      }
    } catch {
      setErrorMessage("扫描请求失败，请稍后重试");
    } finally {
      setIsScanning(false);
    }
  }, [fetchFn, fetchStatus, projectId]);

  const addRoot = useCallback(
    async (folderPath: string): Promise<boolean> => {
      if (!projectId) return false;
      setErrorMessage(null);
      try {
        const res = await fetchFn("/api/desktop/music/local/roots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ projectId, action: "add", path: folderPath }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          const errorText = formatMusicErrorMessage(
            res.status,
            data?.reason,
            data?.message,
          );
          setErrorMessage(errorText);
          return false;
        }
        return true;
      } catch {
        setErrorMessage("添加音乐文件夹失败");
        return false;
      }
    },
    [fetchFn, projectId],
  );

  const handleAddFolder = useCallback(async () => {
    if (!projectId) return;
    try {
      const pickRes = await fetchFn("/api/desktop/pick-folder", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!pickRes.ok) {
        // 用户取消或接口不可用（如 404）时，静默不报错、不触发 scan
        return;
      }
      const pickData = await pickRes.json().catch(() => null);
      if (!pickData || !pickData.path) {
        return;
      }

      const added = await addRoot(pickData.path);
      if (!added) return;

      // 添加成功后自动触发一次扫描
      await triggerScan();
      void fetchStatus();
    } catch {
      setErrorMessage("添加音乐文件夹失败");
    }
  }, [fetchFn, projectId, addRoot, triggerScan, fetchStatus]);

  const handleUseProjectFolder = useCallback(async () => {
    if (!projectId || !project?.localPath) return;
    const added = await addRoot(project.localPath);
    if (!added) return;
    await triggerScan();
    void fetchStatus();
  }, [addRoot, project, projectId, triggerScan, fetchStatus]);

  const handleRemoveFolder = useCallback(
    async (pathToRemove: string) => {
      if (!projectId) return;
      setErrorMessage(null);
      try {
        const res = await fetchFn("/api/desktop/music/local/roots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ projectId, action: "remove", path: pathToRemove }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          void fetchStatus();
        } else {
          const errorText = formatMusicErrorMessage(
            res.status,
            data?.reason,
            data?.message,
          );
          setErrorMessage(errorText);
        }
      } catch {
        setErrorMessage("移除文件夹失败");
      }
    },
    [fetchFn, fetchStatus, projectId],
  );

  if (!projectId) {
    return (
      <div
        className="local-music-library-panel"
        data-testid="local-music-library-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
        }}
      >
        <div
          className="local-music-empty-state"
          data-testid="local-music-project-required"
          style={{
            padding: "14px 12px",
            borderRadius: "var(--radius-md, 6px)",
            border: "1px dashed var(--border, #ccc)",
            color: "var(--textSecondary, #888)",
            fontSize: "13px",
          }}
        >
          本地音乐需要绑定项目：先在项目里选择一个文件夹
        </div>
      </div>
    );
  }

  const showUseProjectSuggestion = roots.length === 0 && !!project?.localPath;

  return (
    <div
      className="local-music-library-panel"
      data-testid="local-music-library-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
      }}
    >
      {/* 状态区 */}
      <div
        className="local-music-status-card"
        data-testid="local-music-status-card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "10px 12px",
          borderRadius: "var(--radius-md, 6px)",
          backgroundColor: "var(--backgroundSecondary, rgba(0,0,0,0.03))",
          border: "1px solid var(--border, rgba(0,0,0,0.1))",
          fontSize: "13px",
          color: "var(--text, inherit)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <span data-testid="local-music-tracks-info">
            已收录 {stats?.tracks ?? 0} 首曲目（{stats?.unavailable ?? 0} 首文件不可用）
          </span>
          <span data-testid="local-music-roots-count">
            根目录 {stats?.roots ?? roots.length} 个
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--textSecondary, #888)" }}>
          上次扫描时间：
          <span data-testid="local-music-last-scanned">
            {formatLastScannedAt(stats?.lastScannedAt)}
          </span>
        </div>
      </div>

      {/* 操作按钮区 */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleAddFolder}
          disabled={isScanning}
          data-testid="local-music-add-btn"
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-md, 6px)",
            border: "1px solid var(--border, #ccc)",
            backgroundColor: "var(--backgroundSecondary, #f4f4f4)",
            color: "var(--text, inherit)",
            cursor: isScanning ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          添加音乐文件夹
        </button>

        <button
          type="button"
          onClick={triggerScan}
          disabled={isScanning}
          data-testid="local-music-scan-btn"
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-md, 6px)",
            border: "1px solid var(--border, #ccc)",
            backgroundColor: "var(--backgroundSecondary, #f4f4f4)",
            color: "var(--text, inherit)",
            cursor: isScanning ? "not-allowed" : "pointer",
            fontSize: "13px",
          }}
        >
          {isScanning ? "正在扫描中..." : "重新扫描"}
        </button>

        {showUseProjectSuggestion && (
          <button
            type="button"
            onClick={handleUseProjectFolder}
            disabled={isScanning}
            data-testid="local-music-use-project-btn"
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md, 6px)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              color: "#dc2626",
              cursor: isScanning ? "not-allowed" : "pointer",
              fontSize: "13px",
            }}
          >
            用项目文件夹作为音乐库
          </button>
        )}
      </div>

      {/* 扫描摘要 */}
      {scanSummary && (
        <div
          data-testid="local-music-scan-summary"
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md, 6px)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            color: "#059669",
            fontSize: "12px",
          }}
        >
          {scanSummary}
        </div>
      )}

      {/* 错误提示 */}
      {errorMessage && (
        <div
          data-testid="local-music-error"
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md, 6px)",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#dc2626",
            fontSize: "12px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* 根目录列表 */}
      {roots.length > 0 && (
        <div
          className="local-music-roots-list"
          data-testid="local-music-roots-list"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            width: "100%",
          }}
        >
          {roots.map((root) => (
            <div
              key={root.path}
              className="local-music-root-item"
              data-testid="local-music-root-item"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "6px 10px",
                borderRadius: "var(--radius-md, 6px)",
                backgroundColor: "var(--backgroundSecondary, #f9f9f9)",
                border: "1px solid var(--border, #eee)",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  direction: "rtl",
                  textAlign: "left",
                  flex: 1,
                }}
                title={root.path}
              >
                {root.path}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFolder(root.path)}
                disabled={isScanning}
                data-testid={`local-music-remove-btn-${root.path}`}
                style={{
                  padding: "2px 8px",
                  fontSize: "12px",
                  color: "#dc2626",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  cursor: isScanning ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 只读边界说明 */}
      <div
        className="local-music-boundary-note"
        data-testid="local-music-boundary-note"
        style={{
          fontSize: "12px",
          color: "var(--textSecondary, #888)",
          marginTop: "2px",
        }}
      >
        只读取你选择的文件夹，不复制、不上传
      </div>
    </div>
  );
};

export default LocalMusicLibraryPanel;
