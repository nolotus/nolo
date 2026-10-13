import { API_ENDPOINTS } from "database/config";

/**
 * 课程音视频播放地址。服务端路由为 `${API_ENDPOINTS.DATABASE}/file/content/:id`，
 * `:id` 可为裸 fileId（经 fileId 索引解析）或 `file-<userId>-<id>` dbKey。
 * handler（handleGetFileContent）本身不校验身份，<audio src> 无需 Authorization 头。
 */
export const buildLectureMediaUrl = (fileId: string): string =>
  `${API_ENDPOINTS.DATABASE}/file/content/${encodeURIComponent(fileId.trim())}`;
