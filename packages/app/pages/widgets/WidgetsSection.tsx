import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuRotateCcw,
  LuPencil,
  LuGrid2X2,
  LuX,
  LuBadgeDollarSign,
  LuDownload,
  LuGripVertical,
} from "react-icons/lu";
import { AppRoutePaths } from "app/constants/routePaths";
import { useNavigate } from "app/routing";
import { useAppDispatch } from "app/store";
import { useStore } from "react-redux";
import { createDocState } from "render/page/docStore";
import { useCreateTable } from "render/table/useCreateTable";
import { toast } from "app/utils/toast";
import { getIsDesktopApp } from "app/utils/env";
import { readStorageJSON, writeStorageJSON } from "app/utils/localStorageState";
import CalendarWidget from "./CalendarWidget";
import UsageWidget from "./UsageWidget";
import "./actionCards.css";
import "./WidgetsSection.css";

type WidgetId =
  | "calendar"
  | "createNote"
  | "createTable"
  | "usage"
  | "pricing"
  | "downloadClient";

// key 值冻结：用户浏览器里已持久化的首页布局都挂在这个 key 下，改 key 会丢弃既有布局。
const STORAGE_KEY = "home-custom-widgets-v3";

const ALL_WIDGETS: WidgetId[] = [
  "calendar",
  "createNote",
  "createTable",
  "usage",
  "pricing",
  "downloadClient",
];

// 网格列数上限；对应 WidgetsSection.css 的 grid-template-columns: repeat(6, 1fr)
// 与 .w-col-1~6 档位，改列数需两边同步。
const MAX_SPAN = 6;

// 拖拽 resize 的高度档位触发线（px）：指针相对卡片顶部的高度低于阈值即落入对应档位
// （<70→0 auto，<120→1，<220→2，否则→3）。吸附落点 min-height 在 WidgetsSection.css
// 的 .h-* 档位（80/160/280），改档位需两边同步。
const HEIGHT_TIER_THRESHOLDS = { compact: 70, medium: 120, tall: 220 } as const;

// featured 双行布局的 widget（对应 WidgetsSection.css 的 .home-widgets__item--featured）
const FEATURED_WIDGET_ID: WidgetId = "calendar";

interface PersistedState {
  visible: WidgetId[];
  order: WidgetId[];
  sizes: Record<WidgetId, number>;
  heights: Record<WidgetId, number>; // 0=auto, 1=compact, 2=medium, 3=tall
}

function defaultState(): PersistedState {
  const isDesktop = getIsDesktopApp();
  return {
    visible: [...ALL_WIDGETS],
    order: [...ALL_WIDGETS],
    sizes: {
      calendar: 3,
      createNote: 3,
      createTable: 3,
      usage: isDesktop ? 3 : 2,
      pricing: isDesktop ? 3 : 2,
      downloadClient: 2,
    },
    heights: {
      calendar: 0,
      createNote: 0,
      createTable: 0,
      usage: 0,
      pricing: 0,
      downloadClient: 0,
    },
  };
}

function loadState(): PersistedState {
  try {
    const parsed = readStorageJSON<Partial<PersistedState>>(STORAGE_KEY);
    if (!parsed) return defaultState();
    const parsedVisible = (parsed.visible ?? ALL_WIDGETS).filter((id) =>
      ALL_WIDGETS.includes(id)
    );
    const parsedOrder = (parsed.order ?? ALL_WIDGETS).filter((id) =>
      ALL_WIDGETS.includes(id)
    );

    const missingVisible = ALL_WIDGETS.filter(
      (id) => !parsedVisible.includes(id) && !parsedOrder.includes(id)
    );
    const missingOrder = ALL_WIDGETS.filter((id) => !parsedOrder.includes(id));

    return {
      visible: [...parsedVisible, ...missingVisible],
      order: [...parsedOrder, ...missingOrder],
      sizes: { ...defaultState().sizes, ...parsed.sizes },
      heights: { ...defaultState().heights, ...(parsed.heights ?? {}) },
    };
  } catch {
    // 合法 JSON 但形状错误（如 visible 是字符串）时回退默认布局，避免首页挂载崩溃。
    return defaultState();
  }
}

