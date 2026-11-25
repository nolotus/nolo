/**
 * GLB / glTF 2.0 二进制预览器（three + @react-three/fiber + @react-three/drei）。
 *
 * 职责边界：
 * - 只做「看得见的预览」：旋转/平移/缩放、自动居中、自适应相机、透视↔正交、
 *   标准视角、方向 gizmo（坐标轴参考系）、包围盒辅助框、加载态与错误态；
 * - **不做几何量测**：包围盒只用于摆相机和画辅助框，界面不输出尺寸/体积/面积数字，
 *   精确数值属于 cad-analysis 的 `inspect` JSON（网格近似，单位未知）。
 *
 * 本模块会拉起 three，只在浏览器侧按需 `import()`（见 GlbModelPreview.tsx），
 * 不进 SSR 路径。
 */
import React, { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GlbViewerStatus } from "./GlbViewerStatus";
import { glbErrorCodeLabel, loadGlbFromUrl, type GlbLoadError } from "./glbLoader";
import { disposeObject3D } from "./glbSceneDisposal";
import {
  STANDARD_VIEWS,
  boxMaxSpan,
  fitOrthographicCamera,
  fitPerspectiveCamera,
  normalizeVec3,
  shouldRefitForSize,
  type Box3Like,
  type StandardViewKey,
  type Vec3,
} from "./glbViewerModel";
import "./glbViewer.css";

export type GlbProjection = "perspective" | "orthographic";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; error: GlbLoadError }
  | { phase: "empty" }
  | { phase: "ready"; scene: THREE.Object3D };

const VIEW_BUTTONS: { key: StandardViewKey; label: string }[] = [
  { key: "front", label: "前" },
  { key: "back", label: "后" },
  { key: "left", label: "左" },
  { key: "right", label: "右" },
  { key: "top", label: "上" },
  { key: "bottom", label: "下" },
  { key: "iso", label: "等轴" },
];

const hasRenderableMesh = (root: THREE.Object3D): boolean => {
  let found = false;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) found = true;
  });
  return found;
};

/** Box3Like → three 的 Box3（供 box3Helper 使用）。 */
const box3From = (box: Box3Like): THREE.Box3 =>
  new THREE.Box3(
    new THREE.Vector3(box.min[0], box.min[1], box.min[2]),
    new THREE.Vector3(box.max[0], box.max[1], box.max[2]),
  );

/** 把 three 的 Box3 转成纯数据的 Box3Like，避免把可变对象放进依赖里比较。 */
const toBox3Like = (box: THREE.Box3): Box3Like => {
  if (box.isEmpty()) {
    return { min: [-1, -1, -1], max: [1, 1, 1] };
  }
  return {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
};

interface CameraRigProps {
  box: Box3Like;
  projection: GlbProjection;
  direction: Vec3;
  /** 视角指令序号：同一方向重复点也要重新贴合。 */
  viewToken: number;
}

const CameraRig: React.FC<CameraRigProps> = ({ box, projection, direction, viewToken }) => {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update?: () => void }
    | null;

  const [dirX, dirY, dirZ] = direction;

  useEffect(() => {
    if (!shouldRefitForSize(size.width, size.height)) return;
    const aspect = size.width / size.height;
    const dir = normalizeVec3([dirX, dirY, dirZ]);

    if (projection === "perspective" && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const perspective = camera as THREE.PerspectiveCamera;
      const fit = fitPerspectiveCamera({ box, fovDeg: perspective.fov, aspect, direction: dir });
      perspective.position.set(fit.position[0], fit.position[1], fit.position[2]);
      perspective.near = fit.near;
      perspective.far = fit.far;
      perspective.lookAt(new THREE.Vector3(fit.center[0], fit.center[1], fit.center[2]));
      perspective.updateProjectionMatrix();
    } else if (
      projection === "orthographic" &&
      (camera as THREE.OrthographicCamera).isOrthographicCamera
    ) {
      const orthographic = camera as THREE.OrthographicCamera;
      const fit = fitOrthographicCamera({ box, aspect, direction: dir });
      orthographic.left = fit.left;
      orthographic.right = fit.right;
      orthographic.top = fit.top;
      orthographic.bottom = fit.bottom;
      orthographic.near = fit.near;
      orthographic.far = fit.far;
      orthographic.position.set(fit.position[0], fit.position[1], fit.position[2]);
      orthographic.zoom = 1;
      orthographic.lookAt(new THREE.Vector3(fit.center[0], fit.center[1], fit.center[2]));
      orthographic.updateProjectionMatrix();
    }

    if (controls) {
      controls.target.set(
        (box.min[0] + box.max[0]) / 2,
        (box.min[1] + box.max[1]) / 2,
        (box.min[2] + box.max[2]) / 2,
      );
      controls.update?.();
    }
    // frameloop="demand"：相机改了必须主动申请一帧，否则画面停在旧位置。
    invalidate();
  }, [box, camera, controls, dirX, dirY, dirZ, invalidate, projection, size.height, size.width, viewToken]);

  return null;
};

