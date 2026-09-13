/**
 * Renders a device-code login block that is hard to miss in a noisy terminal:
 * the verification URL and the user code inside an ASCII box, with the code
 * additionally bolded when stdout is a TTY.
 *
 * Kept dependency-free (no color/theme imports) so every OAuth flow in this
 * folder can share it; callers pass plain lines to `deps.output.log`.
 */

const BOLD = "\u001b[1m";
const RESET = "\u001b[0m";

type DeviceCodeDisplayArgs = {
  /** e.g. "ChatGPT / OpenAI Codex" or "xAI Grok". */
  provider: string;
  /** Page where the user enters the code. */
  verificationUrl: string;
  /** Optional URL that already embeds the code (one-click approve). */
  completeUrl?: string;
  /** The user code to type, e.g. "ABCD-EFGH". */
  userCode: string;
  /** Extra hint lines shown under the box (e.g. expiry, security notes). */
  notes?: string[];
  /**
   * Override TTY detection (bold code). Defaults to `process.stdout.isTTY`;
   * tests pass an explicit value to cover both branches.
   */
  isTTY?: boolean;
};

export function renderDeviceCodeDisplay(args: DeviceCodeDisplayArgs): string[] {
  const { provider, verificationUrl, completeUrl, userCode, notes = [] } = args;
  const bold = args.isTTY ?? Boolean(process.stdout.isTTY);

  // Uniform two-space right padding keeps the longest line (usually the URL)
  // off the border so terminal link detection / double-click select does not
  // swallow the trailing │.
  const rows: { rendered: string; plain: string }[] = [
    { rendered: `  URL:  ${verificationUrl}  `, plain: `  URL:  ${verificationUrl}  ` },
  ];
  if (completeUrl) {
    rows.push({
      rendered: `  Link: ${completeUrl}  `,
      plain: `  Link: ${completeUrl}  `,
    });
  }
  rows.push({
    rendered: `  Code: ${bold ? `${BOLD}${userCode}${RESET}` : userCode}  `,
    plain: `  Code: ${userCode}  `,
  });

  const innerWidth = Math.max(...rows.map((row) => row.plain.length));
  const top = `┌${"─".repeat(innerWidth)}┐`;
  const bottom = `└${"─".repeat(innerWidth)}┘`;

  return [
    `Authorize nolo-cli for ${provider} (device code / headless):`,
    top,
    ...rows.map(
      (row) => `│${row.rendered}${" ".repeat(innerWidth - row.plain.length)}│`
    ),
    bottom,
    ...notes,
  ];
}
