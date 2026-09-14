// Pinned anonymous Local User shared by the desktop edition display layer
// (and available to local-edition consumers). Single source of truth for the
// "no session → Local User" contract; never treated as a cloud login.
import type { IdentityUser } from "./types";

export const LOCAL_USER_ID =
  (typeof process !== "undefined" ? process.env?.NOLO_LOCAL_USER_ID : undefined) ||
  (typeof process !== "undefined" ? process.env?.NOLO_USER_ID : undefined) ||
  "local";

export const LOCAL_USER: IdentityUser = {
  userId: LOCAL_USER_ID,
  username: "Local User",
};