function saveState(state: PersistedState) {
  writeStorageJSON(STORAGE_KEY, state);
}

interface ActionCardMeta {
  id: "createNote" | "createTable" | "pricing" | "downloadClient";
  icon: React.ComponentType<{ size?: number }>;
  titleKey: string;
  descKey: string;
  onClick: () => void | Promise<void>;
}

interface WidgetsSectionProps {
  isEditing: boolean;
}

const WidgetsSection: React.FC<WidgetsSectionProps> = ({ isEditing }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const [state, setState] = useState<PersistedState>(loadState);
  // resize 的 pointermove 闭包跨多次 render 存活，必须经 ref 读最新 state，
  // 否则拖离起点再拖回时守卫误判 early return、错误布局被持久化。
  const stateRef = useRef(state);
  stateRef.current = state;
  const [resizingId, setResizingId] = useState<WidgetId | null>(null);
  const { createNewTable, isCreating: isCreatingTable } = useCreateTable();

  const persist = useCallback((next: PersistedState) => {
    setState(next);
    saveState(next);
  }, []);

  // --- visibility toggle ---
  const toggleVisible = useCallback((id: WidgetId) => {
    const visible = [...state.visible];
    const idx = visible.indexOf(id);
    if (idx >= 0) visible.splice(idx, 1);
    else visible.push(id);
    persist({ ...state, visible });
  }, [state, persist]);

  // --- reset ---
  const handleReset = useCallback(() => {
    persist(defaultState());
  }, [persist]);
  // --- drag & drop (using dataTransfer) ---
  const handleDragStart = useCallback((e: React.DragEvent, id: WidgetId) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: WidgetId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain") as WidgetId;
    if (!fromId || fromId === targetId) return;
    const order = [...state.order];
    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, fromId);
    persist({ ...state, order });
  }, [state, persist]);

  // --- pointer resize via bottom-right handle (span + height tier) ---
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, id: WidgetId) => {
      if (!isEditing) return;
      e.preventDefault();
      e.stopPropagation();
      const itemEl = (e.currentTarget as HTMLElement).closest(".home-widgets__item") as HTMLElement | null;
      const gridEl = itemEl?.parentElement ?? null;
      if (!itemEl || !gridEl) return;
      const gridRect = gridEl.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();
      const colWidth = gridRect.width / MAX_SPAN;
      setResizingId(id);
      const applyFromPointer = (clientX: number, clientY: number) => {
        const current = stateRef.current;
        const nextSpan = Math.min(MAX_SPAN, Math.max(1, Math.round((clientX - itemRect.left) / colWidth)));
        const h = clientY - itemRect.top;
        const nextH = h < HEIGHT_TIER_THRESHOLDS.compact ? 0 : h < HEIGHT_TIER_THRESHOLDS.medium ? 1 : h < HEIGHT_TIER_THRESHOLDS.tall ? 2 : 3;
        if ((current.sizes[id] ?? 2) === nextSpan && (current.heights[id] ?? 0) === nextH) return;
        const next = { ...current, sizes: { ...current.sizes, [id]: nextSpan }, heights: { ...current.heights, [id]: nextH } };
        persist(next);
        stateRef.current = next;
      };
      const onMove = (ev: PointerEvent) => applyFromPointer(ev.clientX, ev.clientY);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        setResizingId(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("pointercancel", onUp, { once: true });
    },
    [isEditing, persist],
  );

  // --- action handlers ---
  const createNewPageHandler = useCallback(async () => {
    try {
      const key = await createDocState({}, { dispatch, getState: store.getState });
      if (key) {
        navigate(`/${key}?edit=true`);
      } else {
        toast.error(t("homeActions.createFailed"));
      }
    } catch {
      toast.error(t("homeActions.createFailed"));
    }
  }, [dispatch, navigate, store, t]);

  const actionCards: ActionCardMeta[] = [
    {
      id: "createNote",
      icon: LuPencil,
      titleKey: "homeActions.createNoteTitle",
      descKey: "homeActions.createNoteDesc",
      onClick: createNewPageHandler,
    },
    {
      id: "createTable",
      icon: LuGrid2X2,
      titleKey: "homeActions.createTableTitle",
      descKey: "homeActions.createTableDesc",
      onClick: () => {
        if (isCreatingTable) return;
        void createNewTable();
      },
    },
    {
      id: "pricing",
      icon: LuBadgeDollarSign,
      titleKey: "topbar.pricing",
      descKey: "homeActions.pricingDesc",
      onClick: () => navigate("/pricing"),
    },
    {
      id: "downloadClient",
      icon: LuDownload,
      titleKey: "downloadClient",
      descKey: "homeActions.downloadClientDesc",
      onClick: () => navigate(AppRoutePaths.CLIENT_DOWNLOADS),
    },
  ];

  // --- display order ---
  const displayOrder = useMemo(() => {
    const isDesktop = getIsDesktopApp();
    return state.order.filter(
      (id) => state.visible.includes(id) && !(isDesktop && id === "downloadClient")
    );
  }, [state.order, state.visible]);

  const renderWidgetItem = (id: WidgetId) => {
    const span = state.sizes[id] ?? 2;
    const clampedSpan = Math.min(span, MAX_SPAN);
    const h = state.heights[id] ?? 0;
    const className = `home-widgets__item w-col-${clampedSpan} h-${h}${id === FEATURED_WIDGET_ID ? " home-widgets__item--featured" : ""}${isEditing ? " is-editing" : ""}`;

    const dragProps = isEditing
      ? {
          draggable: resizingId === null,
          onDragStart: (e: React.DragEvent) => handleDragStart(e, id),
          onDragOver: (e: React.DragEvent) => handleDragOver(e),
          onDrop: (e: React.DragEvent) => handleDrop(e, id),
        }
      : {};

    const actionMeta = actionCards.find((a) => a.id === id);

    return (
      <div key={id} className={className} data-widget-id={id} {...dragProps}>
        {isEditing && (
          <div className="home-widgets__toolbar">
            <button
              type="button"
              className="home-widgets__tb-btn home-widgets__tb-btn--del"
              onClick={(e) => { e.stopPropagation(); toggleVisible(id); }}
              title={t("common.delete", "删除")}
              aria-label={t("common.delete", "删除")}
            >
              <LuX size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {isEditing && (
          <button
            type="button"
            className="home-widgets__resize-handle"
            title={t("homeWidgets.dragResize", "拖动调整大小")}
            aria-label={t("homeWidgets.dragResize", "拖动调整大小")}
            onPointerDown={(e) => handleResizeStart(e, id)}
          >
            <LuGripVertical size={12} aria-hidden="true" />
          </button>
        )}

        {actionMeta && (
          <button
            type="button"
            className="home-custom-actions__card"
            onClick={isEditing ? undefined : actionMeta.onClick}
          >
            <div className="home-custom-actions__header">
              <div className="home-custom-actions__icon" aria-hidden="true">
                <actionMeta.icon size={18} />
              </div>
              <h3 className="home-custom-actions__title">{t(actionMeta.titleKey)}</h3>
            </div>
            <p className="home-custom-actions__desc">{t(actionMeta.descKey)}</p>
          </button>
        )}

        {id === FEATURED_WIDGET_ID && (
          <CalendarWidget isEditing={isEditing} />
        )}

        {id === "usage" && (
          <UsageWidget isEditing={isEditing} />
        )}
      </div>
    );
  };

  return (
    <section
      className={`home-widgets ${isEditing ? "home-widgets--editing" : ""}`}
      aria-label={t("homeTabs.custom", "自定义")}
    >
      {/* edit action bar */}
      {isEditing && (
        <div className="home-widgets__edit-bar">
          <button type="button" className="home-widgets__reset-btn" onClick={handleReset}>
            <LuRotateCcw size={14} aria-hidden="true" />
            <span>{t("homeWidgets.reset", "重置")}</span>
          </button>
        </div>
      )}

      {/* widgets */}
      {displayOrder.map((id) => renderWidgetItem(id))}

      {/* empty state */}
      {isEditing && displayOrder.length === 0 && (
        <p className="home-widgets__empty">
          {t("homeWidgets.empty", "所有模块已隐藏，点击重置恢复")}
        </p>
      )}
    </section>
  );
};

export default WidgetsSection;
