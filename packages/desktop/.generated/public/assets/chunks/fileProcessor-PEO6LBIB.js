import {
  nanoid
} from "/public/assets/chunks/chunk-T73R6CXN.js";
import {
  createPageAndAddReference,
  toast,
  upload
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  GLOBAL_DIALOG_RUNTIME_KEY
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/web/fileProcessor.ts
var EXCEL_LIKE_EXTENSIONS = [
  ".xlsx",
  ".xls",
  ".csv",
  ".ods",
  ".xlsm",
  ".xlsb"
];
var PLAIN_TEXT_EXTENSIONS = [
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
  ".less"
];
var isExcelLikeFile = (fileName) => {
  const lower = fileName.toLowerCase();
  return EXCEL_LIKE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};
var isJsonFile = (file, fileNameLower) => {
  return fileNameLower.endsWith(".json") || file.type === "application/json" || file.type === "application/ld+json" || file.type === "application/jsonl";
};
var isPlainTextFile = (file, fileNameLower) => {
  if (fileNameLower.endsWith(".json")) return false;
  if (file.type && file.type.startsWith("text/")) return true;
  return PLAIN_TEXT_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
};
var getSheetToJsonOptions = () => ({
  raw: true,
  cellDates: true
});
var createCodeBlockSlate = (text, language) => {
  return [
    {
      type: "code-block",
      language,
      children: [{ text }]
    }
  ];
};
var createSlateFromJsonText = (text) => {
  let prettyJson = text;
  try {
    const parsed = JSON.parse(text);
    prettyJson = JSON.stringify(parsed, null, 2);
  } catch {
  }
  return createCodeBlockSlate(prettyJson, "json");
};
var guessCodeLanguageFromExtension = (fileNameLower) => {
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
  return void 0;
};
var isOcrConfigurationError = (error) => {
  const message = toErrorMessage(error);
  return message.includes("Server missing Google Document AI configuration");
};
var processDocumentFile = async ({
  file,
  fileId,
  dispatch,
  t,
  ocrModel,
  ocrRequest,
  dialogKey
}) => {
  const toastId = toast.loading(
    t("processingFile", "\u6B63\u5728\u5904\u7406 {{fileName}}...", { fileName: file.name })
  );
  try {
    const fileNameLower = file.name.toLowerCase();
    let fileProcessed = false;
    const currentLocale = t?.i18n?.language || typeof navigator !== "undefined" && navigator.language || "en-US";
    if (isExcelLikeFile(fileNameLower)) {
      fileProcessed = true;
      const XLSX = await import("/public/assets/chunks/xlsx-6GJQZJ62.js");
      const { createTable, addRow } = await import("/public/assets/chunks/tableSlice-SLYAARQB.js");
      const { addPendingFile } = await import("/public/assets/chunks/dialogSlice-5YLHPK2U.js");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error(t("excelNoSheets", "Excel \u6587\u4EF6\u4E2D\u6CA1\u6709\u627E\u5230\u5DE5\u4F5C\u8868\u3002"));
      }
      const workbookGroupId = nanoid();
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(
          worksheet,
          getSheetToJsonOptions()
        );
        if (!jsonData.length) continue;
        const tableTitle = `${file.name} (${sheetName})`;
        const firstRow = jsonData[0];
        const columns = Object.keys(firstRow).map((key) => ({
          name: key,
          label: key,
          type: "text"
        }));
        const dbKey = await dispatch(
          createTable({
            title: tableTitle,
            columns,
            withDefaultRows: false
          })
        ).unwrap();
        const parts = dbKey.split("-");
        const tableId = parts.slice(2).join("-");
        const tenantId = parts[1];
        await Promise.all(
          jsonData.map(
            (row) => dispatch(
              addRow({
                tenantId,
                tableId,
                values: row
              })
            ).unwrap()
          )
        );
        dispatch(
          addPendingFile({
            id: nanoid(),
            name: tableTitle,
            pageKey: dbKey,
            type: "table",
            groupId: workbookGroupId,
            trackingId: fileId,
            dialogKey: dialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY
          })
        );
      }
    } else {
      let slateData;
      let fileType;
      if (fileNameLower.endsWith(".docx")) {
        fileType = "docx";
        const { convertDocxToSlate } = await import("/public/assets/chunks/docxToSlate-NDBJ5DQ5.js");
        const uploadImage = async (blob, filename) => {
          const imageFile = new File([blob], filename, { type: blob.type });
          const result = await dispatch(upload({ file: imageFile })).unwrap();
          return result.id;
        };
        slateData = await convertDocxToSlate(file, uploadImage);
      } else if (fileNameLower.endsWith(".pdf")) {
        fileType = "pdf";
        const { convertPdfToSlate } = await import("/public/assets/chunks/pdfToSlate-URIRFHUP.js");
        if (ocrModel && ocrModel !== "none" && ocrRequest?.serverOrigin && ocrRequest?.accessToken) {
          const { processPdfWithOcr } = await import("/public/assets/chunks/pdfOcrProcessor-72WULUDN.js");
          try {
            slateData = await processPdfWithOcr(file, ocrModel, ocrRequest);
          } catch (error) {
            if (!isOcrConfigurationError(error)) throw error;
            slateData = await convertPdfToSlate(file);
          }
        } else {
          slateData = await convertPdfToSlate(file);
        }
      } else if (isJsonFile(file, fileNameLower)) {
        fileType = "json";
        const textContent = await file.text();
        slateData = createSlateFromJsonText(textContent);
      } else if (isPlainTextFile(file, fileNameLower)) {
        const textContent = await file.text();
        const codeLanguage = guessCodeLanguageFromExtension(fileNameLower);
        if (codeLanguage) {
          fileType = "txt";
          slateData = createCodeBlockSlate(textContent, codeLanguage);
        } else {
          fileType = "txt";
          const { convertTxtToSlate } = await import("/public/assets/chunks/txtToSlate-TALCQJUC.js");
          slateData = await convertTxtToSlate(textContent);
        }
      }
      if (fileType && slateData) {
        fileProcessed = true;
        await dispatch(
          createPageAndAddReference({
            slateData,
            title: file.name,
            type: fileType,
            fileId,
            size: file.size,
            dialogKey
          })
        ).unwrap();
      }
    }
    if (!fileProcessed) {
      throw new Error(t("unsupportedFileType", "\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B"));
    }
    toast.success(
      t("fileProcessedSuccess", "{{fileName}} \u5904\u7406\u6210\u529F!", {
        fileName: file.name
      }),
      { id: toastId }
    );
  } catch (err) {
    const msg = toErrorMessage(err) || t("fileProcessDefaultError", "\u5904\u7406\u6587\u4EF6\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF");
    toast.error(
      t("fileProcessedError", "\u5904\u7406 {{fileName}} \u65F6\u51FA\u9519: {{error}}", {
        fileName: file.name,
        error: msg
      }),
      { id: toastId }
    );
    throw new Error(msg);
  }
};
export {
  processDocumentFile
};
