// 文件路径: packages/app/pages/Home.tsx

import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "app/routing";
import { selectDesktopProject } from "chat/web/desktopFolderProjects";
import { DESKTOP_FOLDER_SELECTION_EVENT, readSelectedDesktopFolderProject } from "chat/web/desktopFolderProjects";

import { useHasMounted } from "app/hooks/useHasMounted";
import { usePageMeta, useStaticPageMeta } from "app/hooks/usePageMeta";
import { useCurrentUser, useIsLoggedIn, useToken } from "identity";
import { useMyContentItems } from "app/hooks/useMyContentItems";

import HomeLanding from "./HomeLanding";
import DesktopAgentOnboarding from "./DesktopAgentOnboarding";
import QuickChat from "./QuickChat";
import ProjectHomeWorkspace from "./ProjectHomeWorkspace";
import { getIsDesktopApp } from "app/utils/env";
import { getIsDesktopPreview } from "app/utils/env";
import { getIsDesktopUiPreview } from "app/utils/env";
import {
  readLocalFirstOnboardingDismissed,
  writeLocalFirstOnboardingDismissed,
} from "app/localFirst/onboardingDismissed";

import * as stylex from "@stylexjs/stylex";
import { homeStyles } from "./HomeStyles";
import { withLiteralClass } from "./share/withLiteralClass";
import "./home-motion.css";
import "./Home.css";

const Home = () => {
  const hasMounted = useHasMounted();
  const location = useLocation();
  const navigate = useNavigate();
  const projectId = new URLSearchParams(location.search).get("project");
  const [projectAgentId, setProjectAgentId] = useState("");
  const [project, setProject] = useState<ReturnType<typeof readSelectedDesktopFolderProject>>(null);
  useEffect(() => {
    const sync = () => {
      try {
        if (!getIsDesktopApp() || !projectId) {
          setProject(null);
          return;
        }
        // Respect an explicit exit: never choose a project or seed demo records here.
        const selected = readSelectedDesktopFolderProject(window.localStorage);
        setProject(selected?.id === projectId ? selected : null);
        setProjectAgentId("");
      } catch {
        setProject(null);
      }
    };
    sync();
    window.addEventListener(DESKTOP_FOLDER_SELECTION_EVENT, sync);
    return () => window.removeEventListener(DESKTOP_FOLDER_SELECTION_EVENT, sync);
  }, [projectId]);
  const isLoggedIn = useIsLoggedIn();
  const linkedAgents = (project?.linkedContentKeys ?? []).filter((key) => key.startsWith("agent-"));
  const currentUser = useCurrentUser();
  const token = useToken();
  // Local User remains the authenticated home owner for local data/widgets.
  // Desktop edition: the session hooks report real isLoggedIn (anonymous=false)
  // but the local home must stay the anonymous entry — currentUser carries the
  // Local User fallback, a token only distinguishes a real cloud account when
  // deciding whether the Desktop first-run guide still needs to be shown.
  const isDesktopApp = getIsDesktopApp();
  // 渲染面判据：真桌面壳，或 loopback 开发下的 `?desktop=1` 外观预览。
  // 只决定「渲染哪套布局」；项目绑定、cwd、工具挂载等能力面仍看 isDesktopApp。
  const isDesktopUi = getIsDesktopUiPreview();
  const showAuthedHome = hasMounted && (!!currentUser || isDesktopUi);
  const pageMeta = useStaticPageMeta(showAuthedHome ? "default" : "home");
  const { items: myContentItems, loading: myContentLoading } = useMyContentItems();
  const isEmptyState = showAuthedHome && !myContentLoading && myContentItems.length === 0;

  // Desktop Agent-first onboarding. Device-local durable dismiss (shared local-first key),
  // matching RN: login/signup/local paths/skip all complete onboarding. Not account-scoped
  // and not synced; logout must not bring the guide back. Public web never shows it.
  // Lazy-init from localStorage avoids a post-mount flash of onboarding when already dismissed.
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    if (getIsDesktopPreview()) return true;
    return readLocalFirstOnboardingDismissed(window.localStorage);
  });
  const hasCloudAccount = Boolean(token);
  const showDesktopOnboarding =
    isDesktopApp && !hasCloudAccount && !onboardingDismissed;

  const handleDismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (typeof window !== "undefined") {
      writeLocalFirstOnboardingDismissed(window.localStorage, true);
    }
  }, []);

  usePageMeta(pageMeta);


  return (
    <>
      <div
        {...withLiteralClass(
          `home-layout ${showAuthedHome ? "home-layout--authed" : "home-layout--guest"}`,
          showAuthedHome ? homeStyles.homeLayoutAuthed : homeStyles.homeLayout
        )}
      >
        <main
          {...withLiteralClass(
            "home-main",
            homeStyles.homeMain,
            showAuthedHome && homeStyles.homeMainAuthed,
            !showDesktopOnboarding && !showAuthedHome && !isDesktopUi && homeStyles.homeMainGuestLanding
          )}
        >
          {showDesktopOnboarding ? (
            <DesktopAgentOnboarding onDismiss={handleDismissOnboarding} />
          ) : showAuthedHome ? (
            project ? (
              <ProjectHomeWorkspace
                project={project}
                items={myContentItems}
                userId={currentUser?.userId || ""}
                projectAgentId={projectAgentId}
                onSelectProjectAgentId={setProjectAgentId}
                onExitProject={() => {
                  selectDesktopProject(window.localStorage, null);
                  navigate("/");
                  setProjectAgentId("");
                }}
              />
            ) : (
              <section {...stylex.props(homeStyles.homeBottomChatShell)}>
                <div
                  {...withLiteralClass(
                    "home-primary-chat",
                    homeStyles.homePrimaryChat,
                    homeStyles.homePrimaryChatInShell
                  )}
                >
                  <QuickChat surface="home-primary" isEmptyState={isEmptyState} />
                </div>
              </section>
            )
          ) : (
            <>
              {!isDesktopUi && <HomeLanding />}

            </>
          )}

        </main>
      </div>
    </>
  );
};

export default Home;