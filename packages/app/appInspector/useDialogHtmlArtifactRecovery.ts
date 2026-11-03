import { useEffect, useRef } from "react";
import {
  clearPreviewTarget,
  getCloseGeneration,
  getPreviewTarget,
  openPreviewTarget,
  useLocalPreviewOpen,
} from "./appInspectorStore";
import { listHtmlArtifacts } from "./htmlArtifactClient";

/**
 * 跨对话 HTML 成品恢复与清理 Hook。
 * 挂载在始终保持渲染的对话页外层（如 LocalPreviewSplit），
 * 负责：
 * 1. 清理跨对话残留 artifact（包括挂载初值与切换对话）；
 * 2. 首次 mount（无论初始 open 与否）允许恢复；
 * 3. 同对话发生 closed -> open（用户主动重新打开）且无 target 时允许恢复；
 * 4. 同对话发生 true -> false（用户主动关闭）直接清理/取消前置请求并早退，绝不发起新恢复请求，绝不弹回！
 * 5. 严格防竞态（基于 closeGeneration 计数器）：
 *    - 捕获发出请求时的 initialCloseGen；
 *    - 异步返回前若用户在此期间执行过主动关闭（closeGeneration 变化），绝不弹回！
 *    - 异步返回前若对话已切换（prevDialogKey 变化），绝不将旧成品写给新对话！
 *    - 异步返回前若已打开了其它目标（无论是新制品、网页还是本地工程），绝不静默覆盖！
 */
export function useDialogHtmlArtifactRecovery(dialogKey: string | null | undefined): void {
  const isFirstMountRef = useRef<boolean>(true);
  const prevDialogKeyRef = useRef<string | null | undefined>(dialogKey);
  const previewOpen = useLocalPreviewOpen();
  const prevPreviewOpenRef = useRef<boolean>(previewOpen);

  useEffect(() => {
    const isFirstMount = isFirstMountRef.current;
    isFirstMountRef.current = false;

    const prevKey = prevDialogKeyRef.current;
    prevDialogKeyRef.current = dialogKey;

    const prevOpen = prevPreviewOpenRef.current;
    prevPreviewOpenRef.current = previewOpen;

    // 清理跨 dialog 残留的 artifact（无论是初次挂载自带残留，还是切 dialog 产生残留）
    const currentTarget = getPreviewTarget();
    if (currentTarget?.kind === "artifact") {
      if (dialogKey && currentTarget.dialogKey && currentTarget.dialogKey !== dialogKey) {
        clearPreviewTarget();
      }
    }

    if (!dialogKey) return;

    // 关键守卫 1：如果是同 dialog 内发生了 open -> closed（即用户主动关闭），
    // 必须直接早退！严禁发起任何新 list 请求，更严禁在新请求里捕获新的 closeGen 导致弹回！
    const isCloseTransition = prevOpen && !previewOpen;
    const isDialogChange = prevKey !== dialogKey;
    if (!isDialogChange && isCloseTransition) {
      return;
    }

    // 关键守卫 2：如果不是首次挂载、不是切对话、也不是 closed -> open 跃迁，且已有 target，无需拉取
    const isOpenTransition = !prevOpen && previewOpen;
    if (!isFirstMount && !isDialogChange && !isOpenTransition && getPreviewTarget()) {
      return;
    }

    let cancelled = false;
    // 捕获请求发起时的关闭代数，用于检测请求期间用户是否主动关闭过工作台
    const requestCloseGen = getCloseGeneration();

    void listHtmlArtifacts(dialogKey)
      .then((artifacts) => {
        if (cancelled) return;
        // 竞态守卫 1：当前 dialog 必须仍是请求发出的 dialog
        if (prevDialogKeyRef.current !== dialogKey) return;
        // 竞态守卫 2：如果请求发出后用户主动执行过关闭，绝不自动弹回！
        if (getCloseGeneration() !== requestCloseGen) return;

        const latestTarget = getPreviewTarget();
        // 竞态守卫 3：如果当前已经有了当前对话的目标，不要静默覆盖它
        if (latestTarget?.kind === "artifact" && latestTarget.dialogKey === dialogKey) {
          return;
        }
        if (latestTarget && latestTarget.kind !== "artifact") {
          return;
        }

        if (artifacts.length > 0) {
          const latest = artifacts[0];
          openPreviewTarget({
            kind: "artifact",
            title: latest.title,
            html: latest.html,
            artifactId: latest.id,
            dialogKey: latest.dialogKey,
          });
        }
      })
      .catch(() => {
        // 忽略网络或鉴权错误，不做阻断
      });

    return () => {
      cancelled = true;
    };
  }, [dialogKey, previewOpen]);
}
