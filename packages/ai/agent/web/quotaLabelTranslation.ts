/** Keep quota formatting pure while allowing callers to supply their active i18n instance. */
export type QuotaLabelTranslator = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>,
) => string;

export const defaultQuotaLabelTranslator: QuotaLabelTranslator = (_key, fallback, values) =>
  fallback.replace(/{{(\w+)}}/g, (placeholder, name: string) => String(values?.[name] ?? placeholder));
