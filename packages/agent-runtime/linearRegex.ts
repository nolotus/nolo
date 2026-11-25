// packages/agent-runtime/linearRegex.ts
//
// 线性时间（Thompson NFA）正则匹配器 —— 专供进程输出等待（readyPattern /
// waitForPattern）使用。
//
// 为什么不能用 `new RegExp(pattern)`：
//   宿主 JS 引擎的正则是回溯实现，且跑在主线程上。`(a+)+$` 这类模式遇到
//   一条长日志就是指数级回溯：事件循环被整段冻住，于是 wait 超时、AbortSignal、
//   pipe drain 全部失效——沙盒里的子进程只要打印一行畸形输出就能卡死整个运行时。
//
// 本模块的做法：把模式编译成 Thompson NFA，再用显式状态集合在行上模拟，
// 严格 O(N · M)（N = 行长度，M = NFA 状态数），不回溯、不递归、零依赖。
//
// 支持（日志匹配需要的子集）：普通字符、`.`、转义字符（`\d \D \w \W \s \S`
// 与 `\n \r \t \f \v \0` 及元字符转义）、字符类 `[...]` / `[^...]`（含范围
// `a-z` 与内置转义）、分组 `(...)` / `(?:...)`、选择 `|`、量词
// `* + ? {m} {m,} {m,n}`（含惰性修饰 `*? +? ??`，布尔结果一致）、行锚点
// `^` / `$`（相对被匹配的那一行）。
//
// 明确拒绝（需要回溯或捕获状态，无法保持线性）：反向引用 `\1`-`\9`、命名
// 反向引用 `\k<name>`、前后查找 `(?=...)` `(?!...)` `(?<=...)` `(?<!...)`、
// 命名分组 `(?<name>...)`、词边界 `\b` / `\B`。拒绝时报清晰错误，交由调用方
// 转成 `invalid-arguments`，绝不悄悄退回 `RegExp`。
//
// 编译上限（拒绝病态模式而非吃满 CPU）：模式长度、状态数、重复次数。

export const LINEAR_REGEX_MAX_PATTERN_LENGTH = 512;
export const LINEAR_REGEX_MAX_STATES = 512;
export const LINEAR_REGEX_MAX_REPEAT = 64;
/**
 * 单行最多扫描的字符数。
 *
 * NFA 模拟是 O(行长 · 状态数)，没有回溯但仍然是**同步 CPU 工作**：`(?:x{64}){7}y`
 * 这种合法模式遇上一条 65,535 字符的日志行就是 ~3e7 步（实测 ≈960ms），足以冻住
 * timer / AbortSignal / pipe drain。超过此上限的行只扫描受预算约束的前缀，配合
 * `LINEAR_REGEX_MAX_STEPS` 给出单次 `test()` 的硬上界。
 */
export const LINEAR_REGEX_MAX_LINE_SCAN_CHARS = 8_192;
/** 单次 `test()` 允许的 NFA 步数硬上限（超出即中止并返回 `line-budget-exceeded`）。 */
export const LINEAR_REGEX_MAX_STEPS = 1_000_000;

export type LinearRegexTestStatus =
  | "matched"
  | "no-match"
  /** 单行扫描预算用尽（步数上限）：结果未知，绝不等同于「不匹配」。 */
  | "line-budget-exceeded"
  /** 墙钟 deadline 到达：调用方应把它当作真正的等待超时。 */
  | "deadline-exceeded";

export type LinearRegexTestResult = {
  status: LinearRegexTestStatus;
  /** True when the line was longer than `LINEAR_REGEX_MAX_LINE_SCAN_CHARS`,
   *  so only a prefix was scanned — a `no-match` is not conclusive then. */
  lineTruncated?: boolean;
};

export type LinearRegexTestOptions = {
  /** Absolute timestamp (`now()` scale) after which the scan must stop. */
  deadlineMs?: number;
  now?: () => number;
};

