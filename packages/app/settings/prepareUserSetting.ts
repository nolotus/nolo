import { SETTINGS_RECORD_SCHEMA_VERSION } from "./settingsRecord";

export function prepareUserSettings(locale: string) {
  return {
    schemaVersion: SETTINGS_RECORD_SCHEMA_VERSION,
    theme: "system",
    language: locale,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
