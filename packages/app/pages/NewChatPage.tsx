import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "app/routing";
import { usePageMeta, useStaticPageMeta } from "app/hooks/usePageMeta";
import QuickChat from "./QuickChat";
import SpaceContextBadge from "chat/dialog/SpaceContextBadge";
import SpaceNavigation from "create/space/components/SpaceNavigation";
import "./NewChatPage.css";

const NewChatPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rawSpaceId = searchParams.get("spaceId");
  const spaceId = rawSpaceId?.trim() ? rawSpaceId : undefined;
  // `?launch=feedback` 等直达入口（用户菜单里的「我想反馈」）。
  const launch = searchParams.get("launch");

  const pageMeta = useStaticPageMeta("default");
  usePageMeta(pageMeta);

  return (
    <main className="new-chat-page">
      <section
        className="new-chat-page__content"
        aria-label={t("chat:newchat", "新对话")}
      >
        {/* 空间首页 = 该空间的对话页（`/space/:id` 重定向到 `/chat?spaceId=`），
            所以「首页 / 全部内容 / 成员 / 设置」这排导航要跟着空间一起出现；
            没有 spaceId 的普通新对话不渲染它，也绝不借用全局当前空间。 */}
        {spaceId && (
          <div className="new-chat-page__space-nav">
            <SpaceContextBadge spaceId={spaceId} />
            <SpaceNavigation spaceId={spaceId} />
          </div>
        )}
        <QuickChat
          surface="home-primary"
          spaceId={spaceId}
          launch={launch}
          isEmptyState
        />
      </section>
    </main>
  );
};

export default NewChatPage;
