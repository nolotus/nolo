import { flushSync } from "react-dom";
import { prefersReducedMotion } from "app/viewTransitions";

/**
 * Directional step transitions for the local-create wizard (Morph UI
 * "Step Wizard" pattern): moving forward slides the step surface in from the
 * right while the previous step leaves to the left; moving back mirrors it, so
 * the motion always matches the direction the user is travelling.
 *
 * Same house conventions as stackNavViewTransitions / sidebarViewTransitions /
 * spaceContentViewTransitions:
 *   • one `document.startViewTransition` with `flushSync` around the state
 *     change, so React commits inside the capture callback;
 *   • the direction travels as a `<html>` data attribute
 *     (`data-quick-create-step-vt="forward" | "back"`) consumed by scoped CSS
 *     in LocalQuickCreateAgent.css — two keyframe sets, no cross-fade;
 *   • the step surface's `view-transition-name` is stamped only for the
 *     duration of the slide and removed at rest: the idle DOM never holds a VT
 *     name, so it cannot collide with route-level names (`root`, card names)
 *     or double-mount when the wizard re-mounts;
 *   • reduced motion / SSR / browsers without the View Transitions API degrade
 *     to the previous behaviour: the update is applied synchronously, no
 *     attribute is written and no animation plays.
 *
 * Motion durations and keyframes live in the stylesheet; this module only owns
 * direction resolution and the VT lifecycle.
 */

export type StepTransitionDirection = "forward" | "back";

/** Ordered steps; the array index is the rank used for direction resolution. */
export const QUICK_CREATE_STEP_ORDER = [
  "path",
  "membership",
  "source",
  "form",
] as const;

export type QuickCreateStep = (typeof QUICK_CREATE_STEP_ORDER)[number];

/** The wizard derives its step from exactly these three fields. */
export type QuickCreateStepState = {
  path: "byo" | "membership" | null;
  membershipAccess: "cli" | "oauth" | "api_key" | null;
  sourceKey: string | null;
};

/**
 * The wizard's step surface (the card): named only while a step transition
 * runs. The name is wizard-scoped — one instance per route — and is never left
 * on the idle element.
 */
export const QUICK_CREATE_STEP_PANEL_VT_NAME = "quick-create-step-panel";

/** Marks the step surface so the runner can find it without React state. */
export const QUICK_CREATE_STEP_PANEL_ATTRIBUTE = "data-quick-create-step-panel";

/** Present on <html> only while a step slide runs; its value is the direction. */
export const QUICK_CREATE_STEP_VT_ATTRIBUTE = "data-quick-create-step-vt";

const VIEW_TRANSITION_NAME_PROPERTY = "view-transition-name";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition | undefined;
};

/** Single source of truth for the wizard's step order. */
export const quickCreateStepForState = (
  state: QuickCreateStepState,
): QuickCreateStep => {
  if (!state.path) return "path";
  if (state.path === "membership" && !state.membershipAccess) {
    return "membership";
  }
  if (!state.sourceKey) return "source";
  return "form";
};

/** Rank of a step inside {@link QUICK_CREATE_STEP_ORDER}; -1 when unknown. */
export const quickCreateStepRank = (step: QuickCreateStep): number =>
  QUICK_CREATE_STEP_ORDER.indexOf(step);

/**
 * Direction of a step change, or null when nothing actually moves: the same
 * step, an unknown step, the first step asked to go back, or the terminal step
 * asked to advance (the wizard submits there instead of stepping). Callers hand
 * the null straight to {@link runQuickCreateStepTransition}, which then applies
 * the update without any transition — that is what keeps the boundaries inert.
 */
export const quickCreateStepDirection = (
  from: QuickCreateStep,
  to: QuickCreateStep,
): StepTransitionDirection | null => {
  const fromRank = quickCreateStepRank(from);
  const toRank = quickCreateStepRank(to);
  if (fromRank < 0 || toRank < 0 || fromRank === toRank) return null;
  return toRank > fromRank ? "forward" : "back";
};

/**
 * Step a back move returns to, or null at the first step (nothing behind us).
 * Matches the state resets the wizard performs for that move, so the target
 * always equals `quickCreateStepForState(resetState)`.
 */
export const quickCreateBackTarget = (
  step: QuickCreateStep,
  path: QuickCreateStepState["path"],
): QuickCreateStep | null => {
  if (step === "form") return "source";
  if (step === "source") return path === "membership" ? "membership" : "path";
  if (step === "membership") return "path";
  return null;
};

const findStepSurfaces = (doc: Document): HTMLElement[] =>
  Array.from(
    doc.querySelectorAll<HTMLElement>(`[${QUICK_CREATE_STEP_PANEL_ATTRIBUTE}]`),
  );

const stampSurfaceName = (surface: HTMLElement | null): void => {
  surface?.style.setProperty(
    VIEW_TRANSITION_NAME_PROPERTY,
    QUICK_CREATE_STEP_PANEL_VT_NAME,
  );
};

const clearSurfaceNames = (doc: Document): void => {
  for (const surface of findStepSurfaces(doc)) {
    if (
      surface.style.getPropertyValue(VIEW_TRANSITION_NAME_PROPERTY) ===
      QUICK_CREATE_STEP_PANEL_VT_NAME
    ) {
      surface.style.removeProperty(VIEW_TRANSITION_NAME_PROPERTY);
    }
  }
};

export type RunQuickCreateStepTransitionOptions = {
  /** null → no directional move: the update applies without a transition. */
  direction: StepTransitionDirection | null;
  update: () => void;
  /** Step surface to name; defaults to the `[data-quick-create-step-panel]` node. */
  panel?: HTMLElement | null;
};

/**
 * Apply a step change as a directional slide.
 * Returns true when a View Transition actually ran.
 */
export const runQuickCreateStepTransition = (
  options: RunQuickCreateStepTransitionOptions,
): boolean => {
  const { direction, update } = options;
  const doc =
    typeof document === "undefined"
      ? null
      : (document as ViewTransitionDocument);

  if (
    !direction ||
    !doc ||
    typeof doc.startViewTransition !== "function" ||
    prefersReducedMotion()
  ) {
    update();
    return false;
  }

  const panel = options.panel ?? findStepSurfaces(doc)[0] ?? null;
  doc.documentElement.setAttribute(QUICK_CREATE_STEP_VT_ATTRIBUTE, direction);
  stampSurfaceName(panel);

  try {
    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        update();
        // The surface node survives the step swap (only its children change);
        // re-stamp defensively in case React replaced it during the update.
        const live =
          panel && panel.isConnected === false
            ? (findStepSurfaces(doc)[0] ?? null)
            : panel;
        stampSurfaceName(live);
      });
    });

    Promise.resolve(transition?.finished)
      .catch(() => undefined)
      .finally(() => {
        doc.documentElement.removeAttribute(QUICK_CREATE_STEP_VT_ATTRIBUTE);
        clearSurfaceNames(doc);
      });
  } catch (error) {
    // Never leave the direction stamp / a VT name behind on a failed update.
    doc.documentElement.removeAttribute(QUICK_CREATE_STEP_VT_ATTRIBUTE);
    clearSurfaceNames(doc);
    throw error;
  }

  return true;
};
