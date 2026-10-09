import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { parse as babelParse } from "@babel/parser";

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
  "packages/create/space/useCurrentSpaceFromEntity.ts",
  // Desktop edition (2026-09 desktop account work) resolves the session Core
  // through the react-redux store context as its public boundary.
  "packages/identity/cloudRoutes.desktop.tsx",
  "packages/identity/useIdentity.desktop.ts",
  "packages/render/layout/CreateMenuButtonContainer.tsx",
  "packages/render/layout/useTopBarState.tsx",
  "packages/rn/redux/store.ts",
  "packages/rn/screens/ArticleDetailScreen.tsx",
  "packages/server/html/renderReactApp.tsx",
  "packages/web/entry.tsx",
] as const;

/**
 * Existing files allowed to import Redux consumer/infrastructure APIs from
 * `app/store`. This is intentionally a concrete file inventory: new code must
 * use domain hooks/services instead of adding another Redux consumer.
 */
export const WHITELISTED_APP_REDUX_CONSUMER_FILES: readonly string[] = [
  "packages/app/hooks.ts",
  "packages/ai/agent/_executeModel.ts",
  "packages/ai/agent/agentSlice.ts",
  "packages/ai/agent/buildEditingContext.ts",
  "packages/ai/agent/cliChatClient.ts",
  "packages/ai/agent/getFullChatContextKeys.ts",
  "packages/ai/agent/hooks/useAgentConfig.ts",
  "packages/ai/agent/hooks/useAgentDialog.ts",
  "packages/ai/agent/hooks/useAgentFormValidation.ts",
  "packages/ai/agent/hooks/usePublicAgents.ts",
  "packages/ai/agent/referenceUtils.ts",
  "packages/ai/agent/runAgentBackground.ts",
  "packages/ai/agent/runAgentClientLoop.ts",
  "packages/ai/agent/serverOwnedWebEffectiveToolSurface.ts",
  "packages/ai/agent/serverOwnedWebForegroundTurn.ts",
  "packages/ai/agent/streamAgentChatTurn.ts",
  "packages/ai/agent/streamAgentChatTurnUtils.ts",
  "packages/ai/agent/streamTurnMessageBuild.ts",
  "packages/ai/agent/streamTurnQuickChat.ts",
  "packages/ai/agent/turnToolContext.ts",
  "packages/ai/agent/web/AgentAvatar.tsx",
  "packages/ai/agent/web/AgentBlock.tsx",
  "packages/ai/agent/web/AgentCard.tsx",
  "packages/ai/agent/web/AgentForkDialog.tsx",
  "packages/ai/agent/web/AgentForm.tsx",
  "packages/ai/agent/web/AgentGrantPanel.tsx",
  "packages/ai/agent/web/AgentInboxPage.tsx",
  "packages/ai/agent/web/AgentMemoryTab.tsx",
  "packages/ai/agent/web/AgentMoreActions.tsx",
  "packages/ai/agent/web/AgentPage.tsx",
  "packages/ai/agent/web/CreatorPage.tsx",
  "packages/ai/agent/web/FavoritesCollection.tsx",
  "packages/ai/agent/web/ModelSourceSection.tsx",
  "packages/ai/agent/web/PersonaSection.tsx",
  "packages/ai/agent/web/PublicAgentsList.tsx",
  "packages/ai/agent/web/ReferencesSelector.tsx",
  "packages/ai/agent/web/ReferencesTab.tsx",
  "packages/ai/agent/web/ToolsTab.tsx",
  "packages/ai/agent/web/seedAgentPreview.ts",
  "packages/ai/agent/web/useAgentCardNavigation.ts",
  "packages/ai/agent/web/useAgentCreateSourceState.ts",
  "packages/ai/agent/web/useSubscriptionOAuthConnection.ts",
  "packages/ai/chat/sendOpenAICompletionsRequest.native.ts",
  "packages/ai/chat/sendOpenAICompletionsRequest.ts",
  "packages/ai/chat/sendOpenAIResponseRequest.ts",
  "packages/ai/context/buildReferenceContext.ts",
  "packages/ai/llm/web/AgentNameChip.tsx",
  "packages/ai/tools/agent/createAgentTool.ts",
  "packages/ai/tools/agent/createDialogTool.ts",
  "packages/ai/tools/agent/updateAgentTool.ts",
  "packages/ai/tools/agent/updateSelfTool.ts",
  "packages/ai/tools/category/createCategoryTool.ts",
  "packages/ai/tools/category/queryContentsByCategoryTool.ts",
  "packages/ai/tools/category/updateContentCategoryTool.ts",
  "packages/ai/tools/createDocTool.ts",
  "packages/ai/tools/createSkillDocTool.ts",
  "packages/ai/tools/importDataTool.ts",
  "packages/ai/tools/importSkillTool.ts",
  "packages/ai/tools/listUserSpacesTool.ts",
  "packages/app/actions/syncAppRecord.ts",
  "packages/app/components/AppCard.tsx",
  "packages/app/email/AgentEmailE2EPage.tsx",
  "packages/app/favorite/useFavoriteDeps.ts",
  "packages/app/favorite/useFavoriteSidebarItems.ts",
  "packages/app/fetchOwnedApps.ts",
  "packages/app/hooks/deleteDbKey.ts",
  "packages/app/hooks/index.ts",
  "packages/app/hooks/useAccountProfileRefresh.ts",
  "packages/app/hooks/useAppDetail.ts",
  "packages/app/hooks/useAppVersions.ts",
  "packages/app/hooks/useChatPageTitle.ts",
  "packages/app/hooks/useDesktopLocalConnectorAutostart.ts",
  "packages/app/hooks/useMyApps.ts",
  "packages/app/hooks/useMyContentItems.ts",
  "packages/app/hooks/useNewMessageNotification.ts",
  "packages/app/hooks/useTrashedContentItems.ts",
  "packages/app/hooks/useUnifiedStore.ts",
  "packages/app/hooks/useUserNotifications.ts",
  "packages/app/notifications/useNotificationActions.ts",
  "packages/app/pages/AppEditorPage.tsx",
  "packages/app/pages/ClientDownloadsPage.tsx",
  "packages/app/pages/EmailAdmin.tsx",
  "packages/app/pages/Lab.tsx",
  "packages/app/pages/LocalPreviewPanel.tsx",
  "packages/app/pages/LocalQuickCreateAgent.tsx",
  "packages/app/pages/MyContentCollection.tsx",
  "packages/app/pages/MySharesPage.tsx",
  "packages/app/pages/NotificationsPage.tsx",
  "packages/app/pages/ProviderHealthAdmin.tsx",
  "packages/app/pages/QuickChat.tsx",
  "packages/app/pages/QuickChatModeSelector.tsx",
  "packages/app/pages/QuickChatRuntime.tsx",
  "packages/app/pages/Recharge.tsx",
  "packages/app/pages/ShareCommunityPage.tsx",
  "packages/app/pages/ShareCommunityPreview.tsx",
  "packages/app/pages/ShareImportPage.tsx",
  "packages/app/pages/share/DocImportView.tsx",
  "packages/app/pages/widgets/WidgetsSection.tsx",
  "packages/app/settings/fieldSelectors.ts",
  "packages/app/settings/serverSelectors.ts",
  "packages/app/settings/web/ChatConfig.tsx",
  "packages/app/settings/web/DesktopMachines.tsx",
  "packages/app/settings/web/DeveloperConfig.tsx",
  "packages/app/settings/web/EditorConfig.tsx",
  "packages/app/settings/web/MemoryConfig.tsx",
  "packages/app/settings/web/Productivity.tsx",
  "packages/app/settings/web/SecretsConfig.tsx",
  "packages/app/settings/web/SecuritySettings.tsx",
  "packages/app/settings/web/SystemBuiltinSkills.tsx",
  "packages/app/settings/web/UserProfile.tsx",
  "packages/app/settings/web/chat-config/useAutoSaveGlobalPrompt.ts",
  "packages/app/stateViews/runtime.ts",
  "packages/app/theme/GlobalThemeController.tsx",
  "packages/app/theme/index.ts",
  "packages/app/theme/useSystemTheme.ts",
  "packages/app/theme/web/DarkModeSwitch.tsx",
  "packages/app/theme/web/DensitySwitch.tsx",
  "packages/app/theme/web/FontPresetPicker.tsx",
  "packages/app/theme/web/ThemePicker.tsx",
  "packages/app/web/App.tsx",
  "packages/auth/hooks/useDeleteOwnAccount.ts",
  "packages/auth/hooks/useDeleteUser.ts",
  "packages/auth/hooks/useDisableUser.tsx",
  "packages/auth/hooks/useEnableUser.ts",
  "packages/auth/hooks/useFetchUsers.ts",
  "packages/auth/hooks/useRechargeUser.ts",
  "packages/auth/web/CliAuthorize.tsx",
  "packages/auth/web/InviteSignup.tsx",
  "packages/auth/web/UserGrowthPage.tsx",
  "packages/auth/web/useAuthTargetServer.ts",
  "packages/auth/web/UserUsagePage.tsx",
  "packages/auth/web/UsersPage.tsx",
  "packages/chat/dialog/AgentDraftPanel.tsx",
  "packages/chat/dialog/AppendInstructionControl.tsx",
  "packages/chat/dialog/ChildRunDetailModal.tsx",
  "packages/chat/dialog/ChildRunObserverPanel.tsx",
  "packages/chat/dialog/DialogPage.tsx",
  "packages/chat/dialog/ObjectAssistantPanel.tsx",
  "packages/chat/dialog/PageAssistantPanel.tsx",
  "packages/chat/dialog/actions/addDialogAgentAction.ts",
  "packages/chat/dialog/actions/addReferenceKeysAction.ts",
  "packages/chat/dialog/actions/cleanupCliSession.ts",
  "packages/chat/dialog/actions/handleSendMessageAction.ts",
  "packages/chat/dialog/actions/removeDialogAgentAction.ts",
  "packages/chat/dialog/actions/setDialogExtraReferencesAction.ts",
  "packages/chat/dialog/actions/setPrimaryDialogAgentAction.ts",
  "packages/chat/dialog/actions/switchDialogAgentAction.ts",
  "packages/chat/dialog/actions/updateDialogSummaryAction.ts",
  "packages/chat/dialog/actions/updateDialogTitleAction.ts",
  "packages/chat/dialog/ensureDialogSpaceAction.ts",
  "packages/chat/dialog/useCreateDialog.ts",
  "packages/chat/dialog/useCurrentDialogConfig.ts",
  "packages/chat/hooks/useSendPermission.ts",
  "packages/chat/messages/hooks/useBase64Migration.ts",
  "packages/chat/messages/hooks/useMessageDelete.tsx",
  "packages/chat/messages/messageContent.ts",
  "packages/chat/messages/sendFirstMessage.ts",
  "packages/chat/messages/web/AskChoicePanelWeb.tsx",
  "packages/chat/messages/web/CreateAgentToolCard.tsx",
  "packages/chat/messages/web/MessageActions.tsx",
  "packages/chat/messages/web/MessageItem.tsx",
  "packages/chat/messages/web/MessageList.tsx",
  "packages/chat/messages/web/MessageToolConfirmBar.tsx",
  "packages/chat/messages/web/ThinkingSection.tsx",
  "packages/chat/messages/web/ToolMessageContent.tsx",
  "packages/chat/messages/web/ToolMessageItem.tsx",
  "packages/chat/messages/web/UpdateAgentToolCard.tsx",
  "packages/chat/task/TaskPage.tsx",
  "packages/chat/web/AgentPickerControl.tsx",
  "packages/chat/web/AttachmentsPreview.tsx",
  "packages/chat/web/ChatSidebar.tsx",
  "packages/chat/web/CreateTaskModal.tsx",
  "packages/chat/web/DialogUsageTrigger.tsx",
  "packages/chat/web/ForegroundTurnRecovery.tsx",
  "packages/chat/web/IncompleteBrowserTurnNotice.tsx",
  "packages/chat/web/MessageInputContainer.tsx",
  "packages/chat/web/MessageInputCore.tsx",
  "packages/chat/web/VoiceInputButton.tsx",
  "packages/chat/web/fileProcessor.ts",
  "packages/chat/web/sidebar/AllViewSidebar.tsx",
  "packages/chat/web/sidebar/CategorySection.tsx",
  "packages/chat/web/sidebar/SidebarCommandPalette.tsx",
  "packages/chat/web/sidebar/SidebarPinnedBlock.tsx",
  "packages/chat/web/sidebar/SidebarUserSection.tsx",
  "packages/chat/web/sidebar/useSidebarDragAndDrop.ts",
  "packages/chat/web/useMessageInputDeleteConfirm.ts",
  "packages/chat/web/useMessageInputFiles.ts",
  "packages/chat/web/useMessageInputSend.ts",
  "packages/chat/web/useStopCurrentForegroundTurn.ts",
  "packages/create/editor/Editor.tsx",
  "packages/create/editor/EditorToolbar.tsx",
  "packages/create/editor/LinkEditorPopover.tsx",
  "packages/create/editor/MentionList.tsx",
  "packages/create/editor/imageUpload.ts",
  "packages/create/hooks/category.ts",
  "packages/create/space/CreateSpaceForm.tsx",
  "packages/create/space/SidebarAppDeleteDialog.tsx",
  "packages/create/space/SidebarItemRow.tsx",
  "packages/create/space/SidebarMoveToSubmenu.tsx",
  "packages/create/space/addSpaceAction.ts",
  "packages/create/space/category/CategoryHeader.tsx",
  "packages/create/space/category/categoryActions.ts",
  "packages/create/space/components/DeleteContentButton.tsx",
  "packages/create/space/components/ImagePreviewFetcher.tsx",
  "packages/create/space/components/SpaceContentList.tsx",
  "packages/create/space/components/SpaceLayout.tsx",
  "packages/create/space/components/SpaceNavigation.tsx",
  "packages/create/space/components/useContentImageSrc.ts",
  "packages/create/space/content/moveContentAction.ts",
  "packages/create/space/content/updateContentCategoryAction.ts",
  "packages/create/space/hooks/useAgentFetcher.ts",
  "packages/create/space/hooks/useSpaceData.tsx",
  "packages/create/space/hooks/useSpaceEvents.ts",
  "packages/create/space/member/fetchUserSpaceMembershipsAction.ts",
  "packages/create/space/pages/SpaceContent.tsx",
  "packages/create/space/pages/SpaceInvite.tsx",
  "packages/create/space/pages/SpaceMembers.tsx",
  "packages/create/space/pages/SpaceSettings.tsx",
  "packages/create/space/updateSpaceAction.ts",
  "packages/create/version/VersionHistoryPanel.tsx",
  "packages/database/actions/cacheMergedUserData.ts",
  "packages/database/actions/fetchUserData.ts",
  "packages/database/hooks/useUserData.ts",
  "packages/database/runtimeServerContext.ts",
  "packages/database/thunkApiTypes.ts",
  "packages/life/web/InviteRewards.tsx",
  "packages/life/web/RechargeRecord.tsx",
  "packages/life/web/RecycleBin.tsx",
  "packages/render/layout/CreateMenuButtonContainer.tsx",
  "packages/render/layout/DialogMenu.tsx",
  "packages/render/layout/MainLayout.tsx",
  "packages/render/layout/TopbarDeleteButton.tsx",
  "packages/render/layout/TopbarNotificationBell.tsx",
  "packages/render/layout/TopbarSpaceSwitcher.tsx",
  "packages/render/layout/TopbarUserMenu.tsx",
  "packages/render/layout/useTopBarState.tsx",
  "packages/render/page/FileDetailsPanel.tsx",
  "packages/render/page/FileInfoPanel.tsx",
  "packages/render/page/FilePage.tsx",
  "packages/render/page/RenderPage.tsx",
  "packages/render/page/SaveStatusIndicator.tsx",
  "packages/render/page/createPageAction.ts",
  "packages/render/table/useCreateTable.ts",
  "packages/render/table/useTableShareActions.ts",
  "packages/render/web/elements/ImageElement.tsx",
  "packages/render/web/ui/ReadOnlyMarkdownContent.tsx",
  "packages/render/web/ui/Table.tsx",
  "packages/render/web/ui/modal/DocxPreviewDialog.tsx",
  "packages/render/web/ui/modal/ImagePreviewModal.tsx",
  "packages/render/web/ui/modal/PagePreviewDialog.tsx",
  "packages/rn/components/shared/AppSidebarContent.tsx",
  "packages/rn/screens/AuthScreen.tsx",
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
  "packages/rn/redux/store.ts",
] as const;

