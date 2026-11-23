/** Shared model policy; callers decide whether they are on a supported wire. */
export function isGpt62DeveloperPrefixModel(model: string): boolean {
  return /^gpt-6\.2-(astra|sol)$/.test(model);
}
