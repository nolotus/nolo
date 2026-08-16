// render/web/ui/SearchInput.tsx
import "../ui.css";
import React, { useId, useRef } from "react";
import { LuX, LuSearch } from "react-icons/lu";
import Button from "./Button";

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
  const wrapperClassName = [
    "search-form",
    formClassName,
    className,
    `search-form--${size}`,
  ]
    .filter(Boolean)
    .join(" ");

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

  return (
    <form
      onSubmit={handleSubmit}
      className={wrapperClassName}
      data-empty={isEmpty}
      data-dismissible={dismissible || undefined}
      data-disabled={disabled || undefined}
      data-invalid={hasError || undefined}
      role="search"
    >
      {label && (
        <label htmlFor={fieldId} className="search-input-label">
          {label}
        </label>
      )}

      <div className="search-container">
        <div className="input-field-wrapper">
          <LuSearch className="search-icon-left" size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            id={fieldId}
            name={name}
            type="text"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-label={inputAriaLabel}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Default: Escape clears only when there is text.
              // Dismissible: Escape always exits (empty = cancel search mode).
              if (e.key === "Escape" && (dismissible || !isEmpty)) {
                e.preventDefault();
                handleClear();
              }
            }}
            className="search-input-field"
          />

          {/* Clear / dismiss: hidden when empty unless dismissible overlay mode. */}
          <div
            className={`clear-btn-wrapper${showClearControl ? " visible" : ""}`}
            aria-hidden={!showClearControl}
          >
            <button
              type="button"
              onClick={handleClear}
              className="clear-icon-button"
              title={clearAriaLabel}
              aria-label={clearAriaLabel}
              tabIndex={!showClearControl || disabled ? -1 : 0}
              disabled={disabled}
            >
              <LuX size={12} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="search-action">
          <Button
            type="submit"
            variant="primary"
            size="medium" // 调整为 medium 配合胶囊高度
            className="search-btn"
            disabled={disabled}
            aria-label={searchButtonLabel}
          >
            {searchButtonLabel}
          </Button>
        </div>
      </div>

      {description && !hasError && (
        <div id={descriptionId} className="search-input-description">
          {description}
        </div>
      )}

      {hasError && (
        <div id={errorId} className="search-input-error" role="alert">
          {errorMessage}
        </div>
      )}
    </form>
  );
};

SearchInput.displayName = "SearchInput";

export default SearchInput;
