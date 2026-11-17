/** Small shared source for resource generation and stale-resource UI fallbacks. */
export const childRunObserverLabels = {
  "en": {
    "openChildPage": "Open child dialog",
    "savedActiveGroup": "Last saved active · not live",
    "historyGroup": "Other tasks",
    "viewDetails": "View details",
    "persistedRuns": "Persisted subagent runs",
    "persistedSnapshot": "Saved status · not live",
    "inProgressGroup": "In progress"
  },
  "zh-CN": {
    "openChildPage": "打开子对话",
    "savedActiveGroup": "上次保存为活跃 · 非实时",
    "historyGroup": "其他任务",
    "viewDetails": "查看详情",
    "persistedRuns": "已同步的子任务",
    "persistedSnapshot": "已保存状态 · 非实时",
    "inProgressGroup": "进行中"
  },
  "zh-Hant": {
    "openChildPage": "開啟子對話",
    "savedActiveGroup": "上次儲存為活躍 · 非即時",
    "historyGroup": "其他任務",
    "viewDetails": "查看詳情",
    "persistedRuns": "已同步的子任務",
    "persistedSnapshot": "已儲存狀態 · 非即時",
    "inProgressGroup": "進行中"
  },
  "ja": {
    "openChildPage": "子会話を開く",
    "savedActiveGroup": "最終保存時は実行中・非リアルタイム",
    "historyGroup": "その他のタスク",
    "viewDetails": "詳細を見る",
    "persistedRuns": "保存済みサブタスク",
    "persistedSnapshot": "保存済み状態・リアルタイムではありません",
    "inProgressGroup": "進行中"
  },
  "de": {
    "openChildPage": "Unterdialog öffnen",
    "savedActiveGroup": "Zuletzt aktiv gespeichert · nicht live",
    "historyGroup": "Weitere Aufgaben",
    "viewDetails": "Details ansehen",
    "persistedRuns": "Gespeicherte Unteraufgaben",
    "persistedSnapshot": "Gespeicherter Status · nicht live",
    "inProgressGroup": "In Bearbeitung"
  },
  "es": {
    "openChildPage": "Abrir diálogo secundario",
    "savedActiveGroup": "Activo al guardar · no en vivo",
    "historyGroup": "Otras tareas",
    "viewDetails": "Ver detalles",
    "persistedRuns": "Subtareas guardadas",
    "persistedSnapshot": "Estado guardado · no en vivo",
    "inProgressGroup": "En curso"
  }
} as const;

export function childRunObserverFallback(language: string | undefined, key: keyof typeof childRunObserverLabels.en): string {
  const normalized = language?.toLowerCase() ?? "en";
  const locale = normalized.startsWith("zh-hant") || normalized.startsWith("zh-tw") || normalized.startsWith("zh-hk")
    ? "zh-Hant" : normalized.startsWith("zh") ? "zh-CN" : normalized.split("-")[0];
  return (childRunObserverLabels[locale as keyof typeof childRunObserverLabels] ?? childRunObserverLabels.en)[key];
}
