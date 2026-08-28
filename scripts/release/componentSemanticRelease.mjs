import { analyzeCommits as analyzeConventionalCommits } from "@semantic-release/commit-analyzer";
import { generateNotes as generateConventionalNotes } from "@semantic-release/release-notes-generator";
import {
  filterCommitsForComponent,
  readCommitPaths,
  RELEASE_RULES,
} from "./componentReleasePolicy.mjs";

export {
  commitCanTriggerRelease,
  componentsForCommit,
  filterCommitsForComponent,
  readCommitPaths,
} from "./componentReleasePolicy.mjs";

const ANALYZER_OPTIONS = {
  preset: "conventionalcommits",
  releaseRules: RELEASE_RULES,
};

const NOTES_OPTIONS = { preset: "conventionalcommits" };

function filteredContext(pluginConfig, context) {
  const component = pluginConfig?.component;
  const repositoryRoot = context.cwd ?? process.cwd();
  const commits = filterCommitsForComponent(
    context.commits ?? [],
    component,
    (commit) => readCommitPaths(commit, repositoryRoot),
  );
  context.logger?.log(
    `[component-release] ${component}: selected ${commits.length}/${context.commits?.length ?? 0} commits`,
  );
  return { ...context, commits };
}

export async function analyzeCommits(pluginConfig, context) {
  return analyzeConventionalCommits(ANALYZER_OPTIONS, filteredContext(pluginConfig, context));
}

export async function generateNotes(pluginConfig, context) {
  return generateConventionalNotes(NOTES_OPTIONS, filteredContext(pluginConfig, context));
}
