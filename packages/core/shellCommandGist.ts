/**
 * Shell 命令的「可读摘要」投影。
 *
 * 背景（2026-11-15 owner 定调）：
 * 此前 Run 行按「全量安全投影」把整条命令平铺上屏（见 toolOutput.ts 的
 * commandFullGist）。多段 `&&` 复合命令会把整行占满，读者必须自己解析
 * shell 才知道发生了什么 —— 例如：
 *
 *   cd ~/linux/.worktrees/x && mkdir -p ptyxis/palettes && cp a b && cp c d
 *
 * 新策略：默认显示**意图摘要**（`建目录并复制 2 个文件`），原文不再平铺；
 * 需要审计原文时走展开层（Run 树 / verbose），那里仍保留整条命令。
 *
 * 设计约束：
 * - 纯确定性规则，不做语义猜测。识别不了的命令老实退回原文（截断），
 *   宁可显示命令也不显示编造的摘要。破坏性动作伪装成只读（`find -delete`、
 *   `git checkout .`）、管道把数据喂给非过滤命令（`| sh`、`| xargs rm`）
 *   都按「识别不了」处理，退回原文。
 * - 摘要绝不进入执行路径，只影响显示。
 * - **摘要会原样带出 target（可能含凭据：`cat token=…`、`bun run sk-…`），
 *   本函数不做任何脱敏。调用方必须对 summary 过 redactSecrets**
 *   （见 toolOutput.ts 的摘要出口）。出口处还有 withholdIfSecretLike 兜底。
 */

/** 单个命令段的动作类型。 */
type SegmentAction = {
  /** 显示用的动词，例如「建目录」「复制」「编辑」。 */
  verb: string;
  /** 主要对象（路径 basename 或文件名），用于拼接后缀。 */
  target?: string;
  /** 可累加的数量（同一动作多次出现时合并，例如复制 3 个文件）。 */
  count?: number;
  /** count > 1 时的量词单位，默认「个文件」/「项」。 */
  unit?: string;
  /** 仅当确定无副作用时为 true；写操作、脚本执行与未知命令均为 false。 */
  readOnly?: boolean;
};

/** 摘要结果。null 表示识别失败，调用方应退回原文投影。 */
export type CommandGist = {
  /** 主摘要文本，例如「建目录并复制 2 个文件」。 */
  summary: string;
  /** Structured single-command action; compound commands expose summary only. */
  action?: string;
  object?: string;
  context?: string;
  /** 当且仅当命令内全部段均明确只读且无副作用管道时为 true。 */
  readOnly?: boolean;
  /** 被折叠掉的段数（供 UI 显示「+N」）。 */
  foldedSegments: number;
};

