/** Only a single simple command may be hidden; single quotes are literal, double quotes still expand. */
export function isTreeListingCommand(command: string): boolean {
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "\\" && quote !== "'") { i++; continue; }
    if (quote) {
      // Single quotes are literal; double quotes still execute substitutions
      // and expand unescaped dollars. Escaped characters were skipped above.
      if (quote === '"' && (char === "$" || char === "`")) return false;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    // Reject chains, pipes, redirection and substitutions outside quotes so
    // hiding a tree listing never also hides output from another command.
    if (";&|><`\n\r".includes(char) || (char === "$" && command[i + 1] === "(")) return false;
  }
  if (quote) return false;
  const tokens = command.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const unquote = (token: string) => token.replace(/^(["'])(.*)\1$/, "$2");
  const assignment = /^[A-Za-z_][A-Za-z0-9_]*=/;
  let i = 0;
  while (assignment.test(tokens[i] ?? "")) i++;
  if (unquote(tokens[i] ?? "").split("/").pop() === "sudo") {
    i++;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === "--") { i++; break; }
      if (assignment.test(token)) { i++; continue; }
      if (!token.startsWith("-")) break;
      // Common sudo options whose arguments are separate simple tokens.
      if (/^(?:-[ughpCRT]|--(?:user|group|host|prompt|chdir|chroot|command-timeout|close-from|role|type))$/.test(token)) i += 2;
      else i++;
    }
  }
  return unquote(tokens[i] ?? "").split("/").pop() === "tree";
}
