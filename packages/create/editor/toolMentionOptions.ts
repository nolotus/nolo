import { toolDescriptions } from "ai/tools";
import { isToolVisibleInUi } from "ai/tools/toolVisibility";
import type { MentionOption } from "./MentionList";

export const buildToolMentionOptions = (): MentionOption[] => {
  const options: MentionOption[] = [];

  Object.entries(toolDescriptions).forEach(([name, desc]) => {
    if (!isToolVisibleInUi(name)) return;
    options.push({
      id: name,
      label: name,
      type: "tool",
      description: desc.description,
    });
  });

  return options;
};
