/**
 * 3D 预览的纯逻辑层：来源判定、相机自适应、标准视角。
 *
 * 这里**不做任何几何量测**：包围盒只用来摆相机与画辅助框，不对外当作测量值。
 * 精确量测属于 cad-analysis 的 `inspect` JSON（见 `.agents/skills/cad-analysis`），
 * 本模块不计算体积/表面积，也不把网格近似值当成精确值展示。
 *
 * 「是不是 GLB」只有一处真值：`isGlbBinary`（内容，glTF 二进制头）。
 * 扩展名与 MIME 只是提示，用来决定「要不要尝试加载」和「失败时怎么解释」，
 * 永远不覆盖内容判定。
 */

/** GLB（glTF 2.0 二进制）的标准 MIME。 */
export const GLB_MIME_TYPE = "model/gltf-binary";

/** GLB 二进制头魔数 `glTF`（小端读作 0x46546c67）。 */
const GLB_MAGIC = 0x46546c67;

/** GLB 头长度：magic + version + length。 */
const GLB_HEADER_BYTES = 12;

/** 前 12 字节是 glTF 2.0 的 GLB 头；魔数不对就不是 GLB（内容真值）。 */
export const isGlbBinary = (buffer: ArrayBuffer | Uint8Array): boolean => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength < GLB_HEADER_BYTES) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, 4);
  return view.getUint32(0, true) === GLB_MAGIC;
};

/** 明确「不是 3D 模型」的 MIME 家族（有这些就不要下载、不要进 viewer）。 */
const NON_MODEL_MIME_FAMILIES = ["image/", "video/", "audio/", "text/", "font/"];

const NON_MODEL_MIME_EXACT = new Set([
  "application/pdf",
  "application/json",
  "application/zip",
  "application/msword",
]);

/** 中性 MIME：拿不到格式信息（blob/octet-stream），交给扩展名判定。 */
const NEUTRAL_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

/** 本阶段不支持的 3D 格式扩展名 → 给用户的真实原因（生产可达：见 `isGlbViewerCandidate`）。 */
const UNSUPPORTED_MODEL_FORMATS: Record<string, string> = {
  gltf: "当前只支持自包含的 .glb；`.gltf`（JSON 版）会引用外部 .bin 与贴图，本阶段不跟随外部 URI。",
  stl: ".stl 属于三角网格原始格式，本阶段请在 cad-analysis 里用 convert.ts 转成 .glb 再预览。",
  obj: "本阶段未接入 .obj 解析器，只支持 .glb。",
  fbx: "本阶段未接入 .fbx，只支持 .glb。",
  dae: "本阶段未接入 .dae（Collada），只支持 .glb。",
  "3dm": "本阶段未接入 .3dm（Rhino），只支持 .glb。",
  step: "本阶段未接入 STEP（需要 OCCT 级 B-rep 内核），只支持 .glb。",
  stp: "本阶段未接入 STEP（需要 OCCT 级 B-rep 内核），只支持 .glb。",
  iges: "本阶段未接入 IGES（需要 B-rep 内核），只支持 .glb。",
  igs: "本阶段未接入 IGES（需要 B-rep 内核），只支持 .glb。",
};

/** 会被 3D 预览接管的扩展名（含本阶段不支持的格式：它们要走到 viewer 里拿到真实原因）。 */
export const MODEL_FILE_EXTENSIONS = new Set([
  "glb",
  ...Object.keys(UNSUPPORTED_MODEL_FORMATS),
]);

const asTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/** 文件名的小写扩展名（不含点）；没有扩展名返回空串。 */
export const fileNameExtension = (fileName: unknown): string => {
  const name = asTrimmedString(fileName);
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  if (dot < 1 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
};

/**
 * 这个文件资源要不要进 3D 预览（文件页分派用）。
 *
 * 认的是「模型类文件」：`.glb` 与其它已知 3D 扩展名、以及 `model/*` MIME。
 * 非 glb 的模型格式也要进来——viewer 会先按**内容**判定，真不是 GLB 时再用
 * 扩展名对应的真实原因解释，而不是在文件页上含糊地说「暂不支持预览」。
 */
export const isGlbViewerCandidate = (input: {
  fileName?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
}): boolean => {
  const mime = asTrimmedString(input.mimeType).toLowerCase();
  if (mime.startsWith("model/")) return true;
  return (
    MODEL_FILE_EXTENSIONS.has(fileNameExtension(input.fileName)) ||
    MODEL_FILE_EXTENSIONS.has(fileNameExtension(input.originalName))
  );
};

export type GlbSourceResolution =
  /** 可以加载（内容会再次按 GLB 魔数校验）。 */
  | { state: "ready"; url: string }
  | { state: "missing-url"; message: string }
  /**
   * 3D 模型但（按提示/内容）不是 GLB：仍然尝试按内容判定，
   * 内容确实是 GLB 就正常预览，否则用这里的 `message` 解释原因。
   * `url` 一定非空（缺地址的情况先被 `missing-url` 拦掉）。
   */
  | { state: "unsupported-format"; url: string; format: string; message: string }
  /** 明确不是 3D 模型（图片/PDF/文本等）：不下载、不进 viewer。 */
  | { state: "not-a-model"; message: string };

/**
 * 唯一的来源判定：内容优先，扩展名/MIME 只作提示。
 *
 * @param bytes 已知的字节（可选）。给了就以内容为准，忽略扩展名/MIME 的推断。
 */
export const resolveGlbSource = (input: {
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  bytes?: ArrayBuffer | Uint8Array | null;
}): GlbSourceResolution => {
  const url = asTrimmedString(input.url);
  const ext = fileNameExtension(input.fileName);
  const mime = asTrimmedString(input.mimeType).toLowerCase();

  // 0. 没有地址：无论格式如何都没法加载，先报缺失（不渲染空白画布）。
  if (!url) {
    return { state: "missing-url", message: "缺少模型下载地址，无法加载 3D 预览。" };
  }

  const ready = (): GlbSourceResolution => ({ state: "ready", url });

  const formatReason = (format: string): string =>
    UNSUPPORTED_MODEL_FORMATS[format] ??
    `当前只支持 .glb 预览；这个文件是 ${format}，不在可预览格式内。`;

  // 1. 内容优先：有字节就以魔数为准（这正是「有效 GLB 被扩展名误判」的兜底）。
  if (input.bytes) {
    if (isGlbBinary(input.bytes)) return ready();
    const format = ext || mime || "unknown";
    return {
      state: "unsupported-format",
      url,
      format,
      message: UNSUPPORTED_MODEL_FORMATS[ext]
        ? UNSUPPORTED_MODEL_FORMATS[ext]
        : "文件内容不是 GLB 二进制（缺少 glTF 头），无法用 3D 预览打开。",
    };
  }

  // 2. MIME 明确是 GLB：优先于扩展名（扩展名会写错，MIME 通常来自真实类型）。
  if (mime === GLB_MIME_TYPE) return ready();

  // 3. 扩展名是 .glb。
  if (ext === "glb") return ready();

  // 4. 其它已知 3D 格式：仍进 viewer，失败时给真实原因。
  if (ext && UNSUPPORTED_MODEL_FORMATS[ext]) {
    return { state: "unsupported-format", url, format: ext, message: formatReason(ext) };
  }

  // 5. 其它 model/* MIME。
  if (mime.startsWith("model/")) {
    return {
      state: "unsupported-format",
      url,
      format: mime,
      message: `当前只支持 .glb（${GLB_MIME_TYPE}）；这个文件是 ${mime}，不在可预览格式内。`,
    };
  }

  // 6. 明确不是模型的文件。
  if (
    NON_MODEL_MIME_FAMILIES.some((family) => mime.startsWith(family)) ||
    NON_MODEL_MIME_EXACT.has(mime)
  ) {
    return {
      state: "not-a-model",
      message: `这个文件是 ${mime}，不是 3D 模型，没有 3D 预览。`,
    };
  }

  // 7. 中性 MIME、无已知扩展名（文件页给的是对象 URL）：交给内容判定。
  if (NEUTRAL_MIME_TYPES.has(mime) && (!ext || ext === "bin")) {
    return ready();
  }

  return {
    state: "not-a-model",
    message: `无法确认这个文件是 3D 模型（${ext ? `.${ext}` : mime}），已跳过 3D 预览。`,
  };
};

export type Vec3 = [number, number, number];

export interface Box3Like {
  min: Vec3;
  max: Vec3;
}

export const normalizeVec3 = (input: Vec3): Vec3 => {
  const length = Math.hypot(input[0], input[1], input[2]);
  if (!Number.isFinite(length) || length === 0) return [0, 0, 1];
  return [input[0] / length, input[1] / length, input[2] / length];
};

/** 标准视角方向（相机相对模型中心的朝向）。 */
export const STANDARD_VIEWS = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  iso: [1, 1, 1],
} as const satisfies Record<string, Vec3>;

