import { describe, expect, it } from "bun:test";

let moduleVersion = 0;

const loadModule = async () => import(`./desktopClipboardHandler.ts`);

describe("desktop clipboard handler", () => {
  it("is only available in desktop mode", async () => {
    const { handleDesktopClipboardPost } = await loadModule();

    const response = await handleDesktopClipboardPost(
      new Request("http://localhost/api/desktop/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
      { env: { NOLO_DESKTOP: "0" }, writeClipboard: async () => {} },
    );

    expect(response.status).toBe(404);
  });

  it("writes text through the injected native clipboard writer", async () => {
    const { handleDesktopClipboardPost } = await loadModule();
    let copied = "";

    const response = await handleDesktopClipboardPost(
      new Request("http://localhost/api/desktop/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "https://nolo.chat/share/78shzngptv" }),
      }),
      {
        env: { NOLO_DESKTOP: "1" },
        writeClipboard: async (text: string) => {
          copied = text;
        },
      },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(copied).toBe("https://nolo.chat/share/78shzngptv");
  });

  it("rejects missing text", async () => {
    const { handleDesktopClipboardPost } = await loadModule();

    const response = await handleDesktopClipboardPost(
      new Request("http://localhost/api/desktop/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { env: { NOLO_DESKTOP: "1" }, writeClipboard: async () => {} },
    );

    expect(response.status).toBe(400);
  });
});
