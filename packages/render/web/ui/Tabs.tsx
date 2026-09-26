import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type { Key } from 'react-aria-components';
import {
  Tabs as RACTabs,
  TabList as RACTabList,
  type TabListProps,
  type TabProps,
  Tab as RACTab,
  type TabsProps as RACTabsProps,
  TabPanels as RACTabPanels,
  type TabPanelProps as RACTabPanelProps,
  TabPanel as RACTabPanel,
  SelectionIndicator,
  type TabPanelsProps
} from 'react-aria-components/Tabs';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import { prefersReducedMotion, sanitizeViewTransitionKey } from 'app/viewTransitions';
import './Tabs.css';

export interface TabTransitionContextValue {
  instanceId: string;
  panelVtName: string;
  registerPanel: (element: HTMLElement | null) => void;
  direction: 'forward' | 'backward' | null;
}

export const TabsTransitionContext = createContext<TabTransitionContextValue | null>(null);

export interface TabsProps extends RACTabsProps {
  /** Optional ID of an external panel element associated with these tabs. */
  panelId?: string;
  /** Optional CSS selector of an external panel element associated with these tabs. */
  panelSelector?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TabPanelProps extends RACTabPanelProps {
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * Searches for the associated panel element for directional View Transitions:
 * 1. Registered <TabPanel> ref via TabsTransitionContext
 * 2. Explicit panelId prop or panelSelector
 * 3. Element inside the Tabs container ([role="tabpanel"], .react-aria-TabPanel)
 * 4. Active tab's aria-controls
 * 5. Nearest enclosing section/main content pane
 * 6. Direct adjacent sibling content container
 */
export function findPanelElement(
  tabsEl: HTMLElement | null,
  registeredPanelEl: HTMLElement | null,
  panelId?: string,
  panelSelector?: string
): HTMLElement | null {
  if (registeredPanelEl && registeredPanelEl.isConnected) {
    return registeredPanelEl;
  }
  if (panelId) {
    const el = document.getElementById(panelId);
    if (el) return el;
  }
  if (panelSelector) {
    const el = document.querySelector<HTMLElement>(panelSelector);
    if (el) return el;
  }
  if (!tabsEl) return null;

  // 1. Inside the Tabs element. Exclude panels that are mid-exit
  // ([data-exiting]) — react-aria keeps them mounted for the opacity
  // transition, but they must not be picked as the incoming snapshot panel.
  const insidePanel = tabsEl.querySelector<HTMLElement>(
    ':scope > .react-aria-TabPanels > [role="tabpanel"]:not([data-exiting]), :scope > [role="tabpanel"]:not([data-exiting]), .react-aria-TabPanel[data-selected="true"]:not([data-exiting]), [role="tabpanel"][aria-hidden="false"]:not([data-exiting]), [role="tabpanel"]:not([hidden]):not([data-exiting])'
  );
  if (insidePanel) return insidePanel;

  // 2. Active tab's aria-controls
  const activeTabEl = tabsEl.querySelector<HTMLElement>(
    '[role="tab"][aria-selected="true"], [role="tab"][data-selected="true"]'
  );
  const controlsId = activeTabEl?.getAttribute('aria-controls');
  if (controlsId) {
    const controlledEl = document.getElementById(controlsId);
    if (controlledEl) return controlledEl;
  }

  // 3. Search in closest enclosing section/main container
  const scope = tabsEl.closest(
    'section, main, article, form, [data-tabs-container], .agent-explore__inner, .MyContentPage, .SettingsLayout'
  );
  if (scope) {
    const scopePanel = scope.querySelector<HTMLElement>(
      '[role="tabpanel"], .activity-pane, .agent-explore-content, .home-content-body > div, .MyContentCollection__content, .SettingsLayout__content'
    );
    if (scopePanel) return scopePanel;
  }

  // 4. Look in adjacent siblings (either of tabsEl, or of its parent e.g. <header>)
  let sibling = tabsEl.nextElementSibling as HTMLElement | null;
  if (
    !sibling &&
    tabsEl.parentElement &&
    tabsEl.parentElement !== document.body &&
    tabsEl.parentElement !== document.documentElement
  ) {
    sibling = tabsEl.parentElement.nextElementSibling as HTMLElement | null;
  }
  while (sibling) {
    if (!sibling.matches('script, style, link, [aria-hidden="true"]')) {
      const panel = sibling.matches('[role="tabpanel"]')
        ? sibling
        : sibling.querySelector<HTMLElement>('[role="tabpanel"]');
      if (panel) return panel;
      return sibling;
    }
    sibling = sibling.nextElementSibling as HTMLElement | null;
  }

  return null;
}

/**
 * Remove `viewTransitionName` from every element still carrying `name`.
 * Scoped to [role="tabpanel"] so unrelated transition targets are untouched.
 * Covers both the exiting panel and the incoming panel after a transition.
 */
function clearPanelVtName(name: string): void {
  if (typeof document === 'undefined' || !name) return;
  const panels = document.querySelectorAll<HTMLElement>('[role="tabpanel"], .react-aria-TabPanel');
  for (const panel of Array.from(panels)) {
    if (panel.style.viewTransitionName === name) {
      panel.style.viewTransitionName = '';
    }
  }
}

/**
 * Strip `viewTransitionName` from exiting panels ([data-exiting]) that react-aria
 * keeps mounted for the opacity transition. Called inside the view-transition
 * update callback before the incoming panel is named, so the browser never sees
 * two panels sharing the same name in the old+new snapshot.
 */
function clearExitingPanelVtNames(name: string): void {
  if (typeof document === 'undefined' || !name) return;
  const exiting = document.querySelectorAll<HTMLElement>(
    '[role="tabpanel"][data-exiting], .react-aria-TabPanel[data-exiting]'
  );
  for (const panel of Array.from(exiting)) {
    if (panel.style.viewTransitionName === name) {
      panel.style.viewTransitionName = '';
    }
  }
}

export function Tabs(props: TabsProps) {
  const {
    id,
    panelId,
    panelSelector,
    selectedKey: controlledKey,
    defaultSelectedKey,
    onSelectionChange,
    orientation = 'horizontal',
    children,
    ...restProps
  } = props;

  const generatedId = useId();
  const rawId = id || generatedId;
  const instanceId = sanitizeViewTransitionKey(rawId) || 'tabs';
  const panelVtName = `tab-panel-${instanceId}`;

  const isControlled = controlledKey !== undefined;
  const [internalKey, setInternalKey] = useState<Key | undefined>(defaultSelectedKey);
  const effectiveSelectedKey = isControlled ? controlledKey : internalKey;

  const currentKeyRef = useRef<Key | undefined>(effectiveSelectedKey);
  currentKeyRef.current = effectiveSelectedKey;

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const registeredPanelRef = useRef<HTMLElement | null>(null);
  const [activeDirection, setActiveDirection] = useState<'forward' | 'backward' | null>(null);

  const registerPanel = useCallback((element: HTMLElement | null) => {
    registeredPanelRef.current = element;
  }, []);

  const handleSelectionChange = useCallback(
    (nextKey: Key) => {
      const prevKey = currentKeyRef.current;
      if (nextKey === prevKey) return;

      // Determine sliding direction by inspecting tab indices in DOM
      let direction: 'forward' | 'backward' = 'forward';
      const tabsEl = tabsRef.current;
      if (tabsEl) {
        const tabElements = Array.from(tabsEl.querySelectorAll<HTMLElement>('[role="tab"]'));
        const prevIdx = tabElements.findIndex(
          (el) =>
            el.getAttribute('data-key') === String(prevKey) ||
            el.id === String(prevKey) ||
            el.getAttribute('data-value') === String(prevKey) ||
            el.getAttribute('aria-selected') === 'true'
        );
        const nextIdx = tabElements.findIndex(
          (el) =>
            el.getAttribute('data-key') === String(nextKey) ||
            el.id === String(nextKey) ||
            el.getAttribute('data-value') === String(nextKey)
        );
        if (prevIdx !== -1 && nextIdx !== -1) {
          direction = nextIdx >= prevIdx ? 'forward' : 'backward';
        }
      }

      setActiveDirection(direction);

      const shouldAnimate =
        typeof document !== 'undefined' &&
        typeof (document as any).startViewTransition === 'function' &&
        !prefersReducedMotion();

      const applyUpdate = () => {
        currentKeyRef.current = nextKey;
        if (!isControlled) {
          setInternalKey(nextKey);
        }
        onSelectionChange?.(nextKey);
      };

      if (!shouldAnimate) {
        applyUpdate();
        return;
      }

      document.documentElement.dataset.tabsDirection = direction;
      if (orientation === 'vertical') {
        document.documentElement.dataset.tabsOrientation = 'vertical';
      } else {
        delete document.documentElement.dataset.tabsOrientation;
      }

      const panel = findPanelElement(tabsEl, registeredPanelRef.current, panelId, panelSelector);
      if (panel) {
        panel.style.viewTransitionName = panelVtName;
      }

      try {
        const transition = (document as any).startViewTransition(() => {
          flushSync(() => {
            applyUpdate();
          });
          // Before stamping the incoming panel, strip the transition name from
          // any exiting panel still mounted for its opacity transition, so the
          // old/new snapshot never sees two panels sharing `panelVtName`.
          clearExitingPanelVtNames(panelVtName);
          const newPanel = findPanelElement(
            tabsRef.current,
            registeredPanelRef.current,
            panelId,
            panelSelector
          );
          if (newPanel) {
            newPanel.style.viewTransitionName = panelVtName;
          }
        });

        Promise.resolve(transition?.finished)
          .catch(() => undefined)
          .finally(() => {
            try {
              // Clear every panel (exiting + incoming) that still carries this
              // instance's transition name, not just the single element that
              // findPanelElement resolves after the DOM has settled.
              clearPanelVtName(panelVtName);
              delete document.documentElement.dataset.tabsDirection;
              delete document.documentElement.dataset.tabsOrientation;
            } catch {
              // ignore
            }
          });
      } catch {
        applyUpdate();
        delete document.documentElement.dataset.tabsDirection;
        delete document.documentElement.dataset.tabsOrientation;
      }
    },
    [isControlled, onSelectionChange, orientation, panelId, panelSelector, panelVtName]
  );

  const contextValue = React.useMemo<TabTransitionContextValue>(
    () => ({
      instanceId,
      panelVtName,
      registerPanel,
      direction: activeDirection,
    }),
    [instanceId, panelVtName, registerPanel, activeDirection]
  );

  const styleTag = (
    <style>{`
      ::view-transition-group(${panelVtName}) {
        animation-duration: 0.28s;
        animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
      }
      ::view-transition-old(${panelVtName}) {
        animation: 0.2s cubic-bezier(0.33, 1, 0.68, 1) both vt-tab-fade-out,
                   0.28s cubic-bezier(0.32, 0.72, 0, 1) both vt-tab-slide-out;
      }
      ::view-transition-new(${panelVtName}) {
        animation: 0.24s cubic-bezier(0.33, 1, 0.68, 1) both vt-tab-fade-in,
                   0.28s cubic-bezier(0.32, 0.72, 0, 1) both vt-tab-slide-in;
      }
      @media (prefers-reduced-motion: reduce) {
        ::view-transition-group(${panelVtName}),
        ::view-transition-old(${panelVtName}),
        ::view-transition-new(${panelVtName}) {
          animation: none !important;
        }
      }
    `}</style>
  );

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      tabsRef.current = node;
      if (typeof props.ref === 'function') {
        props.ref(node);
      } else if (props.ref && typeof props.ref === 'object') {
        (props.ref as any).current = node;
      }
    },
    [props.ref]
  );

