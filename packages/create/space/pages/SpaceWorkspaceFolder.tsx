import React, { useEffect, useState } from "react";
import { useUserId } from "identity";
import Button from "render/web/ui/Button";
import { getIsDesktopApp } from "app/utils/env";
import { requestPickFolderPath, probeFolderPicker, FolderPickerUnavailableError } from "chat/web/desktopFolderProjectsPicker";
import { subscribeSpaceWorkspaces, readSpaceWorkspaceFolder, writeSpaceWorkspaceFolder, clearSpaceWorkspaceFolder } from "chat/web/spaceWorkspaces";

export default function SpaceWorkspaceFolder({ spaceId }: { spaceId: string }) {
  const userId = useUserId();
  const [path, setPath] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [capability, setCapability] = useState<"checking" | "available" | "unavailable" | "error">("checking");
  const desktop = getIsDesktopApp();
  useEffect(() => {
    const refresh = () => {
      try { setPath(readSpaceWorkspaceFolder(window.localStorage, spaceId, userId)); }
      catch { setError("无法读取本机存储"); }
    };
    refresh();
    return subscribeSpaceWorkspaces(refresh);
  }, [spaceId, userId]);
  const checkCapability = async () => {
    setCapability("checking"); setError("");
    try { setCapability(desktop && await probeFolderPicker() ? "available" : "unavailable"); }
    catch (cause) { setCapability("error"); setError(cause instanceof Error ? cause.message : "能力检查失败"); }
  };
  useEffect(() => {
    let active = true;
    setCapability("checking");
    if (!desktop) { setCapability("unavailable"); return; }
    probeFolderPicker().then((available) => { if (active) setCapability(available ? "available" : "unavailable"); })
      .catch((cause) => { if (active) { setCapability("error"); setError(cause instanceof Error ? cause.message : "能力检查失败"); } });
    return () => { active = false; };
  }, [desktop]);
  const pick = async () => {
    setBusy(true); setError("");
    try {
      const selected = await requestPickFolderPath();
      if (selected && userId) writeSpaceWorkspaceFolder(window.localStorage, spaceId, selected, userId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "选择文件夹失败");
      if (cause instanceof FolderPickerUnavailableError) setCapability("unavailable");
    } finally { setBusy(false); }
  };
  return <section aria-label="本机工作目录" className="space-workspace-folder">
    <strong>本机工作目录</strong>
    <p>仅本机，不共享给成员</p>
    <p style={{ overflowWrap: "anywhere" }}>{path || "未设置"}</p>
    {desktop && capability === "available" && userId ? <Button onClick={pick} disabled={busy}>选择文件夹</Button> :
      capability === "unavailable" && <p>{desktop ? "当前环境的文件夹选择能力不可用" : "当前为非桌面端，文件夹选择不可用；请在桌面端设置。"}</p>}
    {capability === "checking" && <p>正在检查文件夹选择能力…</p>}
    {capability === "error" && <Button onClick={checkCapability}>重试能力检查</Button>}
    {path && <Button disabled={busy} onClick={() => {
      try { clearSpaceWorkspaceFolder(window.localStorage, spaceId, userId!); setError(""); }
      catch { setError("无法清除本机目录设置"); }
    }}>清除</Button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
