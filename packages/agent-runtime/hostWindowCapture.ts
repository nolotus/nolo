import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { AgentRuntimeToolResult } from "./hostAdapter";
import { readLocalImage } from "./readImage";

export const HOST_CAPTURE_TIMEOUT_MS = 9_000;
const UNAVAILABLE = "当前环境无可用截屏权限/服务";

// One connection owns both Screenshot and Response subscription. Separate gdbus
// call/monitor processes cannot reliably own a portal Request (sender lifetime).
// No temporary script/image is written; portal-owned URI files are NOT deleted.
const PORTAL_SCRIPT = String.raw`
import json, signal
from gi.repository import Gio, GLib
bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
loop = GLib.MainLoop()
handle = None
finished = False
result = None
responses = {}
def response(conn, sender, path, interface, name, parameters, data):
    global result, finished
    responses[path] = parameters.unpack()
    if handle == path:
        result = responses[path]
        finished = True
        loop.quit()
def stop(*args):
    loop.quit()
    return False
subscription = bus.signal_subscribe('org.freedesktop.portal.Desktop', 'org.freedesktop.portal.Request', 'Response', None, None, Gio.DBusSignalFlags.NONE, response, None)
signal.signal(signal.SIGTERM, stop)
try:
    options = {'interactive': GLib.Variant('b', True), 'handle_token': GLib.Variant('s', 'nolo_capture')}
    handle = bus.call_sync('org.freedesktop.portal.Desktop', '/org/freedesktop/portal/desktop', 'org.freedesktop.portal.Screenshot', 'Screenshot', GLib.Variant('(sa{sv})', ('', options)), GLib.VariantType.new('(o)'), Gio.DBusCallFlags.NONE, 7000, None).unpack()[0]
    if handle in responses:
        result = responses[handle]
        finished = True
    else:
        GLib.timeout_add(8000, stop)
        loop.run()
    if result is None:
        print(json.dumps({'error': 'portal response timeout'}), flush=True)
    else:
        code, values = result
        print(json.dumps({'code': code, 'uri': values.get('uri')}), flush=True)
finally:
    if handle and not finished:
        try:
            bus.call_sync('org.freedesktop.portal.Desktop', handle, 'org.freedesktop.portal.Request', 'Close', None, None, Gio.DBusCallFlags.NONE, 200, None)
        except Exception:
            pass
    bus.signal_unsubscribe(subscription)
`;

export type PortalReply = { code?: number; uri?: string; error?: string };
export type PortalCapture = (signal: AbortSignal) => Promise<PortalReply>;

export const capturePortalScreenshot: PortalCapture = (signal) => new Promise((resolve, reject) => {
  const child = spawn("/usr/bin/python3", ["-c", PORTAL_SCRIPT], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  const stop = () => { child.kill("SIGTERM"); };
  signal.addEventListener("abort", stop, { once: true });
  if (signal.aborted) stop();
  child.stdout.on("data", (data) => { stdout = (stdout + data).slice(-16_384); });
  child.stderr.on("data", (data) => { stderr = (stderr + data).slice(-4096); });
  child.once("error", reject);
  child.once("close", (code) => {
    signal.removeEventListener("abort", stop);
    if (signal.aborted) return reject(new Error("portal capture timeout"));
    if (code !== 0) return reject(new Error(stderr.trim() || `portal helper exited ${code}`));
    try { resolve(JSON.parse(stdout)); } catch { reject(new Error("invalid portal response")); }
  });
});

/** Shared by all host toolsets; queue wait is included in the <=9s deadline. */
export function createHostWindowCapture(options: {
  portal?: PortalCapture;
  readImage?: typeof readLocalImage;
  concurrency?: number;
  timeoutMs?: number;
} = {}) {
  const concurrency = Math.max(1, Math.min(2, Math.floor(options.concurrency || 1)));
  const timeoutMs = Math.max(1, Math.min(HOST_CAPTURE_TIMEOUT_MS, options.timeoutMs || HOST_CAPTURE_TIMEOUT_MS));
  let active = 0;
  const waiters: (() => void)[] = [];
  function acquire(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const abort = () => {
        const index = waiters.indexOf(start);
        if (index >= 0) waiters.splice(index, 1);
        reject(new Error("portal capture timeout (queue)"));
      };
      const start = () => {
        signal.removeEventListener("abort", abort);
        active++;
        resolve();
      };
      if (signal.aborted) return abort();
      if (active < concurrency) start();
      else { waiters.push(start); signal.addEventListener("abort", abort, { once: true }); }
    });
  }
  return async (): Promise<AgentRuntimeToolResult> => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const work = async (): Promise<AgentRuntimeToolResult> => {
      await acquire(controller.signal);
      try {
        const reply = await (options.portal ?? capturePortalScreenshot)(controller.signal);
        if (controller.signal.aborted) throw new Error("portal capture timeout");
        if (reply.error) throw new Error(reply.error);
        if (reply.code !== 0) throw new Error(reply.code === 1 ? "portal denied/cancelled (Response 1)" : `portal failed (Response ${reply.code})`);
        if (!reply.uri) throw new Error("portal returned no file URI");
        const uri = new URL(reply.uri);
        if (uri.protocol !== "file:" || (uri.hostname && uri.hostname !== "localhost")) throw new Error("portal returned a non-local file URI");
        const path = fileURLToPath(uri);
        const image = await (options.readImage ?? readLocalImage)(path);
        if (!image.images?.length) throw new Error("portal image could not be decoded");
        const dimensions = /\[image (\d+x\d+) (\d+) bytes/.exec(image.content);
        if (!dimensions) throw new Error("invalid image summary");
        return {
          ...image,
          content: `[screenshot ${dimensions[1]} ${Math.round(Number(dimensions[2]) / 1024)}KB → ${path}]\n来源：宿主 portal 全屏/交互选择结果；portal 未提供应用/窗口身份，无法确认窗口名。`,
        };
      } finally {
        active--;
        waiters.shift()?.();
      }
    };
    try {
      return await Promise.race([
        work(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error("portal capture timeout")); }, timeoutMs);
        }),
      ]);
    } catch (error) {
      return { content: `${UNAVAILABLE}：${error instanceof Error ? error.message : String(error)}` };
    } finally {
      clearTimeout(timer!);
    }
  };
}

export const captureHostWindow = createHostWindowCapture();
