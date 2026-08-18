// packages/render/styles/zIndex.ts
var zIndex = {
  // --- 1. 基础布局层 ---
  topbar: 100,
  // 必须高于页面内 sticky 元素（如 content-header z-index:20）
  sidebarBackdrop: 5,
  sidebar: 6,
  // 移动端抽屉：必须高于页面内 sticky 内容（首页 quick-chat 输入条 z-index:20）
  mobileDrawerBackdrop: 60,
  mobileDrawer: 70,
  // --- 3. 浮动组件层 ---
  // 侧边栏下拉需覆盖 sticky 分类头/顶部控件，避免出现“被挡住”的回归。
  dropdown: 1e3,
  // --- 4. 模态框与全局菜单层 ---
  modalBackdrop: 1010
};

export {
  zIndex
};
