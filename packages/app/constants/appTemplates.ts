export interface AppTemplate {
  id: string;
  labelKey: string;
  fallback: string;
  launchSlug: string;
  descriptionKey: string;
  descriptionFallback: string;
  description: string;
  /**
   * 是否在「新增应用」菜单里直接露出。
   * 模板本身与直达入口始终保留（可通过 /chat?launch=<launchSlug> 使用），
   * 这里只控制菜单展示，避免菜单被具体模板占满。
   */
  showInCreateMenu: boolean;
}

export const APP_TEMPLATE_SURF: AppTemplate = {
  id: "surf",
  labelKey: "appTemplate.surf.title",
  fallback: "冲浪工作台",
  launchSlug: "create-app-surf",
  descriptionKey: "appTemplate.surf.description",
  descriptionFallback: "打造专属冲浪工作台，集成实时浪况、风向潮汐与自定义浪点",
  description: "打造专属冲浪工作台，集成实时浪况、风向潮汐与自定义浪点",
  showInCreateMenu: false,
};

export const APP_TEMPLATES: readonly AppTemplate[] = [
  APP_TEMPLATE_SURF,
] as const;
