export type CliBinaryChannel = "alpha" | "main";

export type CliBinaryUpload = {
  sourceName: string;
  targetName: string;
  contentType: string;
  kind: "version" | "fixed";
};

export function createCliBinaryPublishPlan(
  channelValue: string | undefined,
  version: string,
): { channel: CliBinaryChannel; uploads: CliBinaryUpload[] } {
  const channel = channelValue ?? "alpha";
  if (channel !== "alpha" && channel !== "main") {
    throw new Error(`Invalid NOLO_CLI_BINARY_CHANNEL: ${channel}`);
  }
  if (typeof version !== "string" || !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-alpha\.(?:0|[1-9]\d*))?$/.test(version)) {
    throw new Error(`Invalid CLI version: ${version}`);
  }
  const isAlpha = version.includes("-alpha.");
  if ((channel === "alpha") !== isAlpha) {
    throw new Error(`CLI version ${version} does not match channel ${channel}`);
  }
  const binaries = ["nolo-darwin-arm64.tar.gz", "nolo-linux-x64.tar.gz"];
  const uploads = binaries.flatMap((sourceName) => {
    const stem = sourceName.slice(0, -".tar.gz".length);
    const fixedName = channel === "alpha" ? `${stem}-alpha.tar.gz` : sourceName;
    return [
      { sourceName, targetName: `${stem}-${version}.tar.gz`, contentType: "application/gzip", kind: "version" as const },
      { sourceName, targetName: fixedName, contentType: "application/gzip", kind: "fixed" as const },
    ];
  });
  uploads.push({
    sourceName: "install-nolo.sh",
    targetName: channel === "alpha" ? "install-nolo-alpha.sh" : "install-nolo.sh",
    contentType: "text/plain; charset=utf-8",
    kind: "fixed",
  });
  return { channel, uploads };
}

const INSTALL_CHANNEL_DEFAULT = 'NOLO_INSTALL_CHANNEL="${NOLO_INSTALL_CHANNEL:-latest}"';

export function prepareCliInstallerSource(source: string, channel: CliBinaryChannel): string {
  if (channel === "main") return source;
  const matches = source.match(/NOLO_INSTALL_CHANNEL="\$\{NOLO_INSTALL_CHANNEL:-latest\}"/g) ?? [];
  if (matches.length !== 1 || matches[0] !== INSTALL_CHANNEL_DEFAULT) {
    throw new Error(`Expected exactly one installer channel default marker; found ${matches.length}`);
  }
  return source.replace(INSTALL_CHANNEL_DEFAULT, 'NOLO_INSTALL_CHANNEL="${NOLO_INSTALL_CHANNEL:-alpha}"');
}

export async function executeCliBinaryPublishPlan<T>(
  uploads: CliBinaryUpload[],
  readSource: (sourceName: string) => Promise<T>,
  upload: (entry: CliBinaryUpload, source: T) => Promise<void>,
): Promise<void> {
  const sources = new Map<string, T>();
  for (const entry of uploads) {
    if (!sources.has(entry.sourceName)) sources.set(entry.sourceName, await readSource(entry.sourceName));
  }
  for (const entry of uploads) await upload(entry, sources.get(entry.sourceName)!);
}
