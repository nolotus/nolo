import { describe, expect, it } from "bun:test";
import {
  isOnboardingDismissedValue,
  LOCAL_FIRST_ONBOARDING_DISMISSED_KEY,
  readLocalFirstOnboardingDismissed,
  readLocalFirstOnboardingDismissedAsync,
  writeLocalFirstOnboardingDismissed,
  writeLocalFirstOnboardingDismissedAsync,
} from "./onboardingDismissed";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("localFirst onboarding dismissed helper", () => {
  it("uses the stable localStorage / AsyncStorage key", () => {
    expect(LOCAL_FIRST_ONBOARDING_DISMISSED_KEY).toBe(
      "nolo.localFirst.onboarding.dismissed"
    );
  });

  it("treats 1/true/yes as dismissed", () => {
    expect(isOnboardingDismissedValue("1")).toBe(true);
    expect(isOnboardingDismissedValue("true")).toBe(true);
    expect(isOnboardingDismissedValue("YES")).toBe(true);
    expect(isOnboardingDismissedValue("0")).toBe(false);
    expect(isOnboardingDismissedValue(null)).toBe(false);
    expect(isOnboardingDismissedValue(undefined)).toBe(false);
  });

  it("reads and writes sync storage", () => {
    const storage = createMemoryStorage();
    expect(readLocalFirstOnboardingDismissed(storage)).toBe(false);
    writeLocalFirstOnboardingDismissed(storage, true);
    expect(storage.getItem(LOCAL_FIRST_ONBOARDING_DISMISSED_KEY)).toBe("1");
    expect(readLocalFirstOnboardingDismissed(storage)).toBe(true);
    writeLocalFirstOnboardingDismissed(storage, false);
    expect(readLocalFirstOnboardingDismissed(storage)).toBe(false);
  });

  it("reads and writes async storage adapters", async () => {
    const storage = createMemoryStorage();
    expect(await readLocalFirstOnboardingDismissedAsync(storage)).toBe(false);
    await writeLocalFirstOnboardingDismissedAsync(storage, true);
    expect(await readLocalFirstOnboardingDismissedAsync(storage)).toBe(true);
  });

  it("tolerates missing storage", () => {
    expect(readLocalFirstOnboardingDismissed(null)).toBe(false);
    expect(readLocalFirstOnboardingDismissed(undefined)).toBe(false);
    writeLocalFirstOnboardingDismissed(null, true);
  });
});
