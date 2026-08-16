import { describe, expect, it } from "bun:test";

import { convertMarxistsBookToOfflineHtml } from "./marxistsOfflineBook";

const encoder = new TextEncoder();
const gifBytes = Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0]);

function responseBytes(text: string) {
  return new Response(encoder.encode(text), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

describe("convertMarxistsBookToOfflineHtml", () => {
  it("builds a single offline HTML with discovered pages and inlined CSS assets", async () => {
    const requests: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);

      if (url === "https://www.marxists.org/chinese/fromm/1973/index.htm") {
        return responseBytes(`
          <html><head><meta charset="gb2312"><title>Fromm Book</title>
          <link rel="stylesheet" href="../../MIA01.css"></head>
          <body><a href="00a.htm">preface</a><a href="01.htm">chapter</a></body></html>
        `);
      }
      if (url === "https://www.marxists.org/chinese/fromm/1973/00a.htm") {
        return responseBytes(`<html><head><title>Preface</title></head><body><table class="table1"><tr><td>Preface body</td></tr></table></body></html>`);
      }
      if (url === "https://www.marxists.org/chinese/fromm/1973/01.htm") {
        return responseBytes(`<html><head><title>Chapter One</title></head><body><table class="table1"><tr><td>Chapter body <a href="00a.htm">prev</a></td></tr></table></body></html>`);
      }
      if (url === "https://www.marxists.org/chinese/MIA01.css") {
        return responseBytes("BODY { background-image:url('images/backg1.gif'); } .table1 { width: 960px; }");
      }
      if (url === "https://www.marxists.org/chinese/images/backg1.gif") {
        return new Response(gifBytes, {
          status: 200,
          headers: { "Content-Type": "image/gif" },
        });
      }
      return new Response(`unexpected ${url}`, { status: 404 });
    };

    const result = await convertMarxistsBookToOfflineHtml({
      startUrl: "https://www.marxists.org/chinese/fromm/1973/01.htm",
      fetchImpl,
      encoding: "utf-8",
    });

    expect(result.title).toBe("Fromm Book");
    expect(result.pages.map((page) => page.name)).toEqual([
      "index.htm",
      "00a.htm",
      "01.htm",
    ]);
    expect(result.html).toContain('<meta charset="utf-8">');
    expect(result.html).toContain("Preface body");
    expect(result.html).toContain("Chapter body");
    expect(result.html).toContain("data:image/gif;base64,R0lGODlhAQA=");
    expect(result.validation).toMatchObject({
      pageCount: 3,
      hasEmbeddedAssets: true,
      hasNetworkUrls: false,
      hasUtf8Meta: true,
    });
    expect(requests).toContain("https://www.marxists.org/chinese/MIA01.css");
    expect(requests).toContain("https://www.marxists.org/chinese/images/backg1.gif");
  });
});