/** Conservative shell words: no expansion, redirection, background jobs or unclosed quotes. */
function shellWords(text: string, validationOnly = false): string[] | null {
  const words: string[] = [];
  let word = "", started = false;
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "\\" && quote !== "'") {
      const next = text[++i];
      if (next === undefined) return null;
      word += next; started = true; continue;
    }
    if (ch === "$" && quote !== "'" || ch === "`" && quote !== "'") return null;
    if (quote) {
      if (ch === quote) quote = undefined;
      else word += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; started = true; continue; }
    if (validationOnly && (ch === "|" || ch === "~")) { word += ch; started = true; continue; }
    if (ch === "?" && /^https?:\/\//i.test(word)) { word += ch; started = true; continue; }
    if (/[<> &|;(){}*?\[\]#~]/.test(ch) && !/\s/.test(ch)) return null;
    if (/\s/.test(ch)) { if (started) words.push(word); word = ""; started = false; }
    else { word += ch; started = true; }
  }
  if (quote) return null;
  if (started) words.push(word);
  return words;
}

function isSafeGitTarget(token: string | undefined): token is string {
  if (!token || token.startsWith("-")) return false;
  // Never promote URLs or credential-bearing remotes into summary objects.
  if (/:\/\/|@/.test(token)) return false;
  return true;
}

function clipShortText(text: string, maxLen = 24): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen - 1)}…`;
}

function parseGit(rest: string): { action: string; object?: string; context?: string; readOnly?: boolean } | null {
  const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
  if (!tokens) return null;
  let i = 0, context: string | undefined;
  if (tokens.length === 1 && tokens[0] === "--version") return { action: "查版本", readOnly: true };
  while (tokens[i]?.startsWith("-")) {
    const option = tokens[i++]!;
    if (["-C", "-c", "--git-dir", "--work-tree"].includes(option)) {
      const value = tokens[i++];
      if (!value || value.startsWith("-")) return null;
      if (option === "-C") context = value;
    } else if (!/^(--git-dir|--work-tree)=.+/.test(option) && !["--no-pager", "--no-optional-locks", "--literal-pathspecs"].includes(option)) return null;
  }
  const sub = tokens[i++];
  const args = tokens.slice(i);
  const result = (action: string, object?: string, readOnly?: boolean) => ({ action, object, context, readOnly });
  if (sub === "worktree") {
    const operation = args.shift();
    const operands: string[] = [];
    let end = false;
    for (let j = 0; j < args.length; j++) {
      const token = args[j]!;
      if (!end && token === "--") { end = true; continue; }
      if (!end && token.startsWith("-")) {
        if (operation === "add" && ["-b", "-B", "--reason"].includes(token)) { if (!args[++j] || args[j]!.startsWith("-")) return null; }
        else if (!(operation === "add" && ["--detach", "--checkout", "--no-checkout", "--lock"].includes(token)) && !(operation === "list" && ["--porcelain", "-v", "--verbose", "-z"].includes(token)) && !(operation === "remove" && ["-f", "--force"].includes(token))) return null;
      } else operands.push(token);
    }
    if (operation === "list" && !operands.length) return result("列出工作区", undefined, true);
    if (operation === "add" && operands.length >= 1 && operands.length <= 2) return result("创建工作区", operands[0], false);
    if (operation === "remove" && operands.length === 1) return result("移除工作区", operands[0], false);
    return null;
  }
  if (sub === "branch") {
    let mode = "create", end = false, explicitList = false, listFilter = false;
    const operands: string[] = [];
    // 纯过滤选项（只影响列举结果），不会退化成创建/改动。
    const BRANCH_FILTER_FLAGS = ["--merged", "--no-merged", "--contains", "--no-contains", "--points-at"];
    for (let j = 0; j < args.length; j++) {
      const token = args[j]!;
      if (!end && token === "--") { end = true; continue; }
      if (!end && token.startsWith("-")) {
        if (["-d", "-D", "--delete"].includes(token) && mode === "create") mode = "delete";
        else if (token === "--list" && mode === "create") { mode = "list"; explicitList = true; }
        else if (["-a", "--all", "-r", "--remotes", "-v", "-vv", "--verbose", "--show-current"].includes(token) && mode === "create") mode = "list";
        else if (mode === "create" && (BRANCH_FILTER_FLAGS.includes(token) || BRANCH_FILTER_FLAGS.some(f => token.startsWith(`${f}=`)))) {
          // `git branch --merged main` / `--contains HEAD` 是列举（要求一个 commit 参数）。
          mode = "list"; listFilter = true;
          if (BRANCH_FILTER_FLAGS.includes(token)) {
            const value = args[j + 1];
            if (!value || value.startsWith("-")) return null;
            j++;
          }
        } else if (mode === "list" && ["-i", "--ignore-case", "-v", "-vv", "--verbose", "--no-color", "--color", "--column", "--no-column"].includes(token)) continue;
        else return null;
      } else operands.push(token);
    }
    if (mode === "delete" && operands.length === 1) return result("删除分支", operands[0], false);
    // `git branch -v newbr` 实际会**创建**分支（`-v` 只是显示修饰），把它讲成
    // 「列出分支 / 只读」就是编造。列举模式只有在显式 `--list`（可带 pattern）
    // 或纯过滤选项（--merged/--contains…）在场时才允许带参数位。
    if (mode === "list" && operands.length && !explicitList && !listFilter) return null;
    if (mode === "list" || !args.length) return result("列出分支", undefined, true);
    if (mode === "create" && operands.length >= 1 && operands.length <= 2) return result("创建分支", operands[0], false);
    return null;
  }
  if (sub === "checkout" && args.some(t => t === "." || t === "--" || t.includes("/"))) return null;

  const nonFlagArgs = (list: string[]): string[] => {
    const out: string[] = [];
    for (let j = 0; j < list.length; j++) {
      const tok = list[j]!;
      if (tok === "--") { out.push(...list.slice(j + 1)); break; }
      if (tok.startsWith("-")) {
        if (["-m", "-F", "-b", "-B", "-n", "--max-count", "--format", "--pretty", "--since", "--until", "--author", "-U", "-L", "-S", "-G"].includes(tok)) j++;
        continue;
      }
      out.push(tok);
    }
    return out;
  };

  switch (sub) {
    case "status": return result("查状态", undefined, true);
    case "log": return result("查历史", undefined, true);
    case "rev-list": return result("统计提交", undefined, true);
    case "merge-base": return result("查共同祖先", undefined, true);
    case "rev-parse": return result("查仓库信息", undefined, true);
    // 以下子命令在 git 里没有写/执行形态（例外一律单独把关），可安全折进探索树。
    case "version": return result("查版本", undefined, true);
    case "ls-files": return result("列跟踪文件", undefined, true);
    case "ls-tree": {
      const target = nonFlagArgs(args).find(isSafeGitTarget);
      return result("看树", target ? clipShortText(target, 20) : undefined, true);
    }
    case "cat-file": {
      const target = nonFlagArgs(args).find(isSafeGitTarget);
      return result("看对象", target ? clipShortText(target, 20) : undefined, true);
    }
    case "show-ref":
    case "for-each-ref": return result("查引用", undefined, true);
    case "grep": {
      // `-O` / `--open-files-in-pager` 会启动外部程序处理匹配文件，不属只读。
      if (args.some(t =>
        (t.startsWith("-") && !t.startsWith("--") && t.slice(1).includes("O")) ||
        t === "--open-files-in-pager" ||
        t.startsWith("--open-files-in-pager="),
      )) return null;
      return result("搜代码", extractSafeSearchTarget(args.join(" ")), true);
    }
    case "blame": {
      const files = nonFlagArgs(args).filter(isSafeGitTarget);
      const file = files[files.length - 1];
      return result("查行作者", file ? baseName(file) ?? clipShortText(file, 20) : undefined, true);
    }
    case "describe": return result("查版本描述", undefined, true);
    case "count-objects": return result("统计对象", undefined, true);
    case "shortlog": return result("汇总提交", undefined, true);
    case "check-ignore": {
      const file = nonFlagArgs(args).find(isSafeGitTarget);
      return result("查忽略规则", file ? baseName(file) : undefined, true);
    }
    case "reflog": {
      // `git reflog expire|delete` 会改写/删除引用日志，不是只读查询。
      const op = nonFlagArgs(args)[0];
      if (op === "expire" || op === "delete" || op === "drop") return null;
      return result("查引用日志", undefined, true);
    }
    case "remote": {
      // `git remote add|set-url|remove|prune` 都写仓库；只放行纯列举。
      if (nonFlagArgs(args).length) return null;
      if (args.some(t => !["-v", "--verbose"].includes(t))) return null;
      return result("查远端", undefined, true);
    }
    case "config": {
      // 只有显式读取形式才认：`git config a b` 写值，`--unset`/`--add` 也是写。
      const isReadForm = args.some(t => ["--get", "--get-all", "--get-regexp", "--list", "-l", "--show-origin"].includes(t)
        || /^--(?:get|get-all|get-regexp|list|show-origin)(?:=|$)/.test(t));
      if (!isReadForm) return null;
      if (args.some(t => ["--unset", "--unset-all", "--add", "--replace-all", "--rename-section", "--remove-section", "-e", "--edit"].includes(t)
        || /^--(?:unset|unset-all|add|replace-all|rename-section|remove-section|edit)(?:=|$)/.test(t))) return null;
      const key = nonFlagArgs(args)[0];
      return result("查配置", key && isSafeGitTarget(key) ? clipShortText(key, 24) : undefined, true);
    }
    case "show": {
      const target = nonFlagArgs(args)[0];
      return result("看提交", isSafeGitTarget(target) ? clipShortText(target, 20) : undefined, true);
    }
    case "diff": {
      const target = nonFlagArgs(args).find(isSafeGitTarget);
      return result("看差异", target ? baseName(target) ?? clipShortText(target, 20) : undefined, true);
    }
    case "tag": {
      const hasMutating = args.some(t => ["-d", "--delete", "-a", "-s", "-f", "--force"].includes(t)) || nonFlagArgs(args).length > 0;
      return hasMutating ? result("管标签", undefined, false) : result("查标签", undefined, true);
    }
    case "add": {
      if (args.some(t => t === "-A" || t === "--all" || t === ".")) return result("暂存全部修改", undefined, false);
      const files = nonFlagArgs(args).filter(isSafeGitTarget);
      if (files.length === 1) return result("暂存", baseName(files[0]!) ?? files[0]!, false);
      if (files.length > 1) return result("暂存", `${files.length} 项`, false);
      return result("暂存修改", undefined, false);
    }
    case "commit": return result("提交", undefined, false);
    case "merge": {
      const branch = nonFlagArgs(args).find(isSafeGitTarget);
      return result("合并", branch ? clipShortText(branch, 28) : undefined, false);
    }
    case "checkout":
    case "switch": {
      const branch = nonFlagArgs(args).find(isSafeGitTarget);
      return result("切换分支", branch ? clipShortText(branch, 28) : undefined, false);
    }
    case "push": {
      const parts = nonFlagArgs(args).filter(isSafeGitTarget);
      const target = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
      return result("推送", target ? clipShortText(target, 28) : undefined, false);
    }
    case "pull": {
      const parts = nonFlagArgs(args).filter(isSafeGitTarget);
      const target = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
      return result("拉取", target ? clipShortText(target, 28) : undefined, false);
    }
    case "fetch": {
      const remote = nonFlagArgs(args).find(isSafeGitTarget);
      return result("获取远端", remote ? clipShortText(remote, 24) : undefined, true);
    }
    case "stash": {
      const op = nonFlagArgs(args)[0];
      return op === "list" ? result("查贮藏", undefined, true) : result("暂存", undefined, false);
    }
    case "reset": return result("重置", undefined, false);
    case "restore": return result("恢复文件", undefined, false);
    default: return null;
  }
}

/** 取路径最后一段用于显示；空路径返回 undefined。 */
function baseName(path: string): string | undefined {
  const cleaned = path.replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
  if (!cleaned || cleaned === "." || cleaned === "..") return undefined;
  const parts = cleaned.split("/").filter(Boolean);
  const base = parts.pop();
  return base || undefined;
}

/**
 * 取命令里最后一个位置参数（文件/目录），跳过已知「选项取值」的下一枚词。
 * 只读工具（diff/du/basename…）没有输出文件参数，最后一个位置参数就是被看的对象。
 */
function lastFileOperand(tokens: string[], valueFlags: ReadonlySet<string>): string | undefined {
  let file: string | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok === "--") {
      const rest = tokens.slice(i + 1);
      if (rest.length) file = rest[rest.length - 1];
      break;
    }
    if (tok.startsWith("-")) {
      if (!tok.includes("=") && valueFlags.has(tok)) i++;
      continue;
    }
    file = tok;
  }
  return file;
}

/**
 * 把一条命令切成独立的段。
 *
 * 只按「命令分隔符」切，不解析引号内的分隔符 —— 这是有意的简化：
 * 带引号的复合命令（如 `bash -c 'a && b'`）会被当作一个整体处理，
 * 若识别不了就退回原文。用简单状态机跳过引号内容，避免把
 * `sed 's|a|b|'` 里的字符误判成分隔符。
 */
function splitSegments(command: string): { segments: string[]; hasFallback: boolean } {
  const segments: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let hasFallback = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];

    if (quote) {
      // 双引号内反斜杠是转义字符：`echo "a \" ; rm -rf x"` 里的 \" 不能
      // 结束引号，否则引号内的 `; rm -rf x` 会被当成真实命令切出来
      // （M3：会凭空显示一条从未执行的删除动作）。单引号内反斜杠不是转义。
      if (ch === "\\" && next && quote === '"') {
        current += ch + next;
        i++;
        continue;
      }
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    // 反斜杠转义：原样带走下一个字符，避免把转义的分号当分隔符
    if (ch === "\\" && next) {
      current += ch + next;
      i++;
      continue;
    }
    // && 串行分隔
    if (ch === "&" && next === "&") {
      const trimmed = current.trim();
      if (trimmed) segments.push(trimmed);
      current = "";
      i++;
      continue;
    }
    // || 是失败回退：后续命令**可能不执行**，摘要不能平铺成「都执行了」
    // （M2：`git status || git log` 实际只跑后半条，摘要在 `||` 存在时
    // 整体放弃，退回原文更诚实）。
    if (ch === "|" && next === "|") {
      hasFallback = true;
      current = "";
      i++;
      continue;
    }
    // 单个 ; 分隔（但 `|` 管道不切：`git log | head` 是一个整体动作）
    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) segments.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) segments.push(tail);
  return { segments, hasFallback };
}

/** 去掉前置的环境变量赋值（`NOLO=1 bun test` / `export NOLO=1 && ...`）。 */
function stripEnvAssignments(segment: string): string {
  let rest = segment.trimStart();
  if (/^export\s+[A-Za-z_][A-Za-z0-9_]*=/.test(rest)) {
    rest = rest.replace(/^export\s+/, "");
  }
  while (/^[A-Za-z_][A-Za-z0-9_]*=(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\S*)\s*/.test(rest)) {
    const next = rest.replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\S*)\s*/, "");
    if (next === rest) break;
    rest = next;
  }
  return rest;
}

/** 取段的首个命令词（跳过 `sudo`/`env`/`command`/`timeout` 之类前缀）。 */
function firstVerbToken(segment: string): { verb: string; rest: string } {
  let rest = stripEnvAssignments(segment).trim();
  // 常见前缀包装词：跳过并继续
  const wrappers = new Set(["sudo", "env", "command", "time", "nohup", "exec"]);
  let guard = 0;
  while (guard++ < 6) {
    // 先剥掉前置的 VAR=value 赋值（`env NOLO=1 bun test` 跳过 env 后
    // 还要再剥一层 NOLO=1），否则识别出的 verb 是 "NOLO=1"
    const before = rest;
    rest = stripEnvAssignments(rest).trim();
    const m = rest.match(/^(\S+)\s*(.*)$/s);
    if (!m) return { verb: "", rest: "" };
    const [, word, restAfter] = m;
    const base = word.replace(/^.*\//, "");
    if (wrappers.has(base) && restAfter.trim()) {
      if (base === "command" && /^-(?:v|V)(?:\s|$)/.test(restAfter.trim())) {
        return { verb: base, rest: restAfter.trim() };
      }
      rest = restAfter.trim();
      continue;
    }
    if (base === "timeout" && restAfter.trim()) {
      const tokens = shellWords(restAfter.trim());
      if (!tokens || tokens.length < 2) return { verb: "timeout", rest: restAfter.trim() };
      let idx = 0;
      while (idx < tokens.length && tokens[idx]!.startsWith("-")) {
        const opt = tokens[idx++]!;
        if (["-k", "-s", "--kill-after", "--signal"].includes(opt)) idx++;
      }
      if (idx < tokens.length && /^\d+(?:\.\d+)?[smhd]?$/i.test(tokens[idx]!)) idx++;
      if (idx < tokens.length) {
        const inner = tokens.slice(idx).map(q => (/\s/.test(q) ? JSON.stringify(q) : q)).join(" ");
        rest = inner;
        continue;
      }
    }
    if (before !== rest && !rest) return { verb: "", rest: "" };
    return { verb: base, rest: restAfter.trim() };
  }
  return { verb: "", rest };
}

function extractSafeSearchTarget(rest: string): string | undefined {
  const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
  if (!tokens) return undefined;
  const valuedOpts = new Set(["-e", "-f", "-g", "--glob", "-t", "--type", "-T", "--type-not", "-A", "-B", "-C", "-m", "--max-count", "--max-filesize", "--color", "--sort"]);
  let hasExtendedRegex = false;
  let pattern: string | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok === "--") { pattern = tokens[i + 1]; break; }
    if (tok.startsWith("-")) {
      if (tok === "-E" || tok === "-P" || tok === "--extended-regexp") hasExtendedRegex = true;
      if (valuedOpts.has(tok)) {
        if (tok === "-e" && !pattern && tokens[i + 1]) pattern = tokens[i + 1];
        i++;
      }
      continue;
    }
    pattern = tok;
    break;
  }
  if (!pattern || hasExtendedRegex || /[|[\]^$()*+?\\]/.test(pattern)) return undefined;
  return clipShortText(pattern, 22);
}

function parseSed(rest: string): SegmentAction | null {
  const rawTokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
  if (!rawTokens) return null;
  let quiet = false;
  let inPlace = false;
  const scripts: string[] = [];
  const positional: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i]!;
    if (tok === "--") { positional.push(...rawTokens.slice(i + 1)); break; }
    if (tok.startsWith("-") && tok.length > 1) {
      if (tok === "--quiet" || tok === "--silent") { quiet = true; continue; }
      if (tok === "--in-place" || tok.startsWith("--in-place=")) { inPlace = true; continue; }
      if (tok === "--regexp-extended") continue;
      if (tok.startsWith("--expression=")) {
        scripts.push(tok.slice("--expression=".length));
        continue;
      }
      if (tok === "--expression") {
        if (rawTokens[i + 1] === undefined) return null;
        scripts.push(rawTokens[++i]!);
        continue;
      }
      if (tok.startsWith("--")) return null;
      for (let c = 1; c < tok.length; c++) {
        const flag = tok[c]!;
        if (flag === "n") { quiet = true; continue; }
        if (flag === "r" || flag === "E") continue;
        if (flag === "i") {
          inPlace = true;
          if (c === tok.length - 1 && rawTokens[i + 1] === "") i++;
          break;
        }
        if (flag === "e") {
          if (c + 1 < tok.length) {
            scripts.push(tok.slice(c + 1));
          } else {
            if (rawTokens[i + 1] === undefined) return null;
            scripts.push(rawTokens[++i]!);
          }
          break;
        }
        return null;
      }
      continue;
    }
    positional.push(tok);
  }

  const isSedScript = (tok: string) =>
    /^(?:\d+|\$)(?:,\s*(?:\d+|\$))?[pdq=!]?$/.test(tok) ||
    /^s[|/#]/.test(tok) ||
    /^\/.*\/[pd=!]?$/.test(tok) ||
    /^\d+[ew]/.test(tok);

  for (const tok of positional) {
    if (isSedScript(tok)) scripts.push(tok);
  }
  const files = positional.filter((t) => !isSedScript(t));
  // If `-e` was given, all positional args are files; if no `-e` and 2+ positionals,
  // positional[0] is the script even if unusual — require scripts when `-e` absent.
  if (scripts.length === 0 && files.length >= 2) {
    scripts.push(files.shift()!);
  }
  const fileToken = files[files.length - 1];
  const target = fileToken ? baseName(fileToken) : undefined;

  if (inPlace) {
    // Reject sed `e` / `w` execution/write flags inside replacement scripts,
    // while allowing `;`-separated `s|a|b|; s|c|d|` chains and other delimiter chars inside patterns.
    const isSafeSub = (part: string): boolean => {
      if (part.length < 4 || part[0] !== "s") return false;
      const delim = part[1]!;
      if (delim !== "|" && delim !== "/" && delim !== "#") return false;
      let delimsSeen = 1;
      let idx = 2;
      for (; idx < part.length && delimsSeen < 3; idx++) {
        const ch = part[idx]!;
        if (ch === "\\" && idx + 1 < part.length) { idx++; continue; }
        if (ch === delim) delimsSeen++;
      }
      if (delimsSeen !== 3) return false;
      return /^[gipI]*$/.test(part.slice(idx));
    };
    const allSafe = scripts.every((s) => {
      const parts = s.split(";").map((p) => p.trim()).filter(Boolean);
      return parts.length > 0 && parts.every(isSafeSub);
    });
    if (!allSafe) return null;
    const replaceCount = (rest.match(/s[|/#][^|/#]*[|/#][^|/#]*[|/#]/g) ?? []).length;
    return {
      verb: "编辑",
      target,
      count: replaceCount > 1 ? replaceCount : undefined,
      unit: "处替换",
      readOnly: false,
    };
  }
  if (quiet) {
    // Only strict read-only line/range print expressions (`85,115p`, `10p`, `$p`, `1,$p`)
    // qualify as read-only view; anything with `e`, `w`, or unknown commands falls back.
    const isStrictReadOnlyPrint = (s: string) =>
      /^(?:\d+|\$)(?:\s*,\s*(?:\d+|\$))?\s*p$/.test(s.trim());
    if (scripts.length === 0 || !scripts.every(isStrictReadOnlyPrint)) {
      return null;
    }
    return { verb: "查看", target, readOnly: true };
  }
  return { verb: "处理文本", target, readOnly: false };
}

function parseNolo(rest: string): SegmentAction | null {
  const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
  if (!tokens || tokens.length === 0) return null;
  const sub = tokens[0];
  const action = tokens[1];
  const nonFlag = tokens.slice(2).filter((t) => !t.startsWith("-"));
  if (sub === "browser" || sub === "chrome") {
    const map: Record<string, [string, boolean]> = {
      status: ["查浏览器状态", true],
      "list-tabs": ["列浏览器标签", true],
      "read-page": ["浏览器读页面", true],
      "read-network": ["查浏览器请求", true],
      screenshot: ["浏览器截图", true],
      "open-tab": ["浏览器开标签", false],
      click: ["浏览器点击", false],
      type: ["浏览器输入", false],
      press: ["浏览器按键", false],
    };
    if (action && map[action]) return { verb: map[action]![0], readOnly: map[action]![1] };
    return { verb: "浏览器操作", readOnly: false };
  }
  if (sub === "agent") {
    if (action === "list" || action === "providers" || action === "models") return { verb: action === "list" ? "列智能体" : "列模型通道", readOnly: true };
    if (action === "read") return { verb: "读智能体", target: nonFlag[0] ? clipShortText(nonFlag[0]!, 24) : undefined, readOnly: true };
    if (action === "create") return { verb: "创建智能体", target: nonFlag[0] ? clipShortText(nonFlag[0]!, 24) : undefined, readOnly: false };
    if (action === "delete") return { verb: "删除智能体", target: nonFlag[0] ? clipShortText(nonFlag[0]!, 24) : undefined, readOnly: false };
    return { verb: "管理智能体", readOnly: false };
  }
  if (sub === "dialog") {
    if (action === "list") return { verb: "列对话", readOnly: true };
    if (action === "read") return { verb: "读对话", target: nonFlag[0] ? clipShortText(nonFlag[0]!, 20) : undefined, readOnly: true };
    if (action === "status") return { verb: "查对话状态", readOnly: true };
    if (action === "search") return { verb: "搜对话", readOnly: true };
    return { verb: "管对话", readOnly: false };
  }
  if (sub === "secret") {
    if (action === "list") return { verb: "列凭据", readOnly: true };
    if (action === "run") return { verb: "带凭据执行", readOnly: false };
    return { verb: "管凭据", readOnly: false };
  }
  if (sub === "ci") return { verb: "查 CI 状态", readOnly: true };
  return null;
}

function stripTrailingPipe(rest: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]!;
    const next = rest[i + 1];
    if (quote) {
      if (ch === "\\" && next && quote === '"') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "\\" && next) { i++; continue; }
    if (ch === "|" && next !== "|" && rest[i - 1] !== "|") {
      return rest.slice(0, i).trim();
    }
  }
  return rest.trim();
}

const CURL_VALUE_FLAGS = new Set([
  "-o", "--output", "-H", "--header", "-d", "--data", "--data-raw",
  "--data-binary", "--data-urlencode", "--data-ascii", "-F", "--form",
  "--form-string", "-u", "--user", "-A", "--user-agent", "-e", "--referer",
  "-b", "--cookie", "-c", "--cookie-jar", "-x", "--proxy", "-U", "--proxy-user",
  "-X", "--request", "-m", "--max-time", "--connect-timeout", "--retry",
  "--retry-delay", "--retry-max-time", "-w", "--write-out", "-T", "--upload-file",
  "-K", "--config", "--resolve", "--cacert", "--capath", "--cert", "--key",
  "-E", "--interface", "--limit-rate", "-r", "--range", "-Y", "-y",
  "--oauth2-bearer", "--aws-sigv4", "--connect-to", "--dns-servers",
]);

const WGET_VALUE_FLAGS = new Set([
  "-O", "--output-document", "-P", "--directory-prefix", "--header",
  "--user", "--password", "--http-user", "--http-password", "-U", "--user-agent",
  "-T", "--timeout", "-t", "--tries", "-a", "--append-output", "-o", "--output-file",
  "--post-data", "--post-file", "--load-cookies", "--save-cookies", "-e", "--execute",
  "--referer", "--wait", "--limit-rate", "--ca-certificate", "--certificate",
]);

function extractSafeUrlTarget(rawUrl: string): { kind: "file" | "host"; target: string } | null {
  const trimmed = rawUrl.trim();
  // Require an explicit http(s)/ftp scheme so unmodeled flag values (e.g.
  // dotted JWTs or API tokens after unknown flags like --oauth2-bearer) are
  // never coerced into synthetic hostnames and surfaced in the compact summary.
  if (!/^(?:https?|ftp):\/\//i.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (!["http:", "https:", "ftp:"].includes(parsed.protocol)) return null;
  const hostname = parsed.hostname;
  if (!hostname) return null;

  // Never touch username/password/search/hash; inspect pathname only for a plain filename.
  const pathname = parsed.pathname || "/";
  if (!pathname.endsWith("/")) {
    const rawLast = pathname.split("/").filter(Boolean).pop();
    if (rawLast) {
      let decoded = rawLast;
      try { decoded = decodeURIComponent(rawLast); } catch { /* keep raw */ }
      const looksLikeSecret =
        decoded.includes("=") ||
        /^(?:sk-|ghp_|gho_|ghu_|ghs_|github_pat_|AKIA|AIza|xox[baprs]-|eyJ)/i.test(decoded);
      if (
        !looksLikeSecret &&
        !/[\s?#\\]/.test(decoded) &&
        decoded.length <= 64 &&
        /^[^/]+\.[A-Za-z0-9]{1,8}$/.test(decoded)
      ) {
        return { kind: "file", target: clipShortText(decoded, 32) };
      }
    }
  }
  return { kind: "host", target: clipShortText(hostname, 32) };
}

function parseCurlOrWget(verb: "curl" | "wget", rest: string): SegmentAction | null {
  const head = stripTrailingPipe(rest);
  const tokens = shellWords(head);
  if (!tokens) return null;
  const valueFlags = verb === "curl" ? CURL_VALUE_FLAGS : WGET_VALUE_FLAGS;
  const positionals: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    if (tok === "--") {
      positionals.push(...tokens.slice(i + 1));
      break;
    }
    if (tok.startsWith("-")) {
      if (!tok.includes("=") && valueFlags.has(tok)) i++;
      continue;
    }
    positionals.push(tok);
  }
  for (const pos of positionals) {
    const extracted = extractSafeUrlTarget(pos);
    if (extracted) {
      return extracted.kind === "file"
        ? { verb: "下载", target: extracted.target, readOnly: false }
        : { verb: "请求", target: extracted.target, readOnly: false };
    }
  }
  return { verb: "下载", readOnly: false };
}

/**
 * 识别单个命令段。返回 null 表示「不认识这个命令」，
 * 整体摘要随之放弃（保持诚实的退化）。
 */
function classifySegment(segment: string): SegmentAction | null {
  const { verb, rest } = firstVerbToken(segment);
  if (!verb) return null;

  switch (verb) {
    case "cd":
      return { verb: "进入目录", target: baseName(rest), readOnly: true };
    case "mkdir":
      return { verb: "建目录", target: baseName(rest.replace(/^-\S+\s+/, "")), readOnly: false };
    case "cp":
      return { verb: "复制", target: baseName(rest.split(/\s+/).pop() ?? ""), readOnly: false };
    case "mv":
      return { verb: "移动", target: baseName(rest.split(/\s+/).pop() ?? ""), readOnly: false };
    case "rm":
      return { verb: "删除", target: baseName(rest.split(/\s+/).pop() ?? ""), readOnly: false };
    case "touch":
      return { verb: "创建文件", target: baseName(rest), readOnly: false };
    case "cat": {
      const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
      const file = tokens?.find((t) => !t.startsWith("-"));
      return { verb: "读取", target: baseName(file ?? rest.split(/\s+/)[0] ?? ""), readOnly: true };
    }
    case "ls": {
      const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
      const dir = tokens?.find((t) => !t.startsWith("-"));
      return { verb: "列出目录", target: dir ? baseName(dir) : undefined, readOnly: true };
    }
    case "grep":
    case "rg":
      return { verb: "搜索", target: extractSafeSearchTarget(rest), readOnly: true };
    case "chmod":
      return { verb: "改权限", target: baseName(rest.split(/\s+/).pop() ?? ""), readOnly: false };
    case "chown":
      return { verb: "改属主", target: baseName(rest.split(/\s+/).pop() ?? ""), readOnly: false };
    case "tar":
    case "unzip":
      return { verb: "解压", readOnly: false };
    case "git": {
      const parsed = parseGit(rest);
      return parsed ? { verb: parsed.action, target: parsed.object, readOnly: parsed.readOnly } : null;
    }
    case "sed":
      return parseSed(rest);
    case "nolo":
      return parseNolo(rest);
    case "gh": {
      const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
      if (!tokens?.length) return null;
      const sub = tokens[0];
      const op = tokens[1];
      const isRead = ["view", "list", "status", "checks", "diff"].includes(op ?? "");
      if (sub === "pr") return { verb: isRead ? "查 PR" : "操作 PR", readOnly: isRead };
      if (sub === "run") return { verb: isRead ? "查 CI 运行" : "操作 CI 运行", readOnly: isRead };
      if (sub === "issue") return { verb: isRead ? "查 Issue" : "操作 Issue", readOnly: isRead };
      if (sub === "api") return { verb: "调 GitHub API", readOnly: false };
      return null;
    }
    case "ps":
      return { verb: "查进程", readOnly: true };
    case "sha256sum":
    case "sha1sum":
    case "md5sum":
    case "sha512sum":
    case "b2sum":
    case "cksum": {
      // 校验和只有 stdout 输出；`-c` 也只是读校验清单（无输出文件形态）。
      const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!);
      const file = tokens?.find((t) => !t.startsWith("-"));
      return { verb: "算校验和", target: file ? baseName(file) : undefined, readOnly: true };
    }
    case "du": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      const path = lastFileOperand(tokens, new Set(["-d", "--max-depth", "-B", "--block-size", "--files0-from", "--exclude", "-t", "--threshold", "--time-style"]));
      return { verb: "查磁盘占用", target: path ? baseName(path) : undefined, readOnly: true };
    }
    case "df":
      return { verb: "查磁盘空间", readOnly: true };
    case "free":
      return { verb: "查内存", readOnly: true };
    case "nproc":
      return { verb: "查 CPU 数", readOnly: true };
    case "uptime":
      return { verb: "查负载", readOnly: true };
    case "id": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      const user = tokens.find((t) => !t.startsWith("-"));
      return { verb: "查身份", target: user ? clipShortText(user, 24) : undefined, readOnly: true };
    }
    case "hostname": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      // `hostname newname` / `hostname -F file` / `-b` 会改主机名；只有纯查询才算只读。
      if (tokens.some((t) => ["-F", "--file", "-b", "--boot"].includes(t))) return null;
      if (tokens.some((t) => !t.startsWith("-"))) return null;
      return { verb: "查主机名", readOnly: true };
    }
    case "date": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      // `date -s '…'` / `date 010100002020` 会设置时钟；只有打印形式才算只读。
      if (tokens.some((t) => ["-s", "--set", "-f", "--file"].includes(t) || t.startsWith("--set="))) return null;
      const valueFlags = new Set(["-d", "--date", "-r", "--reference"]);
      const positionals: string[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i]!;
        if (tok.startsWith("-")) {
          if (!tok.includes("=") && valueFlags.has(tok)) i++;
          continue;
        }
        positionals.push(tok);
      }
      // `+%Y-%m-%d` 是输出格式，不是要设置的时间值。
      if (positionals.some((t) => !t.startsWith("+"))) return null;
      return { verb: "查时间", readOnly: true };
    }
    case "basename": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      const path = tokens.find((t) => !t.startsWith("-"));
      return { verb: "取文件名", target: path ? baseName(path) : undefined, readOnly: true };
    }
    case "dirname": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      const path = tokens.find((t) => !t.startsWith("-"));
      return { verb: "取所在目录", target: path ? clipShortText(path, 24) : undefined, readOnly: true };
    }
    case "diff":
    case "cmp": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      // diff/cmp 只输出到 stdout，没有输出文件参数。
      const file = lastFileOperand(tokens, new Set(["-x", "--exclude", "-I", "--ignore-matching-lines", "-U", "--unified", "-C", "--context", "--label", "-L", "--to-file", "--from-file", "-S", "--starting-file", "--horizon-lines", "--tabsize", "-t"]));
      return { verb: "对比文件", target: file ? baseName(file) : undefined, readOnly: true };
    }
    case "dnf":
    case "yum": {
      const sub = rest.split(/\s+/)[0] ?? "";
      if (sub === "install") return { verb: "装软件包", readOnly: false };
      if (sub === "remove" || sub === "erase") return { verb: "卸载软件包", readOnly: false };
      if (sub === "update" || sub === "upgrade") return { verb: "更新系统", readOnly: false };
      if (sub === "search") return { verb: "搜索软件包", readOnly: true };
      if (sub === "list") return { verb: "列出软件包", readOnly: true };
      if (sub === "history") return { verb: "查安装历史", readOnly: true };
      return null;
    }
    case "rpm":
    case "pacman":
    case "apt":
    case "apt-get":
      return { verb: "管软件包", readOnly: false };
    case "systemctl":
    case "journalctl": {
      // `systemctl --user enable foo` 的子命令可能是第 2 个 token：
      // 跳过 --user/--system/-q 之类选项后再取
      const tokens = rest.split(/\s+/).filter((t) => t && !t.startsWith("-"));
      const sub = tokens[0] ?? "";
      if (verb === "journalctl") return { verb: "查日志", readOnly: true };
      const sysVerbs: Record<string, [string, boolean]> = {
        start: ["启动服务", false],
        stop: ["停止服务", false],
        restart: ["重启服务", false],
        status: ["查服务状态", true],
        enable: ["启用服务", false],
        disable: ["停用服务", false],
        "daemon-reload": ["重载服务配置", false],
        "list-units": ["列服务", true],
        "list-unit-files": ["列服务", true],
        is: ["查服务状态", true],
        cat: ["看服务定义", true],
      };
      const mapped = sysVerbs[sub];
      return mapped ? { verb: mapped[0], readOnly: mapped[1] } : null;
    }
    case "awk":
      return { verb: "处理文本", readOnly: true };
    case "find": {
      // HIGH-1：`find -delete` / `find -exec rm` 是删除，不是查找。
      // `-fprint`/`-fprint0`/`-fprintf`/`-fls` 会把结果写进文件，也属写操作。
      // 把破坏性动作说成只读是编造摘要（违背本模块的退化原则）。
      if (/(?:^|\s)(?:-delete|-exec|-execdir|-ok|-okdir|-fprint|-fprint0|-fprintf|-fls)(?:\s|$)/.test(rest)) return null;
      return { verb: "查找文件", readOnly: true };
    }
    case "curl":
    case "wget":
      return parseCurlOrWget(verb, rest);
    case "bun":
    case "npm":
    case "pnpm":
    case "yarn": {
      const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!) ?? rest.split(/\s+/).filter(Boolean);
      const sub = tokens[0] ?? "";
      // 单纯版本探针（`bun --version` / `npm -v`）是确定性只读查询。
      if (tokens.length === 1 && ["-v", "-V", "--version"].includes(sub)) return { verb: "查版本", readOnly: true };
      if (sub === "test") {
        // 保留测试目标（第一个非 flag 参数），`bun test packages/cli/tui` → 「跑测试 cli/tui」
        const target = tokens.slice(1).find((t) => !t.startsWith("-"));
        return { verb: "跑测试", target: target ? baseName(target) : undefined, readOnly: false };
      }
      if (sub === "install" || sub === "i" || sub === "add") return { verb: "装依赖", readOnly: false };
      if (sub === "run") {
        // `bun run typecheck:core` → 「跑脚本 typecheck:core」
        const script = tokens[1];
        return { verb: "跑脚本", target: script, readOnly: false };
      }
      if (sub === "build") return { verb: "构建", readOnly: false };
      if (sub === "x" || sub === "exec") {
        // bunx 形式：`bun x tsc` → 「执行 tsc」
        return { verb: "执行", target: tokens[1], readOnly: false };
      }
      if (verb === "bun" && (sub === "-e" || sub === "-p" || sub === "--inline-heredoc" || tokens.includes("--inline-heredoc"))) {
        return { verb: "执行内联脚本 (Bun)", readOnly: false };
      }
      const scriptFile = tokens.find((t) => !t.startsWith("-") && (/\.(?:ts|tsx|js|mjs|mts|cjs)$/i.test(t) || t.includes("/")));
      if (scriptFile) {
        return { verb: "运行脚本", target: baseName(scriptFile), readOnly: false };
      }
      return null;
    }
    case "python":
    case "python3": {
      const tokens = shellWords(rest.split(/\s+\|\s+/)[0]!) ?? [];
      if (tokens.length === 1 && ["-V", "-v", "--version"].includes(tokens[0]!)) return { verb: "查版本", readOnly: true };
      if (tokens.includes("--inline-heredoc") || /(?:^|\s)-[A-Za-z]*c(?:\s|$)/.test(rest)) {
        return { verb: "执行内联脚本 (Python)", readOnly: false };
      }
      const script = rest.split(/\s+/).find((t) => t && !t.startsWith("-"));
      return { verb: "执行脚本", target: baseName(script ?? ""), readOnly: false };
    }
    case "node": {
      if (/(?:^|\s)-[A-Za-z]*e(?:\s|$)/.test(rest)) return null;
      const nodeTokens = shellWords(stripTrailingPipe(rest));
      if (nodeTokens?.length === 1 && ["-v", "-V", "--version"].includes(nodeTokens[0]!)) return { verb: "查版本", readOnly: true };
      const script = rest.split(/\s+/).find((t) => t && !t.startsWith("-"));
      return { verb: "执行脚本", target: baseName(script ?? ""), readOnly: false };
    }
    case "bash":
    case "sh":
    case "zsh": {
      // `-c` / `-e` 以及组合短选项（`-lc`、`-ec`、`-xc`）都是「把一段代码
      // 当字符串跑」，不存在脚本文件。
      if (/(?:^|\s)-[A-Za-z]*[ce](?:\s|$)/.test(rest)) return null;
      const script = rest.split(/\s+/).find((t) => t && !t.startsWith("-"));
      return { verb: "执行脚本", target: baseName(script ?? ""), readOnly: false };
    }
    case "echo":
    case "printf":
      return { verb: "输出", readOnly: true };
    case "head":
    case "tail":
    case "wc":
    case "sort":
    case "uniq": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      if (
        verb === "sort" &&
        tokens.some((t) => t === "-o" || (t.startsWith("-") && !t.startsWith("--") && t.includes("o")) || t === "--output" || t.startsWith("--output="))
      ) {
        return null;
      }
      const valueFlagsByCmd: Record<"head" | "tail" | "wc" | "sort" | "uniq", ReadonlySet<string>> = {
        head: new Set(["-n", "-c", "--lines", "--bytes"]),
        tail: new Set(["-n", "-c", "-s", "--lines", "--bytes", "--sleep-interval", "--pid"]),
        wc: new Set(["--files0-from"]),
        sort: new Set(["-t", "-k", "-T", "-S", "--field-separator", "--key", "--temporary-directory", "--buffer-size", "--files0-from"]),
        uniq: new Set(["-f", "-s", "-w", "--skip-fields", "--skip-chars", "--check-chars"]),
      };
      const valueFlags = valueFlagsByCmd[verb];
      const positionals: string[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i]!;
        if (tok === "--") {
          positionals.push(...tokens.slice(i + 1));
          break;
        }
        if (tok.startsWith("-")) {
          if (!tok.includes("=") && valueFlags.has(tok)) i++;
          continue;
        }
        positionals.push(tok);
      }
      // `uniq <input> <output>` writes to the second positional file; never fold as readOnly.
      if (verb === "uniq" && positionals.length >= 2) return null;
      const file = positionals[0];
      return file ? { verb: "查看", target: baseName(file), readOnly: true } : { verb: "查看输出", readOnly: true };
    }
    case "which": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      const target = tokens.find((t) => !t.startsWith("-"));
      return target ? { verb: "查命令", target: clipShortText(target, 24), readOnly: true } : { verb: "查命令", readOnly: true };
    }
    case "command": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens || tokens.length < 2) return null;
      if (tokens[0] !== "-v" && tokens[0] !== "-V") return null;
      const target = tokens.slice(1).find((t) => !t.startsWith("-"));
      return target ? { verb: "查命令", target: clipShortText(target, 24), readOnly: true } : null;
    }
    case "file": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      // `file -C` / `--compile` writes a compiled magic file (~/.magic.mgc); never mark readOnly.
      for (const tok of tokens) {
        if (tok === "--") break;
        if (tok === "--compile" || (tok.startsWith("-") && !tok.startsWith("--") && tok.includes("C"))) {
          return null;
        }
      }
      let file: string | undefined;
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i]!;
        if (tok === "--") {
          file = tokens[i + 1];
          break;
        }
        if (["-m", "-f", "-F", "-e", "--exclude", "--magic-file"].includes(tok)) { i++; continue; }
        if (tok.startsWith("-")) continue;
        file = tok;
        break;
      }
      return { verb: "查类型", target: file ? baseName(file) : undefined, readOnly: true };
    }
    case "stat": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      let file: string | undefined;
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i]!;
        if (["-c", "--format", "--printf"].includes(tok)) { i++; continue; }
        if (tok.startsWith("-")) continue;
        file = tok;
        break;
      }
      return { verb: "查文件信息", target: file ? baseName(file) : undefined, readOnly: true };
    }
    case "readlink":
    case "realpath": {
      const tokens = shellWords(stripTrailingPipe(rest));
      if (!tokens) return null;
      const file = tokens.find((t) => !t.startsWith("-"));
      return { verb: "解析路径", target: file ? baseName(file) : undefined, readOnly: true };
    }
    case "pwd":
      return { verb: "查当前目录", readOnly: true };
    case "uname":
      return { verb: "查系统信息", readOnly: true };
    case "whoami":
      return { verb: "查身份", readOnly: true };
    default:
      return null;
  }
}

/**
 * 把动作列表压成一行摘要。
 * 相邻同类动作合并计数（复制 3 个 → 「复制 3 个文件」）。
 */
function summarizeActions(actions: SegmentAction[]): string {
  // 进入目录作为前缀条件，单独提到最前
  const cds = actions.filter((a) => a.verb === "进入目录");
  const body = actions.filter((a) => a.verb !== "进入目录");

  // 合并相邻同 verb + 同 target 的动作（M4：只比 verb 会把 f1/f2 的两处
  // 替换都记到 f1 名下并丢掉 f2，摘要指向错误对象）
  const merged: SegmentAction[] = [];
  for (const action of body) {
    const last = merged[merged.length - 1];
    if (last && last.verb === action.verb && last.target === action.target) {
      last.count = (last.count ?? 1) + (action.count ?? 1);
      continue;
    }
    merged.push({ ...action });
  }

  const renderOne = (a: SegmentAction): string => {
    if (a.count && a.count > 1) {
      const suffix = a.unit ?? (a.verb === "复制" || a.verb === "移动" || a.verb === "删除" ? "个文件" : "项");
      // 合并计数时 target 只代表其中一个，带上会误导（「复制 palettes：2 个文件」），
      // 所以只在有单位语义（如 sed 的「处替换」）时才带 target。
      const head = a.unit && a.target ? `${a.verb} ${a.target}` : a.verb;
      return `${head} ${a.count} ${suffix}`;
    }
    return a.target ? `${a.verb} ${a.target}` : a.verb;
  };

  const parts = merged.map(renderOne);
  const cdPart = cds.length > 0 && cds[0].target ? `进入 ${cds[0].target}` : "";
  const joined = parts.length > 0 ? parts.join("、") : "";
  if (cdPart && joined) return `${cdPart}：${joined}`;
  return cdPart || joined;
}

/**
 * 管道右侧允许出现的「纯过滤 / 查看」命令白名单。
 *
 * 只有这些命令出现在 `|` 右侧时才认为管道不改变执行语义（读 → 过滤 → 读）。
 * 任何其他命令（sh / bash / sudo / xargs / dd / tee 到设备 / env / 解释器…）
 * 都可能把数据变成副作用，摘要必须退回原文。
 */
const PIPELINE_FILTER_COMMANDS = new Set([
  "head", "tail", "cat", "wc", "sort", "uniq", "cut", "tr", "nl", "column",
  "grep", "egrep", "fgrep", "rg", "ag", "ack", "jq", "less", "more", "bat",
  "awk", "sed",
  // 纯 stdout 文本/校验和工具：只读 stdin/文件，没有输出文件参数
  // （写文件的 tee/xargs/split/xxd 之类**不在此列**）。
  "diff", "cmp", "comm", "paste", "join", "fold", "expand", "unexpand",
  "tac", "rev", "strings", "od", "base64",
  "md5sum", "sha1sum", "sha256sum", "sha512sum", "b2sum", "cksum",
]);

/**
 * 判断命令里是否存在「右侧不是纯过滤器」的管道。
 *
 * 逐段检查、跳过引号内容（`grep -E 'foo|sh'` 里的 `|` 不是管道），
 * 对每一处真实的 `|` 取右邻命令名（去掉路径前缀与 sudo/env 前缀）后
 * 查白名单。`|` 后面接 `||` 的部分交给调用方的 hasFallback 处理。
 */
function hasNonFilterPipeline(command: string): boolean {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];
    if (quote) {
      if (ch === "\\" && next && quote === '"') { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "\\" && next) { i++; continue; }
    // 单个 | 是管道；|| 是失败回退（另有 hasFallback 处理，不在此判）
    if (ch === "|" && next !== "|" && command[i - 1] !== "|") {
      // 取右侧第一个命令词
      const afterPipe = command.slice(i + 1).trimStart();
      const m = afterPipe.match(/^(\S+)\s*(.*)$/s);
      if (!m) return true;
      let word = m[1].replace(/^.*\//, ""); // 去路径前缀：/bin/sh → sh
      let restAfter = m[2];
      // 剥掉 sudo / env / xargs 之类前缀，看真正的执行者
      let guard = 0;
      while (guard++ < 4) {
        if (word === "sudo") {
          // `sudo -i bash` / `sudo -u x sh`：跳过选项找命令
          const opt = restAfter.match(/^(?:-\S+\s+)*(\S+)\s*(.*)$/s);
          if (!opt) return true;
          word = opt[1].replace(/^.*\//, "");
          restAfter = opt[2];
          continue;
        }
        if (word === "env" || word === "xargs") {
          // env VAR=1 bash / xargs -0 rm
          const nxt = restAfter.match(/^(?:[A-Za-z_]\w*=\S*\s+|-\S+\s+)*(\S+)\s*(.*)$/s);
          if (!nxt) return true;
          word = nxt[1].replace(/^.*\//, "");
          restAfter = nxt[2];
          continue;
        }
        break;
      }
      if (!PIPELINE_FILTER_COMMANDS.has(word)) return true;
    }
  }
  return false;
}

/**
 * 生成命令摘要。识别失败返回 null，调用方应退回原文投影。
 *
 * **契约：返回的是未脱敏文本。** summary 会原样带出 target，而 target 可能
 * 含凭据（`cat token=…`、`bun run sk-…`）。调用方必须过 redactSecrets，
 * 见 toolOutput.ts 的摘要出口；那里还有 withholdIfSecretLike 兜底。
 * 本函数只负责结构化摘要，不做脱敏（脱敏属出口职责，避免两处各写一遍规则）。
 *
 * @param command 运行时产出的命令原文（metadata.command）
 */
/**
 * Collapse single-quoted heredocs (`python3 - <<'PY' ... PY`) into a marker
 * token `--inline-heredoc` so body lines are never split as shell segments.
 * Unquoted heredocs (`<<PY`) allow shell expansion and are left untouched so
 * downstream checks fall back safely to the raw command.
 */
function collapseSafeHeredocs(command: string): string | null {
  const lines = command.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const hd = trimmed.match(/^(.*?)\s*<<-?\s*'([A-Za-z0-9_]+)'\s*$/);
    if (hd) {
      const head = hd[1]!.trim();
      const tag = hd[2]!;
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j]!.trim() === tag) { end = j; break; }
      }
      if (end === -1) return null; // unclosed heredoc
      out.push(`${head} --inline-heredoc`);
      i = end;
      continue;
    }
    out.push(trimmed);
  }
  return out.join("\n");
}

/** Join top-level newlines as ` && ` without breaking inside `'...'` single quotes. */
function normalizeTopLevelNewlines(command: string): string {
  let out = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]!;
    const next = command[i + 1];
    if (quote) {
      if (ch === "\\" && next && quote === '"') { out += ch + next; i++; continue; }
      if (ch === quote) quote = null;
      out += ch === "\n" ? " " : ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
    if (ch === "\\" && next) { out += ch + next; i++; continue; }
    if (ch === "\n") {
      if (!out.endsWith("&& ") && out.trim().length > 0) out += " && ";
      continue;
    }
    out += ch;
  }
  return out.replace(/(?:\s*&&\s*)+$/, "").trim();
}

export function summarizeShellCommand(command: string): CommandGist | null {
  const collapsed = collapseSafeHeredocs(command);
  if (collapsed === null) return null;
  const normalized = normalizeTopLevelNewlines(collapsed);
  if (!normalized) return null;

  // HIGH-2：管道右侧若是「消费者」，执行语义完全不在首段 verb 里
  // （`curl … | sh` 会把远端代码跑起来，摘要却只显示「下载」）。
  //
  // 用**白名单**而不是 denylist：只放行纯过滤/查看类命令，其余一律退回原文。
  // 理由是 denylist 永远在追新的绕过写法——`| /bin/sh`、`| sudo -i bash`、
  // `| env bash`、`| xargs -0 rm`、`| dd of=/dev/sda` 都能漏过去（复审实测）。
  // 白名单天然覆盖这些，且误判方向安全（多退原文，不会编造）。
  if (hasNonFilterPipeline(normalized)) return null;

  const { segments, hasFallback } = splitSegments(normalized);
  if (segments.length === 0) return null;
  // M2：`||` 失败回退链上后续命令可能根本没执行，摘要一律退回原文，
  // 避免声称「查状态、查历史」而实际只跑了后半条。
  if (hasFallback) return null;
  // shellWords(segment, true) rejects any `$` or backtick outside single quotes
  // (including inside double quotes like "$DIR").
  if (segments.some(segment => !shellWords(segment, true))) return null;

  const actions: SegmentAction[] = [];
  for (const segment of segments) {
    const action = classifySegment(segment);
    // 任意一段识别不了 → 整体放弃，退回原文，避免给出片面的摘要
    if (!action) return null;
    actions.push(action);
  }

  const summary = summarizeActions(actions);
  if (!summary) return null;

  const readOnly = actions.every((a) => a.readOnly === true);
  const single = segments.length === 1 ? firstVerbToken(segments[0]!) : undefined;
  const git = single?.verb === "git" ? parseGit(single.rest) : null;
  const singleAction = segments.length === 1 && !actions[0]?.count
    ? { action: actions[0]!.verb, ...(actions[0]!.target ? { object: actions[0]!.target } : {}) }
    : {};
  return { summary, foldedSegments: segments.length, readOnly, ...singleAction, ...(git ?? {}) };
}
