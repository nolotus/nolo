/**
 * 媒体任务目标语言码 —— 客户端与服务端**共用的唯一真值源**。
 *
 * 背景（2026-10-13 独立审查 MEDIUM）：此前 web 端 `chat/web/mediaJobs.ts` 的
 * `SUPPORTED_MEDIA_TARGET_LANGS` 与服务端 `server/handlers/mediaJobs/languages.ts` 的
 * `TARGET_LANGUAGES` 键各是一份清单。当时两份一致（同样 10 个码），但互为真值源，新增语言会漂移。
 * 现在两侧都从这里导入：
 *   - 客户端：`SUPPORTED_MEDIA_TARGET_LANGS` 直接引用本清单（同一对象，无法漂移）；
 *   - 服务端：`TARGET_LANGUAGES` 声明为 `Record<MediaTargetLangCode, TargetLanguage>`（tsc 强制键集合一致），
 *     `SUPPORTED_TARGET_LANGS` 也引用本清单；`languages.test.ts` 运行时断言 record 键序列与本清单逐项相等。
 *
 * 为什么放在 ai/lecture 而不是任一侧：这是服务端与 web 都依赖的共享契约层
 * （同层已有 `ai/lecture/types.ts`、`ai/lecture/mediaToolConfirm.ts`），客户端不得反向依赖服务端模块。
 *
 * 改动须知：本清单只有**语言码**。新增码时必须在服务端 TARGET_LANGUAGES 里补对应条目
 * （name/english/outputTokenFactor，缺失会被 tsc 与 languages.test.ts 挡下）。
 * 顺序即对外展示顺序（400 文案与支持的 supported 列表），不要顺手重排。
 */
export const MEDIA_TARGET_LANG_CODES = [
  "zh",
  "en",
  "ru",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "pt",
  "ar",
] as const;

export type MediaTargetLangCode = (typeof MEDIA_TARGET_LANG_CODES)[number];
