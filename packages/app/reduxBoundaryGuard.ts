import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Redux Deprecation Boundary Guard (Phase 1).
 *
 * Architecture policy: Redux usage is frozen ("only reduce, never increase").
 * No new slices, no new reducers, and no new direct react-redux / @reduxjs/toolkit
 * imports outside the known legacy implementations.
 *
 * When new UI or business logic needs data from remaining domains (message, db,
 * settings, table), consume them through existing domain hooks / services
 * rather than leaking new Redux selectors or dispatches.
 */

/** Files allowed to declare Redux slices via createSlice / buildCreateSlice. */
export const WHITELISTED_SLICE_FILES: readonly string[] = [
  "packages/render/table/tableSlice.ts",
  "packages/database/dbSlice.ts",
  "packages/chat/messages/messageSlice.ts",
  "packages/app/settings/settingSlice.tsx",
  "packages/ai/agent/agentSlice.ts",
] as const;

/** Production files allowed to import from "react-redux". */
export const WHITELISTED_REACT_REDUX_FILES: readonly string[] = [
  "packages/ai/agent/web/AgentCard.tsx",
  "packages/ai/agent/web/AgentForkDialog.tsx",
  "packages/ai/agent/web/LinkedSpacesSelector.tsx",
  "packages/ai/agent/web/PublicAgentsList.tsx",
  "packages/ai/agent/web/useAgentCardNavigation.ts",
  "packages/app/hooks/index.ts",
  "packages/app/hooks/useChatPageTitle.ts",
  "packages/app/hooks/useNewMessageNotification.ts",
  "packages/app/hooks/useUnifiedStore.ts",
  "packages/app/pages/LocalQuickCreateAgent.tsx",
  "packages/app/pages/widgets/WidgetsSection.tsx",
  "packages/app/store.ts",
  "packages/auth/session/react.ts",
  "packages/chat/messages/web/MessageActions.tsx",
  "packages/chat/messages/web/ToolMessageContent.tsx",
  "packages/create/space/spaceCurrentSelectors.ts",
  "packages/render/layout/CreateMenuButtonContainer.tsx",
  "packages/render/layout/useTopBarState.tsx",
  "packages/rn/redux/store.ts",
  "packages/rn/screens/ArticleDetailScreen.tsx",
  "packages/server/html/renderReactApp.tsx",
  "packages/web/entry.tsx",
] as const;

/** Production files allowed to import from "@reduxjs/toolkit". */
export const WHITELISTED_RTK_FILES: readonly string[] = [
  "packages/ai/agent/agentSlice.ts",
  "packages/ai/agent/runAgentBackground.ts",
  "packages/ai/tools/toolRunStore.ts",
  "packages/app/fetchOwnedApps.ts",
  "packages/app/settings/editorConfigSelectors.ts",
  "packages/app/settings/fieldSelectors.ts",
  "packages/app/settings/serverSelectors.ts",
  "packages/app/settings/settingActions.ts",
  "packages/app/settings/settingSlice.tsx",
  "packages/app/settings/settingThunks.ts",
  "packages/app/settings/themeSelectors.ts",
  "packages/app/stateViews/runtime.ts",
  "packages/app/store.ts",
  "packages/chat/dialog/actions/addReferenceKeysAction.ts",
  "packages/chat/dialog/actions/compactDialogAndForkAction.ts",
  "packages/chat/dialog/dialogSlice.ts",
  "packages/chat/messages/messageSlice.ts",
  "packages/chat/messages/toolThunks.ts",
  "packages/chat/queue/chatQueueReduxAdapter.ts",
  "packages/create/space/category/categoryActions.ts",
  "packages/create/space/content/contentThunks.ts",
  "packages/create/space/markDialogReadThunk.ts",
  "packages/create/space/member/memberThunks.ts",
  "packages/create/space/spaceThunks.ts",
  "packages/database/actions/cacheMergedUserData.ts",
  "packages/database/actions/fetchUserData.ts",
  "packages/database/dbSlice.ts",
  "packages/database/thunkApiTypes.ts",
  "packages/render/table/tableSlice.ts",
  "packages/rn/redux/store.ts",
] as const;

const GUARD_OWN_FILES = [
  "packages/app/reduxBoundaryGuard.ts",
  "packages/app/reduxBoundary.source.test.ts",
] as const;

export type ReduxBoundaryViolation = {
  file: string;
  reason: string;
};

/** Strip comments so historical notes or commented-out code do not trip scan. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'])\/\/.*$/gm, "$1");
}

export function scanReduxSource(rel: string, source: string): ReduxBoundaryViolation[] {
  if ((GUARD_OWN_FILES as readonly string[]).includes(rel)) return [];

  const violations: ReduxBoundaryViolation[] = [];
  const code = stripComments(source);

  // Check createSlice / buildCreateSlice: only allowed in whitelisted legacy slices
  if (/\b(createSlice|buildCreateSlice)\s*\(/.test(code)) {
    if (!WHITELISTED_SLICE_FILES.includes(rel)) {
      violations.push({
        file: rel,
        reason: `New Redux slice forbidden (${rel}). Redux is in deprecation mode — do not add new createSlice / buildCreateSlice calls.`,
      });
    }
  }

  // Check react-redux imports
  if (/from\s*["']react-redux["']/.test(code)) {
    if (!WHITELISTED_REACT_REDUX_FILES.includes(rel)) {
      violations.push({
        file: rel,
        reason: `Direct import from "react-redux" forbidden (${rel}). Use existing domain hooks/services instead of adding new Redux consumers.`,
      });
    }
  }

  // Check @reduxjs/toolkit imports
  if (/from\s*["']@reduxjs\/toolkit["']/.test(code)) {
    if (!WHITELISTED_RTK_FILES.includes(rel)) {
      violations.push({
        file: rel,
        reason: `Direct import from "@reduxjs/toolkit" forbidden (${rel}). Redux usage is frozen; do not introduce new toolkit dependencies.`,
      });
    }
  }

  return violations;
}

export function collectProductionFiles(
  root: string,
  dir: string = join(root, "packages")
): Array<{ rel: string; source: string }> {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "build" || entry === ".worktrees") {
        return [];
      }
      return collectProductionFiles(root, full);
    }
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    const rel = full.slice(root.length + 1);
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry) || entry.includes(".test.") || entry.includes(".fixture.")) {
      return [];
    }
    return [{ rel, source: readFileSync(full, "utf8") }];
  });
}

export function scanReduxBoundary(root: string): ReduxBoundaryViolation[] {
  const violations: ReduxBoundaryViolation[] = [];
  for (const { rel, source } of collectProductionFiles(root)) {
    violations.push(...scanReduxSource(rel, source));
  }
  return violations;
}
