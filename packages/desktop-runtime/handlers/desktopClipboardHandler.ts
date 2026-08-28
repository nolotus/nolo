import { toErrorMessage } from "core/errorMessage";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

type HandlerDeps = {
  env?: Record<string, string | undefined>;
  writeClipboard?: (text: string) => Promise<void>;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

async function writeProcessInput(proc: any, input: string) {
  const stdin = proc.stdin;
  if (!stdin) return;
  const encoded = new TextEncoder().encode(input);
  if (typeof stdin.getWriter === "function") {
    const writer = stdin.getWriter();
    try {
      await writer.write(encoded);
      await writer.close();
    } finally {
      writer.releaseLock();
    }
    return;
  }
  if (typeof stdin.write === "function") {
    await stdin.write(encoded);
    await stdin.end?.();
  }
}

const runClipboardCommand = async (command: string[], text: string) => {
  const proc = Bun.spawn(command, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  await writeProcessInput(proc, text);
  const [stderr, exitCode] = await Promise.all([
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `Clipboard command failed: ${command[0]}`);
  }
};

export const writeNativeClipboard = async (text: string) => {
  if (process.platform === "darwin") {
    await runClipboardCommand(["pbcopy"], text);
    return;
  }
  if (process.platform === "win32") {
    await runClipboardCommand(["clip.exe"], text);
    return;
  }
  const wlCopy = Bun.which("wl-copy");
  if (wlCopy) {
    await runClipboardCommand([wlCopy], text);
    return;
  }
  const xclip = Bun.which("xclip");
  if (xclip) {
    await runClipboardCommand([xclip, "-selection", "clipboard"], text);
    return;
  }
  throw new Error("No native clipboard command is available.");
};

export async function handleDesktopClipboardPost(
  req: Request,
  deps: HandlerDeps = {},
) {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return json({ error: "Desktop clipboard is only available inside Nolo Desktop." }, 404);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = typeof body?.text === "string" ? body.text : "";
  if (!text) {
    return json({ error: "text_required" }, 400);
  }

  try {
    await (deps.writeClipboard ?? writeNativeClipboard)(text);
    return json({ ok: true });
  } catch (error) {
    return json(
      { ok: false, error: toErrorMessage(error) },
      500,
    );
  }
}
