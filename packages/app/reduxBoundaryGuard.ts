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
  "packages/ai/agent/streamAgentChatTurn.ts",
  "packages/ai/agent/streamAgentChatTurnUtils.ts",
  "packages/ai/agent/streamTurnMessageBuild.ts",
  "packages/ai/agent/streamTurnQuickChat.ts",
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
  "packages/app/favorite/favoriteStore.ts",
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
  "packages/auth/web/Login.tsx",
  "packages/auth/web/UserGrowthPage.tsx",
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
  "packages/chat/web/MessageInputContainer.tsx",
  "packages/chat/web/MessageInputCore.tsx",
  "packages/chat/web/SendButton.tsx",
  "packages/chat/web/StopGenerationButton.tsx",
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
  "packages/render/surf/screens/SurfWeatherLabelCol.tsx",
  "packages/render/table/useCreateTable.ts",
  "packages/render/table/useTable.ts",
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
