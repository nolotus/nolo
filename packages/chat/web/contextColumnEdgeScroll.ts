/**
 * Context 列拖拽边缘自动滚动的几何判定。
 *
 * 为什么抽成纯函数：触发带的**优先级**是这个功能唯一真正的高价值行为，而它此前散在
 * ChatSidebar 的 drag handler 里，只能靠「源码里存在某个字符串」去测 —— 一旦优先级写反
 * （列底附近拖拽却往上滚），存在性检查照样全绿。这里把它变成可单测的判定：
 * 输入视口坐标下的四条边，输出「滚不滚、往哪滚、滚多少」，单测直接断言 scrollTop 的变化方向。
 *
 * 触发带优先级（顺序即语义）：
 * 1. `viewport-bottom` —— 真实滚动视口（Space 分支即 Context 列）底边 60px → 向下滚。
 *    **优先级最高**：列表顶部在还没滚走时可能落在列底附近，与列底带重叠（y - 列表顶 < 60px
 *    且 列底 - y < 60px）。取「上带距离的最小值」会让上带在重叠区获胜，于是在列底拖拽反而
 *    向上滚。视口底部必须永远可达，不能被内部列表顶部抢占。
 * 2. `column-top` —— 列顶 60px → 向上滚。sticky 控件区盖住的正是这条带（控件是列表的兄弟
 *    节点、z-index: 2），handler 绑在列上之后这条带才可达。
 * 3. `list-top` —— 控件下沿 / 列表实际可视顶部 60px → 向上滚。非重叠时它给控件下沿提供一条
 *    更贴近内容的向上触发带（基准 = max(列顶, 控件底边, 列表顶)）。
 *
 * **极矮列例外（列高 ≤ 2×edgeSize）**：此时底带与列顶带**整段重叠** —— 列内每一点都同时落
 * 在两条带里，「底带无条件优先」会把向上滚彻底吃掉：列高 50px、指针贴列顶（pointerY=1）旧
 * 实现命中 viewport-bottom 给出 +2.75，已滚过顶的极矮列再也滚不回去；若同时已滚到底，正向
 * delta 被浏览器按 scrollHeight 夹取，表现为指针贴列顶完全不动。所以极矮列改按**指针相对列
 * 中线的位置**决定方向：严格更靠上 → 向上滚，中线及更靠下 → 向下滚（步长各自按到近边的距离
 * 收敛）。普通列（列高 > 2×edgeSize）不受影响，底带仍然最高优先级 —— M1 的「列表顶部带不得
 * 抢占真实视口底部带」照旧成立。
 */

/** 触发带宽度（px）。 */
export const EDGE_SCROLL_BAND_PX = 60;
/** 每帧最小位移：贴死边缘时也要能挪动，否则指针一动不动的拖拽会卡在边缘外。 */
export const MIN_EDGE_SCROLL_STEP_PX = 2;
/**
 * 极矮列判定倍数：列高 ≤ EDGE_SCROLL_BAND_PX × 该倍数时，底带与列顶带必然整段重叠，
 * 方向改由「指针相对列中线的位置」决定（见文件头注释）。
 */
export const COMPACT_COLUMN_BAND_MULTIPLIER = 2;

export type EdgeScrollGeometry = {
  /** 指针的视口坐标（dragover 事件的 clientY）。 */
  pointerY: number;
  /** 真实滚动视口的上下边界（视口坐标）。 */
  viewportTop: number;
  viewportBottom: number;
  /** sticky 控件区的底边（视口坐标）；控件未挂载时为 null。 */
  controlsBottom: number | null;
  /** 列表区（.ChatSidebar__scroll-area）的顶边（视口坐标）。 */
  listTop: number;
  /** 触发带宽度，默认 EDGE_SCROLL_BAND_PX。 */
  edgeSize?: number;
};

/** 命中的触发带。 */
export type EdgeScrollBand = "viewport-bottom" | "column-top" | "list-top" | "none";

