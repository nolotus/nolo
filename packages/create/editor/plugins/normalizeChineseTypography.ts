// editor/plugins/normalizeChineseTypography.ts
export const normalizeChineseTypography = (input: string): string => {
  let text = input;

  // ===== 0. 提前返回：空字符串／全空白没必要处理 =====
  if (!text || !text.trim()) return text;

  // ===== 1. 折叠重复标点：！！ → ！, ？？ → ？ 等 =====
  text = text
    // 折叠英文/中文叹号
    .replace(/[!！]{2,}/g, "！")
    // 折叠英文/中文问号
    .replace(/[?？]{2,}/g, "？")
    // 连续逗号
    .replace(/[,，]{2,}/g, "，")
    // 连续句号
    .replace(/[.。]{2,}/g, "。");

  // ===== 2. 半角标点在 CJK 附近时替换成全角 =====
  // CJK 统一表意文字范围（含中日韓扩展示意，够用即可）
  const CJK_RANGE = "\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF";
  const CJK = `[${CJK_RANGE}]`;

  const fullWidthPunctMap: Record<string, string> = {
    ",": "，",
    ".": "。",
    "!": "！",
    "?": "？",
    ":": "：",
    ";": "；",
  };

  // CJK + 半角标点 → CJK + 全角标点
  text = text.replace(
    new RegExp(`(${CJK})([,.!?:;])`, "g"),
    (_, cjk: string, p: string) => cjk + (fullWidthPunctMap[p] ?? p)
  );

  // 半角标点 + CJK → 全角标点 + CJK
  text = text.replace(
    new RegExp(`([,.!?:;])(${CJK})`, "g"),
    (_, p: string, cjk: string) => (fullWidthPunctMap[p] ?? p) + cjk
  );

  // ===== 3. 全角标点两侧不留空格 =====
  // 「iPhone ， 好開心！」→「iPhone，好開心！」
  text = text.replace(/\s*([，。！？：；])\s*/g, "$1");

  // ===== 4. 中英文之间、中文与数字之间自动加空格 =====
  // 说明：
  // - CJK 与 ASCII/数字之间：在边界插入一个空格
  // - 数字与 CJK：同理
  // - 数字与英文单位：10Gbps → 10 Gbps   （不动 15% / 90°）
  const ALNUM = "[A-Za-z0-9]";

  // CJK + 英文/数字
  text = text.replace(
    new RegExp(`(${CJK})(${ALNUM})`, "g"),
    "$1 $2"
  );
  // 英文/数字 + CJK
  text = text.replace(
    new RegExp(`(${ALNUM})(${CJK})`, "g"),
    "$1 $2"
  );

  // 数字 + CJK（5000元 → 5000 元），这里冗余一层保证覆盖
  text = text.replace(
    new RegExp(`(${CJK})([0-9])`, "g"),
    "$1 $2"
  );
  text = text.replace(
    new RegExp(`([0-9])(${CJK})`, "g"),
    "$1 $2"
  );

  // 数字 + 英文字母：10Gbps → 10 Gbps
  // 注意：不会影响 15% / 90°，因为 % 和 ° 不在 [A-Za-z] 范围内
  text = text.replace(/(\d)([A-Za-z])/, "$1 $2");

  // ===== 5. 收尾：多空格压成单个空格（不动换行）=====
  text = text.replace(/ {2,}/g, " ");

  return text;
};