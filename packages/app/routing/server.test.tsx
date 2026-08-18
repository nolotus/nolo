import React from "react";
import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import { Outlet, useParams, useRoutes, useSearchParams } from "./index";
import { StaticRouter } from "./server";

describe("StaticRouter", () => {
  it("renders nested routes with leaf params and search params on the server", () => {
    function LayoutProbe() {
      const params = useParams<"spaceId" | "pageKey">();
      return (
        <div>
          layout-space={params.spaceId};layout-page={params.pageKey}
          <Outlet />
        </div>
      );
    }

    function LeafProbe() {
      const params = useParams<"spaceId" | "pageKey">();
      const [searchParams] = useSearchParams();
      return (
        <span>
          leaf-space={params.spaceId};leaf-page={params.pageKey};q={searchParams.get("q")}
        </span>
      );
    }

    function Routes() {
      return (
        <>
          {useRoutes([
            {
              path: "/space/:spaceId",
              element: <LayoutProbe />,
              children: [{ path: ":pageKey", element: <LeafProbe /> }],
            },
          ])}
        </>
      );
    }

    const html = renderToString(
      <StaticRouter location="https://nolo.test/space/space-1/dialog-user-1?q=hello">
        <Routes />
      </StaticRouter>,
    );

    expect(html).toContain("layout-space");
    expect(html).toContain("space-1");
    expect(html).toContain("layout-page");
    expect(html).toContain("dialog-user-1");
    expect(html).toContain("leaf-space");
    expect(html).toContain("leaf-page");
    expect(html).toContain("q=");
    expect(html).toContain("hello");
  });
});