export type LinearRegex = {
  /** Original pattern source (for error messages / echoes only). */
  readonly source: string;
  /** True when `line` contains a match. Never mutates matcher state. */
  test(line: string): boolean;
  /**
   * Bounded variant: never scans more than `LINEAR_REGEX_MAX_LINE_SCAN_CHARS`
   * characters or `LINEAR_REGEX_MAX_STEPS` NFA steps, and yields control to the
   * event loop between scan slices so timers / aborts are not starved.
   *
   * NOTE: `status: "line-budget-exceeded"` / `"deadline-exceeded"` mean
   * "unknown", never "no match" — a caller that needs a real answer must retry
   * with more budget. A `no-match` with `lineTruncated: true` is also
   * inconclusive (only a prefix of an oversized line was scanned).
   */
  testBounded(line: string, opts?: LinearRegexTestOptions): LinearRegexTestResult;
};

export type LinearRegexCompileResult =
  | { ok: true; matcher: LinearRegex }
  | { ok: false; detail: string };

type CharPredicate = (code: number) => boolean;

function codeIsDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function codeIsWord(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    code === 95 ||
    (code >= 97 && code <= 122)
  );
}

function codeIsSpace(code: number): boolean {
  return (
    code === 32 ||
    code === 9 ||
    code === 10 ||
    code === 11 ||
    code === 12 ||
    code === 13 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  );
}

// `.` never crosses a line terminator (same intent as the JS default).
function codeIsAnyExceptLineTerminator(code: number): boolean {
  return code !== 10 && code !== 13;
}

function charEquals(expected: number): CharPredicate {
  return (code) => code === expected;
}

function unionPredicates(predicates: CharPredicate[]): CharPredicate {
  if (predicates.length === 0) return () => false;
  if (predicates.length === 1) return predicates[0]!;
  return (code) => {
    for (const predicate of predicates) {
      if (predicate(code)) return true;
    }
    return false;
  };
}

// --- AST ---------------------------------------------------------------------

type Ast =
  | { type: "empty" }
  | { type: "char"; pred: CharPredicate }
  | { type: "lineStart" }
  | { type: "lineEnd" }
  | { type: "seq"; items: Ast[] }
  | { type: "alt"; options: Ast[] }
  | { type: "repeat"; node: Ast; min: number; max: number };

class LinearRegexError extends Error {}

const EMPTY_AST: Ast = { type: "empty" };

// --- Parser ------------------------------------------------------------------

class PatternParser {
  private i = 0;

  constructor(private readonly source: string) {}

  parse(): Ast {
    const node = this.parseAlternation();
    if (this.i < this.source.length) {
      const rest = this.source[this.i];
      throw new LinearRegexError(
        rest === ")"
          ? `unmatched ")" at position ${this.i}`
          : `unexpected "${rest}" at position ${this.i}`,
      );
    }
    return node;
  }

  private peek(offset = 0): string | undefined {
    return this.source[this.i + offset];
  }

  private parseAlternation(): Ast {
    const options: Ast[] = [this.parseSequence()];
    while (this.peek() === "|") {
      this.i += 1;
      options.push(this.parseSequence());
    }
    return options.length === 1 ? options[0]! : { type: "alt", options };
  }

  private parseSequence(): Ast {
    const items: Ast[] = [];
    while (this.i < this.source.length) {
      const c = this.source[this.i]!;
      if (c === "|" || c === ")") break;
      items.push(this.parseQuantified());
    }
    if (items.length === 0) return EMPTY_AST;
    return items.length === 1 ? items[0]! : { type: "seq", items };
  }

  private parseQuantified(): Ast {
    const atom = this.parseAtom();
    const c = this.peek();
    let min: number;
    let max: number;
    if (c === "*") {
      min = 0;
      max = Number.POSITIVE_INFINITY;
      this.i += 1;
    } else if (c === "+") {
      min = 1;
      max = Number.POSITIVE_INFINITY;
      this.i += 1;
    } else if (c === "?") {
      min = 0;
      max = 1;
      this.i += 1;
    } else if (c === "{") {
      const quantifier = this.tryParseBraceQuantifier();
      if (!quantifier) return atom;
      min = quantifier.min;
      max = quantifier.max;
    } else {
      return atom;
    }
    // Lazy modifier (`*?`, `+?`, `??`, `{m,n}?`): identical boolean semantics,
    // so it is accepted and dropped. A second quantifier (`a**`) is left to the
    // parser as a literal, matching neither JS nor anything useful in practice.
    if (this.peek() === "?") this.i += 1;
    return { type: "repeat", node: atom, min, max };
  }

