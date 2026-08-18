// packages/auth/locale.ts
var DEFAULT_AUTH_LOCALE = "en-US";
var ZH_LOCALE_CANDIDATES = ["zh-CN", "zh-Hans-CN", "zh-Hans", "zh-SG", "zh-TW", "zh-HK", "zh"];
var EN_LOCALE_CANDIDATES = ["en-US", "en-GB", "en"];
var canonicalizeLocale = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/_/g, "-");
  if (!trimmed) return null;
  try {
    if (typeof Intl !== "undefined" && typeof Intl.Locale === "function") {
      return new Intl.Locale(trimmed).toString();
    }
  } catch {
  }
  const [language, ...rest] = trimmed.split("-");
  if (!language) return null;
  const normalizedRest = rest.map((segment) => {
    if (segment.length === 2) return segment.toUpperCase();
    if (segment.length === 4) {
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    }
    return segment;
  });
  return [language.toLowerCase(), ...normalizedRest].join("-");
};
var getLocaleFamily = (value) => {
  const canonical = canonicalizeLocale(value);
  if (!canonical) return null;
  const [language] = canonical.split("-");
  return language || null;
};
var addUniqueLocale = (target, value) => {
  const canonical = canonicalizeLocale(value);
  if (!canonical || target.includes(canonical)) return;
  target.push(canonical);
};
var addLocaleFamilyFallbacks = (target, family) => {
  if (family === "zh") {
    ZH_LOCALE_CANDIDATES.forEach((locale) => addUniqueLocale(target, locale));
    return;
  }
  if (family === "en") {
    EN_LOCALE_CANDIDATES.forEach((locale) => addUniqueLocale(target, locale));
    return;
  }
  addUniqueLocale(target, family);
};
var buildAuthLoginLocaleCandidates = (primaryLocale, extras = []) => {
  const candidates = [];
  [primaryLocale, ...extras].forEach((locale) => addUniqueLocale(candidates, locale));
  const families = [primaryLocale, ...extras].map((locale) => getLocaleFamily(locale)).filter((locale) => Boolean(locale));
  families.forEach((family) => addLocaleFamilyFallbacks(candidates, family));
  if (candidates.length === 0) {
    candidates.push(DEFAULT_AUTH_LOCALE);
  }
  return candidates;
};
var resolvePreferredAuthLocale = (primaryLocale, extras = []) => {
  const family = getLocaleFamily(primaryLocale) || extras.map((locale) => getLocaleFamily(locale)).find(Boolean);
  if (family === "zh") return "zh-CN";
  if (family === "en") return "en-US";
  const candidates = buildAuthLoginLocaleCandidates(primaryLocale, extras);
  return candidates[0] || DEFAULT_AUTH_LOCALE;
};

export {
  buildAuthLoginLocaleCandidates,
  resolvePreferredAuthLocale
};
