/**
 * TUI 鼠标协议解析（SGR 1006 / DECSET 1002）。
 *
 * 将终端原始 SGR 鼠标序列转换为结构化的 TuiMouseEvent 语义事件。
 */

export type TuiMouseButton = "left" | "middle" | "right" | "none";

export type TuiMouseEventKind = "press" | "release" | "drag" | "wheel";

export type TuiMouseEvent = {
  kind: TuiMouseEventKind;
  button: TuiMouseButton;
  /** 1-based terminal column */
  x: number;
  /** 1-based terminal row */
  y: number;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  wheelDirection?: "up" | "down";
};

/** SGR mouse report: ESC [ < button ; col ; row (M=press/drag/wheel, m=release). */
// eslint-disable-next-line no-control-regex
export const SGR_MOUSE_REGEX = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;

/**
 * 匹配缓冲区开头第一个完整 SGR 鼠标报告的终止符位置。
 * 一个滚轮/触控板手势会在同一个 stdin chunk 里批量送来几十条报告
 * （如 `\x1b[<64;10;5M\x1b[<64;10;6M...`），所以这里只校验开头第一个报告，
 * 不要求 `M`/`m` 位于 buffer 末尾。调用方消费返回的报告后把剩余字节留在
 * buffer 里继续解析。
 *
 * 三态语义（与调用方约定保持一致）：
 * - 完整报告 → 返回该报告字符串（仅第一个，不含后续报告）
 * - 前缀合法但尚不完整 → undefined（等更多字节）
 * - 确定不是鼠标序列 → null
 */
export function consumeSgrMouseSequence(
  buffer: string,
): string | null | undefined {
  if (!buffer.startsWith("\x1b[")) return null;
  if (!buffer.startsWith("\x1b[<")) return null;

  // 报告体 = buffer 去掉 `\x1b[<`（3 字节）后的部分，形如 `64;10;5M...`。
  // 开头第一个报告的终止符是第一个 `M`/`m`。在此之前 body 只能由数字和 `;`
  // 组成；一旦出现其它字符则确定不是鼠标序列。
  const body = buffer.slice(3);
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === "M" || character === "m") {
      // 找到第一个完整报告：body[0..index] 必须恰好是一个合法报告（数字与
      // `;` 后跟 M/m）。返回这一条报告，后续报告留在 buffer 中由调用方续解析。
      const report = buffer.slice(0, 3 + index + 1);
      return SGR_MOUSE_REGEX.test(report) ? report : null;
    }
    if ((character < "0" || character > "9") && character !== ";") {
      return null;
    }
  }
  // 跑完 buffer 还没遇到 M/m：前缀合法但报告未完整，等更多字节。
  return undefined;
}

/**
 * 解析 SGR 鼠标序列为语义化的 TuiMouseEvent。
 */
export function parseSgrMouseEvent(sequence: string): TuiMouseEvent | null {
  const match = SGR_MOUSE_REGEX.exec(sequence);
  if (!match) return null;

  const code = Number(match[1]);
  const x = Number(match[2]);
  const y = Number(match[3]);
  const isRelease = match[4] === "m";

  const shift = (code & 4) !== 0;
  const alt = (code & 8) !== 0;
  const ctrl = (code & 16) !== 0;

  // Wheel events (bit 6 = 64)
  if ((code & 64) !== 0) {
    if ((code & 2) !== 0) {
      // Horizontal wheel: 暂不映射
      return null;
    }
    const wheelDirection = (code & 1) !== 0 ? "down" : "up";
    return {
      kind: "wheel",
      button: "none",
      x,
      y,
      shift,
      alt,
      ctrl,
      wheelDirection,
    };
  }

  const rawButton = code & 3;
  let button: TuiMouseButton = "none";
  if (rawButton === 0) button = "left";
  else if (rawButton === 1) button = "middle";
  else if (rawButton === 2) button = "right";

  if (isRelease) {
    return {
      kind: "release",
      button,
      x,
      y,
      shift,
      alt,
      ctrl,
    };
  }

  // Motion with button held (bit 5 = 32)
  if ((code & 32) !== 0) {
    return {
      kind: "drag",
      button,
      x,
      y,
      shift,
      alt,
      ctrl,
    };
  }

  return {
    kind: "press",
    button,
    x,
    y,
    shift,
    alt,
    ctrl,
  };
}