  private tryParseBraceQuantifier(): { min: number; max: number } | null {
    const match = /^\{(\d+)(,(\d*))?\}/.exec(this.source.slice(this.i));
    if (!match) return null;
    const min = Number(match[1]);
    const hasComma = match[2] !== undefined;
    const max = !hasComma ? min : match[3] ? Number(match[3]) : Number.POSITIVE_INFINITY;
    if (
      !Number.isSafeInteger(min) ||
      min > LINEAR_REGEX_MAX_REPEAT ||
      (max !== Number.POSITIVE_INFINITY && max > LINEAR_REGEX_MAX_REPEAT)
    ) {
      throw new LinearRegexError(
        `repetition count above ${LINEAR_REGEX_MAX_REPEAT} is not supported (bounded to keep matching linear-time)`,
      );
    }
    if (max < min) {
      throw new LinearRegexError(`invalid repetition range {${min},${max}}`);
    }
    this.i += match[0].length;
    return { min, max };
  }

  private parseAtom(): Ast {
    const c = this.source[this.i];
    if (c === undefined) throw new LinearRegexError("unexpected end of pattern");

    if (c === "(") return this.parseGroup();
    if (c === "[") return this.parseCharClass();
    if (c === ".") {
      this.i += 1;
      return { type: "char", pred: codeIsAnyExceptLineTerminator };
    }
    if (c === "^") {
      this.i += 1;
      return { type: "lineStart" };
    }
    if (c === "$") {
      this.i += 1;
      return { type: "lineEnd" };
    }
    if (c === "\\") return this.parseEscapeAtom();
    if (c === "*" || c === "+" || c === "?") {
      throw new LinearRegexError(`nothing to repeat before "${c}" at position ${this.i}`);
    }
    if (c === ")") throw new LinearRegexError(`unmatched ")" at position ${this.i}`);
    this.i += 1;
    return { type: "char", pred: charEquals(c.charCodeAt(0)) };
  }

  private parseGroup(): Ast {
    this.i += 1; // consume "("
    if (this.peek() === "?") {
      const kind = this.peek(1);
      if (kind === ":") {
        this.i += 2;
      } else if (kind === "=" || kind === "!") {
        throw new LinearRegexError(
          "lookahead assertions ((?=...), (?!...)) are not supported; rewrite the pattern without lookahead",
        );
      } else if (kind === "<") {
        throw new LinearRegexError(
          "lookbehind assertions / named groups ((?<=...), (?<!...), (?<name>...)) are not supported",
        );
      } else {
        throw new LinearRegexError(`unsupported group syntax "(?${kind ?? ""}"`);
      }
    }
    const inner = this.parseAlternation();
    if (this.peek() !== ")") throw new LinearRegexError('unclosed group: missing ")"');
    this.i += 1;
    return inner;
  }

  private parseEscapeAtom(): Ast {
    const next = this.peek(1);
    if (next === undefined) throw new LinearRegexError("trailing backslash");
    const escaped = escapePredicate(next);
    this.i += 2;
    if (typeof escaped === "number") return { type: "char", pred: charEquals(escaped) };
    return { type: "char", pred: escaped };
  }

  private parseCharClass(): Ast {
    this.i += 1; // consume "["
    let negated = false;
    if (this.peek() === "^") {
      negated = true;
      this.i += 1;
    }
    const predicates: CharPredicate[] = [];
    let first = true;
    let closed = false;
    while (this.i < this.source.length) {
      const c = this.source[this.i]!;
      if (c === "]" && !first) {
        this.i += 1;
        closed = true;
        break;
      }
      first = false;
      const head = this.parseCharClassAtom();
      const isRange = this.peek() === "-" && this.peek(1) !== undefined && this.peek(1) !== "]";
      if (isRange) {
        this.i += 1; // consume "-"
        const tail = this.parseCharClassAtom();
        if (head.code !== undefined && tail.code !== undefined) {
          const lo = Math.min(head.code, tail.code);
          const hi = Math.max(head.code, tail.code);
          predicates.push((code) => code >= lo && code <= hi);
        } else {
          // A class shorthand (`\d`) cannot be a range endpoint: keep both
          // operands and the literal "-" (JS would reject; we stay total).
          predicates.push(head.pred, tail.pred, charEquals(45));
        }
        continue;
      }
      predicates.push(head.pred);
    }
    if (!closed) throw new LinearRegexError('unclosed character class: missing "]"');
    const union = unionPredicates(predicates);
    return { type: "char", pred: negated ? (code) => !union(code) : union };
  }

