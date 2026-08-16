/**
 * Local-first M4: first-run Agent-first onboarding dismiss flag.
 * Shared by Desktop (localStorage) and RN (async storage adapter).
 */

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export const LOCAL_FIRST_ONBOARDING_DISMISSED_KEY =
  "nolo.localFirst.onboarding.dismissed";

export type SyncOnboardingStorage = Pick<Storage, "getItem" | "setItem">;

export type AsyncOnboardingStorage = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
};

export function isOnboardingDismissedValue(
  raw: string | null | undefined
): boolean {
  const normalized = asTrimmedLowercaseString(raw);
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function readLocalFirstOnboardingDismissed(
  storage: Pick<Storage, "getItem"> | null | undefined
): boolean {
  if (!storage) return false;
  try {
    return isOnboardingDismissedValue(
      storage.getItem(LOCAL_FIRST_ONBOARDING_DISMISSED_KEY)
    );
  } catch (error) {
    console.warn("[localFirst] read onboarding dismissed failed:", error);
    return false;
  }
}

export function writeLocalFirstOnboardingDismissed(
  storage: Pick<Storage, "setItem"> | null | undefined,
  dismissed = true
): void {
  if (!storage) return;
  try {
    storage.setItem(
      LOCAL_FIRST_ONBOARDING_DISMISSED_KEY,
      dismissed ? "1" : "0"
    );
  } catch (error) {
    console.warn("[localFirst] write onboarding dismissed failed:", error);
  }
}

export async function readLocalFirstOnboardingDismissedAsync(
  storage: AsyncOnboardingStorage | null | undefined
): Promise<boolean> {
  if (!storage) return false;
  try {
    const raw = await storage.getItem(LOCAL_FIRST_ONBOARDING_DISMISSED_KEY);
    return isOnboardingDismissedValue(raw);
  } catch (error) {
    console.warn("[localFirst] async read onboarding dismissed failed:", error);
    return false;
  }
}

export async function writeLocalFirstOnboardingDismissedAsync(
  storage: AsyncOnboardingStorage | null | undefined,
  dismissed = true
): Promise<void> {
  if (!storage) return;
  try {
    await storage.setItem(
      LOCAL_FIRST_ONBOARDING_DISMISSED_KEY,
      dismissed ? "1" : "0"
    );
  } catch (error) {
    console.warn("[localFirst] async write onboarding dismissed failed:", error);
  }
}
