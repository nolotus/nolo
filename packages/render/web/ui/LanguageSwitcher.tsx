// render/web/ui/LanguageSwitcher.tsx
import * as stylex from "@stylexjs/stylex";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "app/i18n/types";
import { loadClientLanguage } from "app/i18n/clientResources";
import {
  isSupportedLanguage,
  writeStoredLanguage,
} from "app/i18n/languagePreference";
import { LuLanguages } from "react-icons/lu";

import { langSwitcherStyles } from "./languageSwitcher.styles";

// 使用场景：多语言切换选择器
//
// 这里刻意不用 react-aria 的 Menu：语言选择是 7 项单选，而 Menu 会把整套
// react-aria / react-stately 拉进访客首屏（实测约 100KB br）。原生 button + role="menu"
// 已覆盖所需的可访问性：aria-haspopup/aria-expanded/aria-checked、Escape 关闭并还焦点、
// 点击外部关闭、上下键在选项间移动焦点。
const languages = [
  { code: Language.EN, name: "English" },
  { code: Language.ZH_CN, name: "简体中文" },
  { code: Language.ZH_HANT, name: "繁體中文" },
  { code: Language.JA, name: "日本語" },
  { code: Language.KO, name: "한국어" },
  { code: Language.DE, name: "Deutsch" },
  { code: Language.ES, name: "Español" },
];

type LanguageSwitcherProps = {
  /** 仅显示地球图标（顶栏紧凑态）；默认 false 保持全文字 */
  iconOnly?: boolean;
};

const LanguageSwitcher = memo(({ iconOnly = false }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const applyLanguage = async (rawLanguage: string) => {
    // Load the target bundle before switching: the web client only fetches the
    // boot language, so changeLanguage alone leaves the new language's keys
    // unresolved and i18next falls back to English for the whole UI.
    const applied = await loadClientLanguage(i18n, rawLanguage);
    if (isSupportedLanguage(applied)) {
      writeStoredLanguage(applied);
    }
    // Drop any explicit ?lang= override so the persisted preference (mirrored
    // into a cookie for SSR) stays authoritative on the next server render.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.delete("lang");
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch {
      /* non-browser environment */
    }
  };

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusItem = useCallback((index: number) => {
    const items = itemRefs.current.filter(
      (element): element is HTMLButtonElement => Boolean(element),
    );
    if (items.length === 0) return;
    items[(index + items.length) % items.length]?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openMenuAt = (index: number) => {
    setOpen(true);
    requestAnimationFrame(() => focusItem(index));
  };

  return (
    <div ref={containerRef} {...stylex.props(langSwitcherStyles.switcher)}>
      <button
        ref={triggerRef}
        type="button"
        className={
          stylex.props(
            langSwitcherStyles.button,
            iconOnly && langSwitcherStyles.iconOnly,
          ).className
        }
        aria-label="切换语言"
        aria-haspopup="menu"
        aria-expanded={open}
        {...(iconOnly ? { title: "语言" } : {})}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          // 点击/Enter/Space 打开后都把焦点交给首项，避免「菜单已开但焦点仍在触发按钮、
          // Tab 会掉进菜单项」的混合态。
          openMenuAt(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenuAt(0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenuAt(languages.length - 1);
          }
        }}
      >
        <LuLanguages
          size={16}
          {...stylex.props(langSwitcherStyles.icon)}
          aria-hidden="true"
        />
        {!iconOnly && (
          <span {...stylex.props(langSwitcherStyles.current)}>
            {currentLanguage.name}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="切换语言"
          {...stylex.props(langSwitcherStyles.menu)}
        >
          {languages.map((lang, index) => {
            const isCurrent = lang.code === currentLanguage.code;
            return (
              <button
                key={lang.code}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                // 菜单非模态：项不进 Tab 序列，焦点由方向键管理，
                // 这样 Tab / Shift+Tab 能自然离开菜单而不是误入下一项。
                tabIndex={-1}
                {...stylex.props(
                  langSwitcherStyles.menuItem,
                  isCurrent && langSwitcherStyles.menuItemCurrent,
                )}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  void applyLanguage(lang.code);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusItem(index + 1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusItem(index - 1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    focusItem(0);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    focusItem(languages.length - 1);
                  } else if (event.key === "Tab") {
                    // 不吞掉 Tab：关闭菜单后让焦点按浏览器默认顺序离开
                    setOpen(false);
                  }
                }}
              >
                {lang.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default LanguageSwitcher;