export interface GlbViewerProps {
  /** GLB 的可下载 URL（对象 URL 或文件内容 URL）。 */
  url: string;
  /** 仅用于无障碍描述与错误提示，不影响加载。 */
  fileName?: string;
  className?: string;
  /**
   * 按扩展名/MIME 得到的「这不是 GLB」的提示。
   * 内容优先：真加载出来是 GLB 就正常预览；内容确实不是 GLB 时用这句话解释原因。
   */
  formatHint?: string;
}

const GlbViewer: React.FC<GlbViewerProps> = ({ url, fileName, className, formatHint }) => {
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [projection, setProjection] = useState<GlbProjection>("perspective");
  const [showAxes, setShowAxes] = useState(true);
  const [showBox, setShowBox] = useState(false);
  const [directionState, setDirectionState] = useState<{ dir: Vec3; token: number }>({
    dir: STANDARD_VIEWS.iso as unknown as Vec3,
    token: 0,
  });

  useEffect(() => {
    let cancelled = false;
    let loadedScene: THREE.Object3D | null = null;
    setLoadState({ phase: "loading" });

    loadGlbFromUrl(url).then((result) => {
      if (cancelled) {
        if (result.ok) disposeObject3D(result.scene);
        return;
      }
      if (!result.ok) {
        // 扩展名/MIME 已经说明「不是 GLB」时，用它给出的真实原因解释，
        // 比泛泛的「缺少 glTF 头」更有用。
        const error =
          result.error.code === "invalid_glb" && formatHint
            ? { ...result.error, message: formatHint }
            : result.error;
        setLoadState({ phase: "error", error });
        return;
      }
      if (!hasRenderableMesh(result.scene)) {
        disposeObject3D(result.scene);
        setLoadState({ phase: "empty" });
        return;
      }
      loadedScene = result.scene;
      setLoadState({ phase: "ready", scene: result.scene });
    });

    return () => {
      cancelled = true;
      if (loadedScene) disposeObject3D(loadedScene);
    };
  }, [url, attempt, formatHint]);

  const scene = loadState.phase === "ready" ? loadState.scene : null;

  const box = useMemo<Box3Like>(() => {
    if (!scene) return { min: [-1, -1, -1], max: [1, 1, 1] };
    return toBox3Like(new THREE.Box3().setFromObject(scene));
  }, [scene]);

  const maxSpan = useMemo(() => Math.max(boxMaxSpan(box), 1), [box]);

  // 包围盒辅助框外扩一点：与网格完全重合时线会被面吃掉（看起来像没画）。
  const displayBox = useMemo(
    () => box3From(box).expandByScalar(maxSpan * 0.015),
    [box, maxSpan],
  );

  const applyView = (dir: Vec3) => {
    setDirectionState((previous) => ({ dir, token: previous.token + 1 }));
  };

  const retry = () => setAttempt((value) => value + 1);

  const body = (() => {
    if (loadState.phase === "loading") {
      return <GlbViewerStatus kind="loading" message="正在加载 3D 模型…" />;
    }
    if (loadState.phase === "error") {
      return (
        <GlbViewerStatus
          kind="error"
          message={loadState.error.message}
          detail={`${glbErrorCodeLabel(loadState.error.code)}${
            fileName ? ` · ${fileName}` : ""
          }`}
          code={loadState.error.code}
          onRetry={retry}
        />
      );
    }
    if (loadState.phase === "empty") {
      return (
        <GlbViewerStatus
          kind="empty"
          detail="文件能解析，但里面没有网格（可能只有相机/空节点）。如果文件还在写入，可以重新加载。"
          onRetry={retry}
        />
      );
    }
    return null;
  })();

  return (
    <div
      className={`glb-viewer${className ? ` ${className}` : ""}`}
      data-hook="glb-viewer"
      data-state={loadState.phase}
      data-projection={projection}
      aria-label={fileName ? `3D 预览：${fileName}` : "3D 预览"}
    >
      <div className="glb-viewer__toolbar" role="toolbar" aria-label="3D 预览控制">
        <div className="glb-viewer__group">
          <button
            type="button"
            className="glb-viewer__button"
            aria-pressed={projection === "perspective"}
            onClick={() => setProjection("perspective")}
            disabled={loadState.phase !== "ready"}
          >
            透视
          </button>
          <button
            type="button"
            className="glb-viewer__button"
            aria-pressed={projection === "orthographic"}
            onClick={() => setProjection("orthographic")}
            disabled={loadState.phase !== "ready"}
          >
            正交
          </button>
        </div>

        <div className="glb-viewer__group" role="group" aria-label="标准视角">
          <span className="glb-viewer__label">视角</span>
          {VIEW_BUTTONS.map((view) => (
            <button
              key={view.key}
              type="button"
              className="glb-viewer__button"
              onClick={() => applyView(STANDARD_VIEWS[view.key] as unknown as Vec3)}
              disabled={loadState.phase !== "ready"}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="glb-viewer__group" role="group" aria-label="辅助显示">
          <button
            type="button"
            className="glb-viewer__button"
            aria-pressed={showAxes}
            onClick={() => setShowAxes((value) => !value)}
            disabled={loadState.phase !== "ready"}
          >
            坐标轴
          </button>
          <button
            type="button"
            className="glb-viewer__button"
            aria-pressed={showBox}
            onClick={() => setShowBox((value) => !value)}
            disabled={loadState.phase !== "ready"}
          >
            包围盒
          </button>
        </div>

        <div className="glb-viewer__group">
          <button
            type="button"
            className="glb-viewer__button"
            onClick={() => {
              setProjection("perspective");
              applyView(STANDARD_VIEWS.iso as unknown as Vec3);
            }}
            disabled={loadState.phase !== "ready"}
          >
            重置视角
          </button>
        </div>
      </div>

      <div className="glb-viewer__canvas">
        {body ?? (
          <Canvas
            key={projection}
            orthographic={projection === "orthographic"}
            dpr={[1, 2]}
            // 静态模型不需要常驻渲染：交互/掉帧由 R3F 的 invalidate 驱动
            // （drei 的 OrbitControls 在每个 change 事件里都会 invalidate）。
            frameloop="demand"
            gl={{ antialias: true }}
            camera={{ fov: 45, near: 0.01, far: 5000, position: [4, 4, 4] }}
            onCreated={({ gl }) => {
              gl.setClearColor("#0f1319");
            }}
          >
            <color attach="background" args={["#0f1319"]} />
            <ambientLight intensity={0.9} />
            <hemisphereLight args={["#ffffff", "#20242c", 1.1]} />
            <directionalLight position={[6, 9, 7]} intensity={2.4} />
            <directionalLight position={[-7, -4, -6]} intensity={0.8} />
            {scene ? <primitive object={scene} /> : null}
            {showBox ? <box3Helper args={[displayBox, 0x4b9cff]} /> : null}
            <CameraRig
              box={box}
              projection={projection}
              direction={directionState.dir}
              viewToken={directionState.token}
            />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.12}
              screenSpacePanning
              // 手机端：单指旋转、双指缩放/平移（显式声明，不依赖库默认值）。
              touches={{
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN,
              }}
              rotateSpeed={0.9}
              zoomSpeed={0.9}
              minDistance={maxSpan * 0.05}
              maxDistance={maxSpan * 40}
            />
            {showAxes ? (
              // 方向 gizmo 是独立的角落视口：不占模型空间、不被网格遮挡、
              // 也不会像贴在模型角上的 axesHelper 那样画出比模型还长的轴线。
              <GizmoHelper alignment="bottom-right" margin={[56, 56]} renderPriority={1}>
                <GizmoViewport
                  axisColors={["#e5534b", "#57ab5a", "#4184e4"]}
                  labelColor="#c9d1d9"
                />
              </GizmoHelper>
            ) : null}
          </Canvas>
        )}

        {loadState.phase === "ready" ? (
          <>
            <span className="glb-viewer__hint glb-viewer__hint--desktop">
              拖动旋转 · 滚轮缩放 · 右键平移
            </span>
            <span className="glb-viewer__hint glb-viewer__hint--touch">
              单指旋转 · 双指缩放/平移
            </span>
            <span className="glb-viewer__badge">
              {projection === "perspective" ? "透视投影" : "正交投影"}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default GlbViewer;
