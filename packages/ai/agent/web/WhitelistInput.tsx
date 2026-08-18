import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LuUserPlus, LuX } from "react-icons/lu";
import Button from "render/web/ui/Button";
import { AriaComboBox, ComboBoxItem } from "render/web/ui/AriaComboBox";
import { useUserId } from "identity";
import "./WhitelistInput.css";

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
    <div className="whitelist-container">
      <div className="whitelist-input-wrapper">
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
          className="whitelist-add-button"
        >
          {t("add", "添加")}
        </Button>
      </div>

      {value.length > 0 && (
        <div className="whitelist-user-list" aria-label="已添加的白名单用户">
          {value.map((user) => (
            <div key={user} className="whitelist-user-tag">
              <span className="whitelist-user-id">{user}</span>
              <button
                type="button"
                className="whitelist-remove-button"
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
