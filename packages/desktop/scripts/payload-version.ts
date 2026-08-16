import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PayloadVersionInfo = {
  version?: string;
  channel?: string;
  identifier?: string;
  name?: string;
};

export const readPayloadVersionInfo = (payloadDir: string): PayloadVersionInfo => {
  const versionJsonPath = join(payloadDir, "Resources", "version.json");
  if (!existsSync(versionJsonPath)) {
    return { version: "0.1.0" };
  }

  try {
    return JSON.parse(readFileSync(versionJsonPath, "utf8")) as PayloadVersionInfo;
  } catch {
    return { version: "0.1.0" };
  }
};
