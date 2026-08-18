// features/web/form/TagsInput.tsx

import "../form.css";
import React, { useState, useId } from "react";
import { useTranslation } from "react-i18next";
import { LuX } from "react-icons/lu";

interface TagsInputProps {
  value?: string;
  onChange: (newValue: string) => void;
  error?: { message?: string };
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  variant?: "default" | "filled" | "ghost";
  maxTags?: number;
  allowDuplicates?: boolean;
  separator?: string | RegExp;
  className?: string;
  style?: React.CSSProperties;
  id?: string;

  // React 19: 直接以 prop 形式接收 ref
  ref?: React.Ref<HTMLInputElement>;
}

export const TagsInput = ({
  value = "",
  onChange,
  error,
  placeholder,
  disabled = false,
  label,
  helperText,
  variant = "default",
  maxTags,
  allowDuplicates = false,
  separator = /[,\s]+/,
  className = "",
  style,
  id,
  ref,
}: TagsInputProps) => {
  const { t } = useTranslation("ai");

  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const tagsArray = String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const generatedId = useId();
  const inputId = id || `tags-input-${generatedId}`;
  const helperTextId =
    helperText || error?.message ? `${inputId}-helper` : undefined;

  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();
    if (
      !trimmedTag ||
      (maxTags && tagsArray.length >= maxTags) ||
      (!allowDuplicates && tagsArray.includes(trimmedTag))
    )
      return;

    onChange([...tagsArray, trimmedTag].join(", "));
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tagsArray
      .filter((_, index) => index !== indexToRemove)
      .join(", ");
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tagsArray.length) {
      removeTag(tagsArray.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    pastedText.split(separator).forEach(addTag);
  };

  const finalPlaceholder = placeholder || t("form.tagsPlaceholder");

  const wrapperClasses = [
    "ti-wrapper",
    variant, // default | filled | ghost
    isFocused ? "focused" : "",
    error ? "error" : "",
    disabled ? "disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={`ti-container ${className}`} style={style}>
        {label && (
          <label
            htmlFor={inputId}
            className={`ti-label ${error ? "error" : ""}`}
          >
            {label}
          </label>
        )}

        <div className={wrapperClasses}>
          {tagsArray.map((tag, index) => (
            <span
              key={allowDuplicates ? `${tag}-${index}` : tag}
              className="ti-tag"
            >
              <span title={tag}>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  className="ti-remove"
                  onClick={() => removeTag(index)}
                  aria-label={t("form.removeTag", { tag })}
                  tabIndex={-1}
                >
                  <LuX size={12} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}

          <input
            ref={ref}
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            onPaste={handlePaste}
            placeholder={tagsArray.length === 0 ? finalPlaceholder : ""}
            disabled={disabled}
            className="ti-input"
            aria-invalid={!!error}
            aria-describedby={helperTextId}
            autoComplete="off"
          />

          {maxTags && (
            <div
              className={`ti-counter ${
                tagsArray.length >= maxTags ? "warning" : ""
              }`}
            >
              {tagsArray.length}/{maxTags}
            </div>
          )}
        </div>

        {(helperText || error?.message) && (
          <div
            id={helperTextId}
            className={`ti-helper ${error ? "error" : ""}`}
            role={error ? "alert" : "note"}
          >
            {error?.message || helperText}
          </div>
        )}
      </div>
    </>
  );
};


TagsInput.displayName = "TagsInput";
