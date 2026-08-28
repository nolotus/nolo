import { stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = path.resolve(import.meta.dir, "../..");
const outputPath = path.join(repoRoot, "public/nolo-og-card-zh.jpg");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 1200px;
      height: 630px;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: #071018;
    }
    .card {
      width: 1200px;
      height: 630px;
      position: relative;
      overflow: hidden;
      color: #1f2329;
      background: #fff;
    }
    .card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 62% 48% at 50% 18%, rgba(22, 119, 255, 0.12), transparent 72%);
    }
    .card::after {
      content: "";
      position: absolute;
      width: 48px;
      height: 48px;
      top: 76px;
      right: 150px;
      border-radius: 50%;
      background: #fa8c16;
      box-shadow: 0 0 0 4px rgba(250, 173, 20, 0.08);
    }
    .inner {
      position: absolute;
      inset: 0;
      z-index: 1;
      padding: 54px 64px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .mountains {
      position: absolute;
      z-index: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 300px;
      opacity: 0.9;
    }
    .mountain-back { fill: rgba(22, 119, 255, 0.035); stroke: rgba(22, 119, 255, 0.16); stroke-width: 2; }
    .mountain-main { fill: rgba(22, 119, 255, 0.08); stroke: rgba(22, 119, 255, 0.32); stroke-width: 2; }
    .tree { fill: none; stroke: rgba(54, 207, 201, 0.28); stroke-width: 1.2; }
    .horizon { stroke: rgba(22, 119, 255, 0.14); stroke-width: 1; }
    .brand {
      display: flex;
      align-items: center;
      gap: 18px;
      font-size: 34px;
      font-weight: 760;
      letter-spacing: 0;
    }
    .mark {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(31, 35, 41, 0.18);
      font-weight: 780;
    }
    .headline {
      max-width: 900px;
      font-size: 74px;
      line-height: 1.08;
      font-weight: 860;
      letter-spacing: 0;
    }
    .headline-line {
      display: block;
      white-space: nowrap;
    }
    .support {
      margin-top: 28px;
      font-size: 34px;
      line-height: 1.35;
      color: #5f6b7a;
      font-weight: 500;
    }
    .tags {
      display: flex;
      gap: 18px;
    }
    .tag {
      border: 1px solid rgba(248, 250, 252, 0.48);
      background: rgba(248, 250, 252, 0.1);
      border-radius: 999px;
      padding: 12px 22px;
      font-size: 24px;
      color: rgba(248, 250, 252, 0.88);
    }
  </style>
</head>
<body>
  <main class="card">
    <svg class="mountains" viewBox="0 0 1200 330" preserveAspectRatio="none" aria-hidden="true">
      <polygon class="mountain-back" points="0,330 270,130 530,330" />
      <polygon class="mountain-back" points="250,330 610,45 980,330" />
      <polygon class="mountain-main" points="390,330 720,82 1080,330" />
      <polygon class="mountain-main" points="720,82 850,190 1080,330" opacity="0.58" />
      <g class="tree">
        <path d="M1020 330V232M1020 245l-26 34h18l-24 35h64l-24-35h18z" />
        <path d="M1100 330V210M1100 224l-30 40h21l-27 39h72l-27-39h21z" />
        <path d="M1165 330V258M1165 270l-20 28h14l-18 27h48l-18-27h14z" />
      </g>
      <line class="horizon" x1="0" y1="329" x2="1200" y2="329" />
    </svg>
    <div class="inner">
      <div class="brand"><span class="mark">N</span><span>Nolo.Chat</span></div>
      <section>
        <div class="headline"><span class="headline-line">让 Nolo 认识你</span><span class="headline-line">记住你</span><span class="headline-line">和你一起创造</span></div>
        <div class="support">一个能长期协作的 AI 工作台</div>
      </section>
      <div class="tags"><span class="tag">认识</span><span class="tag">记忆</span><span class="tag">创造</span></div>
    </div>
  </main>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: outputPath, type: "jpeg", quality: 92, fullPage: false });
} finally {
  await browser.close();
}

const outputStat = await stat(outputPath);
console.log(`Generated ${outputPath} (${outputStat.size} bytes)`);
