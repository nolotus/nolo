const actions = new Map([
  ["click", "Click a control"],
  ["type", "Enter text"],
  ["press", "Press a key"],
  ["set_select_value", "Select an option"],
  ["file_upload", "Attach files"],
  ["eval_script", "Run a script"],
]);

export function describeBrowserApproval(action: string, target?: string) {
  const isScript = action === "eval_script";
  const label = actions.get(action);
  return {
    action: label ? `${label} (${action})` : "Unknown browser action",
    target: isScript ? "Script in the target tab" : target || "Unknown control",
    impact: isScript
      ? "May read or modify the page and cause changes outside the page."
      : "May modify the page or cause changes outside the page.",
    detailLabel: isScript ? "Script preview" : "Details",
  };
}
