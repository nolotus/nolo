# Firefox Add-ons (AMO) listing copy

> **Status: every claim below matches the shipped Firefox build** produced by
> `scripts/buildStorePackage.mjs --browser firefox`. The Firefox package disables the
> debugger-backed capabilities; this listing never mentions them as available. Gecko id:
> `nolo-browser-connector@nolo.chat` (kept in `extension/manifest.json` →
> `browser_specific_settings.gecko.id`, asserted at pack time by `extensionManifest.mjs`).

## Name (both locales)

```text
English:  Nolo Browser Connector
中文:      Nolo 浏览器连接器
```

## Short description (max 250 on AMO; keep under 132 for parity)

```text
Let your Nolo desktop agent work in the Firefox you already use — locally, with no session handover.
```

Chinese:

```text
让你本机的 Nolo 智能体直接操作你正在使用的 Firefox，全程本地连接，无需交出登录状态。
```

## Category

```text
Developer Tools   (secondary: Productivity)
```

## Detailed description (English)

```text
Your Nolo desktop agent works in the browser you already have open — no second browser, no MCP server, no cookie export.

This extension connects Firefox to the Nolo Desktop app on the same computer. The agent can then:

• Read a compact view of a page — visible text, interactive elements and a page revision — instead of dumping raw HTML
• Click and type through short-lived element references, so it does not guess CSS selectors
• Verify what actually happened: typed values are re-read, clicks are confirmed or reported as explicitly uncertain
• Capture a screenshot of the visible tab

It is built to stay out of your way:

• It works in its own tabs and leaves your browsing alone — it never takes over a tab you are using
• It refuses irreversible actions such as payment, send, delete, publish and permission changes, and hands those steps back to you
• It never reads cookies, passwords, profile databases or session stores
• It closes the tabs it opened itself

Firefox capability note

This Firefox build does not include the Chrome-only debugger features: console and network capture, trusted-coordinate mouse clicks, and programmatic file-input assignment. Those actions return an explicit UNSUPPORTED_ON_FIREFOX signal to the desktop app instead of failing silently. Screenshots cover the visible tab (Firefox does not expose full-page capture to extensions).

Requirements

Nolo Desktop must be installed and running on the same computer, and the connector must be enabled in its settings. The extension has no standalone features — it exists to serve your local agent.

Privacy

Page content that your agent reads is sent to the Nolo Desktop app on 127.0.0.1, not to our servers by this extension. Anything the agent then shares with a model is controlled by the provider you configured in Nolo Desktop. The extension does not sell data and does not use it for advertising or creditworthiness.
```

## Detailed description (中文)

```text
让本机的 Nolo 智能体直接工作在你已经打开的 Firefox 里——不需要第二个浏览器，不需要 MCP 服务，也不需要交出 Cookie。

这个扩展把 Firefox 连接到同一台电脑上的 Nolo Desktop 应用。连接后，智能体可以：

• 读取页面的紧凑视图（可见文本、可交互元素、页面版本号），而不是把整页 HTML 塞进上下文
• 通过短生命周期元素引用进行点击和输入，不猜测 CSS 选择器
• 校验真实发生的动作：输入值会被回读，点击结果要么确认、要么明确标记为不确定
• 截取当前可见标签页的截图

它尽量不打扰你：

• 只在自己打开的标签页里工作，不接管你正在使用的标签页
• 对支付、发送、删除、发布、权限变更等不可逆操作直接拒绝，把步骤交还给你
• 不读取 Cookie、密码、浏览器资料库或会话存储
• 会关闭它自己打开的标签页

Firefox 能力说明

Firefox 版不包含仅 Chrome 支持的调试器能力：控制台与网络抓取、坐标级鼠标点击、程序化文件上传。调用这些能力会返回明确的 UNSUPPORTED_ON_FIREFOX 信号，而不是静默失败。截图仅覆盖可见标签页（Firefox 不向扩展提供整页截图）。

使用前提

同一台电脑上必须安装并运行 Nolo Desktop，并在设置中启用连接器。扩展本身没有独立功能。

隐私

智能体读取的页面内容只会通过 127.0.0.1 发送给本机的 Nolo Desktop 应用，扩展不会把它发往我们的服务器。智能体随后与模型之间传输的内容，由你在 Nolo Desktop 中配置的 provider 决定。扩展不出售数据，也不用于广告或信用评估。
```

## Support and URLs

```text
Homepage:       https://nolo.chat
Support:        https://nolo.chat
Privacy policy: https://nolo.chat/privacy
```

## Assets

- Icon: `extension/icons/icon128.png`
- Screenshots: reuse `store/screenshots/01..03-*-1280x800.png` (Chrome chrome visible in shots is a
  known cosmetic gap for AMO; regenerate on Firefox if the reviewer calls it out)
- No promo tile needed on AMO.
