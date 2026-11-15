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
};

/** 摘要结果。null 表示识别失败，调用方应退回原文投影。 */
export type CommandGist = {
  /** 主摘要文本，例如「建目录并复制 2 个文件」。 */
  summary: string;
  /** 被折叠掉的段数（供 UI 显示「+N」）。 */
  foldedSegments: number;
};

/** 取路径最后一段用于显示；空路径返回 undefined。 */
function baseName(path: string): string | undefined {
  const cleaned = path.replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
  if (!cleaned || cleaned === "." || cleaned === "..") return undefined;
  const parts = cleaned.split("/").filter(Boolean);
  const base = parts.pop();
  return base || undefined;
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

/** 去掉前置的环境变量赋值（`NOLO=1 bun test` → `bun test`）。 */
function stripEnvAssignments(segment: string): string {
  let rest = segment;
  while (/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/.test(rest)) {
    rest = rest.replace(/^[A-Za-z_][A-Za-z0-9_]*=\S*\s+/, "");
  }
  return rest;
}

/** 取段的首个命令词（跳过 `sudo`/`env`/`command` 之类前缀）。 */
function firstVerbToken(segment: string): { verb: string; rest: string } {
  let rest = stripEnvAssignments(segment).trim();
  // 常见前缀包装词：跳过并继续
  const wrappers = new Set(["sudo", "env", "command", "time", "nohup", "exec"]);
  let guard = 0;
  while (guard++ < 5) {
    // 先剥掉前置的 VAR=value 赋值（`env NOLO=1 bun test` 跳过 env 后
    // 还要再剥一层 NOLO=1），否则识别出的 verb 是 "NOLO=1"
    const before = rest;
    rest = stripEnvAssignments(rest).trim();
    const m = rest.match(/^(\S+)\s*(.*)$/s);
    if (!m) return { verb: "", rest: "" };
    const [, word, restAfter] = m;
    if (wrappers.has(word) && restAfter.trim()) {
      rest = restAfter.trim();
      continue;
    }
    if (before !== rest && !rest) return { verb: "", rest: "" };
    return { verb: word.replace(/^.*\//, ""), rest: restAfter.trim() };
  }
  return { verb: "", rest };
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
      return { verb: "进入目录", target: baseName(rest) };
    case "mkdir":
      return { verb: "建目录", target: baseName(rest.replace(/^-\S+\s+/, "")) };
    case "cp":
      return { verb: "复制", target: baseName(rest.split(/\s+/).pop() ?? "") };
    case "mv":
      return { verb: "移动", target: baseName(rest.split(/\s+/).pop() ?? "") };
    case "rm":
      return { verb: "删除", target: baseName(rest.split(/\s+/).pop() ?? "") };
    case "touch":
      return { verb: "创建文件", target: baseName(rest) };
    case "cat":
      return { verb: "读取", target: baseName(rest.split(/\s+/)[0] ?? "") };
    case "ls":
      return { verb: "列出目录" };
    case "grep":
    case "rg":
      return { verb: "搜索" };
    case "chmod":
      return { verb: "改权限", target: baseName(rest.split(/\s+/).pop() ?? "") };
    case "chown":
      return { verb: "改属主", target: baseName(rest.split(/\s+/).pop() ?? "") };
    case "tar":
    case "unzip":
      return { verb: "解压" };
    case "git": {
      // 跳过选项取子命令：`git --git-dir=/x status` 的 sub 是 status
      const rawTokens = rest.split(/\s+/).filter(Boolean);
      const subIndex = rawTokens.findIndex((t) => !t.startsWith("-"));
      const sub = subIndex >= 0 ? rawTokens[subIndex] : "";
      // HIGH-1 同类：`git checkout .` / `-- .` / `<path>` 是丢弃工作区改动，
      // 不是切换分支。参数看起来是路径时退回原文，避免把破坏性操作说成只读。
      if (sub === "checkout") {
        const args = rawTokens.slice(subIndex + 1);
        const looksLikePath = args.some(
          (t) => t === "." || t === "--" || t.includes("/") || t.endsWith("*"),
        );
        if (looksLikePath) return null;
      }
      const gitVerbs: Record<string, string> = {
        clone: "克隆仓库",
        status: "查状态",
        add: "暂存改动",
        commit: "提交",
        push: "推送",
        pull: "拉取",
        fetch: "抓取远端",
        checkout: "切换分支",
        switch: "切换分支",
        merge: "合并",
        rebase: "变基",
        log: "查历史",
        diff: "看差异",
        worktree: "管理工作区",
        branch: "管理分支",
        stash: "暂存",
        reset: "重置",
        restore: "恢复文件",
      };
      const mapped = gitVerbs[sub];
      return mapped ? { verb: mapped } : null;
    }
    case "sed": {
      // 数一下 s|a|b| / s/a/b/ / s#a#b# 形式的替换次数
      const replaceCount = (rest.match(/s[|/#][^|/#]*[|/#][^|/#]*[|/#]/g) ?? []).length;
      // 目标文件是最后一个不以 - 开头、且不含 | / # 分隔符的 token
      const tokens = rest.split(/\s+/).filter((t) => t && !t.startsWith("-"));
      const fileToken = [...tokens].reverse().find((t) => !/[|/#]/.test(t));
      return {
        verb: "编辑",
        target: baseName(fileToken ?? ""),
        count: replaceCount > 1 ? replaceCount : undefined,
        unit: "处替换",
      };
    }
    case "dnf":
    case "yum": {
      const sub = rest.split(/\s+/)[0] ?? "";
      if (sub === "install") return { verb: "装软件包" };
      if (sub === "remove" || sub === "erase") return { verb: "卸载软件包" };
      if (sub === "update" || sub === "upgrade") return { verb: "更新系统" };
      if (sub === "search") return { verb: "搜索软件包" };
      if (sub === "list") return { verb: "列出软件包" };
      if (sub === "history") return { verb: "查安装历史" };
      return null;
    }
    case "rpm":
    case "pacman":
    case "apt":
    case "apt-get":
      return { verb: "管软件包" };
    case "systemctl":
    case "journalctl": {
      // `systemctl --user enable foo` 的子命令可能是第 2 个 token：
      // 跳过 --user/--system/-q 之类选项后再取
      const tokens = rest.split(/\s+/).filter((t) => t && !t.startsWith("-"));
      const sub = tokens[0] ?? "";
      if (verb === "journalctl") return { verb: "查日志" };
      const sysVerbs: Record<string, string> = {
        start: "启动服务",
        stop: "停止服务",
        restart: "重启服务",
        status: "查服务状态",
        enable: "启用服务",
        disable: "停用服务",
        "daemon-reload": "重载服务配置",
        "list-units": "列服务",
        "list-unit-files": "列服务",
        is: "查服务状态",
        cat: "看服务定义",
      };
      const mapped = sysVerbs[sub];
      return mapped ? { verb: mapped } : null;
    }
    case "awk":
      return { verb: "处理文本" };
    case "find": {
      // HIGH-1：`find -delete` / `find -exec rm` 是删除，不是查找。
      // 把破坏性动作说成只读是编造摘要（违背本模块的退化原则）。
      if (/(?:^|\s)(?:-delete|-exec|-execdir|-ok|-okdir)(?:\s|$)/.test(rest)) return null;
      return { verb: "查找文件" };
    }
    case "curl":
    case "wget":
      return { verb: "下载" };
    case "bun":
    case "npm":
    case "pnpm":
    case "yarn": {
      const tokens = rest.split(/\s+/).filter(Boolean);
      const sub = tokens[0] ?? "";
      if (sub === "test") {
        // 保留测试目标（第一个非 flag 参数），`bun test packages/cli/tui` → 「跑测试 cli/tui」
        const target = tokens.slice(1).find((t) => !t.startsWith("-"));
        return { verb: "跑测试", target: target ? baseName(target) : undefined };
      }
      if (sub === "install" || sub === "i" || sub === "add") return { verb: "装依赖" };
      if (sub === "run") {
        // `bun run typecheck:core` → 「跑脚本 typecheck:core」
        const script = tokens[1];
        return { verb: "跑脚本", target: script };
      }
      if (sub === "build") return { verb: "构建" };
      if (sub === "x" || sub === "exec") {
        // bunx 形式：`bun x tsc` → 「执行 tsc」
        return { verb: "执行", target: tokens[1] };
      }
      return null;
    }
    case "node":
    case "python":
    case "python3":
    case "bash":
    case "sh":
    case "zsh": {
      // `-c` / `-e` 以及组合短选项（`-lc`、`-ec`、`-xc`）都是「把一段代码
      // 当字符串跑」，不存在脚本文件。
      if (/(?:^|\s)-[A-Za-z]*[ce](?:\s|$)/.test(rest)) return null;
      const script = rest.split(/\s+/).find((t) => t && !t.startsWith("-"));
      return { verb: "执行脚本", target: baseName(script ?? "") };
    }
    case "echo":
    case "printf":
      return { verb: "输出" };
    case "head":
    case "tail":
    case "wc":
    case "sort":
    case "uniq":
      return { verb: "查看输出" };
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
  "grep", "rg", "ag", "ack", "jq", "less", "more", "bat",
  "awk", "sed",
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
export function summarizeShellCommand(command: string): CommandGist | null {
  // 换行是命令分隔符，必须先按行切再折叠空白，否则 `a\nb` 会被并成一条
  // 单段命令（`git status\ngit log` 被当成 `git status git log`）。
  const normalized = command
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" && ");
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

  const actions: SegmentAction[] = [];
  for (const segment of segments) {
    const action = classifySegment(segment);
    // 任意一段识别不了 → 整体放弃，退回原文，避免给出片面的摘要
    if (!action) return null;
    actions.push(action);
  }

  const summary = summarizeActions(actions);
  if (!summary) return null;

  return { summary, foldedSegments: segments.length };
}