const GUARD_OWN_FILES = [
  "packages/app/reduxBoundaryGuard.ts",
  "packages/app/reduxBoundary.source.test.ts",
] as const;

export type ReduxBoundaryViolation = {
  file: string;
  reason: string;
  /**
   * Peeled-store dispatch scan only. `undetermined` = a dispatch() argument
   * references a peeled-store binding in a form the guard cannot resolve
   * statically; it is REPORTED (fail-closed), never treated as clean.
   */
  kind?: "void-setter-dispatch" | "undetermined";
};

const REDUX_APP_STORE_API_NAMES = [
  "useAppSelector",
  "useAppDispatch",
  "dispatchThunk",
  "TypedThunkDispatch",
  "AppDispatch",
  "RootState",
  "AppThunkApi",
  "asThunkActionCreator",
] as const;

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

  // Check app/store Redux APIs. Session/domain APIs exported by app/store are
  // deliberately not included in this set, so non-Redux migrations remain free
  // to use them.
  const appStoreImportRegex = /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s+from\s*["']app\/store["']/g;
  const importsReduxAppStoreApi =
    /import\s+\*\s+as\s+\w+\s+from\s*["']app\/store["']/.test(
      code
    ) ||
    Array.from(code.matchAll(appStoreImportRegex)).some((match) =>
      match[1]
        .split(",")
        .map((name) => name.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0])
        .some((name) =>
          REDUX_APP_STORE_API_NAMES.includes(
            name as (typeof REDUX_APP_STORE_API_NAMES)[number]
          )
        )
    );
  if (
    importsReduxAppStoreApi &&
    !WHITELISTED_APP_REDUX_CONSUMER_FILES.includes(rel)
  ) {
    violations.push({
      file: rel,
      reason: `Import from \"app/store\" Redux consumer API forbidden (${rel}). Use a domain hook/service or keep Redux infrastructure internal.`,
    });
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

/* --------------------------------------------------------------------------
 * Peeled-domain guard: module-store void setters must never be dispatched
 * ------------------------------------------------------------------------*/

/**
 * 2026-09-17 incident guard (`docs/incidents/2026-09-17-table-page-focus-context-dispatch-crash.md`).
 *
 * After a Redux slice is peeled into a standalone module store
 * (`useSyncExternalStore` + plain sync mutators annotated `: void`), leftover
 * `dispatch(setterFn(...))` call sites hand `undefined` to Redux, which throws
 * minified error #7 ("Actions must be plain objects") at runtime — caught only
 * by the page error boundary, invisible to typecheck and to the server.
 * Peeled-store mutators must be called directly; this scan finds `dispatch(...)`
 * wrapping them.
 */

export type PeeledStoreModule = {
  /** Store module path relative to the repo root. */
  module: string;
  /** Exported mutators annotated `: void` (must never be dispatched). */
  voidSetters: string[];
  /** Barrels only: exported setter name → "<defining store module>#<setter>". */
  origin?: Record<string, string>;
  /** Barrels only: `export * as ns` / re-exported namespace name → store module. */
  namespaces?: Record<string, string>;
};

const PEELED_STORE_FILE_RE = /(?:^|\/)[A-Za-z0-9_-]*[Ss]tore\.tsx?$/;
const MODULE_STORE_MARKER = "useSyncExternalStore";

type AstNode = { type: string; [key: string]: any };

/** Parse TS/TSX with @babel/parser. A parse failure THROWS (never skipped). */
function parseModule(source: string, filename: string): { body: AstNode[] } {
  const isJsx = /\.[jt]sx$/.test(filename);
  try {
    return babelParse(source, {
      sourceType: "module",
      plugins: isJsx ? ["typescript", "jsx"] : ["typescript"],
    }).program as unknown as { body: AstNode[] };
  } catch (error) {
    throw new Error(
      `reduxBoundaryGuard: failed to parse ${filename}: ${(error as Error).message}`
    );
  }
}

function hasVoidReturn(fn: AstNode | null | undefined): boolean {
  return fn?.returnType?.typeAnnotation?.type === "TSVoidKeyword";
}

function isFunctionNode(node: AstNode | null | undefined): boolean {
  return (
    node?.type === "FunctionDeclaration" ||
    node?.type === "TSDeclareFunction" ||
    node?.type === "FunctionExpression" ||
    node?.type === "ArrowFunctionExpression"
  );
}

/**
 * Exported functions whose EXPLICIT return annotation is `void`, read from the
 * Babel AST (not regex / char scanning): covers `export function f(): void`,
 * overload signatures, `export const f = (...): void => ...` /
 * `= function (): void {}`, and local declarations re-exported via
 * `export { f }`. Generics, string defaults containing parens, comments and
 * multi-line annotations are handled by the parser itself.
 *
 * Earlier versions misattributed across functions (lazy `[\s\S]*?` regex) or
 * missed `f(x = ")"): void` / `f<T>(x: T): void` (paren counting). A parse
 * failure THROWS — a silently skipped store would be a new blind spot.
 *
 * Parser: `typescript@7` is the native (Go) build with no in-process
 * `createSourceFile` API, so this uses `@babel/parser` (pure JS, declared in
 * the root package.json).
 */
export function extractVoidSetterNames(
  source: string,
  filename = "source.ts"
): string[] {
  const program = parseModule(source, filename);

  // Local (possibly un-exported) void functions, for `export { f }` forms.
  const localVoid = new Set<string>();
  const collectDecl = (decl: AstNode | null | undefined, out: Set<string>) => {
    if (!decl) return;
    if (
      (decl.type === "FunctionDeclaration" || decl.type === "TSDeclareFunction") &&
      decl.id?.name &&
      hasVoidReturn(decl)
    ) {
      out.add(decl.id.name);
    } else if (decl.type === "VariableDeclaration") {
      for (const d of decl.declarations ?? []) {
        if (d.id?.type === "Identifier" && isFunctionNode(d.init) && hasVoidReturn(d.init)) {
          out.add(d.id.name);
        }
      }
    }
  };

  const names = new Set<string>();
  for (const stmt of program.body) collectDecl(stmt, localVoid);
  for (const stmt of program.body) {
    if (stmt.type !== "ExportNamedDeclaration") continue;
    if (stmt.declaration) {
      collectDecl(stmt.declaration, names);
    } else if (!stmt.source) {
      for (const spec of stmt.specifiers ?? []) {
        const local = spec.local?.name;
        const exported = spec.exported?.name ?? spec.exported?.value;
        if (local && exported && localVoid.has(local)) names.add(exported);
      }
    }
  }
  return [...names];
}

const SOURCE_EXT_RE = /\.(?:tsx?|jsx?)$/;

/**
 * Resolve an import specifier to a repo-relative module path WITHOUT extension
 * (e.g. "packages/render/table/tableStore"). Relative specifiers resolve
 * against the importer; bare specifiers map to `packages/<spec>` (workspace
 * packages are symlinked as top-level modules). Callers compare the result
 * against known store/barrel modules, so unknown targets simply never match.
 */
function resolveSpecifier(importerRel: string, spec: string): string {
  const raw = spec.startsWith(".")
    ? posix.join(posix.dirname(importerRel), spec)
    : `packages/${spec}`;
  return posix.normalize(raw).replace(SOURCE_EXT_RE, "");
}

function moduleKey(rel: string): string {
  return rel.replace(SOURCE_EXT_RE, "");
}

type ModuleIndex = Map<string, PeeledStoreModule>;

function indexModules(modules: readonly PeeledStoreModule[]): ModuleIndex {
  const index: ModuleIndex = new Map();
  for (const m of modules) {
    const key = moduleKey(m.module);
    index.set(key, m);
    if (key.endsWith("/index")) index.set(key.slice(0, -"/index".length), m);
  }
  return index;
}

/**
 * Specifier basenames a source must mention to possibly import one of
 * `modules` — a pure prefilter that skips parsing unrelated files. It cannot
 * hide a real import: every resolvable specifier ends in one of these tokens.
 */
function mentionsAnyModule(source: string, modules: Iterable<PeeledStoreModule>): boolean {
  for (const m of modules) {
    const parts = moduleKey(m.module).split("/");
    const base = parts[parts.length - 1] === "index" ? parts[parts.length - 2] : parts[parts.length - 1];
    if (base && source.includes(base)) return true;
  }
  return false;
}

function lookupModule(index: ModuleIndex, importerRel: string, spec: string) {
  return index.get(resolveSpecifier(importerRel, spec));
}

function exportedName(node: AstNode | null | undefined): string | undefined {
  return node?.type === "StringLiteral" ? node.value : node?.name;
}

/** Store module that ultimately defines exported setter `name` of `m`. */
function setterOrigin(m: PeeledStoreModule, name: string): { module: string; setter: string } {
  const origin = m.origin?.[name];
  if (!origin) return { module: m.module, setter: name };
  const hash = origin.lastIndexOf("#");
  return { module: origin.slice(0, hash), setter: origin.slice(hash + 1) };
}

/**
 * Barrels re-exporting peeled-store setters (`export { a as b } from`,
 * `export * from`, `export * as ns from`, `import { a } ...; export { a }`)
 * become module entries too, so imports through them still resolve. Iterates
 * to a fixpoint for barrel-of-barrel chains.
 */
function collectBarrels(
  files: ReadonlyArray<{ rel: string; source: string }>,
  stores: PeeledStoreModule[]
): PeeledStoreModule[] {
  const candidates = files.filter(
    ({ rel, source }) => /\bexport\s*(?:\*|\{)/.test(source) && !stores.some((s) => s.module === rel)
  );
  const parsed = new Map<string, AstNode[]>();
  const barrels = new Map<string, PeeledStoreModule>();
  for (let round = 0; round < 8; round++) {
    const index = indexModules([...stores, ...barrels.values()]);
    let changed = false;
    for (const { rel, source } of candidates) {
      if (!mentionsAnyModule(source, index.values())) continue;
      let body = parsed.get(rel);
      if (!body) {
        body = parseModule(source, rel).body;
        parsed.set(rel, body);
      }
      const voidSetters = new Set<string>();
      const origin: Record<string, string> = {};
      const namespaces: Record<string, string> = {};
      const addSetter = (from: PeeledStoreModule, name: string, as: string) => {
        const o = setterOrigin(from, name);
        voidSetters.add(as);
        origin[as] = `${o.module}#${o.setter}`;
      };
      const importedSetters = new Map<string, { from: PeeledStoreModule; name: string }>();
      const importedNs = new Map<string, PeeledStoreModule>();
      for (const stmt of body) {
        if (stmt.type === "ImportDeclaration") {
          const from = lookupModule(index, rel, stmt.source.value);
          if (!from) continue;
          for (const spec of stmt.specifiers ?? []) {
            if (spec.type === "ImportNamespaceSpecifier") importedNs.set(spec.local.name, from);
            const name = exportedName(spec.imported);
            if (spec.type === "ImportSpecifier" && name && from.voidSetters.includes(name)) {
              importedSetters.set(spec.local.name, { from, name });
            }
          }
        }
      }
      for (const stmt of body) {
        if (stmt.type === "ExportAllDeclaration") {
          const from = lookupModule(index, rel, stmt.source.value);
          if (from) for (const name of from.voidSetters) addSetter(from, name, name);
        } else if (stmt.type === "ExportNamedDeclaration") {
          const from = stmt.source ? lookupModule(index, rel, stmt.source.value) : undefined;
          for (const spec of stmt.specifiers ?? []) {
            const as = exportedName(spec.exported);
            if (!as) continue;
            if (spec.type === "ExportNamespaceSpecifier") {
              if (from) namespaces[as] = from.module;
              continue;
            }
            const local = exportedName(spec.local);
            if (!local) continue;
            if (from) {
              if (from.voidSetters.includes(local)) addSetter(from, local, as);
            } else if (importedSetters.has(local)) {
              const hit = importedSetters.get(local)!;
              addSetter(hit.from, hit.name, as);
            } else if (importedNs.has(local)) {
              namespaces[as] = importedNs.get(local)!.module;
            }
          }
        }
      }
      if (voidSetters.size === 0 && Object.keys(namespaces).length === 0) continue;
      const next: PeeledStoreModule = { module: rel, voidSetters: [...voidSetters].sort(), origin, namespaces };
      if (JSON.stringify(barrels.get(rel)) !== JSON.stringify(next)) {
        barrels.set(rel, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return [...barrels.values()];
}

export function collectPeeledStoreModules(root: string): PeeledStoreModule[] {
  const files = collectProductionFiles(root);
  const stores: PeeledStoreModule[] = [];
  for (const { rel, source } of files) {
    if (!PEELED_STORE_FILE_RE.test(rel)) continue;
    if (!source.includes(MODULE_STORE_MARKER)) continue;
    const voidSetters = extractVoidSetterNames(source, rel);
    if (voidSetters.length === 0) continue;
    stores.push({ module: rel, voidSetters });
  }
  return [...stores, ...collectBarrels(files, stores)];
}

/* ---------------- call-site resolution (AST, binding-aware) ---------------- */

type Binding =
  | { kind: "setter"; module: string; setter: string }
  | { kind: "namespace"; store: PeeledStoreModule }
  | { kind: "opaque"; module: string; why: string };

type Target = Binding | { kind: "other" };

const DISPATCH_NAME_RE = /^(?:dispatch|\w+Dispatch)$/;
const TYPE_ONLY_KEYS = new Set([
  "typeAnnotation",
  "typeParameters",
  "typeArguments",
  "returnType",
  "superTypeParameters",
]);
const FUNCTION_TYPES = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
  "ObjectMethod",
  "ClassMethod",
]);

/** Strip parens/TS wrappers that do not change the runtime value. */
function unwrap(node: AstNode): AstNode {
  let cur = node;
  while (
    cur.type === "ParenthesizedExpression" ||
    cur.type === "TSAsExpression" ||
    cur.type === "TSSatisfiesExpression" ||
    cur.type === "TSNonNullExpression" ||
    cur.type === "TSTypeAssertion" ||
    cur.type === "TSInstantiationExpression"
  ) {
    cur = cur.expression;
  }
  return cur;
}

function isDispatchCallee(callee: AstNode): boolean {
  const c = unwrap(callee);
  if (c.type === "Identifier") return DISPATCH_NAME_RE.test(c.name);
  if (c.type === "MemberExpression" || c.type === "OptionalMemberExpression") {
    return !c.computed && c.property.type === "Identifier" && DISPATCH_NAME_RE.test(c.property.name);
  }
  return false;
}

function isCall(node: AstNode): boolean {
  return node.type === "CallExpression" || node.type === "OptionalCallExpression";
}

function childNodes(node: AstNode): AstNode[] {
  const out: AstNode[] = [];
  for (const key of Object.keys(node)) {
    if (
      key === "loc" ||
      key === "extra" ||
      key === "leadingComments" ||
      key === "trailingComments" ||
      key === "innerComments" ||
      TYPE_ONLY_KEYS.has(key)
    ) {
      continue;
    }
    // Non-computed property keys are names, not references.
    if (key === "key" && !node.computed && !node.shorthand) continue;
    if (key === "property" && !node.computed) continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const v of value) if (v && typeof v.type === "string") out.push(v);
    } else if (value && typeof value.type === "string") {
      out.push(value);
    }
  }
  return out;
}

function walk(node: AstNode, visit: (n: AstNode) => void): void {
  visit(node);
  for (const child of childNodes(node)) walk(child, visit);
}

/** Expressions whose value becomes the dispatched value (dispatch's argument). */
function resultPositions(node: AstNode): AstNode[] {
  const n = unwrap(node);
  if (n.type === "ConditionalExpression") {
    return [...resultPositions(n.consequent), ...resultPositions(n.alternate)];
  }
  if (n.type === "LogicalExpression") return [...resultPositions(n.left), ...resultPositions(n.right)];
  if (n.type === "SequenceExpression") return resultPositions(n.expressions[n.expressions.length - 1]);
  if (n.type === "AwaitExpression") return resultPositions(n.argument);
  return [n];
}

export function scanPeeledStoreDispatch(
  rel: string,
  source: string,
  modules: readonly PeeledStoreModule[]
): ReduxBoundaryViolation[] {
  if (modules.length === 0 || !/dispatch/i.test(source) || !mentionsAnyModule(source, modules)) {
    return [];
  }
  const index = indexModules(modules);
  const program = parseModule(source, rel);

  // 1) Bindings that point into peeled stores / barrels.
  const bindings = new Map<string, Binding>();
  for (const stmt of program.body) {
    if (stmt.type !== "ImportDeclaration" || stmt.importKind === "type") continue;
    const from = lookupModule(index, rel, stmt.source.value);
    if (!from) continue;
    for (const spec of stmt.specifiers ?? []) {
      if (spec.importKind === "type") continue;
      const local = spec.local.name;
      if (spec.type === "ImportNamespaceSpecifier") {
        bindings.set(local, { kind: "namespace", store: from });
      } else if (spec.type === "ImportDefaultSpecifier") {
        bindings.set(local, { kind: "opaque", module: from.module, why: "default import" });
      } else {
        const name = exportedName(spec.imported)!;
        const nsModule = from.namespaces?.[name];
        const nsStore = nsModule ? modules.find((m) => m.module === nsModule) : undefined;
        if (from.voidSetters.includes(name)) {
          const o = setterOrigin(from, name);
          bindings.set(local, { kind: "setter", module: o.module, setter: o.setter });
        } else if (nsStore) {
          bindings.set(local, { kind: "namespace", store: nsStore });
        }
      }
    }
  }

  const resolve = (expr: AstNode): Target | undefined => {
    const n = unwrap(expr);
    if (n.type === "Identifier") return bindings.get(n.name);
    if (n.type === "MemberExpression" || n.type === "OptionalMemberExpression") {
      const obj = resolve(n.object);
      if (!obj) return undefined;
      if (obj.kind === "other") return obj;
      if (obj.kind !== "namespace") return { kind: "opaque", module: obj.module, why: "member access on a store binding" };
      const prop = n.computed ? (n.property.type === "StringLiteral" ? n.property.value : undefined) : n.property.name;
      if (prop === undefined) return { kind: "opaque", module: obj.store.module, why: "computed namespace member" };
      if (obj.store.voidSetters.includes(prop)) {
        const o = setterOrigin(obj.store, prop);
        return { kind: "setter", module: o.module, setter: o.setter };
      }
      const nsModule = obj.store.namespaces?.[prop];
      const nsStore = nsModule ? modules.find((m) => m.module === nsModule) : undefined;
      return nsStore ? { kind: "namespace", store: nsStore } : { kind: "other" };
    }
    return undefined;
  };

  // 2) Simple local aliases: `const f = setX`, `const f = ns.setX`,
  //    `const { setX: f } = ns` (scope-insensitive, two passes for chains).
  for (let pass = 0; pass < 2; pass++) {
    walk(program as unknown as AstNode, (n) => {
      if (n.type !== "VariableDeclarator" || !n.init) return;
      const target = resolve(n.init);
      if (!target || target.kind === "other") return;
      if (n.id.type === "Identifier") {
        bindings.set(n.id.name, target);
      } else if (n.id.type === "ObjectPattern" && target.kind === "namespace") {
        for (const p of n.id.properties) {
          const key = p.type === "ObjectProperty" && !p.computed ? exportedName(p.key) : undefined;
          const value = p.type === "ObjectProperty" ? p.value : undefined;
          if (!key || value?.type !== "Identifier") continue;
          if (target.store.voidSetters.includes(key)) {
            const o = setterOrigin(target.store, key);
            bindings.set(value.name, { kind: "setter", module: o.module, setter: o.setter });
          }
        }
      }
    });
  }
  if (bindings.size === 0) return [];

  // 3) dispatch(...) call sites.
  const violations: ReduxBoundaryViolation[] = [];
  const seen = new Set<string>();
  const report = (v: ReduxBoundaryViolation) => {
    const key = `${v.kind}|${v.reason}`;
    if (!seen.has(key)) {
      seen.add(key);
      violations.push(v);
    }
  };
  const line = (n: AstNode) => n.loc?.start?.line ?? 0;

  walk(program as unknown as AstNode, (call) => {
    if (!isCall(call) || !isDispatchCallee(call.callee)) return;
    const arg = call.arguments?.[0];
    if (!arg) return;
    const accounted = new Set<AstNode>();
    for (const result of resultPositions(arg)) {
      if (!isCall(result)) continue;
      const target = resolve(result.callee);
      accounted.add(unwrap(result.callee));
      if (target?.kind === "setter") {
        const callee = unwrap(result.callee);
        const shown = callee.type === "Identifier" && callee.name !== target.setter
          ? `${callee.name} (= ${target.setter})`
          : target.setter;
        report({
          file: rel,
          kind: "void-setter-dispatch",
          reason: `dispatch() wraps void setter ${shown}() from ${target.module} (line ${line(call)}) — dispatch(undefined) throws Redux error #7 at runtime; call the module-store setter directly.`,
        });
      } else if (target?.kind === "opaque" || target?.kind === "namespace") {
        report({
          file: rel,
          kind: "undetermined",
          reason: `undetermined: dispatch() argument at line ${line(call)} calls a ${target.kind === "opaque" ? target.why : "store namespace"} from ${target.kind === "opaque" ? target.module : target.store.module}; cannot prove it is not a void setter — rewrite as a direct named/namespace call.`,
        });
      }
    }
    // Any other store reference inside the argument, outside nested functions,
    // whose value flows somewhere the guard cannot follow → fail closed.
    const inspect = (node: AstNode): void => {
      if (FUNCTION_TYPES.has(node.type)) return; // thunk bodies may call setters directly
      if (accounted.has(node)) return;
      const target = node.type === "Identifier" || node.type.endsWith("MemberExpression") ? resolve(node) : undefined;
      if (target) {
        if (target.kind === "other") return;
        report({
          file: rel,
          kind: "undetermined",
          reason: `undetermined: dispatch() argument at line ${line(call)} references ${target.kind === "setter" ? `void setter ${target.setter}() from ${target.module}` : target.kind === "namespace" ? `store namespace ${target.store.module}` : `${target.why} from ${target.module}`} in a position the guard cannot follow.`,
        });
        return;
      }
      for (const child of childNodes(node)) inspect(child);
    };
    inspect(arg);
  });
  return violations;
}

export function scanPeeledStoreDispatches(root: string): ReduxBoundaryViolation[] {
  const modules = collectPeeledStoreModules(root);
  const violations: ReduxBoundaryViolation[] = [];
  for (const { rel, source } of collectProductionFiles(root)) {
    violations.push(...scanPeeledStoreDispatch(rel, source, modules));
  }
  return violations;
}
