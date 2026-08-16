import React from "react";
import { RouterProvider } from "./index";

export function StaticRouter({
  location,
  children,
}: {
  location: string | URL;
  children: React.ReactNode;
}): React.ReactElement {
  return <RouterProvider initialUrl={location}>{children}</RouterProvider>;
}
