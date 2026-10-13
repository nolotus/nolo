/**
 * TUI 图片视口渲染器（B2b）：按实例持有 kitty 图片资源，把视口内完全可见的图片
 * 放置到计算好的屏幕坐标。
 *
 * 契约：
 * - 无 IO：字节由调用方经 getPng(key) 同步提供（必须已准备好）；本模块不读文件、不读 stdin。
 * - 写入边界：只通过注入的 output.write 发出，每次调用合并为一次写入，外包 DECSC/DECRC
 *   以恢复光标。调用方应在文字帧之后调用 frame()。
 * - 传输与放置分离：字节变化或首次出现时 a=T 传输并放置；仅位置变化时 a=p 替换
 *   同 (i,p) 的放置。同一张图在屏幕上出现多次时，每次出现各有自己的 placement id
 *   （kitty 按 (image id, placement id) 识别放置，同对是替换而非新增），字节与图片
 *   id 仍按内容复用，所以重复出现不重复传输。离开视口只删那一处的放置。
 * - 只释放本实例：dispose() 只发出本 session id 的 a=d,d=I；绝不全局清图。
 * - 不根据模型文本拼命令：所有控制序列只由数字参数与 PNG base64 组成。
 * - 挂起（对话覆盖层）：suspend() 删除本实例全部放置，之后 frame() 不输出；resume() 后下一帧恢复。
 * - 视口尺寸变化：删除旧放置并重放置。
 * - graphicsEnabled=false：frame/suspend/resume 全部无输出，等同未注入。
 */
import {
  createKittyGraphicsSession,
  encodeKittyDeletePlacement,
  encodeKittyImage,
  encodeKittyPlacement,
  KITTY_MAX_PLACEMENTS,
} from "./terminalGraphics";

export type TuiImageVisible = {
  /** 出现次唯一键；缺省时回退为 key（兼容旧调用方）。 */
  readonly occurrence?: string;
  readonly key: string;
  /** 0 基视口行（终端行 = row + 1）。 */
  readonly row: number;
  /** 0 基视口列（终端列 = column + 1）。 */
  readonly column: number;
  readonly columns: number;
  readonly rows: number;
};

export type TuiImageViewport = {
  readonly rows: number;
  readonly columns: number;
};

export interface TuiImageRendererOptions {
  readonly output: NodeJS.WritableStream;
  /** 1..65535，区分同进程多个实例的 kitty 图片 id。 */
  readonly namespace: number;
  readonly graphicsEnabled: boolean;
  /**
   * 同步取得已准备好的 PNG 字节；undefined 表示尚未就绪，该图本帧跳过。
   * 字节未变时必须返回同一个引用：本模块以引用判定是否需要重传（不逐字节比较）。
   */
  readonly getPng: (key: string) => Uint8Array | undefined;
}

export interface TuiImageRenderer {
  /** 文字帧之后调用：放置完全可见的图片，离开视口的图片只删放置。 */
  frame(images: readonly TuiImageVisible[], viewport: TuiImageViewport): void;
  /** 删除本实例全部放置（不释放数据），并进入挂起态，frame 不再输出。 */
  suspend(): void;
  /** 退出挂起态；下一次 frame 重新放置。 */
  resume(): void;
  /** 释放本实例全部图片 id（a=d,d=I）。之后所有调用无效。 */
  dispose(): void;
}

type Geometry = { readonly row: number; readonly column: number; readonly columns: number; readonly rows: number };
type Placed = Geometry & { readonly id: number; readonly placementId: number };

function sameGeometry(a: Geometry, b: Geometry): boolean {
  return a.row === b.row && a.column === b.column && a.columns === b.columns && a.rows === b.rows;
}

function moveTo(geometry: Geometry): string {
  return `\x1b[${geometry.row + 1};${geometry.column + 1}H`;
}

