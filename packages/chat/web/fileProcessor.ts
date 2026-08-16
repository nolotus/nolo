// src/features/chat/web/fileProcessor.ts

import { nanoid } from "nanoid";
import { Descendant } from "slate";
import { toast } from "app/utils/toast"
import { TFunction } from "i18next";
import { toErrorMessage } from "core/errorMessage";

import {
  createPageAndAddReference,
  GLOBAL_DIALOG_RUNTIME_KEY,
} from "../dialog/dialogSlice";
import { AppDispatch } from "app/store";
import { upload } from "database/dbSlice";

// ========= 常量 & 类型 =========

/**
 * 认为是“表格类文件”的扩展名集合
 */
const EXCEL_LIKE_EXTENSIONS = [
  ".xlsx",
  ".xls",
  ".csv",
  ".ods",
  ".xlsm",
  ".xlsb",
] as const;

/**
 * 认为是“纯文本类文件”的扩展名集合
 * - 这些文件不需要复杂结构解析，只需要按纯文本展示即可
 * - JSON 单独处理（见下方 isJsonFile），这里不要包含 .json
 */
const PLAIN_TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".mdx",
  ".log",
  ".ini",
  ".cfg",
  ".yaml",
  ".yml",
  ".env",
  ".toml",
  ".xml",
  ".html",
  ".htm",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".less",
] as const;

interface ProcessDocumentFileArgs {
  file: File;
  /**
   * 由调用方生成，用于跟踪整个文件操作；
   * Excel 多 sheet 的情况会为每个 sheet 单独生成 sheetFileId。
   */
  fileId: string;
  dispatch: AppDispatch;
  t: TFunction<"chat", undefined>;
  /** PDF OCR 模型，"none" 或未传 时使用 pdf.js 提取文字 */
  ocrModel?: string;
  /** OCR 接口上下文，避免零散透传 server/token */
  ocrRequest?: {
    serverOrigin?: string;
    accessToken?: string;
    dialogId?: string;
  };
  dialogKey?: string;
}

// ========= 工具函数 =========

/**
 * 是否为表格类文件（Excel / CSV / ODS 等）。
 */
const isExcelLikeFile = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return EXCEL_LIKE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

/**
 * 是否为 JSON 文件
 * - 通过扩展名 .json 或 常见 JSON MIME 判断
 */
const isJsonFile = (file: File, fileNameLower: string): boolean => {
  return (
    fileNameLower.endsWith(".json") ||
    file.type === "application/json" ||
    file.type === "application/ld+json" ||
    file.type === "application/jsonl"
  );
};

/**
 * 是否为“纯文本类文件”
 *
 * 注意：
 * - 这里不包含 JSON，JSON 有单独的处理逻辑
 * - 只要是 text/* 都认为可以按纯文本展示
 */
const isPlainTextFile = (file: File, fileNameLower: string): boolean => {
  // JSON 单独处理
  if (fileNameLower.endsWith(".json")) return false;

  if (file.type && file.type.startsWith("text/")) return true;

  return PLAIN_TEXT_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
};

/**
 * Excel -> JSON 的通用配置：
 * - raw: true     保留原始值（日期用 Date 或数字表示），不做字符串格式化
 * - cellDates: true  尽量把日期单元格解析成 JS Date 对象
 *
 * 具体的「显示格式」在 convertExcelToSlate 里处理（其中 displayData 会带有 Excel 的显示文本）。
 */
const getSheetToJsonOptions = () => ({
  raw: true,
  cellDates: true,
});

/**
 * 生成一个 code-block 类型的 Slate 节点内容。
 *
 * 如果你的 schema 不同（比如 type: "code" 或 data.language），
 * 在这里统一改结构即可。
 */
const createCodeBlockSlate = (
  text: string,
  language?: string
): Descendant[] => {
  return [
    {
      type: "code-block",
      language,
      children: [{ text }],
    } as any,
  ];
};

/**
 * JSON 文本 -> Slate 数据（code-block + pretty print）
 * - 若解析成功，则以缩进 2 的格式美化 JSON 字符串
 * - 若解析失败，则原样作为纯文本展示，不抛异常
 */
const createSlateFromJsonText = (text: string): Descendant[] => {
  let prettyJson = text;

  try {
    const parsed = JSON.parse(text);
    prettyJson = JSON.stringify(parsed, null, 2);
  } catch {
    // 忽略解析错误，按原始文本展示
  }

  return createCodeBlockSlate(prettyJson, "json");
};

