// render/web/ui/SearchInput.tsx
import * as stylex from "@stylexjs/stylex";
import React, { useId, useRef, useState } from "react";
import { LuX, LuSearch } from "react-icons/lu";
import Button from "./Button";

import { searchInputStyles } from "./searchInput.styles";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  // New, all optional. Existing callers keep working unchanged.
  label?: string;
  description?: string;
  errorMessage?: string;
  name?: string;
  inputId?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  clearAriaLabel?: string;
  searchButtonLabel?: string;
  formClassName?: string;
  /**
   * Overlay / mode-toggle search (e.g. sidebar): Escape always dismisses,
   * and the clear control stays available when the field is empty so users
   * can cancel without typing first.
   */
  dismissible?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = "搜索...",
  className = "",
  autoFocus,
  label,
  description,
  errorMessage,
  name,
  inputId,
  disabled = false,
  size = "medium",
  clearAriaLabel = "清空搜索",
  searchButtonLabel = "搜索",
  formClassName,
  dismissible = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const fieldId = inputId ?? `search-input-${reactId}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = errorMessage ? `${fieldId}-error` : undefined;
  const isEmpty = value.length === 0;
  const hasError = Boolean(errorMessage);
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const inputAriaLabel = label ? undefined : placeholder || "搜索";
  // Dismissible overlays keep the × control available while empty.
  const showClearControl = dismissible || !isEmpty;
  // 原 :focus-within .search-icon-left 后代选择器的 state 等价
  const [fieldFocused, setFieldFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSearch();
    inputRef.current?.blur(); // 搜索后收起键盘/焦点
  };

  const handleClear = () => {
    if (disabled) return;
    onClear();
    // Overlay search is closing — don't pull focus back into a vanishing field.
    if (!dismissible) {
      inputRef.current?.focus();
    }
  };

  // data-* 属性保留（role=search 语义与测试钩子），样式改由状态 props 组合
  const formProps = {
    "data-empty": isEmpty,
    "data-dismissible": dismissible || undefined,
    "data-disabled": disabled || undefined,
    "data-invalid": hasError || undefined,
  } as const;

  const searchBtnClassName = stylex.props(
    searchInputStyles.searchBtn,
    size === "small" && searchInputStyles.searchBtnSmall,
  ).className;

  return (
    <form
      onSubmit={handleSubmit}
      {...stylex.props(searchInputStyles.form)}
      className={[stylex.props(searchInputStyles.form).className, formClassName, className]
        .filter(Boolean)
        .join(" ")}
      {...formProps}
      role="search"
    >
      {label && (
        <label
          htmlFor={fieldId}
          {...stylex.props(searchInputStyles.label)}
        >
          {label}
        </label>
      )}

      <div {...stylex.props(searchInputStyles.container)}>
        <div
          {...stylex.props(
            searchInputStyles.fieldWrapper,
            size === "small" && searchInputStyles.fieldWrapperSmall,
            hasError && searchInputStyles.fieldWrapperInvalid,
            disabled && searchInputStyles.fieldWrapperDisabled,
          )}
        >
          <LuSearch
            {...stylex.props(
              searchInputStyles.iconLeft,
              fieldFocused && searchInputStyles.iconLeftFocused,
            )}
            size={18}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            aria-label={inputAriaLabel}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            onFocus={() => setFieldFocused(true)}
            onBlur={() => setFieldFocused(false)}
            onKeyDown={(e) => {
              // Default: Escape clears only when there is text.
              // Dismissible: Escape always exits (empty = cancel search mode).
              if (e.key === "Escape" && (dismissible || !isEmpty)) {
                e.preventDefault();
                handleClear();
              }
            }}
            {...stylex.props(
              searchInputStyles.field,
              disabled && searchInputStyles.fieldDisabled,
            )}
          />

          {/* Clear / dismiss: hidden when empty unless dismissible overlay mode. */}
          <div
            {...stylex.props(
              searchInputStyles.clearWrapper,
              showClearControl
                ? searchInputStyles.clearWrapperVisible
                : searchInputStyles.clearWrapperHidden,
            )}
            aria-hidden={!showClearControl}
          >
            <button
              type="button"
              onClick={handleClear}
              {...stylex.props(searchInputStyles.clearButton)}
              title={clearAriaLabel}
              aria-label={clearAriaLabel}
              tabIndex={!showClearControl || disabled ? -1 : 0}
              disabled={disabled}
            >
              <LuX size={12} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div {...stylex.props(searchInputStyles.action)}>
          <Button
            type="submit"
            variant="primary"
            size="medium" // 调整为 medium 配合胶囊高度
            className={searchBtnClassName}
            disabled={disabled}
            aria-label={searchButtonLabel}
          >
            {searchButtonLabel}
          </Button>
        </div>
      </div>

      {description && !hasError && (
        <div
          id={descriptionId}
          {...stylex.props(searchInputStyles.description)}
        >
          {description}
        </div>
      )}

      {hasError && (
        <div id={errorId} {...stylex.props(searchInputStyles.error)} role="alert">
          {errorMessage}
        </div>
      )}
    </form>
  );
};

SearchInput.displayName = "SearchInput";

export default SearchInput;
