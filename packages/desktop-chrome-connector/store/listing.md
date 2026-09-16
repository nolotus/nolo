# Chrome Web Store listing copy

> **Status: every claim below is shipped.** The irreversible-action gate landed in `e12f1595b`, so the
> wording describes *refusing* such an action and handing the step back to the user — not an approval
> prompt. Capability negotiation (protocol version plus a `features` list) ships in this same release.

Paste these strings into the Developer Dashboard. English is the primary listing;
add the Simplified Chinese translation as a second locale.

## Name (both locales)

```text
English:  Nolo Browser Connector
中文:      Nolo 浏览器连接器
```

The Chinese name must match `_locales/zh_CN/messages.json` (`extName`) so the store listing and the
extension name a Chinese user sees in `chrome://extensions` are the same string.

## Short description (max 132 characters)

```text
Let your Nolo desktop agent work in the Chrome you already use — locally, with no session handover.
```

Chinese:

```text
让你本机的 Nolo 智能体直接操作你正在使用的 Chrome，全程本地连接，无需交出登录状态。
```

## Category

```text
Tools
```

## Language

```text
English (primary), 中文（简体）(secondary)
```

## Detailed description (English)

```text
Your Nolo desktop agent works in the browser you already have open — no second browser, no MCP server, no cookie export.

This extension connects Chrome to the Nolo Desktop app on the same computer. The agent can then:

• Read a compact view of a page — visible text, interactive elements and a page revision — instead of dumping raw HTML
• Click and type through short-lived element references, so it does not guess CSS selectors
• Verify what actually happened: typed values are re-read, clicks are confirmed or reported as explicitly uncertain
• Read console and network output, deduplicated, filtered and capped before it reaches the model

It is built to stay out of your way:

• It works in its own tabs and leaves your browsing alone — it never takes over a tab you are using
• It refuses irreversible actions such as payment, send, delete, publish and permission changes, and hands those steps back to you
• It never reads cookies, passwords, profile databases or session stores
• It releases browser debugging when idle and closes the tabs it opened itself

Requirements

Nolo Desktop must be installed and running on the same computer, and the connector must be enabled in its settings. The extension has no standalone features — it exists to serve your local agent.

Privacy

Page content that your agent reads is sent to the Nolo Desktop app on 127.0.0.1, not to our servers by this extension. Anything the agent then shares with a model is controlled by the provider you configured in Nolo Desktop. The extension does not sell data and does not use it for advertising or creditworthiness.
```

## Detailed description (中文)

```text
让本机的 Nolo 智能体直接工作在你已经打开的浏览器里——不需要第二个浏览器，不需要 MCP 服务，也不需要交出 Cookie。

这个扩展把 Chrome 连接到同一台电脑上的 Nolo Desktop 应用。连接后，智能体可以：

• 读取页面的紧凑视图（可见文本、可交互元素、页面版本号），而不是把整页 HTML 塞进上下文
• 通过短期有效的元素引用点击和输入，不需要猜 CSS 选择器
• 验证动作是否真的生效：输入值会被回读，点击的结果要么被确认，要么明确标记为“不确定”
• 读取 console 与 network 输出，并做去重、过滤和条数上限

它的设计目标是尽量不打扰你：

• 它只在自己的标签页里工作，不会接管你正在使用的标签页
• 支付、发送、删除、发布、权限变更等不可逆操作会被拒绝执行，这些步骤交还给你自己完成
• 从不读取 Cookie、密码、profile 数据库或 session 存储
• 空闲时释放浏览器调试状态，并关闭它自己打开的标签页

使用前提

同一台电脑上必须安装并运行 Nolo Desktop，并在设置中启用连接器。扩展本身没有独立功能。

隐私

智能体读取的页面内容只会通过 127.0.0.1 发送给本机的 Nolo Desktop 应用，扩展不会把它发往我们的服务器。智能体随后与模型之间传输的内容，由你在 Nolo Desktop 中配置的 provider 决定。扩展不出售数据，也不用于广告或信用评估。
```

## Support and URLs

```text
Homepage:      https://nolo.chat
Support:       https://nolo.chat
Privacy policy: https://nolo.chat/privacy   (see privacy-policy.md for required additions)
```

## Assets

- Icon: `extension/icons/icon128.png` (the store also wants 16/32/48 in the package)
- Screenshots: `store/screenshots/01..03-*-1280x800.png`
- Small promo tile: `store/promo/small-tile-440x280.png`

## Listing risks to keep in mind

- **They can't demo it standalone.** The listing must say so plainly (it does above) and the toolbar
  popup must explain the same thing when Nolo Desktop is not connected, otherwise the "minimum
  functionality" review criterion can bite.
- The listing must not promise features we do not ship (no "automate any website", no "AI browsing agent").
- **Sensitive-action refusal is shipped** (commit `e12f1595b`) and verified live in the user's Chrome:
  a "Pay now" control is marked `sensitive: true` in the observation and refused pre-action with
  `SENSITIVE_ACTION_REQUIRES_CONFIRMATION`, leaving the page unchanged.
- Screenshot 03 says "Refuses irreversible actions … stay with you", matching the shipped behaviour.
