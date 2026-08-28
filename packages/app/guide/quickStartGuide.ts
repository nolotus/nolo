import { DataType } from "create/types";

export const QUICK_START_GUIDE_DB_KEY = "builtin-guide-quick-start";

export type QuickStartGuideTranslate = (
  key: string,
  fallback: string
) => string;

export type QuickStartGuideSection = {
  title: string;
  items: string[];
};

export type QuickStartGuideContent = {
  title: string;
  description: string;
  sections: QuickStartGuideSection[];
};

const createText = (text: string) => ({ text });

const createParagraph = (text: string) => ({
  type: "paragraph",
  children: [createText(text)],
});

const createHeading = (text: string) => ({
  type: "heading-two",
  children: [createText(text)],
});

const createBulletedList = (items: string[]) => ({
  type: "bulleted-list",
  children: items.map((item) => ({
    type: "list-item",
    children: [createParagraph(item)],
  })),
});

export const buildQuickStartGuideContent = (
  t: QuickStartGuideTranslate
): QuickStartGuideContent => ({
  title: t("quickStartGuide.title", "Quick Start Guide"),
  description: t(
    "quickStartGuide.description",
    "Use these three checks to get oriented quickly when you open nolo."
  ),
  sections: [
    {
      title: t("quickStartGuide.setupTitle", "1. Confirm your current environment"),
      items: [
        t(
          "quickStartGuide.setupItem1",
          "The login target is always the current server and language shown on the auth screen."
        ),
        t(
          "quickStartGuide.setupItem2",
          "If an account was created on another server or locale, switch first before signing in."
        ),
        t(
          "quickStartGuide.setupItem3",
          "For RN smoke checks, verify the environment before testing content fetches or chat writes."
        ),
      ],
    },
    {
      title: t("quickStartGuide.shortcutsTitle", "2. Start from the three fastest entry points"),
      items: [
        t(
          "quickStartGuide.shortcutsItem1",
          "Quick Note captures an idea immediately and saves it as a page."
        ),
        t(
          "quickStartGuide.shortcutsItem2",
          "New Chat creates a fresh dialog with the default assistant."
        ),
        t(
          "quickStartGuide.shortcutsItem3",
          "Create AI is the fastest way to customize a dedicated assistant."
        ),
      ],
    },
    {
      title: t("quickStartGuide.nextStepsTitle", "3. When something looks off"),
      items: [
        t(
          "quickStartGuide.nextStepsItem1",
          "If login fails, re-check that the server and locale match the original registration."
        ),
        t(
          "quickStartGuide.nextStepsItem2",
          "If recent content looks stale, give sync a moment and then reopen the target page."
        ),
        t(
          "quickStartGuide.nextStepsItem3",
          "Use Feedback to report missing data or confusing behavior directly from the home screen."
        ),
      ],
    },
  ],
});

export const buildQuickStartGuideDoc = (t: QuickStartGuideTranslate) => {
  const guide = buildQuickStartGuideContent(t);
  const slateData = [
    createParagraph(guide.description),
    ...guide.sections.flatMap((section) => [
      createHeading(section.title),
      createBulletedList(section.items),
    ]),
  ];

  return {
    id: QUICK_START_GUIDE_DB_KEY,
    dbKey: QUICK_START_GUIDE_DB_KEY,
    type: DataType.DOC,
    title: guide.title,
    content: [
      guide.description,
      ...guide.sections.flatMap((section) => [
        section.title,
        ...section.items.map((item) => `- ${item}`),
      ]),
    ].join("\n\n"),
    slateData,
  };
};
