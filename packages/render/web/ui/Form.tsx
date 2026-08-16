import { Text, FieldError as RACFieldError } from "react-aria-components";
import type { ReactNode } from "react";

export function Description({ children }: { children: ReactNode }) {
  return <Text slot="description">{children}</Text>;
}

export { RACFieldError as FieldError };