export type StandardViewKey = keyof typeof STANDARD_VIEWS;

export const boxCenter = (box: Box3Like): Vec3 => [
  (box.min[0] + box.max[0]) / 2,
  (box.min[1] + box.max[1]) / 2,
  (box.min[2] + box.max[2]) / 2,
];

/** 包围盒 8 个角点。 */
export const boxCorners = (box: Box3Like): Vec3[] => {
  const xs = [box.min[0], box.max[0]];
  const ys = [box.min[1], box.max[1]];
  const zs = [box.min[2], box.max[2]];
  const corners: Vec3[] = [];
  for (const x of xs) for (const y of ys) for (const z of zs) corners.push([x, y, z]);
  return corners;
};

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** 相机空间基：w 指向相机（观察方向的反向），r/u 为屏幕右/上。 */
export const cameraBasis = (
  direction: Vec3,
): { w: Vec3; r: Vec3; u: Vec3 } => {
  const w = normalizeVec3(direction);
  // 方向与世界上轴平行时（顶/底视），换一个上轴避免叉积退化。
  const worldUp: Vec3 = Math.abs(w[1]) > 0.999 ? [0, 0, 1] : [0, 1, 0];
  const r = normalizeVec3(cross(worldUp, w));
  const u = normalizeVec3(cross(w, r));
  return { w, r, u };
};

/** 把 8 个角点投影到以模型中心为原点的相机空间。 */
export const projectBoxToCameraSpace = (
  box: Box3Like,
  direction: Vec3,
): { center: Vec3; points: Vec3[] } => {
  const center = boxCenter(box);
  const { w, r, u } = cameraBasis(direction);
  const points = boxCorners(box).map((corner) => {
    const relative = subtract(corner, center);
    return [dot(relative, r), dot(relative, u), dot(relative, w)] as Vec3;
  });
  return { center, points };
};

/** 默认留白：模型刚好贴住视口再留 15%~20%，不再用「包围球 × 1.6」。 */
export const DEFAULT_FIT_MARGIN = 1.18;

export interface CameraFitInput {
  box: Box3Like;
  /** 垂直视野（度）。 */
  fovDeg: number;
  /** 画布宽高比（width / height）。 */
  aspect: number;
  /** 留白系数，1 = 模型外接矩形刚好贴住视口；默认 1.18。 */
  margin?: number;
  /** 观察方向（未归一化的向量），默认等轴视角。 */
  direction?: Vec3;
}

export interface CameraFit {
  center: Vec3;
  /** 相机到中心的距离（透视用）。 */
  distance: number;
  position: Vec3;
  near: number;
  far: number;
  /** 适配后模型在屏幕上的最大占位（0~1，1 = 刚好铺满对应边）。 */
  screenFill: { x: number; y: number };
}

const safeSpan = (min: number, max: number): number => {
  const span = max - min;
  return Number.isFinite(span) ? Math.abs(span) : 0;
};

const safeAspect = (aspect: number): number =>
  Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

const maxAbs = (values: number[]): number =>
  values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

/**
 * 按**给定视角方向**把相机摆到「模型刚好铺满且不裁切」的位置。
 *
 * 做法：把 8 个角点投到相机空间，取屏幕方向上的最大半宽/半高，
 * 要求 `|y| ≤ (d - z)·tan(fov/2)/margin` 与 `|x| ≤ (d - z)·tan(fov/2)·aspect/margin`，
 * 解出最小距离 `d`。所以顶视、前视、等轴各自得到自己的距离，
 * 不会因为共用「包围球」而让非等轴视角里的模型缩成一小块。
 */
