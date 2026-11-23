import { API_ENDPOINTS } from "database/config";

/**
 * 课程音视频播放地址。服务端路由为 `${API_ENDPOINTS.DATABASE}/file/content/:id`，
 * `:id` 可为裸 fileId（经 fileId 索引解析）或 `file-<userId>-<id>` dbKey。
 * 返回未签名引用；课程播放器渲染时再解析公开或签名后的播放地址。
 */
export const buildLectureMediaUrl = (fileId: string): string =>
  `${API_ENDPOINTS.DATABASE}/file/content/${encodeURIComponent(fileId.trim())}`;
