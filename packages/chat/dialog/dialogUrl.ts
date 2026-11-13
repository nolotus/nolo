import { buildRoutableContentPath } from "create/space/contentKeyUtils";

export const buildDialogUrl = (
  dialogKey: string,
  spaceId?: string | null
): string => buildRoutableContentPath({ contentKey: dialogKey, spaceId });
