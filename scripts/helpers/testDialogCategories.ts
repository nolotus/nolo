import { asNonEmptyStringArray } from "core/stringArray";

export interface TestDialogCategoryDefinition {
  id: string;
  name: string;
  order: number;
  keywords: string[];
}

export interface ExistingTestDialogCategory {
  id: string;
  name?: string;
}

export interface TestDialogCategoryResolution {
  categoryId?: string;
  categoryName?: string;
  order?: number;
  source: "explicit" | "agent-default" | "existing-match" | "seed" | "fallback" | "disabled";
  confidence: number;
}

export const DEFAULT_TEST_DIALOG_CATEGORY_ID = "test-dialogs";

export const TEST_DIALOG_CATEGORY_DEFINITIONS: TestDialogCategoryDefinition[] = [
  {
    id: "usage-management-tests",
    name: "用量管理测试",
    order: 10,
    keywords: [
      "usage",
      "用量",
      "费用",
      "计费",
      "gemini",
      "google api",
      "querymodelusage",
      "scheduled",
      "每日任务",
      "超额",
      "告警",
    ],
  },
  {
    id: "image-generation-tests",
    name: "图片生成测试",
    order: 20,
    keywords: [
      "image",
      "图片",
      "图像",
      "照片",
      "证件照",
      "生成",
      "白底",
      "photo",
    ],
  },
  {
    id: "table-sharing-tests",
    name: "表格分享测试",
    order: 30,
    keywords: [
      "table",
      "表格",
      "sharetable",
      "share table",
      "分享表",
      "live table",
    ],
  },
  {
    id: "web-fetch-tests",
    name: "网页抓取测试",
    order: 40,
    keywords: [
      "http://",
      "https://",
      "url",
      "网页",
      "抓取",
      "fetch",
      "read_x_post",
      "x.com",
      "twitter",
    ],
  },
  {
    id: "coding-tool-tests",
    name: "代码工具测试",
    order: 50,
    keywords: [
      "code",
      "代码",
      "文件",
      "package.json",
      "readfile",
      "edit",
      "编辑",
      "仓库",
    ],
  },
  {
    id: DEFAULT_TEST_DIALOG_CATEGORY_ID,
    name: "测试对话",
    order: 100,
    keywords: [],
  },
];

export const TEST_DIALOG_CATEGORY_BY_ID = Object.fromEntries(
  TEST_DIALOG_CATEGORY_DEFINITIONS.map((category) => [category.id, category]),
) as Record<string, TestDialogCategoryDefinition>;

const normalize = (value?: string) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeCategoryLabel = (value?: string) =>
  normalize(value)
    .replace(/测试|test|tests|对话|dialog|dialogs/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildHaystack = (input: {
  agentName?: string;
  agentKey?: string;
  userInput?: string;
  toolNames?: string[];
}) =>
  asNonEmptyStringArray([
    input.agentName,
    input.agentKey,
    input.userInput,
    ...(input.toolNames ?? []),
  ])
    .join("\n")
    .toLowerCase();

const scoreExistingCategory = (
  category: ExistingTestDialogCategory,
  haystack: string,
): number => {
  const id = normalize(category.id);
  const name = normalize(category.name);
  const coreName = normalizeCategoryLabel(category.name);
  const coreId = normalizeCategoryLabel(category.id);

  let score = 0;
  if (id && haystack.includes(id)) score = Math.max(score, 0.95);
  if (name && haystack.includes(name)) score = Math.max(score, 0.9);
  if (coreName && coreName.length >= 2 && haystack.includes(coreName)) {
    score = Math.max(score, 0.78);
  }
  if (coreId && coreId.length >= 3 && haystack.includes(coreId)) {
    score = Math.max(score, 0.72);
  }

  const seeded = TEST_DIALOG_CATEGORY_BY_ID[category.id];
  if (seeded?.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    score = Math.max(score, 0.86);
  }

  return score;
};

export function resolveTestDialogCategory(input: {
  explicitCategory?: string;
  continueDialogId?: string;
  disableDefaultTestRoot?: boolean;
  agentName?: string;
  agentKey?: string;
  agentDefaultCategoryId?: string;
  agentDefaultCategoryName?: string;
  existingCategories?: ExistingTestDialogCategory[];
  toolNames?: string[];
  userInput?: string;
}): TestDialogCategoryResolution {
  const explicitCategory = input.explicitCategory?.trim();
  if (explicitCategory) {
    return {
      categoryId: explicitCategory,
      source: "explicit",
      confidence: 1,
    };
  }
  if (input.continueDialogId || input.disableDefaultTestRoot) {
    return {
      source: "disabled",
      confidence: 1,
    };
  }

  const agentDefaultCategoryId = input.agentDefaultCategoryId?.trim();
  if (agentDefaultCategoryId) {
    return {
      categoryId: agentDefaultCategoryId,
      categoryName: input.agentDefaultCategoryName?.trim() || undefined,
      source: "agent-default",
      confidence: 0.98,
    };
  }

  const haystack = buildHaystack(input);
  const existingMatch = (input.existingCategories ?? [])
    .map((category) => ({
      category,
      score: scoreExistingCategory(category, haystack),
    }))
    .filter((item) => item.score >= 0.7)
    .sort((a, b) => b.score - a.score)[0];
  if (existingMatch) {
    return {
      categoryId: existingMatch.category.id,
      categoryName: existingMatch.category.name,
      source: "existing-match",
      confidence: existingMatch.score,
    };
  }

  for (const category of TEST_DIALOG_CATEGORY_DEFINITIONS) {
    if (category.id === DEFAULT_TEST_DIALOG_CATEGORY_ID) continue;
    if (category.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        order: category.order,
        source: "seed",
        confidence: 0.82,
      };
    }
  }

  const fallback = TEST_DIALOG_CATEGORY_BY_ID[DEFAULT_TEST_DIALOG_CATEGORY_ID];
  return {
    categoryId: fallback.id,
    categoryName: fallback.name,
    order: fallback.order,
    source: "fallback",
    confidence: 0.4,
  };
}

export function inferTestDialogCategoryId(
  input: Parameters<typeof resolveTestDialogCategory>[0],
): string | undefined {
  return resolveTestDialogCategory(input).categoryId;
}
