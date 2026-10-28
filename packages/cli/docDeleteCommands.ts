import { buildPageKey } from "./docPageHelpers";
import { buildSkillPageKey } from "./docSkillHelpers";
import {
  hasFlag,
  hasHelpArg,
  readPageRecord,
  requireTokenUser,
  resolveDocKind,
  resolveWriteTargets,
} from "./docCommandShared";
import { removePageFromSpace } from "./docSpaceHelpers";
import { readOption } from "./cliEnvHelpers";
import { deleteDbRecordOnServers } from "./globalRecordOperations";
import { t } from "./i18n";
import type { DocKind, DocWriteDeps } from "./docCommandShared";

function printDocDeleteUsage(output: { write(chunk: string): unknown }) {
  output.write(t("docCmd.deleteUsage"));
}

function printSkillDocDeleteUsage(output: { write(chunk: string): unknown }) {
  output.write(t("docCmd.skillDeleteUsage"));
}

async function runDeleteCommand(
  args: string[],
  deps: DocWriteDeps,
  options: { defaultKind: DocKind; usage: (output: { write(chunk: string): unknown }) => void }
) {
  if (hasHelpArg(args)) {
    options.usage(process.stdout);
    return 0;
  }

  const explicitId = readOption(args, "--id");
  const explicitKey = readOption(args, "--key");
  if (!explicitId && !explicitKey) {
    options.usage(process.stderr);
    return 1;
  }

  const docKind = resolveDocKind(args, options.defaultKind);
  const shouldDryRun = hasFlag(args, "--dry-run");
  const shouldOutputJson = hasFlag(args, "--json");

  const { authToken, userId } = requireTokenUser(args, deps.env, shouldDryRun);
  const targets = resolveWriteTargets(args, deps.env);
  if (!targets.length) {
    throw new Error(t("docCmd.noDeleteTargetsResolved"));
  }

  const dbKey = explicitKey ?? (docKind === "skill"
    ? buildSkillPageKey(userId, explicitId!)
    : buildPageKey(userId, explicitId!));

  const existing = await readPageRecord({ authToken, dbKey, serverUrl: targets[0] });

  if (docKind === "page" && existing?.meta?.kind === "skill") {
    throw new Error(t("docCmd.targetIsSkillDocDelete", dbKey));
  }
  if (docKind === "skill" && existing?.meta?.kind !== "skill") {
    throw new Error(t("docCmd.targetNotSkillDocDelete", dbKey));
  }

  const spaceId = typeof existing?.spaceId === "string" ? existing.spaceId : null;

  const summary = {
    dryRun: shouldDryRun,
    kind: docKind,
    dbKey,
    userId,
    spaceId,
    syncTargets: targets,
    deletedTargets: [] as string[],
  };

  if (!shouldDryRun) {
    if (spaceId) {
      for (const serverUrl of targets) {
        await removePageFromSpace({
          baseUrl: serverUrl,
          userId,
          authToken,
          spaceId,
          contentKey: dbKey,
        }).catch(() => null);
      }
    }

    const results = await deleteDbRecordOnServers({
      authToken,
      dbKey,
      fetchImpl: fetch,
      serverUrls: targets,
    });

    const failed = results.filter((result) => !result.ok);
    if (failed.length) {
      throw new Error(
        t(
          "docCmd.deleteFailedOnServers",
          dbKey,
          failed.map((result) => `${result.serverUrl}: ${result.error}`).join("; ")
        )
      );
    }

    summary.deletedTargets.push(...results.map((result) => result.serverUrl));
  }

  if (shouldOutputJson) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else if (shouldDryRun) {
    process.stdout.write(t("docCmd.dryRunOk", dbKey));
  } else {
    process.stdout.write(t("docCmd.deletedDoc", docKind, dbKey));
  }

  return 0;
}

export async function runDocDeleteCommand(args: string[], deps: DocWriteDeps) {
  return runDeleteCommand(args, deps, {
    defaultKind: "page",
    usage: printDocDeleteUsage,
  });
}

export async function runSkillDocDeleteCommand(args: string[], deps: DocWriteDeps) {
  return runDeleteCommand(args, deps, {
    defaultKind: "skill",
    usage: printSkillDocDeleteUsage,
  });
}