  private parseCharClassAtom(): { code?: number; pred: CharPredicate } {
    const c = this.source[this.i];
    if (c === undefined) throw new LinearRegexError('unclosed character class: missing "]"');
    if (c === "\\") {
      const next = this.peek(1);
      if (next === undefined) throw new LinearRegexError("trailing backslash in character class");
      const escaped = escapePredicate(next);
      this.i += 2;
      if (typeof escaped === "number") return { code: escaped, pred: charEquals(escaped) };
      return { pred: escaped };
    }
    this.i += 1;
    const code = c.charCodeAt(0);
    return { code, pred: charEquals(code) };
  }
}

function escapePredicate(next: string): number | CharPredicate {
  switch (next) {
    case "d":
      return codeIsDigit;
    case "D":
      return (code) => !codeIsDigit(code);
    case "w":
      return codeIsWord;
    case "W":
      return (code) => !codeIsWord(code);
    case "s":
      return codeIsSpace;
    case "S":
      return (code) => !codeIsSpace(code);
    case "n":
      return 10;
    case "r":
      return 13;
    case "t":
      return 9;
    case "f":
      return 12;
    case "v":
      return 11;
    case "0":
      return 0;
    case "b":
    case "B":
      throw new LinearRegexError(
        `word-boundary assertions (\\${next}) are not supported by the linear-time matcher`,
      );
    case "k":
      throw new LinearRegexError("named backreferences (\\k<name>) are not supported");
    default:
      if (next >= "1" && next <= "9") {
        throw new LinearRegexError(
          `backreference \\${next} is not supported by the linear-time matcher`,
        );
      }
      // Escaped punctuation / unknown escapes: a literal character, as in JS.
      return next.charCodeAt(0);
  }
}

// --- NFA ---------------------------------------------------------------------

const K_BYPASS = 0;
const K_SPLIT = 1;
const K_CHAR = 2;
const K_ASSERT_LINE_START = 3;
const K_ASSERT_LINE_END = 4;
const K_MATCH = 5;

type PatchSlot = { state: number; slot: 0 | 1 };
type Fragment = { start: number; outs: PatchSlot[] };

class StateLimitError extends Error {}

class NfaBuilder {
  readonly kind: number[] = [];
  readonly out1: number[] = [];
  readonly out2: number[] = [];
  readonly pred: Array<CharPredicate | null> = [];

  newState(kind: number, out1 = -1, out2 = -1): number {
    if (this.kind.length >= LINEAR_REGEX_MAX_STATES) {
      throw new StateLimitError(
        `pattern needs more than ${LINEAR_REGEX_MAX_STATES} NFA states (bounded for linear-time matching)`,
      );
    }
    this.kind.push(kind);
    this.out1.push(out1);
    this.out2.push(out2);
    this.pred.push(null);
    return this.kind.length - 1;
  }

  patch(outs: PatchSlot[], target: number): void {
    for (const out of outs) {
      if (out.slot === 0) this.out1[out.state] = target;
      else this.out2[out.state] = target;
    }
  }

