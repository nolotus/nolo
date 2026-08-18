import React, { useState, useEffect, useRef, useCallback } from "react";

interface UseInlineEditOptions {
  onSave: (newValue: string) => void | Promise<void>;
  initialValue: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

interface UseInlineEditReturn {
  isEditing: boolean;
  startEditing: () => void;
  cancelEdit: () => void; // Usually handled internally by blur/escape
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputProps: {
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    placeholder?: string;
    "aria-label"?: string;
  };
}

/**
 * Hook to manage the state and logic for inline editing of a text value.
 * @param initialValue - The initial value to display and edit.
 * @param onSave - Callback function triggered when editing is successfully completed (Enter or Blur with changes).
 * @param placeholder - Optional placeholder text for the input.
 * @param ariaLabel - Optional aria-label for the input.
 */
export const useInlineEdit = ({
  initialValue,
  onSave,
  placeholder = "输入内容...",
  ariaLabel = "编辑内容",
}: UseInlineEditOptions): UseInlineEditReturn => {
  // Co-locate editing flag + value so cancel/revert paths are one update.
  const [editState, setEditState] = useState({
    isEditing: false,
    currentValue: initialValue,
  });
  const { isEditing, currentValue } = editState;
  const inputRef = useRef<HTMLInputElement>(null);
  // Store the value before editing started to check for actual changes on blur/save
  const previousValueRef = useRef(initialValue);

  // Update internal state if the initialValue prop changes externally while not editing
  useEffect(() => {
    if (!isEditing) {
      setEditState((current) =>
        current.currentValue === initialValue
          ? current
          : { ...current, currentValue: initialValue }
      );
      previousValueRef.current = initialValue; // Keep track of the non-editing value
    }
  }, [initialValue, isEditing]);

  // Focus and select text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    previousValueRef.current = currentValue; // Store current value before editing
    setEditState((current) => ({ ...current, isEditing: true }));
  }, [currentValue]);

  const handleSave = useCallback(() => {
    const trimmedValue = currentValue.trim();
    // Only save if the value is non-empty and actually changed
    if (trimmedValue && trimmedValue !== previousValueRef.current) {
      Promise.resolve(onSave(trimmedValue)).finally(() => {
        setEditState((current) => ({ ...current, isEditing: false }));
      });
    } else if (!trimmedValue) {
      // If empty, revert to the value before editing started
      console.warn("Input cannot be empty. Reverting changes.");
      setEditState({
        isEditing: false,
        currentValue: previousValueRef.current,
      });
    } else {
      // If unchanged or only whitespace difference, just exit editing
      setEditState({
        isEditing: false,
        currentValue: previousValueRef.current,
      });
    }
  }, [currentValue, onSave]);

  const cancelEdit = useCallback(() => {
    // Revert to the value before editing started
    setEditState({
      isEditing: false,
      currentValue: previousValueRef.current,
    });
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditState((current) => ({
        ...current,
        currentValue: event.target.value,
      }));
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSave();
      } else if (event.key === "Escape") {
        cancelEdit();
      }
    },
    [handleSave, cancelEdit]
  );

  // Save on blur
  const handleBlur = useCallback(() => {
    // Timeout helps prevent issues where blur triggers before a click outside (e.g., on a save button)
    // If handleSave is already called by Enter, setIsEditing(false) will prevent double execution logic
    // if (isEditing) { // Check if still in editing mode before saving on blur
    setTimeout(handleSave, 0);
    // }
  }, [handleSave]);

  const inputProps = {
    value: currentValue,
    onChange: handleInputChange,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    placeholder: placeholder,
    "aria-label": ariaLabel,
  };

  return {
    isEditing,
    startEditing,
    cancelEdit, // Although primarily internal, can be exposed if needed
    inputRef,
    inputProps,
  };
};
