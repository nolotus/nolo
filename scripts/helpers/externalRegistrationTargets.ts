export type ExternalRegistrationTarget = {
  label: string;
  notes: string;
  priority: number;
  url: string;
};

export const DEFAULT_EXTERNAL_REGISTRATION_TARGETS: ExternalRegistrationTarget[] = [
  {
    label: "Imitate Email",
    notes:
      "Low-friction email-first signup with optional social login, good for proving the base external registration loop before harder targets",
    priority: 10,
    url: "https://imitate.email/signup",
  },
  {
    label: "Try Discourse Demo",
    notes: "Good for detecting silent anti-bot rejection without explicit CAPTCHA",
    priority: 20,
    url: "https://try.discourse.org/signup",
  },
  {
    label: "NodeBB Community",
    notes: "Useful fallback for confirming registration flow behavior across a different forum stack",
    priority: 30,
    url: "https://community.nodebb.org/register",
  },
];

function normalizeTargetUrl(input: string) {
  const normalizedInput = input.includes("://") ? input : `https://${input}`;
  return new URL(normalizedInput).toString();
}

export function resolveExternalRegistrationTargets(args: {
  explicitTargetUrl?: string;
}): ExternalRegistrationTarget[] {
  if (args.explicitTargetUrl) {
    return [
      {
        label: "Explicit registration target",
        notes: "Provided directly for the current run",
        priority: 0,
        url: normalizeTargetUrl(args.explicitTargetUrl),
      },
    ];
  }

  return [...DEFAULT_EXTERNAL_REGISTRATION_TARGETS].sort((left, right) => left.priority - right.priority);
}
