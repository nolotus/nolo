// web/form/FormTitle.tsx
import type { ReactNode } from "react";
import "../form.css";

interface FormTitleProps {
  children: ReactNode;
  fontSize?: string;
  marginBottom?: string;
}

export const FormTitle: React.FC<FormTitleProps> = ({
  children,
  fontSize,
  marginBottom,
}) => {
  return (
    <h2
      className="form-title"
      style={
        fontSize || marginBottom
          ? {
              ...(fontSize ? { fontSize } : {}),
              ...(marginBottom ? { marginBottom } : {}),
            }
          : undefined
      }
    >
      {children}
    </h2>
  );
};

export default FormTitle;
