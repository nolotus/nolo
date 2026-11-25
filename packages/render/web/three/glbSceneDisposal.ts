/**
 * 释放 three 场景占用的 GPU 资源。
 *
 * three 不会自动回收：切换模型/关闭页面时必须显式 dispose 几何、材质**和材质上的贴图**
 * （map / normalMap / roughnessMap … 都是 Texture，各自持有 VRAM），
 * 否则同页反复切换模型会让显存只增不减。
 *
 * 刻意不 import three：按结构判定（`isMesh` / `isTexture`），
 * 这样单测可以直接用带 spy 的假对象验证，不需要 WebGL。
 */

interface Disposable {
  dispose?: () => void;
}

interface MaybeTexured extends Disposable {
  isTexture?: boolean;
}

interface MaybeMesh extends Disposable {
  isMesh?: boolean;
  geometry?: Disposable;
  material?: Disposable | Disposable[];
}

export interface TraversableScene {
  traverse: (callback: (child: unknown) => void) => void;
}

/** 释放材质上挂的每一张贴图（含数组型贴图槽）。 */
const disposeMaterialTextures = (material: unknown): void => {
  if (!material || typeof material !== "object") return;
  for (const value of Object.values(material as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const texture = item as MaybeTexured | undefined;
        if (texture?.isTexture && typeof texture.dispose === "function") texture.dispose();
      }
      continue;
    }
    const texture = value as MaybeTexured | undefined;
    if (texture?.isTexture && typeof texture.dispose === "function") texture.dispose();
  }
};

/** 递归释放场景里的几何、材质与贴图。 */
export const disposeObject3D = (root: TraversableScene): void => {
  root.traverse((child) => {
    const node = child as MaybeMesh | null;
    if (!node) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material)
      ? node.material
      : node.material
        ? [node.material]
        : [];
    for (const material of materials) {
      disposeMaterialTextures(material);
      material?.dispose?.();
    }
  });
};
