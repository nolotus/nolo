export function parseListeningPortOutput(output: string, port: number): boolean {
  const portPattern = new RegExp(`(?:\\*|127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[?::1\\]?):${port}\\s+\\(LISTEN\\)`);
  return output
    .split(/\r?\n/)
    .some((line) => line.includes("(LISTEN)") && portPattern.test(line));
}

export function parseWindowsNetstatOutput(output: string, pid: number, port: number): boolean {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => {
      if (!line.startsWith("TCP")) return false;
      const parts = line.split(/\s+/);
      const [protocol, localAddress, , state, rawPid] = parts;
      if (protocol !== "TCP" || state !== "LISTENING" || rawPid !== String(pid)) {
        return false;
      }
      return localAddress.endsWith(`:${port}`);
    });
}

async function isPidListeningOnPortWithLsof(pid: number, port: number): Promise<boolean> {
  const proc = Bun.spawn(["lsof", "-Pan", "-p", String(pid), `-iTCP:${port}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  return exitCode === 0 && parseListeningPortOutput(stdout, port);
}

async function isPidListeningOnPortWithNetstat(pid: number, port: number): Promise<boolean> {
  const proc = Bun.spawn(["netstat", "-ano", "-p", "tcp"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  return exitCode === 0 && parseWindowsNetstatOutput(stdout, pid, port);
}

export async function isPidListeningOnPort(pid: number, port: number): Promise<boolean> {
  if (process.platform === "win32") {
    return isPidListeningOnPortWithNetstat(pid, port);
  }
  return isPidListeningOnPortWithLsof(pid, port);
}
