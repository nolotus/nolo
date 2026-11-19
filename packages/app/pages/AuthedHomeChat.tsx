// 文件路径: packages/app/pages/AuthedHomeChat.tsx

import * as stylex from "@stylexjs/stylex";

import { useMyContentItems } from "app/hooks/useMyContentItems";

import QuickChat from "./QuickChat";
import { homeStyles } from "./HomeStyles";
import { withLiteralClass } from "./share/withLiteralClass";

/**
 * 登录态首页的聊天面板。
 *
 * 它与 `Home.tsx` 分开并按需加载是有意的：`useMyContentItems` 会去拉本地内容
 * 列表（IndexedDB / abstract-level 依赖链），而访客永远进不了这条分支。把它留在
 * `Home.tsx` 里，等于让每个访客都为一次自己用不到的查询付下载与执行成本。
 */
const AuthedHomeChat = () => {
  const { items, loading } = useMyContentItems();
  const isEmptyState = !loading && items.length === 0;

  return (
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
  );
};

export default AuthedHomeChat;
