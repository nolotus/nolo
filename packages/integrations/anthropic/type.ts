import { array, literal, object, picklist, string, union } from "valibot";

// Claude 特定的类型定义
export type ClaudeContent = Array<
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    }
>;

// Valibot 定义
export const ClaudeMessageSchema = object({
  role: picklist(["system", "user", "assistant"]),
  content: union([
    string(),
    array(
      union([
        object({
          type: literal("text"),
          text: string(),
        }),
        object({
          type: literal("image"),
          source: object({
            type: literal("base64"),
            media_type: string(),
            data: string(),
          }),
        }),
      ]),
    ),
  ]),
});
