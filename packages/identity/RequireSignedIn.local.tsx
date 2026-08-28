// RequireSignedIn: local edition 始终渲染 children（本机即已登录）。
// cloud edition 从 auth/components/RequireSignedIn re-export。
import type { ReactNode } from "react";

export const RequireSignedIn = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default RequireSignedIn;