import { ToolDefinition } from ".";
import { callToolApi } from "./toolApiClient";

export const deepseekOcrSchema = {
    name: "deepseek_ocr",
    description: "使用 deepseek-ai/DeepSeek-OCR 模型进行光学字符识别 (OCR)。擅长中英文混合文档、手写体及复杂版式的精准识别。",
    parameters: {
        type: "object",
        properties: {
            imageUrl: {
                type: "string",
                description: "要进行 OCR 的图片 URL、base64 编码的图片数据，或者内部文件 ID (如 'file-...')。",
            },
            prompt: {
                type: "string",
                description: "可选的提示词，用于指导模型如何提取信息（例如：'提取所有表格数据' 或 '识别图片中的所有文字'）。默认为 '识别图片中的所有文字'。",
                default: "识别图片中的所有文字"
            }
        },
        required: ["imageUrl"],
    },
};

export const deepseekOcrFunc: ToolDefinition["executor"] = async (input: any, thunkApi) => {
    const { imageUrl, prompt = "识别图片中的所有文字" } = input;

    const data = await callToolApi(thunkApi, "/api/deepseek-ocr", { imageUrl, prompt }, { withAuth: true });

    return {
        summary: "OCR processing completed",
        text: data.choices?.[0]?.message?.content || "No text detected",
        rawData: data
    };
};