/**
 * 根据扩展名猜测适合的代码高亮语言。
 * 这里只处理“配置 / 数据 / 日志 / 代码”这些适合用 code-block 展示的类型。
 *
 * 说明：
 * - txt / md / mdx 仍然当自然语言文本处理，不在这里返回 language。
 * - JSON 已在 isJsonFile 分支中单独处理，不在这里判断 .json。
 */
const guessCodeLanguageFromExtension = (
  fileNameLower: string
): string | undefined => {
  if (fileNameLower.endsWith(".yaml") || fileNameLower.endsWith(".yml")) {
    return "yaml";
  }
  if (fileNameLower.endsWith(".ini") || fileNameLower.endsWith(".cfg")) {
    return "ini";
  }
  if (fileNameLower.endsWith(".log")) {
    return "log";
  }
  if (fileNameLower.endsWith(".env")) {
    // 大部分高亮库没有专门的 dotenv 语言，可以按 shell/ini 处理
    return "bash";
  }
  if (fileNameLower.endsWith(".toml")) {
    return "toml";
  }
  if (fileNameLower.endsWith(".xml")) {
    return "xml";
  }
  if (fileNameLower.endsWith(".html") || fileNameLower.endsWith(".htm")) {
    return "html";
  }
  if (fileNameLower.endsWith(".js") || fileNameLower.endsWith(".jsx")) {
    return "javascript";
  }
  if (fileNameLower.endsWith(".ts") || fileNameLower.endsWith(".tsx")) {
    return "typescript";
  }
  if (fileNameLower.endsWith(".css")) {
    return "css";
  }
  if (fileNameLower.endsWith(".scss") || fileNameLower.endsWith(".sass")) {
    return "scss";
  }
  if (fileNameLower.endsWith(".less")) {
    return "less";
  }

  return undefined;
};

const isOcrConfigurationError = (error: unknown): boolean => {
  const message = toErrorMessage(error);
  return message.includes("Server missing Google Document AI configuration");
};

// ========= 主函数 =========

/**
 * 处理单个文档文件：
 *
 * - Excel / CSV / ODS 等多工作表文件：
 *   为每个工作表创建一个页面引用，并为它们附加一个共享的 groupId。
 * - 其他单文件类型（DOCX / PDF / TXT / JSON / 其他纯文本）：
 *   解析后直接生成一个页面引用。
 *
 * 内部使用动态 import，对不同类型文件按需加载各自解析库。
 * 若文件类型不受支持或解析失败会抛出错误。
 */
