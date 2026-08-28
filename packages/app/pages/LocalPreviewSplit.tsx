import { lazy, Suspense, type ReactNode } from "react";

import { useLocalPreviewOpen } from "app/appInspector/appInspectorStore";

const LocalPreviewPanel = lazy(() => import("./LocalPreviewPanel"));

/**
 * 打开本地预览时，预览占主区，对话收窄到右侧。
 *
 * 两个槽位无论开关都要渲染：如果预览槽是条件渲染的，对话在子节点里的位置会
 * 从 0 变成 1，React 按位置对齐，会把对话整个卸载重挂——滚动位置和输入框
 * 草稿都会丢。所以这里只切 class，不切结构。
 */
export default function LocalPreviewSplit({ children }: { children: ReactNode }) {
  const previewOpen = useLocalPreviewOpen();

  return (
    <div
      className={`LocalPreviewSplit${previewOpen ? " LocalPreviewSplit--open" : ""}`}
    >
      <div className="LocalPreviewSplit__preview" aria-hidden={!previewOpen}>
        {previewOpen ? (
          <Suspense fallback={null}>
            <LocalPreviewPanel />
          </Suspense>
        ) : null}
      </div>
      <div className="LocalPreviewSplit__dialog">{children}</div>

      <style>{`
        .LocalPreviewSplit {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        .LocalPreviewSplit__preview {
          flex: 0 0 0;
          width: 0;
          min-width: 0;
          overflow: hidden;
          border-right: 1px solid transparent;
          transition: flex-basis 280ms ease, width 280ms ease;
        }

        .LocalPreviewSplit--open .LocalPreviewSplit__preview {
          flex: 1 1 auto;
          width: auto;
          border-right-color: var(--border, #e5e7eb);
        }

        .LocalPreviewSplit__dialog {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          transition: flex-basis 280ms ease, max-width 280ms ease;
        }

        .LocalPreviewSplit--open .LocalPreviewSplit__dialog {
          flex: 0 0 clamp(400px, 34%, 560px);
          max-width: 560px;
        }

        /* 对话列变窄之后，输入框按默认高度只剩一行多，打字很局促，给它更高的
           起始高度和上限。作用域限定在分栏打开时，不影响全宽的对话页。 */
        .LocalPreviewSplit--open .message-input__textarea {
          min-height: 96px;
          max-height: 320px;
        }

        /* 窄屏并排放不下，把对话压到最低可用宽度，优先保住预览。 */
        @media (max-width: 1100px) {
          .LocalPreviewSplit--open .LocalPreviewSplit__dialog {
            flex: 0 0 360px;
            max-width: 360px;
          }

          .LocalPreviewSplit--open .message-input__textarea {
            min-height: 80px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .LocalPreviewSplit__preview,
          .LocalPreviewSplit__dialog {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
