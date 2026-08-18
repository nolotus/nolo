type BuildPolicyEnv = {
  [key: string]: string | undefined;
  NOLO_WEB_PRECOMPRESS?: string;
  NOLO_WEB_MINIFY_ROUTE_STYLES?: string;
};

export type WebBuildPolicyInput = {
  timestamp: string;
  env?: BuildPolicyEnv;
};

export const shouldPrecompressWebAssets = ({ timestamp, env = process.env }: WebBuildPolicyInput): boolean =>
  timestamp !== "dev" && env.NOLO_WEB_PRECOMPRESS === "1";

export const getRouteStyleTransformOptions = ({ env = process.env }: { env?: BuildPolicyEnv } = {}) => ({
  loader: "css" as const,
  minify: env.NOLO_WEB_MINIFY_ROUTE_STYLES === "1",
  legalComments: "none" as const,
});
