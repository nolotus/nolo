export type AppDeployFramework = "worker" | "react-spa" | "nolo-react";

export type AppSourceFileLike = {
  name?: string | null;
  code?: string | null;
};

const REACT_IMPORT_RE =
  /from\s+["']react["']|from\s+["']react-dom\/client["']|react-icons\/lu|createRoot\s*\(/;

const JSX_COMPONENT_RE =
  /(?:return|=>)\s*\(?\s*<\s*[A-Za-z][A-Za-z0-9]*/;

const REACT_FILE_RE = /\.(tsx|jsx)$/i;

export function sourceLooksLikeReactModule(code?: string | null): boolean {
  if (typeof code !== "string" || !code.trim()) return false;
  return REACT_IMPORT_RE.test(code) || JSX_COMPONENT_RE.test(code);
}

export function filesLookLikeReactApp(
  files?: AppSourceFileLike[] | null
): boolean {
  if (!Array.isArray(files) || files.length === 0) return false;
  return files.some(
    (file) =>
      (typeof file?.name === "string" && REACT_FILE_RE.test(file.name)) ||
      sourceLooksLikeReactModule(file?.code)
  );
}

export function inferAppDeployFramework(params: {
  framework?: string | null;
  code?: string | null;
  files?: AppSourceFileLike[] | null;
}): AppDeployFramework | undefined {
  if (params.framework === "worker" || params.framework === "react-spa" || params.framework === "nolo-react") {
    return params.framework;
  }

  if (Array.isArray(params.files) && params.files.length > 0) {
    return filesLookLikeReactApp(params.files) ? "react-spa" : "worker";
  }

  if (typeof params.code === "string" && params.code.trim()) {
    return sourceLooksLikeReactModule(params.code) ? "react-spa" : "worker";
  }

  return undefined;
}