export type EdgeScrollDecision = {
  band: EdgeScrollBand;
  /** > 0 向下滚（scrollTop 增大），< 0 向上滚（scrollTop 减小），0 表示不滚。 */
  delta: number;
};

const NO_SCROLL: EdgeScrollDecision = { band: "none", delta: 0 };

/**
 * 列表的实际可视顶部：sticky 控件吸顶时盖住列顶那一条带，所以取「列顶 / 控件底边 / 列表顶」
 * 三者的下沿。控件降级为 position: static 后它会随列滚走，取值自然退化成列顶或列表顶。
 */
export function listVisibleTopOf(geometry: {
  viewportTop: number;
  controlsBottom: number | null;
  listTop: number;
}): number {
  return Math.max(
    geometry.viewportTop,
    geometry.controlsBottom ?? geometry.viewportTop,
    geometry.listTop,
  );
}

/** 越靠近边缘滚得越快：线性收敛到最小步长。 */
function stepFor(edgeSize: number, distance: number): number {
  return Math.max(MIN_EDGE_SCROLL_STEP_PX, (edgeSize - distance) / 4);
}

/** 列高是否矮到两条带整段重叠（≤ 2×edgeSize）。 */
export function isCompactColumn(columnHeight: number, edgeSize = EDGE_SCROLL_BAND_PX): boolean {
  return columnHeight <= edgeSize * COMPACT_COLUMN_BAND_MULTIPLIER;
}

/** 指针落在哪条带、该滚多少。 */
export function resolveEdgeScroll(geometry: EdgeScrollGeometry): EdgeScrollDecision {
  const edgeSize = geometry.edgeSize ?? EDGE_SCROLL_BAND_PX;
  const columnHeight = geometry.viewportBottom - geometry.viewportTop;
  const fromViewportBottom = geometry.viewportBottom - geometry.pointerY;
  const fromColumnTop = geometry.pointerY - geometry.viewportTop;

  // 0. 极矮列（列高 ≤ 2×edgeSize）：两条带整段重叠，改按指针相对列中线的位置决定方向。
  if (isCompactColumn(columnHeight, edgeSize)) {
    // 指针在列外（上方或下方）不触发：不能把「拖出列」误判成滚动意图。
    if (fromColumnTop < 0 || fromViewportBottom < 0) return NO_SCROLL;
    // 严格更靠上才向上滚；中线及更靠下向下滚（底部可达性仍然是更常见的诉求）。
    if (fromColumnTop * 2 < columnHeight) {
      return { band: "column-top", delta: -stepFor(edgeSize, fromColumnTop) };
    }
    return { band: "viewport-bottom", delta: stepFor(edgeSize, fromViewportBottom) };
  }

  // 1. 真实滚动视口底部：最高优先级，不被内部列表顶抢占。
  if (fromViewportBottom >= 0 && fromViewportBottom < edgeSize) {
    return { band: "viewport-bottom", delta: stepFor(edgeSize, fromViewportBottom) };
  }

  // 2. 列顶（sticky 控件盖住的那条带）。
  if (fromColumnTop >= 0 && fromColumnTop < edgeSize) {
    return { band: "column-top", delta: -stepFor(edgeSize, fromColumnTop) };
  }

  // 3. 控件下沿 / 列表可视顶部：非重叠时仍提供向上触发带。
  const fromListTop = geometry.pointerY - listVisibleTopOf(geometry);
  if (fromListTop >= 0 && fromListTop < edgeSize) {
    return { band: "list-top", delta: -stepFor(edgeSize, fromListTop) };
  }

  return NO_SCROLL;
}

/** 把判定结果作用到 scrollTop 上（真机由浏览器按 scrollHeight 自行夹取）。 */
export function applyEdgeScroll(scrollTop: number, decision: EdgeScrollDecision): number {
  return decision.delta === 0 ? scrollTop : scrollTop + decision.delta;
}