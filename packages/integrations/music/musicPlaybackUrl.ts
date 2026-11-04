/**
 * 播放地址构造的唯一真值。
 *
 * 为什么要单独一个文件：播放 URL 的拼接曾经散在 `musicStore` 里（本地走
 * `/api/desktop/music/file?refId=`、在线走 `/api/desktop/music/audio?songId=`）。
 * 一旦接第二个在线源（Spotify 的 SDK 形态），这些字符串会变成第二份真值——
 * 谁都记得改一处、忘了另一处。这里按「播放目标形态」收敛成两个函数，
 * store / adapter / 将来的 SDK 引擎都从这里取。
 *
 * 注意：这里只拼**本机路由**，不拼远端 CDN 地址（远端地址由各源自己解析，
 * 且带时效，不允许被持久化或缓存）。
 */

/**
 * 本地文件的播放路由（主进程按 refId 查索引、做白名单校验后流式返回）。
 *
 * `projectId` 是**必填语义**（后端缺它会 400）：本地库按项目隔离，播放也必须带项目，
 * 否则会落到"没有项目上下文"的请求上。这里参数保持可选只是为了不把类型变复杂，
 * 但调用方（musicStore）必须在本地曲目上带上它。
 */
export function buildLocalFilePlaybackUrl(
  refId: string,
  projectId: string,
): string {
  const base = `/api/desktop/music/file?refId=${encodeURIComponent(refId)}`;
  return `${base}&projectId=${encodeURIComponent(projectId)}`;
}

/** 在线源（当前为网易云）的音频代理路由（主进程负责取地址、转发、可选缓存）。 */
export function buildOnlineAudioPlaybackUrl(songId: string | number): string {
  return `/api/desktop/music/audio?songId=${encodeURIComponent(String(songId))}`;
}
