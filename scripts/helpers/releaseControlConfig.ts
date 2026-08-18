import { generateKeyPairFromSeed, generateUserIdV1 } from "../testHelpers/authHelper";

export const RELEASE_CONTROL_SEED =
  process.env.AGENT_SEED ?? "nolo-release-control-account-v1";
export const RELEASE_CONTROL_USERNAME =
  process.env.AGENT_USER ?? "nolo-release-control";
export const RELEASE_CONTROL_LOCALE =
  process.env.AGENT_LOCALE ?? "zh-CN";

export const RELEASE_CONTROL_SPACE_ID = "01MAINRELCTRL0000000000000";
export const RELEASE_CONTROL_SPACE_NAME = "Main Release Control";

export const RELEASE_CONTROL_CONTENT_IDS = {
  overviewPageId: "01RELCTLPGOVERVIEW000000000",
  sopPageId: "01RELCTLPGSOP00000000000000",
  runsTableId: "01RELCTLTBLRUNS00000000000",
  artifactsTableId: "01RELCTLTBLARTS00000000000",
  releasesTableId: "01RELCTLTBLRELS00000000000",
} as const;

export function resolveReleaseControlOwner() {
  const { publicKey } = generateKeyPairFromSeed(RELEASE_CONTROL_SEED);
  const userId = generateUserIdV1(
    publicKey,
    RELEASE_CONTROL_USERNAME,
    RELEASE_CONTROL_LOCALE
  );
  return {
    userId,
    username: RELEASE_CONTROL_USERNAME,
    locale: RELEASE_CONTROL_LOCALE,
  };
}
