import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function spawnAndRead(args: string[]): Promise<string> {
  const proc = Bun.spawn(args, { stdio: ["ignore", "pipe", "pipe"] });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `Folder picker exited with code ${exitCode}`);
  }
  return stdout.trim();
}

/**
 * Open the native OS folder picker and return the selected directory path.
 * Supports macOS (osascript), Windows (pwsh/powershell), and Linux (zenity/kdialog).
 */
async function pickFolderNative(): Promise<string | null> {
  if (process.platform === "darwin") {
    const script = `
      set chosenFolder to choose folder with prompt "选择要绑定的文件夹"
      return POSIX path of chosenFolder
    `;
    const result = await spawnAndRead(["osascript", "-e", script]);
    const path = result.trim().replace(/\n$/, "");
    return path || null;
  }

  if (process.platform === "win32") {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $browser = New-Object System.Windows.Forms.FolderBrowserDialog
      $browser.Description = "选择要绑定的文件夹"
      $browser.ShowNewFolderButton = $true
      $result = $browser.ShowDialog()
      if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $browser.SelectedPath
      }
    `;
    const psArgs = ["-NoProfile", "-NonInteractive", "-Command", psScript];
    // Try PowerShell Core (pwsh) first, then fallback to Windows PowerShell
    const pwsh = Bun.which("pwsh");
    if (pwsh) {
      const result = await spawnAndRead([pwsh, ...psArgs]);
      return result || null;
    }
    const result = await spawnAndRead(["powershell", ...psArgs]);
    return result || null;
  }

  // Linux: try zenity first, then kdialog
  const zenity = Bun.which("zenity");
  if (zenity) {
    const result = await spawnAndRead([zenity, "--file-selection", "--directory",
      "--title", "选择要绑定的文件夹"]);
    return result || null;
  }

  const kdialog = Bun.which("kdialog");
  if (kdialog) {
    const result = await spawnAndRead([kdialog, "--getexistingdirectory",
      "--title", "选择要绑定的文件夹"]);
    return result || null;
  }

  throw new Error("No native folder picker available on this platform.");
}

export async function handleDesktopPickFolder(
  req: Request,
  deps: { env?: Record<string, string | undefined> } = {}
): Promise<Response> {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return json({ error: "Desktop runtime only" }, 404);
  }

  try {
    const folderPath = await pickFolderNative();
    if (!folderPath) {
      return json({ ok: true, path: null });
    }

    const normalizedPath = resolve(folderPath);

    // Validate: path must exist and be a directory
    if (!existsSync(normalizedPath)) {
      return json({ ok: false, error: "Selected path does not exist" }, 400);
    }
    if (!statSync(normalizedPath).isDirectory()) {
      return json({ ok: false, error: "Selected path is not a directory" }, 400);
    }

    return json({ ok: true, path: normalizedPath });
  } catch (error) {
    const message = toErrorMessage(error);
    console.warn("[desktop] pick-folder failed:", message);
    return json({ ok: false, error: message }, 500);
  }
}
