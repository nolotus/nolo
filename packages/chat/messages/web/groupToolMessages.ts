// 把消息列表中连续的 role === "tool" 消息折叠成 group，供只读/分享页使用
export type GroupedVisibleMessage =
  | { type: "message"; message: any }
  | { type: "tool-group"; messages: any[]; key: string };

export function groupConsecutiveToolMessages(
  messages: any[]
): GroupedVisibleMessage[] {
  const result: GroupedVisibleMessage[] = [];
  let buffer: any[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1) {
      result.push({ type: "message", message: buffer[0] });
    } else {
      const key = buffer
        .map((m) => m.id ?? m.dbKey ?? m.tool_call_id ?? "")
        .join("-");
      result.push({ type: "tool-group", messages: buffer, key });
    }
    buffer = [];
  };

  for (const msg of messages) {
    if (msg && msg.role === "tool") {
      buffer.push(msg);
    } else {
      flush();
      result.push({ type: "message", message: msg });
    }
  }
  flush();
  return result;
}