  build(node: Ast): Fragment {
    switch (node.type) {
      case "empty": {
        const state = this.newState(K_BYPASS);
        return { start: state, outs: [{ state, slot: 0 }] };
      }
      case "char": {
        const state = this.newState(K_CHAR);
        this.pred[state] = node.pred;
        return { start: state, outs: [{ state, slot: 0 }] };
      }
      case "lineStart": {
        const state = this.newState(K_ASSERT_LINE_START);
        return { start: state, outs: [{ state, slot: 0 }] };
      }
      case "lineEnd": {
        const state = this.newState(K_ASSERT_LINE_END);
        return { start: state, outs: [{ state, slot: 0 }] };
      }
      case "seq": {
        if (node.items.length === 0) return this.build(EMPTY_AST);
        let fragment = this.build(node.items[0]!);
        for (let index = 1; index < node.items.length; index += 1) {
          const next = this.build(node.items[index]!);
          this.patch(fragment.outs, next.start);
          fragment = { start: fragment.start, outs: next.outs };
        }
        return fragment;
      }
      case "alt": {
        if (node.options.length === 0) return this.build(EMPTY_AST);
        if (node.options.length === 1) return this.build(node.options[0]!);
        const fragments = node.options.map((option) => this.build(option));
        const splits: number[] = [];
        for (let index = 0; index < fragments.length - 1; index += 1) {
          splits.push(this.newState(K_SPLIT));
        }
        const outs: PatchSlot[] = [];
        for (let index = 0; index < fragments.length; index += 1) {
          const split = splits[index];
          if (split !== undefined) this.out1[split] = fragments[index]!.start;
          outs.push(...fragments[index]!.outs);
        }
        for (let index = 0; index < splits.length; index += 1) {
          const fallback = splits[index + 1] ?? fragments[fragments.length - 1]!.start;
          this.out2[splits[index]!] = fallback;
        }
        return { start: splits[0]!, outs };
      }
      case "repeat": {
        let fragment: Fragment | null = null;
        const append = (next: Fragment) => {
          if (!fragment) {
            fragment = next;
            return;
          }
          this.patch(fragment.outs, next.start);
          fragment = { start: fragment.start, outs: next.outs };
        };

        for (let index = 0; index < node.min; index += 1) append(this.build(node.node));

        if (node.max === Number.POSITIVE_INFINITY) {
          const splitState = this.newState(K_SPLIT);
          const inner = this.build(node.node);
          this.out1[splitState] = inner.start;
          this.patch(inner.outs, splitState);
          append({ start: splitState, outs: [{ state: splitState, slot: 1 }] });
        } else {
          // `inner?` repeated (max - min) times: each optional copy keeps its own
          // exit branch, which is equivalent to `(?:inner){min,max}` for `test()`.
          for (let index = node.min; index < node.max; index += 1) {
            const splitState = this.newState(K_SPLIT);
            const inner = this.build(node.node);
            this.out1[splitState] = inner.start;
            append({
              start: splitState,
              outs: [...inner.outs, { state: splitState, slot: 1 }],
            });
          }
        }

        return fragment ?? this.build(EMPTY_AST);
      }
    }
  }
}

class LinearNfaMatcher implements LinearRegex {
  private readonly kind: Uint8Array;
  private readonly out1: Int32Array;
  private readonly out2: Int32Array;
  private readonly pred: Array<CharPredicate | null>;
  private readonly startState: number;
  private readonly visited: Int32Array;
  /** Scratch stack reused across scans (single-threaded, never re-entrant). */
  private readonly stack: number[] = [];
  /**
   * Monotonic "already visited in this position's closure" stamp. It MUST keep
   * increasing across `test()` calls: restarting at 1 would make states stamped
   * `1` by the previous scan look visited, and every anchored pattern (`^…`)
   * would silently stop matching after the first call.
   */
  private generation = 0;

  constructor(
    readonly source: string,
    builder: NfaBuilder,
    startState: number,
  ) {
    this.kind = Uint8Array.from(builder.kind);
    this.out1 = Int32Array.from(builder.out1);
    this.out2 = Int32Array.from(builder.out2);
    this.pred = builder.pred;
    this.startState = startState;
    this.visited = new Int32Array(builder.kind.length).fill(-1);
  }

  test(line: string): boolean {
    return this.testBounded(line).status === "matched";
  }

