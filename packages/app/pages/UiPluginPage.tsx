import React, { lazy, Suspense } from "react";
import { Link } from "app/routing";
import { useUiPlugins } from "app/hooks/index";
import { isUiPluginEnabled } from "app/plugins/uiPlugins";
import "ai/agent/web/PluginExplore.css";

const MusicWidget = lazy(() => import("chat/web/sidebar/MusicWidget"));

export const UiPluginPage: React.FC<{ id: "music" | "calendar" }> = ({ id }) => {
  const enabled = isUiPluginEnabled(useUiPlugins(), id);
  const title = id === "music" ? "音乐" : "日历";
  return <main className="plugin-config-page" data-testid={`ui-plugin-${id}`}>
    <header className="plugin-config-page__head"><h1 className="plugin-config-page__title">{title}</h1>
      <Link to={`/plugins/${id}`}>插件配置</Link></header>
    {!enabled ? <section className="plugin-card" role="status">插件尚未开启，请先在插件配置中创建并开启。</section>
      : id === "music" ? <Suspense fallback={<p role="status">音乐加载中…</p>}><MusicWidget standalone /></Suspense>
      : <section className="plugin-card" role="status"><h2>日历占位</h2><p>日程、提醒与同步尚未实现，此处不展示模拟日程。</p></section>}
  </main>;
};
export default UiPluginPage;