export const fitPerspectiveCamera = (input: CameraFitInput): CameraFit => {
  const margin = input.margin ?? DEFAULT_FIT_MARGIN;
  const aspect = safeAspect(input.aspect);
  const dir = normalizeVec3(input.direction ?? STANDARD_VIEWS.iso);
  const { center, points } = projectBoxToCameraSpace(input.box, dir);

  const vFov = ((Number.isFinite(input.fovDeg) ? input.fovDeg : 45) * Math.PI) / 180;
  const halfTan = Math.tan(vFov / 2);
  const maxZ = Math.max(0, ...points.map((point) => point[2]));

  let distance = 0;
  for (const [x, y, z] of points) {
    const needVertical = Math.abs(y) * margin / halfTan;
    const needHorizontal = (Math.abs(x) * margin) / (halfTan * aspect);
    distance = Math.max(distance, z + needVertical, z + needHorizontal);
  }
  // 退化输入（单点模型）：给一个最小距离，避免相机贴在模型上。
  if (!(distance > 0)) distance = margin / halfTan;

  // 占位按每个角点自己的深度算（离相机越近占比越大），贴近真实投影。
  const fillAt = (point: Vec3): { x: number; y: number } => {
    const depth = Math.max(distance - point[2], 1e-6);
    return {
      x: Math.abs(point[0]) / (depth * halfTan * aspect),
      y: Math.abs(point[1]) / (depth * halfTan),
    };
  };
  const screenFill = points.reduce(
    (acc, point) => {
      const fill = fillAt(point);
      return {
        x: Math.max(acc.x, fill.x),
        y: Math.max(acc.y, fill.y),
      };
    },
    { x: 0, y: 0 },
  );

  return {
    center,
    distance,
    position: [
      center[0] + dir[0] * distance,
      center[1] + dir[1] * distance,
      center[2] + dir[2] * distance,
    ],
    near: Math.max(distance * 0.01, 1e-4),
    far: distance * 2 + maxZ * 2,
    screenFill,
  };
};

export interface OrthographicFit {
  center: Vec3;
  position: Vec3;
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  /** 适配后模型在屏幕上的最大占位（0~1）。 */
  screenFill: { x: number; y: number };
}

/** 正交视锥：同一个「角点投影 + 留白」口径，只是把距离换成视锥半高/半宽。 */
export const fitOrthographicCamera = (input: {
  box: Box3Like;
  aspect: number;
  margin?: number;
  direction?: Vec3;
}): OrthographicFit => {
  const margin = input.margin ?? DEFAULT_FIT_MARGIN;
  const aspect = safeAspect(input.aspect);
  const dir = normalizeVec3(input.direction ?? STANDARD_VIEWS.iso);
  const { center, points } = projectBoxToCameraSpace(input.box, dir);

  const maxAbsX = maxAbs(points.map((point) => point[0]));
  const maxAbsY = maxAbs(points.map((point) => point[1]));
  const halfHeight = Math.max(maxAbsY, maxAbsX / aspect, 1e-6) * margin;
  const halfWidth = halfHeight * aspect;
  const maxZ = Math.max(0, ...points.map((point) => point[2]));
  const distance = maxZ * 2 + 1;

  return {
    center,
    position: [
      center[0] + dir[0] * distance,
      center[1] + dir[1] * distance,
      center[2] + dir[2] * distance,
    ],
    left: -halfWidth,
    right: halfWidth,
    top: halfHeight,
    bottom: -halfHeight,
    near: 0.001,
    far: distance * 2,
    screenFill: {
      x: Math.min(1, maxAbsX / halfWidth),
      y: Math.min(1, maxAbsY / halfHeight),
    },
  };
};

/** 包围盒最长边（坐标轴辅助框与轨道缩放的参考尺度）。 */
export const boxMaxSpan = (box: Box3Like): number =>
  Math.max(
    safeSpan(box.min[0], box.max[0]),
    safeSpan(box.min[1], box.max[1]),
    safeSpan(box.min[2], box.max[2]),
  );

/** 画布尺寸变化后要不要重算视角（0 宽高时不算，避免相机被钉死在错误的宽高比上）。 */
export const shouldRefitForSize = (width: number, height: number): boolean =>
  Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
