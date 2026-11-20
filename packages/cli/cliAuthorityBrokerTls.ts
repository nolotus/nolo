import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { SecureContextOptions } from "node:tls";

type Identity = { cert: string; key: string };

export async function loadCliAuthorityBrokerTls(metadataPath: string): Promise<SecureContextOptions> {
  const runDirectory = dirname(metadataPath);
  await mkdir(runDirectory, { recursive: true });
  if (process.getuid) {
    const uid = process.getuid();
    for (let ancestor = await realpath(runDirectory); ; ancestor = dirname(ancestor)) {
      const stat = await lstat(ancestor);
      if ((stat.uid !== uid && stat.uid !== 0) || ((stat.mode & 0o022) && !(stat.mode & 0o1000))) {
        throw new Error("Authority broker identity path must be protected from other local users");
      }
      if (ancestor === dirname(ancestor)) break;
    }
  }
  // On Windows POSIX modes do not establish privacy. Use the OS user's
  // profile data directory (which inherits the profile ACL), even when the
  // database was relocated to a shared directory.
  const directory = process.platform === "win32"
    ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Nolo", "authority-identity",
      createHash("sha256").update((await realpath(runDirectory)).toLowerCase()).digest("hex"))
    : join(runDirectory, "authority-identity");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || (process.getuid && (stat.uid !== process.getuid() || (stat.mode & 0o077)))) {
    throw new Error("Authority broker identity directory must be private to the current user");
  }
  const identityPath = join(directory, "identity.json");
  async function readIdentity(): Promise<Identity> {
    const identityStat = await lstat(identityPath);
    if (!identityStat.isFile() ||
        (process.getuid && (identityStat.uid !== process.getuid() || (identityStat.mode & 0o077)))) {
      throw new Error("Authority broker identity file must be private to the current user");
    }
    return JSON.parse(await readFile(identityPath, "utf8")) as Identity;
  }
  let identity: Identity;
  try {
    identity = await readIdentity();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const { generate } = await import("selfsigned");
    const certificate = await generate([{ name: "commonName", value: "localhost" }], {
      algorithm: "sha256",
      notAfterDate: new Date("2099-01-01"),
    });
    const temporary = join(directory, randomUUID());
    await writeFile(temporary, JSON.stringify({ cert: certificate.cert, key: certificate.private }), { mode: 0o600, flag: "wx" });
    try {
      await link(temporary, identityPath);
    } catch (linkError) {
      if ((linkError as NodeJS.ErrnoException).code !== "EEXIST") throw linkError;
    } finally {
      await unlink(temporary);
    }
    identity = await readIdentity();
  }
  return { ...identity, ca: identity.cert, minVersion: "TLSv1.3" };
}
