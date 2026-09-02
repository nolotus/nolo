// render/ui/LanguageSwitcher.tsx
import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "app/i18n/types";
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
];

type LanguageSwitcherProps = {
  /** 仅显示地球图标（顶栏紧凑态）；默认 false 保持全文字 */
  iconOnly?: boolean;
};

const LanguageSwitcher = memo(({ iconOnly = false }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

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
            void i18n.changeLanguage(String(key));
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
