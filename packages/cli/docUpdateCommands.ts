import {
  buildPageKey,
  buildPageRecord,
  readBodyArg,
} from "./docPageHelpers";
import {
  buildSkillPageKey,
  buildSkillPageRecord,
  parseJsonArg,
} from "./docSkillHelpers";
import {
  buildSkillSummaryForRecord,
  hasFlag,
  hasHelpArg,
  readPageRecord,
  readTitle,
  requireTokenUser,
  resolveDocKind,
  resolveWriteTargets,
  writePageRecord,
} from "./docCommandShared";
import { parseSkillDocProtocol, resolvePageSkillMetadata } from "../ai/skills/skillDocProtocol";
import { readOption } from "./cliEnvHelpers";
import { findPotentialSecrets, formatSecretFindings } from "./secretScan";
import { t } from "./i18n";
import type { DocKind, DocWriteDeps } from "./docCommandShared";

function printDocUpdateUsage(output: { write(chunk: string): unknown }) {
  output.write(t("docCmd.updateUsage"));
}

function printSkillDocUpdateUsage(output: { write(chunk: string): unknown }) {
  output.write(t("docCmd.skillUpdateUsage"));
}

async function resolveExistingRecord(args: {
  authToken: string;
  dbKey: string;
  targets: string[];
}) {
  for (const serverUrl of args.targets) {
    try {
      const record = await readPageRecord({
        authToken: args.authToken,
        dbKey: args.dbKey,
        serverUrl,
      });
      if (record) {
        return { record, serverUrl };
      }
    } catch {
      // try next target
    }
  }
  throw new Error(t("docCmd.docNotFoundOnTargets", args.dbKey));
}

