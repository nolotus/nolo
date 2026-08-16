// web/form/FormField.tsx
import "../form.css";
import type React from "react";
import type { ReactNode, LabelHTMLAttributes } from "react";

interface FormFieldProps {
  children: ReactNode;
  className?: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  horizontal?: boolean;
  labelWidth?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  style?: React.CSSProperties;
  htmlFor?: string;
}

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
}

const Label: React.FC<LabelProps> = ({
  children,
  required,
  error,
  className = "",
  ...props
}) => (
  <label
    className={`form-label ${error ? "has-error" : ""} ${className}`}
    {...props}
  >
    {children}
    {required && <span className="required">*</span>}
  </label>
);

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className = "",
  label,
  required = false,
  error,
  helperText,
  horizontal = false,
  labelWidth = "140px",
  disabled = false,
  hideLabel = false,
  style,
  htmlFor,
}) => {
  const hasError = Boolean(error);

  const fieldClasses = [
    "form-field",
    horizontal && "horizontal",
    disabled && "disabled",
    hasError && "error",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={fieldClasses} style={style}>
      {!hideLabel && label && (
        <Label
          required={required}
          error={hasError}
          htmlFor={htmlFor}
          style={
            horizontal
              ? ({ "--label-width": labelWidth } as React.CSSProperties)
              : undefined
          }
        >
          {label}
        </Label>
      )}

      <div className="form-content">
        {children}
        {helperText && !hasError && (
          <div className="form-help">{helperText}</div>
        )}
        {hasError && error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export { Label };

FormField.displayName = "FormField";
Label.displayName = "Label";
