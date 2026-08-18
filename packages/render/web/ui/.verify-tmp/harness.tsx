import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button as RacButton, MenuTrigger as AriaMenuTrigger } from "react-aria-components";
import { MenuTrigger, Menu, MenuItem } from "../Menu";
import { Popover } from "../Popover";

const LANGS = [
  { code: "en", name: "English" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "ja", name: "日本語" },
];

function LanguageMenu() {
  const [lang, setLang] = useState("en");
  return (
    <div>
      <p data-testid="current-lang">{lang}</p>
      <MenuTrigger>
        <RacButton className="lang-button" aria-label="切换语言" data-testid="lang-trigger">
          Lang
        </RacButton>
        <Menu
          selectionMode="single"
          selectedKeys={[lang]}
          onAction={(key) => setLang(String(key))}
        >
          {LANGS.map((l) => (
            <MenuItem key={l.code} id={l.code} textValue={l.name}>
              {l.name}
            </MenuItem>
          ))}
        </Menu>
      </MenuTrigger>
    </div>
  );
}

function CreateMenu() {
  const [last, setLast] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p data-testid="create-last">{last}</p>
      <AriaMenuTrigger isOpen={open} onOpenChange={setOpen}>
        <RacButton aria-label="新建" data-testid="create-trigger">Create</RacButton>
        <Popover className="create-menu-popover" placement="bottom start" offset={8}>
          <Menu
            onAction={(key) => {
              setLast(String(key));
              setOpen(false);
            }}
          >
            <MenuItem id="new-chat" textValue="新建对话">新建对话</MenuItem>
            <MenuItem id="new-page" textValue="新建页面">新建页面</MenuItem>
            <MenuItem id="new-table" textValue="新建表格">新建表格</MenuItem>
          </Menu>
        </Popover>
      </AriaMenuTrigger>
    </div>
  );
}

function App() {
  return (
    <div style={{ padding: 40, display: "flex", gap: 80 }}>
      <LanguageMenu />
      <CreateMenu />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
