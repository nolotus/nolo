import { afterEach, describe, expect, it, mock } from "bun:test";

import { parseDialogInput, readDialogOverHttp } from "./dialogDataHelpers";

const originalFetch = globalThis.fetch;

describe("parseDialogInput", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restore();
  });

  it("parses legacy dialog URLs without space context", () => {
    expect(
      parseDialogInput(
        "http://localhost/dialog-392282c404-01KMCWDXXBA8S1JMDDWWVMW9MN"
      )
    ).toMatchObject({
      base: "http://localhost",
      dialogId: "01KMCWDXXBA8S1JMDDWWVMW9MN",
      userId: "392282c404",
    });
  });

  it("parses space-scoped dialog URLs from the pathname", () => {
    expect(
      parseDialogInput(
        "http://localhost/space/space-demo/dialog-392282c404-01KMCWDXXBA8S1JMDDWWVMW9MN"
      )
    ).toMatchObject({
      base: "http://localhost",
      dialogId: "01KMCWDXXBA8S1JMDDWWVMW9MN",
      userId: "392282c404",
      spaceId: "demo",
    });
  });

  it("falls back to the machine/user dialog-read bridge when raw db read is unauthorized", async () => {
    const requests: string[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push(url);
      if (url.includes("/api/v1/db/read/")) {
        return new Response("unauthorized", { status: 401 });
      }
      if (url.endsWith("/api/dialog-read")) {
        expect(JSON.parse(String(init?.body))).toEqual({
          dialogKey: "dialog-user-1-dialog-1",
          dialogId: "dialog-1",
          limit: 20,
        });
        return Response.json({
          ok: true,
          meta: { id: "dialog-1", status: "done" },
          msgs: [{ id: "msg-1", role: "assistant", content: "done" }],
        });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await readDialogOverHttp({
      base: "https://us.nolo.chat",
      dialogKey: "dialog-user-1-dialog-1",
      dialogId: "dialog-1",
      limit: 20,
      authToken: "sk_machine_test",
    });

    expect(requests).toEqual([
      "https://us.nolo.chat/api/v1/db/read/dialog-user-1-dialog-1",
      "https://us.nolo.chat/api/dialog-read",
    ]);
    expect(result.meta).toMatchObject({ status: "done" });
    expect(result.msgs).toHaveLength(1);
  });
});