  return (
    <TabsTransitionContext.Provider value={contextValue}>
      <RACTabs
        id={id}
        orientation={orientation}
        selectedKey={effectiveSelectedKey}
        onSelectionChange={handleSelectionChange}
        ref={mergedRef}
        {...restProps}
      >
        {typeof children === 'function'
          ? (values) => (
              <>
                {children(values)}
                {styleTag}
              </>
            )
          : (
              <>
                {children}
                {styleTag}
              </>
            )}
      </RACTabs>
    </TabsTransitionContext.Provider>
  );
}

export function TabList<T>(props: TabListProps<T>) {
  return <RACTabList {...props} />;
}

export function Tab(props: TabProps) {
  return (
    <RACTab {...props}>
      {composeRenderProps(props.children, (children) => (
        <>
          {children}
          <SelectionIndicator />
        </>
      ))}
    </RACTab>
  );
}

export function TabPanels<T>(props: TabPanelsProps<T>) {
  return <RACTabPanels {...props} />;
}

export function TabPanel(props: TabPanelProps) {
  const ctx = useContext(TabsTransitionContext);
  const internalRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (internalRef.current && ctx?.registerPanel) {
      ctx.registerPanel(internalRef.current);
    }
    return () => {
      if (ctx?.registerPanel) {
        ctx.registerPanel(null);
      }
    };
  }, [ctx]);

  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof props.ref === 'function') {
        props.ref(node);
      } else if (props.ref && typeof props.ref === 'object') {
        (props.ref as any).current = node;
      }
    },
    [props.ref]
  );

  return <RACTabPanel ref={handleRef} {...props} />;
}
export { SelectionIndicator };
