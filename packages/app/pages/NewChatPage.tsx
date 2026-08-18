import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "app/routing";
import { usePageMeta } from "app/hooks/usePageMeta";
import { buildStaticPageMeta } from "app/seo/pageMeta";
import QuickChat from "./QuickChat";
import "./NewChatPage.css";

const NewChatPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rawSpaceId = searchParams.get("spaceId");
  const spaceId = rawSpaceId?.trim() ? rawSpaceId : undefined;
  // `?launch=feedback` 等直达入口（用户菜单里的「我想反馈」）。
  const launch = searchParams.get("launch");

  const pageMeta = useMemo(() => buildStaticPageMeta(t, "default"), [t]);
  usePageMeta(pageMeta);

  return (
    <main className="new-chat-page">
      <section
        className="new-chat-page__content"
        aria-label={t("chat:newchat", "新对话")}
      >
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
