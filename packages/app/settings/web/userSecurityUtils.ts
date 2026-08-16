export type UserSecurityAccessEntry = {
  timestamp: number;
  source: "login" | "token";
  ip: string;
  device: string;
};

export const buildRecentAccessFlags = (
  recentAccesses: UserSecurityAccessEntry[]
) => {
  const seenLaterEntries = new Set<string>();
  return recentAccesses.map((entry) => {
    const fingerprint = `${entry.device}__${entry.ip}`;
    const isNew = !seenLaterEntries.has(fingerprint);
    seenLaterEntries.add(fingerprint);
    return {
      ...entry,
      isNew,
    };
  });
};
