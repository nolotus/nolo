import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { isRemoteSession } from "./clipboardImage";
import { sanitizeImageLabel } from "./tuiImageLayout";

// Static PowerShell program: the filename is data in the child environment,
// never interpolated into PowerShell/cmd syntax or a rundll32 command string.
const WINDOWS_VIEW_SCRIPT = "$ErrorActionPreference='Stop'; $info = New-Object System.Diagnostics.ProcessStartInfo; $info.FileName = $env:NOLO_IMAGE_VIEW_PATH; $info.UseShellExecute = $true; [System.Diagnostics.Process]::Start($info) | Out-Null";

export function localImageViewerCommand(platform: NodeJS.Platform, path: string): { argv: string[]; envPatch: Record<string, string> } | undefined {
  if (platform === "win32") return {
    argv: ["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", WINDOWS_VIEW_SCRIPT],
    envPatch: { NOLO_IMAGE_VIEW_PATH: path },
  };
  const command = platform === "darwin" ? "open" : platform === "linux" ? "xdg-open" : undefined;
  return command ? { argv: [command, path], envPatch: {} } : undefined;
}

/** Explicit local-only viewer action. Never interprets a path as a shell command. */
export async function viewLocalImage(
  sourcePath: string,
  env: Record<string, string | undefined>,
): Promise<string> {
  if (isRemoteSession(env)) return "无法在远程会话打开本机查看器；请在文件所在机器查看。";
  if (!sourcePath || /[\u0000-\u001f\u007f]/.test(sourcePath)) return "无法查看：无有效本机文件路径。";
  const path = resolve(sourcePath);
  try {
    if (!(await stat(path)).isFile()) return "无法查看：路径不是文件。";
    // Called only by the user's View action. Windows ShellExecute resolves the
    // file association; it does not run the filename through a command shell.
    const plan = localImageViewerCommand(process.platform, path);
    if (!plan || !Bun.which(plan.argv[0]!, { PATH: env.PATH })) return "无法查看：此环境没有可用的本机图片查看器。";
    if (process.platform === "linux" && !env.DISPLAY && !env.WAYLAND_DISPLAY) return "无法查看：没有桌面显示会话。";
    const child = Bun.spawn(plan.argv, { env: { ...env, ...plan.envPatch }, stdin: "ignore", stdout: "ignore", stderr: "pipe" });
    const error = await new Response(child.stderr).text();
    const code = await child.exited;
    return code === 0 ? "已交给本机查看器（不代表窗口已显示）。" : `查看器启动失败 (${code}): ${sanitizeImageLabel(error).slice(0, 300)}`;
  } catch (error) {
    return `无法查看: ${sanitizeImageLabel(error instanceof Error ? error.message : String(error))}`;
  }
}
