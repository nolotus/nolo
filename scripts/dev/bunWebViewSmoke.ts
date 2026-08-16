type CliOptions = {
  url?: string;
};

type SmokeResult = {
  title: string;
  inputValue: string;
  clickCount: string;
  screenshotBytes: number;
  url: string;
};

const DEFAULT_TIMEOUT_MS = 8000;

function parseArgs(argv: string[]): CliOptions {
  const [, , ...args] = argv;
  const url = args.find((value) => !value.startsWith("-"));
  return { url };
}

function createSelfTestHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bun.WebView Smoke</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, system-ui, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(255, 220, 120, 0.35), transparent 40%),
          linear-gradient(135deg, #f7f1e3, #e8f3ff 60%, #eef8eb);
      }
      main {
        width: min(92vw, 680px);
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 24px 80px rgba(46, 63, 87, 0.18);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 2rem;
      }
      p {
        margin: 0 0 20px;
        color: #425466;
      }
      .row {
        display: flex;
        gap: 12px;
      }
      input, button {
        font: inherit;
      }
      input {
        flex: 1;
        padding: 12px 14px;
        border: 1px solid #c7d4e5;
        border-radius: 14px;
      }
      button {
        padding: 12px 18px;
        border: 0;
        border-radius: 14px;
        background: #0f766e;
        color: white;
        cursor: pointer;
      }
      #result {
        margin-top: 18px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Bun.WebView Smoke</h1>
      <p>Type into the field and click the button. The page should update synchronously.</p>
      <div class="row">
        <input id="name-input" placeholder="Your name" />
        <button id="submit" type="button">Submit</button>
      </div>
      <div id="result">pending</div>
    </main>
    <script>
      let clickCount = 0;
      const input = document.querySelector("#name-input");
      const result = document.querySelector("#result");
      document.querySelector("#submit").addEventListener("click", () => {
        clickCount += 1;
        result.textContent = input.value + ":" + clickCount;
      });
    </script>
  </body>
</html>`;
}

function createSelfTestUrl() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(createSelfTestHtml())}`;
}

async function withTimeout<T>(
  label: string,
  task: Promise<T>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return await Promise.race([
    task,
    Bun.sleep(timeoutMs).then(() => {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }),
  ]);
}

async function runSelfTest(url: string): Promise<SmokeResult> {
  await using view = new Bun.WebView({
    width: 960,
    height: 720,
  });

  await withTimeout("navigate", view.navigate(url));
  await withTimeout("click input", view.click("#name-input"));
  await withTimeout("type", view.type("Nolo"));
  await withTimeout("click submit", view.click("#submit"));

  const state = await withTimeout("evaluate", view.evaluate(`JSON.stringify({
    title: document.title,
    inputValue: document.querySelector("#name-input")?.value ?? "",
    clickCount: document.querySelector("#result")?.textContent ?? ""
  })`));
  if (typeof state !== "string") {
    throw new Error("evaluate did not return a string");
  }
  const parsed = JSON.parse(state) as Omit<SmokeResult, "screenshotBytes" | "url">;
  const screenshot = await withTimeout("screenshot", view.screenshot({ format: "png" }));

  if (parsed.title !== "Bun.WebView Smoke") {
    throw new Error(`Unexpected title: ${parsed.title}`);
  }

  if (parsed.inputValue !== "Nolo") {
    throw new Error(`Unexpected input value: ${parsed.inputValue}`);
  }

  if (parsed.clickCount !== "Nolo:1") {
    throw new Error(`Unexpected result text: ${parsed.clickCount}`);
  }

  if (screenshot.size === 0) {
    throw new Error("Screenshot generation returned 0 bytes");
  }

  return {
    ...parsed,
    screenshotBytes: screenshot.size,
    url: "self-test:data-url",
  };
}

async function runExternalUrl(url: string): Promise<SmokeResult> {
  await using view = new Bun.WebView({
    width: 1280,
    height: 800,
  });

  await withTimeout("navigate", view.navigate(url));
  const title = await withTimeout("evaluate", view.evaluate("document.title"));
  if (typeof title !== "string") {
    throw new Error("evaluate did not return a string for document.title");
  }
  const screenshot = await withTimeout("screenshot", view.screenshot({ format: "png" }));

  return {
    title,
    inputValue: "",
    clickCount: "",
    screenshotBytes: screenshot.size,
    url,
  };
}

const options = parseArgs(process.argv);

if (options.url) {
  const result = await runExternalUrl(options.url);
  console.log(JSON.stringify(result, null, 2));
} else {
  const result = await runSelfTest(createSelfTestUrl());
  console.log(JSON.stringify(result, null, 2));
}
