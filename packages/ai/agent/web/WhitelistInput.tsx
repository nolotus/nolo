import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LuUserPlus, LuX } from "react-icons/lu";
import Button from "render/web/ui/Button";
import { AriaComboBox, ComboBoxItem } from "render/web/ui/AriaComboBox";
import { useUserId } from "identity";
import * as stylex from "@stylexjs/stylex";
import { whitelistInputStyles as styles } from "./whitelistInputStyles";

interface WhitelistInputProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

const WhitelistInput: React.FC<WhitelistInputProps> = ({
  value = [],
  onChange,
}) => {
  const { t } = useTranslation("ai");
  const [inputValue, setInputValue] = useState("");
  const currentUserId = useUserId() ?? "";

  const handleAddUser = useCallback(
    (candidate = inputValue) => {
      const trimmedValue = candidate.trim();
      if (trimmedValue && !value.includes(trimmedValue)) {
        onChange?.([...value, trimmedValue]);
        setInputValue("");
      }
    },
    [inputValue, value, onChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddUser(inputValue);
    }
  };

  const handleRemoveUser = useCallback(
    (userToRemove: string) => {
      onChange?.(value.filter((user) => user !== userToRemove));
    },
    [value, onChange],
  );

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.inputWrapper)}>
        <AriaComboBox
          aria-label={t("publish.whitelist.label", "白名单用户")}
          allowsCustomValue
          inputValue={inputValue}
          onInputChange={setInputValue}
          selectedKey={null}
          onSelectionChange={(key) => {
            if (key != null) handleAddUser(String(key));
          }}
          onKeyDown={handleKeyDown}
          placeholder={t(
            "publish.whitelist.addPlaceholder",
            "输入或选择用户 ID，按回车添加",
          )}
        >
          {currentUserId ? (
            <ComboBoxItem id={currentUserId}>
              {currentUserId} (当前用户)
            </ComboBoxItem>
          ) : (
            <ComboBoxItem id="no-user" isDisabled>
              暂无可用的推荐用户
            </ComboBoxItem>
          )}
        </AriaComboBox>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleAddUser()}
          icon={<LuUserPlus />}
          disabled={!inputValue.trim()}
          className={stylex.props(styles.addButton).className}
        >
          {t("add", "添加")}
        </Button>
      </div>

      {value.length > 0 && (
        <div {...stylex.props(styles.userList)} aria-label="已添加的白名单用户">
          {value.map((user) => (
            <div key={user} {...stylex.props(styles.userTag)}>
              <span {...stylex.props(styles.userId)}>{user}</span>
              <button
                type="button"
                {...stylex.props(styles.removeButton)}
                onClick={() => handleRemoveUser(user)}
                aria-label={`移除 ${user}`}
              >
                <LuX size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhitelistInput;
