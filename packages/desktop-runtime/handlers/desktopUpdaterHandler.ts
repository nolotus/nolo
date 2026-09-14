import { toErrorMessage } from "core/errorMessage";
import {
  clearDesktopUpdateShutdownStatus,
  readDesktopUpdateShutdownStatus,
} from "core/desktop/desktopUpdateShutdownStatus";
import {
  createDesktopUpdaterCoordinator,
  type DesktopUpdaterAction,
} from "./desktopUpdaterCoordinator";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

const isDesktopMode = () => process.env.NOLO_DESKTOP === "1";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

const notDesktopResponse = () =>
  json({ error: "Desktop updater is only available inside Nolo Desktop." }, 404);

const loadDesktopRuntime = async () => import("electrobun/bun");

// 主进程（index.ts）在启动 server 前注入 NOLO_DESKTOP_CHANNEL_DIR；server 侧
// 用同一 channel dir 读写持久化的「更新退出交接失败」状态。未设置（如测试/
// 非 desktop 环境）时不挂载，行为与之前一致。
const resolveShutdownStatusChannelDir = () =>
  process.env.NOLO_DESKTOP_CHANNEL_DIR?.trim() || null;

const shutdownStatusChannelDir = resolveShutdownStatusChannelDir();

const desktopUpdaterCoordinator = createDesktopUpdaterCoordinator({
  loadDesktopRuntime,
  ...(shutdownStatusChannelDir
    ? {
        readShutdownStatusEntry: () =>
          readDesktopUpdateShutdownStatus(shutdownStatusChannelDir),
        clearShutdownStatusEntry: () =>
          clearDesktopUpdateShutdownStatus(shutdownStatusChannelDir),
      }
    : {}),
});

function isDesktopUpdaterAction(value: unknown): value is DesktopUpdaterAction {
  return value === "check" || value === "download" || value === "apply";
}

export const handleDesktopUpdaterGet = async () => {
  if (!isDesktopMode()) return notDesktopResponse();

  try {
    return json(await desktopUpdaterCoordinator.getSnapshot());
  } catch (error) {
    return json(
      { error: toErrorMessage(error) },
      500,
    );
  }
};

export const handleDesktopUpdaterPost = async (req: Request) => {
  if (!isDesktopMode()) return notDesktopResponse();

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!isDesktopUpdaterAction(body.action)) {
    return json({ error: "Unsupported action" }, 400);
  }

  const result = await desktopUpdaterCoordinator.runAction(body.action);
  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }
  return json(result.snapshot, result.status);
};
