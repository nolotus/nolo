// render/ui/LanguageSwitcher.tsx
import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "app/i18n/types";
import { loadClientLanguage } from "app/i18n/clientResources";
import {
  isSupportedLanguage,
  writeStoredLanguage,
} from "app/i18n/languagePreference";
import { Button as RacButton } from "react-aria-components";
import { LuLanguages } from "react-icons/lu";
import { MenuTrigger, Menu, MenuItem } from "render/web/ui/Menu";

import { langSwitcherStyles } from "./languageSwitcher.styles";

// 使用场景：多语言切换选择器
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

  return (
    <div {...stylex.props(langSwitcherStyles.switcher)}>
      <MenuTrigger>
        <RacButton
          className={stylex.props(
            langSwitcherStyles.button,
            iconOnly && langSwitcherStyles.iconOnly,
          ).className}
          aria-label="切换语言"
          {...(iconOnly ? { title: "语言" } : {})}
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
        </RacButton>
        <Menu
          selectionMode="single"
          selectedKeys={[currentLanguage.code]}
          onAction={(key) => {
            void applyLanguage(String(key));
          }}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} id={lang.code} textValue={lang.name}>
              {lang.name}
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    </div>
  );
});

export default LanguageSwitcher;