export function createTuiImageRenderer(options: TuiImageRendererOptions): TuiImageRenderer {
  const { output, graphicsEnabled, getPng } = options;
  const session = createKittyGraphicsSession(options.namespace);
  /** key → 最近一次传输的字节引用；引用不同即视为字节变更，需重新传输。 */
  const transmitted = new Map<string, Uint8Array>();
  /** occurrence → 当前屏幕上的放置。 */
  const placed = new Map<string, Placed>();
  /**
   * occurrence → placement id。同一张图在屏幕上出现多次时，每次出现都必须有
   * 自己的 placement id：kitty 按 (image id, placement id) 识别放置，同对即替换。
   * 传输与图片 id 仍按内容 key 复用，所以重复出现不会重复传字节。
   */
  const placementIds = new Map<string, number>();
  const freePlacementIds: number[] = [];
  let lastViewport = "";
  let suspended = false;
  let disposed = false;

  const releasePlacement = (occurrence: string): void => {
    const id = placementIds.get(occurrence);
    if (id === undefined) return;
    placementIds.delete(occurrence);
    freePlacementIds.push(id);
  };

  const acquirePlacement = (occurrence: string): number | undefined => {
    const existing = placementIds.get(occurrence);
    if (existing !== undefined) return existing;
    const reused = freePlacementIds.pop();
    if (reused !== undefined) {
      placementIds.set(occurrence, reused);
      return reused;
    }
    const fresh = placementIds.size + freePlacementIds.length + 1;
    if (fresh > KITTY_MAX_PLACEMENTS) return undefined;
    placementIds.set(occurrence, fresh);
    return fresh;
  };

  const emit = (sequence: string) => {
    if (sequence.length > 0) output.write(sequence);
  };

  const deleteOne = (placement: Placed): string =>
    encodeKittyDeletePlacement(placement.id, placement.placementId);

  const placeLocked = (body: string): string =>
    body.length > 0 ? `\x1b7${body}\x1b8` : "";

  return {
    frame(images, viewport) {
      if (disposed || !graphicsEnabled || suspended) return;

      const viewportKey = `${viewport.rows}x${viewport.columns}`;
      const resized = viewportKey !== lastViewport;
      lastViewport = viewportKey;

      // 1) 目标：完全可见、字节可得、id 与 placement 都可分配的图片（按 occurrence 索引）。
      const targets = new Map<
        string,
        { key: string; bytes: Uint8Array; id: number; placementId: number; geometry: Geometry }
      >();
      for (const image of images) {
        const occKey = image.occurrence ?? image.key;
        if (targets.has(occKey)) continue;
        const bytes = getPng(image.key);
        if (!bytes) continue;
        const id = session.imageIdFor(image.key);
        if (id === undefined) continue;
        const placementId = acquirePlacement(occKey);
        if (placementId === undefined) continue;
        targets.set(occKey, {
          key: image.key,
          bytes,
          id,
          placementId,
          geometry: { row: image.row, column: image.column, columns: image.columns, rows: image.rows },
        });
      }

      let body = "";
      // 2) 离开视口或视口尺寸变化：删放置。只有本帧不再出现的 occurrence 才回收
      //    placement id；resize 后仍出现的必须保留自己的 id，否则 step3 会用已回收
      //    的 id 重新放置，与屏幕上仍在使用的 (image id, placement id) 错位。
      for (const [occKey, current] of [...placed]) {
        if (!targets.has(occKey)) {
          body += deleteOne(current);
          placed.delete(occKey);
          releasePlacement(occKey);
        } else if (resized) {
          body += deleteOne(current);
          placed.delete(occKey);
        }
      }

      // 3) 新增 / 变更：字节变化或尚未传输该 key → a=T 传输并放置；仅位置变化或已传输 → a=p 放置。
      for (const [occKey, target] of targets) {
        const current = placed.get(occKey);
        const lastTransmitted = transmitted.get(target.key);
        const needsTransmit = lastTransmitted !== target.bytes;
        if (!needsTransmit && current && sameGeometry(current, target.geometry)) continue;

        if (needsTransmit) {
          const encoded = encodeKittyImage({
            png: target.bytes,
            imageId: target.id,
            placementId: target.placementId,
            columns: target.geometry.columns,
            rows: target.geometry.rows,
          });
          if (!encoded.ok) {
            if (current) {
              body += deleteOne(current);
              placed.delete(occKey);
              releasePlacement(occKey);
            }
            continue;
          }
          body += moveTo(target.geometry) + encoded.sequences.join("");
          transmitted.set(target.key, target.bytes);
        } else {
          const placement = encodeKittyPlacement({
            imageId: target.id,
            placementId: target.placementId,
            columns: target.geometry.columns,
            rows: target.geometry.rows,
          });
          if (!placement) continue;
          body += moveTo(target.geometry) + placement;
        }
        placed.set(occKey, { ...target.geometry, id: target.id, placementId: target.placementId });
      }

      emit(placeLocked(body));
    },

    suspend() {
      if (disposed || !graphicsEnabled) return;
      suspended = true;
      let body = "";
      for (const [occKey, current] of [...placed]) {
        body += deleteOne(current);
        placed.delete(occKey);
        releasePlacement(occKey);
      }
      emit(placeLocked(body));
    },

    resume() {
      if (disposed || !graphicsEnabled) return;
      suspended = false;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      const sequences = session.release();
      placed.clear();
      placementIds.clear();
      freePlacementIds.length = 0;
      transmitted.clear();
      emit(sequences.join(""));
    },
  };
}