async function runUpdateCommand(
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
  const allowSecrets = hasFlag(args, "--allow-secrets");

  const { authToken, userId } = requireTokenUser(args, deps.env, shouldDryRun);
  const targets = resolveWriteTargets(args, deps.env);
  if (!targets.length) {
    throw new Error(t("docCmd.noWriteTargetsResolved"));
  }

  const dbKey = explicitKey ?? (docKind === "skill"
    ? buildSkillPageKey(userId, explicitId!)
    : buildPageKey(userId, explicitId!));

  const { record: existing } = await resolveExistingRecord({ authToken, dbKey, targets });

  // Body-level truth: a page whose content carries a valid `skill-config` block is
  // already a skill doc for every runtime reader, even when record.meta was never
  // promoted. Resolving here lets skill-doc update take over such a page and write
  // the metadata back, instead of dead-locking on the raw meta.kind.
  const existingSkillMeta = resolvePageSkillMetadata(existing);
  const metaKindIsSkill = existing?.meta?.kind === "skill";
  const bodyDeclaresSkill = Boolean(existingSkillMeta?.skillConfig);

  // Symmetric with the skill branch below: a body-declared skill counts as a skill
  // doc here too. Letting `doc update --body ...` through would silently overwrite
  // the skill-config block and demote a mountable skill back to a plain page.
  if (docKind === "page" && (metaKindIsSkill || bodyDeclaresSkill)) {
    throw new Error(t("docCmd.targetIsSkillDoc", dbKey));
  }
  if (docKind === "skill" && !metaKindIsSkill && !bodyDeclaresSkill) {
    throw new Error(t("docCmd.targetNotSkillDoc", dbKey));
  }

  const isPromotion = docKind === "skill" && !metaKindIsSkill && bodyDeclaresSkill;

  const explicitTitle = readTitle(args);
  const title = explicitTitle ?? existing?.title;
  if (!title) {
    throw new Error(t("docCmd.docNoTitle", dbKey));
  }

  const newSpaceId = readOption(args, "--space");
  const spaceId = newSpaceId !== undefined ? newSpaceId : (existing?.spaceId ?? null);

  let record: Record<string, any>;
  let skillSummary: Record<string, any> | undefined;

  if (docKind === "skill") {
    const meta = existingSkillMeta;
    const currentConfig = meta?.skillConfig;
    if (!currentConfig) {
      throw new Error(t("docCmd.existingSkillMissingConfig", dbKey));
    }

    const parsed = parseSkillDocProtocol(existing?.content ?? "", meta);
    const description = readOption(args, "--description") ?? currentConfig.description;

    const explicitName = readOption(args, "--name");
    if (explicitName !== undefined && !explicitName.trim()) {
      throw new Error(t("docCmd.nameCannotBeEmpty"));
    }
    const body = readBodyArg(args, parsed.content ?? "");

    const secretFindings = findPotentialSecrets(body);
    if (secretFindings.length && !allowSecrets) {
      throw new Error(
        [
          t("docCmd.secretBodyWarning"),
          formatSecretFindings(secretFindings),
        ].join("\n")
      );
    }

    const mergedConfig = {
      ...currentConfig,
      // The skill's `name` is its identity (other docs reference it), while the
      // page title is prose. They coincide for docs created via skill-doc create,
      // but diverge when promoting a page. --name targets the identity alone, so
      // a doc can get a readable title without breaking references; without it,
      // only an explicit --title renames.
      name: explicitName ?? explicitTitle ?? currentConfig.name ?? title,
      description,
      ...(parseJsonArg<string[]>(readOption(args, "--tools"), currentConfig.toolNames ?? []).length
        ? { toolNames: parseJsonArg<string[]>(readOption(args, "--tools"), currentConfig.toolNames ?? []) }
        : {}),
      ...(parseJsonArg<string[]>(readOption(args, "--required-skills"), currentConfig.requiredSkills ?? []).length
        ? { requiredSkills: parseJsonArg<string[]>(readOption(args, "--required-skills"), currentConfig.requiredSkills ?? []) }
        : {}),
      ...(parseJsonArg<string[]>(readOption(args, "--recommended-skills"), currentConfig.recommendedSkills ?? []).length
        ? { recommendedSkills: parseJsonArg<string[]>(readOption(args, "--recommended-skills"), currentConfig.recommendedSkills ?? []) }
        : {}),
      ...(readOption(args, "--trigger-mode")
        ? { triggerMode: readOption(args, "--trigger-mode") as "explicit" | "required" | "recommended" }
        : {}),
      ...(readOption(args, "--prompt-patch") !== undefined
        ? { promptPatch: readOption(args, "--prompt-patch") }
        : {}),
    };

    const skillId = typeof existing?.id === "string" ? existing.id : dbKey.split("-").pop()!;
    record = buildSkillPageRecord({
      dbKey,
      skillId,
      title,
      spaceId,
      body,
      skillConfig: mergedConfig,
      evalConfig: meta?.evalConfig,
      workflowConfig: meta?.workflowConfig,
      existing,
    });

    skillSummary = buildSkillSummaryForRecord(record) ?? undefined;
  } else {
    const description = readOption(args, "--description") ?? existing?.meta?.description ?? "";
    const body = readBodyArg(args, typeof existing?.content === "string" ? existing.content : "");

    const secretFindings = findPotentialSecrets(body);
    if (secretFindings.length && !allowSecrets) {
      throw new Error(
        [
          t("docCmd.secretBodyWarning"),
          formatSecretFindings(secretFindings),
        ].join("\n")
      );
    }

    const pageId = typeof existing?.id === "string" ? existing.id : dbKey.split("-").pop()!;
    record = buildPageRecord({
      dbKey,
      pageId,
      title,
      spaceId,
      content: body,
      existing,
      meta: description ? { description } : undefined,
    });
  }

  const summary = {
    dryRun: shouldDryRun,
    kind: docKind,
    promotedFromPage: isPromotion,
    title,
    dbKey,
    userId,
    spaceId,
    syncTargets: targets,
    writtenTargets: [] as string[],
  };

  if (!shouldDryRun) {
    for (const serverUrl of targets) {
      await writePageRecord({
        authToken,
        dbKey,
        record,
        serverUrl,
        spaceId,
        title,
        userId,
        skillSummary,
      });
      summary.writtenTargets.push(serverUrl);
    }
  }

  if (shouldOutputJson) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else if (shouldDryRun) {
    process.stdout.write(isPromotion ? t("docCmd.dryRunOkPromote", dbKey) : t("docCmd.dryRunOk", dbKey));
  } else if (isPromotion) {
    process.stdout.write(t("docCmd.promotedPageToSkill", dbKey));
  } else {
    process.stdout.write(t("docCmd.updatedDoc", docKind, dbKey));
  }

  return 0;
}

export async function runDocUpdateCommand(args: string[], deps: DocWriteDeps) {
  return runUpdateCommand(args, deps, {
    defaultKind: "page",
    usage: printDocUpdateUsage,
  });
}

export async function runSkillDocUpdateCommand(args: string[], deps: DocWriteDeps) {
  return runUpdateCommand(args, deps, {
    defaultKind: "skill",
    usage: printSkillDocUpdateUsage,
  });
}
