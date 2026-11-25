import React, { Suspense, lazy } from "react";
import { useIsLoggedIn } from "identity";
import ContentActionBar from "render/layout/ContentActionBar";
import { useTopBarStateContext } from "render/layout/TopBarStateContext";

/**
 * 内容对象页（表格 / App / 文件）顶部的轻量动作行：
 * 左侧导航簇 + 对象动作（各自的工具槽 + AI + 溢出菜单）+ 右侧用户簇。
 * 没有背景条、没有底边线，靠页面自己的留白分区。
 */
// 懒加载：chrome 模块带 identity 依赖，静态引入会把 identity/database 链
// 拉进只渲染 UI 的页面模块（测试环境里会触发原生模块告警）。
// 左侧导航来自 PageNavChrome.tsx（不依赖创建菜单），游客渲染导航时不会连带
// 下载新建菜单依赖；右侧用户簇按登录态分派，登录态那份里创建入口是 eager 的。
const PageNavChrome = lazy(() =>
  import("render/layout/PageNavChrome").then((m) => ({ default: m.PageNavChrome })),
);
// 登录态用户簇与游客用户簇分居两个模块：登录态模块里创建入口是 eager 的
// （随 chrome 同一次加载到手，不另发切片请求），游客模块不碰创建入口。
const PageUserChrome = lazy(() =>
  import("render/layout/PageTopChrome").then((m) => ({ default: m.PageUserChrome })),
);
const GuestUserChrome = lazy(() =>
  import("render/layout/GuestPageChrome").then((m) => ({ default: m.GuestUserChrome })),
);

const PageObjectActions: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();
  const state = useTopBarStateContext();
  if (!state) return null;

  // App 页暂时不出对象动作：TopbarAppSlot 与页面自带的浏览器动作条功能重叠
  // （编辑 / 版本管理 / 删除），在 App 页切换到 TopbarAppSlot 之前先避免出现
  // 两套入口。contentKeyType 已能正确识别 'app'，切换时把这里去掉即可。
  const showObjectActions = state.contentKeyType !== "app";

  return (
    <div className="page-object-actions">
      <Suspense fallback={null}>
        <PageNavChrome />
      </Suspense>
      {showObjectActions ? <ContentActionBar state={state} /> : null}
      <Suspense fallback={null}>
        {isLoggedIn ? <PageUserChrome /> : <GuestUserChrome />}
      </Suspense>
    </div>
  );
};

export default PageObjectActions;
