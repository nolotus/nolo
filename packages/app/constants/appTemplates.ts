export interface AppTemplate {
  id: string;
  labelKey: string;
  fallback: string;
  launchSlug: string;
  descriptionKey: string;
  descriptionFallback: string;
  description: string;
}

export const APP_TEMPLATE_SURF: AppTemplate = {
  id: "surf",
  labelKey: "appTemplate.surf.title",
  fallback: "冲浪工作台",
  launchSlug: "create-app-surf",
  descriptionKey: "appTemplate.surf.description",
  descriptionFallback: "打造专属冲浪工作台，集成实时浪况、风向潮汐与自定义浪点",
  description: "打造专属冲浪工作台，集成实时浪况、风向潮汐与自定义浪点",
};

export const APP_TEMPLATES: readonly AppTemplate[] = [
  APP_TEMPLATE_SURF,
] as const;
