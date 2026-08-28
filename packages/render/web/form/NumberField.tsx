import {
  Group,
  Input,
  Button,
  NumberField as AriaNumberField,
  Label,
  Text,
  FieldError,
  type NumberFieldProps as AriaNumberFieldProps,
  type ValidationResult,
} from "react-aria-components";
import { LuPlus, LuMinus } from "react-icons/lu";
import "./NumberField.css";

export interface NumberFieldProps extends AriaNumberFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
}

export function NumberField({
  label,
  description,
  errorMessage,
  placeholder,
  className,
  ...props
}: NumberFieldProps) {
  return (
    <AriaNumberField
      {...props}
      className={
        typeof className === "function"
          ? (renderProps) =>
              `react-aria-NumberField ${className(renderProps) ?? ""}`.trim()
          : `react-aria-NumberField ${className ?? ""}`.trim()
      }
    >
      {label && <Label className="react-aria-Label">{label}</Label>}
      <Group className="react-aria-Group">
        <Input className="react-aria-Input" placeholder={placeholder} />
        <Button slot="decrement" className="react-aria-Button">
          <LuMinus size={14} />
        </Button>
        <Button slot="increment" className="react-aria-Button">
          <LuPlus size={14} />
        </Button>
      </Group>
      {description && (
        <Text slot="description" className="react-aria-Description">
          {description}
        </Text>
      )}
      {errorMessage && (
        <FieldError className="react-aria-FieldError">
          {errorMessage}
        </FieldError>
      )}
    </AriaNumberField>
  );
}
