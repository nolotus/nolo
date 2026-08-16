/**
 * Display-only compaction of an absolute workspace path: folds the user's home
 * directory prefix to `~`. The cwd passed to the agent runtime stays the full
 * absolute path; this helper only shapes the label shown in the Desktop UI.
 *
 * Thin wrapper over the shared `core/foldHomePath` so the Desktop webview and
 * the CLI use one implementation. The webview has no Node `os` APIs, so no
 * `home` argument is passed here — `foldHomePath` falls back to its Unix
 * home-layout regex, which covers the macOS/Linux dev and desktop targets.
 */
export { foldHomePath as compactWorkspacePath } from "core/foldHomePath";