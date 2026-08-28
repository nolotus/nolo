const { chromium } = require("playwright");

function buildFakeToken(userId, username) {
  const payload = {
    userId,
    username,
    exp: 4102444800,
  };
  return `${Buffer.from(JSON.stringify(payload)).toString("base64")}.debug`;
}

(async () => {
  const options = JSON.parse(process.argv[2] || "{}");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: options.headless !== false,
  });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => {
    console.log(`[pageerror] ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      console.log(`[response:${response.status()}] ${response.request().method()} ${response.url()}`);
    }
  });

  if (options.authUser) {
    const fakeToken = buildFakeToken(options.authUser, options.authUsername || "debug-user");
    await page.addInitScript((token) => {
      localStorage.setItem("tokens", JSON.stringify([token]));
      localStorage.setItem("nolo-theme-mode", "light");
    }, fakeToken);
  }

  await page.goto(options.url, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(options.waitMs || 8000);

  const body = await page.locator("body").innerText().catch(() => "");
  const debugGlobals = Array.isArray(options.debugGlobals) && options.debugGlobals.length
    ? await page
        .evaluate((names) => {
          const result = {};
          for (const name of names) {
            result[name] = window[name] ?? null;
          }
          return result;
        }, options.debugGlobals)
        .catch((error) => ({ __error: String(error) }))
    : null;

  console.log(
    JSON.stringify(
      {
        url: page.url(),
        title: await page.title().catch(() => null),
        bodySnippet: body.slice(0, options.bodyChars || 2400),
        debugGlobals,
      },
      null,
      2
    )
  );

  await browser.close();
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
