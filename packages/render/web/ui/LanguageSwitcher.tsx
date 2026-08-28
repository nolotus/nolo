// render/ui/LanguageSwitcher.tsx
import "../ui.css";
import React, { memo } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "app/i18n/types";
import { Button as RacButton } from "react-aria-components";
import { LuLanguages } from "react-icons/lu";
import { MenuTrigger, Menu, MenuItem } from "render/web/ui/Menu";

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
    <div className="lang-switcher">
      <MenuTrigger>
        <RacButton
          className={`lang-button${iconOnly ? " lang-button--icon-only" : ""}`}
          aria-label="切换语言"
          {...(iconOnly ? { title: "语言" } : {})}
        >
          <LuLanguages size={16} className="lang-icon" aria-hidden="true" />
          {!iconOnly && (
            <span className="lang-current">{currentLanguage.name}</span>
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