export const processDocumentFile = async ({
  file,
  fileId,
  dispatch,
  t,
  ocrModel,
  ocrRequest,
  dialogKey,
}: ProcessDocumentFileArgs): Promise<void> => {
  const toastId = toast.loading(
    t("processingFile", "正在处理 {{fileName}}...", { fileName: file.name })
  );

  try {
    const fileNameLower = file.name.toLowerCase();
    let fileProcessed = false;

    // 当前语言，用于日期本地化（优先 i18next，其次浏览器语言，最后 en-US）
    const currentLocale =
      (t as any)?.i18n?.language ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en-US";

    // ========= 1. Excel / CSV / ODS 等表格类文件 =========
    if (isExcelLikeFile(fileNameLower)) {
      fileProcessed = true;

      // 按需加载 xlsx & table actions
      const XLSX = await import("xlsx");
      const { createTable, addRow } = await import("render/table/tableSlice");
      const { addPendingFile } = await import("../dialog/dialogSlice");

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error(t("excelNoSheets", "Excel 文件中没有找到工作表。"));
      }

      // 一个工作簿共享一个 groupId
      const workbookGroupId = nanoid();

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(
          worksheet,
          getSheetToJsonOptions()
        );

        if (!jsonData.length) continue;

        const tableTitle = `${file.name} (${sheetName})`;

        // 1. 动态生成列定义
        const firstRow = jsonData[0];
        const columns = Object.keys(firstRow).map((key) => ({
          name: key,
          label: key,
          type: "text" as const,
        }));

        // 2. 创建真正的内置表格
        const dbKey = await dispatch(
          createTable({
            title: tableTitle,
            columns,
            withDefaultRows: false,
          }) as any
        ).unwrap();

        const parts = dbKey.split("-");
        const tableId = parts.slice(2).join("-");
        const tenantId = parts[1]; // meta-tenantId-tableId

        // 3. 注入数据行
        // 注意：这里由于行数可能较多，我们并行处理以提高效率，但生产环境建议分批或后台处理
        await Promise.all(
          jsonData.map((row) =>
            dispatch(
              addRow({
                tenantId,
                tableId,
                values: row,
              }) as any
            ).unwrap()
          )
        );

        // 4. 将该表格引用加入对话（直接作为 table 类型）
        dispatch(
          addPendingFile({
            id: nanoid(),
            name: tableTitle,
            pageKey: dbKey,
            type: "table",
            groupId: workbookGroupId,
            trackingId: fileId,
            dialogKey: dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY,
          })
        );
      }
    }

    // ========= 2. 其他单文件类型：DOCX / PDF / TXT / JSON / 其他纯文本 =========
    else {
      let slateData: Descendant[] | undefined;
      // 目前明确区分 docx / pdf / txt / json，其他纯文本统一归为 txt
      let fileType: "docx" | "pdf" | "txt" | "json" | undefined;

      // DOCX
      if (fileNameLower.endsWith(".docx")) {
        fileType = "docx";

        const { convertDocxToSlate } = await import("./docxToSlate");

        // 将 docx 内嵌图片上传到服务器，避免 base64 膨胀消息体
        const uploadImage = async (blob: Blob, filename: string): Promise<string> => {
          const imageFile = new File([blob], filename, { type: blob.type });
          const result = await dispatch(upload({ file: imageFile }) as any).unwrap();
          return result.id as string;
        };

        slateData = await convertDocxToSlate(file, uploadImage);
      }
      // PDF
      else if (fileNameLower.endsWith(".pdf")) {
        fileType = "pdf";
        const { convertPdfToSlate } = await import(
          "create/editor/utils/pdfToSlate"
        );

        if (
          ocrModel &&
          ocrModel !== "none" &&
          ocrRequest?.serverOrigin &&
          ocrRequest?.accessToken
        ) {
          // 使用 OCR 模型识别 PDF 页面（适合扫描件等无文字层文档）
          const { processPdfWithOcr } = await import("./pdfOcrProcessor");
          try {
            slateData = await processPdfWithOcr(file, ocrModel, ocrRequest);
          } catch (error) {
            if (!isOcrConfigurationError(error)) throw error;
            slateData = await convertPdfToSlate(file);
          }
        } else {
          slateData = await convertPdfToSlate(file);
        }
      }
      // JSON（通过扩展名或 MIME 类型识别，按“格式化 code-block”展示）
      else if (isJsonFile(file, fileNameLower)) {
        fileType = "json";

        const textContent = await file.text();
        slateData = createSlateFromJsonText(textContent);
      }
      // 纯文本类文件（txt / md / log / yaml / ini / cfg / env / toml / js / ts / css 等）
      else if (isPlainTextFile(file, fileNameLower)) {
        const textContent = await file.text();
        const codeLanguage = guessCodeLanguageFromExtension(fileNameLower);

        // 更偏“配置 / 日志 / 代码 / 数据”的扩展名：用 code-block 高亮展示
        if (codeLanguage) {
          fileType = "txt"; // 业务上仍然归为 txt，展示层通过 code-block + language 区分
          slateData = createCodeBlockSlate(textContent, codeLanguage);
        }
        // 更偏“自然语言”的 txt / md / mdx：按普通文本处理
        else {
          fileType = "txt";

          const { convertTxtToSlate } = await import(
            "create/editor/utils/txtToSlate"
          );
          slateData = await convertTxtToSlate(textContent);
        }
      }

      if (fileType && slateData) {
        fileProcessed = true;

        await dispatch(
          createPageAndAddReference({
            slateData,
            title: file.name,
            type: fileType as any,
            fileId,
            size: file.size,
            dialogKey,
          })
        ).unwrap();
      }
    }

    // ========= 3. 文件类型不支持 =========
    if (!fileProcessed) {
      throw new Error(t("unsupportedFileType", "不支持的文件类型"));
    }

    toast.success(
      t("fileProcessedSuccess", "{{fileName}} 处理成功!", {
        fileName: file.name,
      }),
      { id: toastId }
    );
  } catch (err) {
    const msg =
      toErrorMessage(err) ||
      t("fileProcessDefaultError", "处理文件时发生未知错误");

    toast.error(
      t("fileProcessedError", "处理 {{fileName}} 时出错: {{error}}", {
        fileName: file.name,
        error: msg,
      }),
      { id: toastId }
    );

    // 重新抛出错误，以便调用方可以更新其状态（例如 fileErrors）
    throw new Error(msg);
  }
};
