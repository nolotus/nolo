export type EsbuildProcessMemory = {
  pid: number;
  path: string;
  workingSetMb: number;
};

export type EsbuildRecycleDecision = EsbuildProcessMemory & {
  maxWorkingSetMb: number;
};

const normalizePath = (path: string) => path.replace(/\\/g, "/").toLowerCase();

export function parseWindowsEsbuildProcessJson(raw: string): EsbuildProcessMemory[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .map((row): EsbuildProcessMemory | null => {
      if (!row || typeof row !== "object") return null;
      const typed = row as Record<string, unknown>;
      const pid = Number(typed.Id);
      const path = typeof typed.Path === "string" ? typed.Path : "";
      const workingSetMb = Number(typed.WorkingSetMB);
      if (!Number.isInteger(pid) || pid <= 0) return null;
      if (!path) return null;
      if (!Number.isFinite(workingSetMb) || workingSetMb < 0) return null;
      return { pid, path, workingSetMb };
    })
    .filter(Boolean) as EsbuildProcessMemory[];
}

export function shouldRecycleEsbuildService(input: {
  repoRoot: string;
  processes: EsbuildProcessMemory[];
  maxWorkingSetMb: number;
  nowMs: number;
  lastRecycleAtMs: number;
  cooldownMs: number;
}): EsbuildRecycleDecision | null {
  const cooldownRemaining =
    input.lastRecycleAtMs > 0 &&
    input.nowMs - input.lastRecycleAtMs < input.cooldownMs;
  if (cooldownRemaining) return null;

  const repoRoot = normalizePath(input.repoRoot).replace(/\/$/, "");
  const repoEsbuildRoot = `${repoRoot}/node_modules/@esbuild/`;
  const candidate = input.processes
    .filter((process) => normalizePath(process.path).startsWith(repoEsbuildRoot))
    .sort((a, b) => b.workingSetMb - a.workingSetMb)[0];

  if (!candidate || candidate.workingSetMb < input.maxWorkingSetMb) return null;
  return { ...candidate, maxWorkingSetMb: input.maxWorkingSetMb };
}

export async function collectRepoEsbuildProcessMemory(
  repoRoot = process.cwd()
): Promise<EsbuildProcessMemory[]> {
  if (process.platform !== "win32") return [];

  const proc = Bun.spawn(
    [
      "powershell",
      "-NoProfile",
      "-Command",
      "$ErrorActionPreference='SilentlyContinue'; Get-Process -Name esbuild -ErrorAction SilentlyContinue | Select-Object Id,Path,@{Name='WorkingSetMB';Expression={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json -Compress",
    ],
    {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "ignore",
    }
  );

  const output = await new Response(proc.stdout).text();
  await proc.exited.catch(() => undefined);
  return parseWindowsEsbuildProcessJson(output);
}
