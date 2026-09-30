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
    "Tell nolo one goal. Multiple AI agents split the work, execute it, and hand back a result you can verify."
  ),
  sections: [
    {
      title: t("quickStartGuide.setupTitle", "1. State one compound goal"),
      items: [
        t(
          "quickStartGuide.setupItem1",
          "Open a new chat and describe a complete goal in one sentence, e.g. \"Compare three laptops and draft the purchase summary\"."
        ),
        t(
          "quickStartGuide.setupItem2",
          "Include what \"done\" looks like: the format you want, the constraints, and the deadline if it matters."
        ),
        t(
          "quickStartGuide.setupItem3",
          "A concrete, multi-part goal works better than a vague one — the agents need something to divide."
        ),
      ],
    },
    {
      title: t("quickStartGuide.shortcutsTitle", "2. Watch multiple AI agents split and run the work"),
      items: [
        t(
          "quickStartGuide.shortcutsItem1",
          "Nolo breaks your goal into subtasks and assigns them to specialized agents automatically."
        ),
        t(
          "quickStartGuide.shortcutsItem2",
          "You can watch each agent's progress in the same conversation — research, writing, and checks run in parallel."
        ),
        t(
          "quickStartGuide.shortcutsItem3",
          "Jump in anytime to correct a direction or add context; the agents adapt without starting over."
        ),
      ],
    },
    {
      title: t("quickStartGuide.nextStepsTitle", "3. Review and take the result"),
      items: [
        t(
          "quickStartGuide.nextStepsItem1",
          "When the run finishes, check the delivered result against the goal you stated in step 1."
        ),
        t(
          "quickStartGuide.nextStepsItem2",
          "Not quite right? Reply with what to fix — the agents iterate on the same context."
        ),
        t(
          "quickStartGuide.nextStepsItem3",
          "Once it looks good, the result stays in your workspace as a page you can edit, share, or build on."
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
