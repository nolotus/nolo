/** A user's saved HTML workbench artifact, distinct from runtime preview URLs. */
export interface HtmlArtifact {
  id: string;
  title: string;
  html: string;
  dialogKey: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_HTML_ARTIFACT_TITLE = "网页成品";