  testBounded(line: string, opts?: LinearRegexTestOptions): LinearRegexTestResult {
    // Recycle the stamp space long before Int32 range issues; a reset is only
    // ever needed after ~1e9 scanned positions.
    if (this.generation > 0x40000000) {
      this.visited.fill(-1);
      this.generation = 0;
    }
    const fullLength = line.length;
    // Hard cap on scanned characters: the tail of an oversized line is never
    // scanned, so a pathological line cannot buy unbounded CPU.
    const length = Math.min(fullLength, LINEAR_REGEX_MAX_LINE_SCAN_CHARS);
    // A truncated scan has no real line end: `$` must not fire on the prefix
    // boundary, otherwise `^…$` would "match" a line it never actually saw.
    const lineEndPos = fullLength > length ? -1 : length;
    const deadlineMs = opts?.deadlineMs;
    const now = opts?.now ?? Date.now;
    let steps = 0;
    let aborted = false;
    let abortReason: "line-budget-exceeded" | "deadline-exceeded" = "line-budget-exceeded";
    const lineTruncated = fullLength > length;
    const matchedResult: LinearRegexTestResult = { status: "matched" };
    const abortResult = (): LinearRegexTestResult =>
      lineTruncated ? { status: abortReason, lineTruncated: true } : { status: abortReason };
    const noMatchResult = (): LinearRegexTestResult =>
      lineTruncated ? { status: "no-match", lineTruncated: true } : { status: "no-match" };
    const visited = this.visited;
    const stack = this.stack;

    const outOfBudget = (): boolean => {
      if (steps > LINEAR_REGEX_MAX_STEPS) {
        abortReason = "line-budget-exceeded";
        return true;
      }
      if (deadlineMs !== undefined && (steps & 0x3ff) === 0 && now() >= deadlineMs) {
        abortReason = "deadline-exceeded";
        return true;
      }
      return false;
    };

    const closureInto = (seeds: readonly number[], position: number, target: number[]): boolean => {
      const generation = this.generation;
      let hit = false;
      stack.length = 0;
      for (const seed of seeds) stack.push(seed);
      while (stack.length > 0) {
        steps += 1;
        if (outOfBudget()) {
          aborted = true;
          return false;
        }
        const state = stack.pop()!;
        if (state < 0 || visited[state] === generation) continue;
        visited[state] = generation;
        switch (this.kind[state]) {
          case K_CHAR:
            target.push(state);
            break;
          case K_MATCH:
            hit = true;
            break;
          case K_BYPASS:
            stack.push(this.out1[state]!);
            break;
          case K_SPLIT:
            stack.push(this.out1[state]!);
            if (this.out2[state]! >= 0) stack.push(this.out2[state]!);
            break;
          case K_ASSERT_LINE_START:
            if (position === 0) stack.push(this.out1[state]!);
            break;
          case K_ASSERT_LINE_END:
            if (position === lineEndPos) stack.push(this.out1[state]!);
            break;
          default:
            break;
        }
      }
      return hit;
    };

    this.generation += 1;
    let current: number[] = [];
    if (closureInto([this.startState], 0, current)) return matchedResult;
    if (aborted) return abortResult();

    for (let position = 0; position < length; position += 1) {
      const code = line.charCodeAt(position);
      const followed: number[] = [];
      for (const state of current) {
        steps += 1;
        const predicate = this.pred[state];
        if (predicate && predicate(code)) followed.push(this.out1[state]!);
      }
      if (outOfBudget()) return abortResult();
      // Unanchored search: a match may begin at any position. Seeding here keeps
      // the simulation linear (no per-start-offset restart).
      followed.push(this.startState);
      this.generation += 1;
      const next: number[] = [];
      if (closureInto(followed, position + 1, next)) return matchedResult;
      if (aborted) return abortResult();
      current = next;
    }
    return noMatchResult();
  }
}

export function compileLinearRegex(source: string): LinearRegexCompileResult {
  if (typeof source !== "string" || source.length === 0) {
    return { ok: false, detail: "pattern must be a non-empty string" };
  }
  if (source.length > LINEAR_REGEX_MAX_PATTERN_LENGTH) {
    return {
      ok: false,
      detail: `pattern exceeds maximum length of ${LINEAR_REGEX_MAX_PATTERN_LENGTH} characters`,
    };
  }

  let ast: Ast;
  try {
    ast = new PatternParser(source).parse();
  } catch (error) {
    if (error instanceof LinearRegexError) return { ok: false, detail: error.message };
    throw error;
  }

  const builder = new NfaBuilder();
  try {
    const root = builder.build(ast);
    const matchState = builder.newState(K_MATCH);
    builder.patch(root.outs, matchState);
    return { ok: true, matcher: new LinearNfaMatcher(source, builder, root.start) };
  } catch (error) {
    if (error instanceof StateLimitError) return { ok: false, detail: error.message };
    throw error;
  }
}
