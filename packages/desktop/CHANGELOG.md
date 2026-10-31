
## 0.217.0-alpha.1 (2026-10-31)

### Features

* **skills:** 账号可选 Skill 目录与启停卡片 ([e0d3cbd](https://github.com/nolotus/bun-nolo/commit/e0d3cbd8ba5abab9de06f2d04de2a9b8cabe2298))


## 0.216.0-alpha.5 (2026-10-31)

### Bug Fixes

* **ai:** listAgents 并入本地 429 冷却，不再显示偏乐观的可用性 ([a9cf848](https://github.com/nolotus/bun-nolo/commit/a9cf84801ac4f62c7aa59df56fbae0b0a0f0b109))
* **ai:** listAgents 的本地冷却读取改为动态 import，避免污染浏览器包 ([df0f017](https://github.com/nolotus/bun-nolo/commit/df0f0178511899edf84676604dfc7d894f6f0376))


## 0.216.0-alpha.4 (2026-10-31)

### Bug Fixes

* **agent:** 创建/更新由显式 mode + 身份共同决定，杜绝创建误更新旧 agent ([d664507](https://github.com/nolotus/bun-nolo/commit/d6645077b7066ae76fe511d6aa7968228fb22bad))


## 0.216.0-alpha.3 (2026-10-31)

### Bug Fixes

* **app:** 存储受限时不再跳过整套主题变量生成 ([faba891](https://github.com/nolotus/bun-nolo/commit/faba891b87c685ffd83b1ebc56192b513ed1c191))


## 0.216.0-alpha.2 (2026-10-31)

### Bug Fixes

* **agent:** 编辑保存前端：dirty-only payload 与失败可见 ([2698df2](https://github.com/nolotus/bun-nolo/commit/2698df20ccb49e6440aa40595c30a10c6f218458))


## 0.216.0-alpha.1 (2026-10-31)

### Features

* **skills:** add recommended ub-mode with account enablement ([4cc47ea](https://github.com/nolotus/bun-nolo/commit/4cc47ea4c7a0644afb105ff7c0099c5898745e16))


## 0.215.0-alpha.3 (2026-10-31)

### Bug Fixes

* **app:** 首屏补 5 个圆角 token 静态兜底 ([9b326db](https://github.com/nolotus/bun-nolo/commit/9b326dbbe62adfdd75fab58a79fa4288cfe8e3e4))


## 0.215.0-alpha.2 (2026-10-31)

### Bug Fixes

* **agent:** 编辑保存以服务端权威记录为准，失败不再静默 ([3a743d8](https://github.com/nolotus/bun-nolo/commit/3a743d83facb2ab9c6b63dc7410a20d1c12f01e3))


## 0.215.0-alpha.1 (2026-10-31)

### Features

* **desktop:** Electrobun 升到 2.0.4（hutch 0.28.1） ([154cb02](https://github.com/nolotus/bun-nolo/commit/154cb0217d6cf4f647959c6988a8705075ecf9e8))

### Bug Fixes

* **desktop:** Linux 载荷重打包改用 USTAR，并加路径字节上限闸门 ([8fe620f](https://github.com/nolotus/bun-nolo/commit/8fe620fd61c9ce92b381d9e6ff55c753581499c5))


## 0.214.0-alpha.2 (2026-10-31)

### Bug Fixes

* **web:** 下载客户端入口样式补齐圆角 token，去掉 px 回退 ([25abecc](https://github.com/nolotus/bun-nolo/commit/25abeccd9477663d2c3fae703c8d27a476e7b0c2))


## 0.214.0-alpha.1 (2026-10-31)

### Features

* **web:** 将下载客户端入口从头像菜单移到首页 quick-chat 下方 ([da72e58](https://github.com/nolotus/bun-nolo/commit/da72e5896bfa2b0aab718de3c32781b136783e6c))

### Bug Fixes

* **server:** 下载兜底 302 + 审计改真取字节 ([c45f7be](https://github.com/nolotus/bun-nolo/commit/c45f7be9331fb2587aaa9ebd0b14bb66e34fece2))


## 0.213.0-alpha.1 (2026-10-31)

### Features

* **ai:** 派发对象不默认是自身，候选池扫描前置 ([0705709](https://github.com/nolotus/bun-nolo/commit/0705709949cfb8b0552690ae0aa9ef911b2a97b9))


## 0.212.0-alpha.1 (2026-10-31)

### Features

* **chat:** let quick chat pick a remote machine as its runtime ([a80dd95](https://github.com/nolotus/bun-nolo/commit/a80dd95aead6749704481909d6982abe52a933bf))
* **cli:** 审批待决时额外输出一行可 grep 的 approvalId ([565a31a](https://github.com/nolotus/bun-nolo/commit/565a31a1ff7971d5ba1ef1318dfa94d04180ab40))
* **navigation:** add rail create-app templates and smooth sidebar toggle ([376c02e](https://github.com/nolotus/bun-nolo/commit/376c02e5beadd587e2be4e1c05edbbcf5e0c8cce))
* **navigation:** temporarily hide unready runtime picker and new app menu ([08cbc38](https://github.com/nolotus/bun-nolo/commit/08cbc38b5a2abed6de1da8e01e938b79634df73f))

### Bug Fixes

* **agent:** qualify completion claims with scoped evidence ([c947c8a](https://github.com/nolotus/bun-nolo/commit/c947c8a930bbc67e5146b66a7fb39ade8f63def0))
* **ai:** identify MiniMax quota exhausted response and persist state ([66fce89](https://github.com/nolotus/bun-nolo/commit/66fce89fa692f6b80390ff9e91ba257292458dd4))
* **chat:** only write runtimeBinding when machine is explicitly chosen ([208df08](https://github.com/nolotus/bun-nolo/commit/208df089d3a8405c3bd967e6aa107bde13829c2a))
* **chat:** preserve client response wire across upstream fallback ([db1c1aa](https://github.com/nolotus/bun-nolo/commit/db1c1aab7dc59266c4394193e901376d4dcaabeb))
* **cli:** copy provider fields completely and establish anti-slop guidelines ([d3e0e6a](https://github.com/nolotus/bun-nolo/commit/d3e0e6ae2457afd70508b8a9995abf4601e9ce3b))
* **llm:** prefer official DeepSeek for default Flash routing ([95c8690](https://github.com/nolotus/bun-nolo/commit/95c8690af0aaccf1a9c7f8d7d64905b4a7f0457f))
* **navigation:** commit sidebar width even when animation frames are suspended ([0d30196](https://github.com/nolotus/bun-nolo/commit/0d301963ab6d0a29e7b05c74b59ea45049e81913))
* **navigation:** drop the surf template from the create menu ([5d6c0be](https://github.com/nolotus/bun-nolo/commit/5d6c0be728fab8c8e67c7426bfc8e0bf879dcf89))
* **navigation:** simplify rail account menu ([3676141](https://github.com/nolotus/bun-nolo/commit/367614194ec190da32723207a1c31fe84d516f51))
* **navigation:** simplify rail active state to icon surface ([f2661ba](https://github.com/nolotus/bun-nolo/commit/f2661ba6e9f0f5ef2ee30b0453b88afa001d6ae4))
* **navigation:** simplify rail creation menu spacing ([0ded656](https://github.com/nolotus/bun-nolo/commit/0ded656afd7b180d402fe48f523eb598ca7f5acf))
* **navigation:** 收窄 rail 并简化收藏文案 ([20fedbd](https://github.com/nolotus/bun-nolo/commit/20fedbd90deeea1f10c2fea2378ff990234dcfff))
* **routing:** isolate background page location from settings overlay ([90a3805](https://github.com/nolotus/bun-nolo/commit/90a38057270acf1c2198e61f72fa7c0d7565ef87))


## 0.204.0 (2026-10-29)

### Features

* **agent-runtime:** 6 个执行档位定义与逐档断言 ([d091317](https://github.com/nolotus/bun-nolo/commit/d0913178813dbb841d53e12bd5e9fef3154a792e))
* **agent-runtime:** execShell 接 bwrap 沙盒（fail-closed + 遮蔽 + 同形探测） ([d585e38](https://github.com/nolotus/bun-nolo/commit/d585e3899b127d167d780404ac217203d5b4606a))
* **agent-runtime:** 工作区文件工具 realpath 边界（防符号链接逃逸） ([81e42d9](https://github.com/nolotus/bun-nolo/commit/81e42d9d097ba96aeeba7c9e0f06c80fa8a5038c))
* **agent-runtime:** 执行端点契约 + 能力标注 ([bd4176a](https://github.com/nolotus/bun-nolo/commit/bd4176ac1483d459f1fb7ef7f968a232daf8eb95))
* **agent-runtime:** 观测事件队列增加字节上限（默认 2MB） ([c66ecaa](https://github.com/nolotus/bun-nolo/commit/c66ecaa761081a78be349376545babd69e2ff880))
* **agent-runtime:** 隔离硬约束——executionPolicy + 来源可信度 ([030bc35](https://github.com/nolotus/bun-nolo/commit/030bc355fb0fd67609e274bfa9604043707d19f7))
* **exec-policy:** 把沙盒策略接进真实执行入口，拒绝出口不再泄露宿主路径 ([474d99f](https://github.com/nolotus/bun-nolo/commit/474d99f08933657c28f1d9b77954e227b1e27f4a))
* **skills:** 统一技能目录契约 + 可注入来源适配器 ([00e6554](https://github.com/nolotus/bun-nolo/commit/00e6554bd5558fa2b2b5246d494629e3facca21b))
* **skills:** 统一技能目录契约 + 可注入来源适配器 ([2562f9c](https://github.com/nolotus/bun-nolo/commit/2562f9ceb4c6a22766fe87e1e91c53bf9022a8e4))

### Bug Fixes

* **agent-runtime:** 工具输出控制序列清洗（终端注入防护） ([1e2b90a](https://github.com/nolotus/bun-nolo/commit/1e2b90a7ffad5b12475c2b3e7435816c8d24c3c2))
* **chat:** 缺失详情的收藏项用类型图标与标签，不再像空壳 ([52fa5c3](https://github.com/nolotus/bun-nolo/commit/52fa5c3f074fc1c0bedd1f885531bdf3550d4364))
* **cli:** macOS 无沙盒后端不再静默；instabox 归入容器隔离分支 ([24d6e06](https://github.com/nolotus/bun-nolo/commit/24d6e061509cd9c325f8a87f8bf520527b9893e9))
* **quota:** 让位合并保留 resetAt、补写保留并发 plan、修正 import 顺序 ([5a78aa8](https://github.com/nolotus/bun-nolo/commit/5a78aa84e8beb440d3f704e2c72efb31ee0b5ba2))


## 0.203.0 (2026-10-28)

### Features

* **agent-runtime:** Gemini 原生通道注入工具图片 ([4ee3c55](https://github.com/nolotus/bun-nolo/commit/4ee3c55610d165b03a8aeff98e50e41b4818a0b9))
* **agent-runtime:** OpenAI Chat Completions 通道注入工具图片（B1） ([4ed5d49](https://github.com/nolotus/bun-nolo/commit/4ed5d49125f29765c5c2e0e56c0854e6941a3f02))
* **agent-runtime:** read_image 一次多张（≤4）+ 摘要统一为结构化 formatter ([74bb152](https://github.com/nolotus/bun-nolo/commit/74bb1525bc9985889a61020d126eb2f57e8e8d84))
* **agent-runtime:** Responses/codex 通道注入工具图片（原生 output 数组） ([24fb17a](https://github.com/nolotus/bun-nolo/commit/24fb17adf50b7c4bf61243ac3cc184aacc7ad94c))
* **agent-runtime:** Responses/codex 通道注入工具图片（原生 output 数组） ([0684318](https://github.com/nolotus/bun-nolo/commit/06843180c43c0e2d65573225d963034afab417f5))
* **agent-runtime:** 宿主窗口捕获（xdg-desktop-portal）→ 图片（**需显式声明**） ([54c82dc](https://github.com/nolotus/bun-nolo/commit/54c82dc4a6697e482567d80ab0c85471feab2e67))
* **agent-runtime:** 工具结果可携带图片（切片1：Anthropic 通道 + read_image + 护栏） ([dd6d6a6](https://github.com/nolotus/bun-nolo/commit/dd6d6a6b9b45f9724f23f27ff23cc62f1609e038))
* **agent-runtime:** 页面无头渲染 → 图片（替代用户工作区脚本） ([821e619](https://github.com/nolotus/bun-nolo/commit/821e6192e8c7a30c9fd53afed73748b64081a663))
* **browser-connector:** ask the user before irreversible actions ([3588386](https://github.com/nolotus/bun-nolo/commit/35883864b1b4a05088a083a7a10cd4ade47fdeda))
* **browser-connector:** set native select values with readback verification ([a2e5a0a](https://github.com/nolotus/bun-nolo/commit/a2e5a0a89073a1b9cc361c87a5117247bef0edf6))
* **browser-connector:** show the approved option, not the raw value ([3099955](https://github.com/nolotus/bun-nolo/commit/3099955da7630a488d6412af15adf486f44952fb))
* **browser-connector:** show the target site in the approval window ([11ac07c](https://github.com/nolotus/bun-nolo/commit/11ac07c8551cca9f985e18fc3bd05b94c9e085d6))
* **browser-connector:** 标签页执行脚本（eval）与对话内审批 ([28b96c2](https://github.com/nolotus/bun-nolo/commit/28b96c296e1bafaaed61a55ccf5ca66990716e6f))
* **capabilities:** 每通道每请求图片上限 + 超限截断补投 ([bf3e586](https://github.com/nolotus/bun-nolo/commit/bf3e5868ca457e83f0fb82e4c99a391ef141fda6))
* **cli:** help 本地化收尾 + 修英文提示写成中文 + 加固 i18n 守卫 ([1daaa07](https://github.com/nolotus/bun-nolo/commit/1daaa07c329e06ad51cbf2bf3c9993ff62571c2c))
* **cli:** 修英文词条残留中文，抽离高频命令报错到 i18n ([edc95e0](https://github.com/nolotus/bun-nolo/commit/edc95e0332621fec12596356ec1c8ec5e83c003e))
* **cli:** 补齐全部子命令的中文描述并加覆盖率门 ([d3775d7](https://github.com/nolotus/bun-nolo/commit/d3775d7a42f287f7876be55aa1ec07c320525e3a))
* **cli:** 输出统一接入 i18n（zh/en），词条拆域 + 修 update 只读缺口 ([5abaf44](https://github.com/nolotus/bun-nolo/commit/5abaf44a5bb2439206ceb13139be6a48c6a26b2b))
* **connector:** reach same-origin child frames for actions and consent capture ([f7c7463](https://github.com/nolotus/bun-nolo/commit/f7c74635e9eeaa33a9f049645bdd280775c7b774))
* **connector:** 截图工具结果携带图片，模型无需再手动 read_image ([4b11b3c](https://github.com/nolotus/bun-nolo/commit/4b11b3c3ccfbefc093971506bf6813cfd270f104))
* **llm:** deepseek-flash 默认改走 LithosAI，失效回落官方 ([7bc15cd](https://github.com/nolotus/bun-nolo/commit/7bc15cd21727182c01d108eb2a0fab1206147465))
* **token:** usage records 支持按 dialogId 查询 + 补跨用户隔离 ([06220e0](https://github.com/nolotus/bun-nolo/commit/06220e07679cb8857e0e1813f4d22a364640203e))
* **token:** 非流式调用记录 canonical timing + CLI 查对话速度 ([679c48b](https://github.com/nolotus/bun-nolo/commit/679c48ba515118a20826ec1079a9a29bb2175fbd))

### Bug Fixes

* **agent-runtime:** read_image 宽容合并 path/paths，schema 去掉参数级组合子 ([df8a578](https://github.com/nolotus/bun-nolo/commit/df8a57872b3b189c2cc5346ac34002b620930e58))
* **agent-runtime:** 去掉 toolImages/openAiToolImages 的 node:crypto（web bundle 可达） ([f432f19](https://github.com/nolotus/bun-nolo/commit/f432f190d3eb0af4bcf17921970d5fc2b2bc48dc))
* **agent-runtime:** 渲染器缺参 fail fast，不再静默等到超时 ([a86691e](https://github.com/nolotus/bun-nolo/commit/a86691ee2052ef105c5306128102cffc16f9276f))
* **agent-runtime:** 让 agent 声明的 hasVision 真正到达运行时 + 图片归属标签 ([82c1fe4](https://github.com/nolotus/bun-nolo/commit/82c1fe4a8d413c8039053fbdbfddb32ed878ed62))
* **agent-runtime:** 评测语料 FLAG 与文件名解耦（防答案泄露） ([24880df](https://github.com/nolotus/bun-nolo/commit/24880dfc071676334a3dded8b686815dc6fca78a))
* **agent-runtime:** 超预算图片只记已投递，未投递可续取且不破坏前缀 ([7b4e8e9](https://github.com/nolotus/bun-nolo/commit/7b4e8e9c7564ce5d63a7804a67333d79d2c7be0c))
* **browser-connector:** carry approvalId through select, align merged state ([70a2978](https://github.com/nolotus/bun-nolo/commit/70a29787c680c931f5affae3cf96e8671f862253))
* **browser-connector:** prove select identity by node reference, not attributes ([09d743b](https://github.com/nolotus/bun-nolo/commit/09d743b3e3471b56895b750ebb298276ccfbb346))
* **browser-connector:** 审批弹窗放大到 820×680，并补页面滚动兜底 ([b34fc51](https://github.com/nolotus/bun-nolo/commit/b34fc51aeb74ce236d49b1f9bc5707dcd4615f06))
* **capabilities:** antigravity 每请求上限 3→4（原值源自单次观测，已证伪） ([ce24515](https://github.com/nolotus/bun-nolo/commit/ce245156cbcf451bb8bf172979bd3b78b86325f3))
* **capabilities:** 撤销 antigravity 路由禁图（实测可用，此前结论基于旧代码） ([32ed1f3](https://github.com/nolotus/bun-nolo/commit/32ed1f33bead23ad5560bab41c255fde0b5eaded))
* **chat:** 侧边栏补回收藏分区，收藏项不再从列表消失 ([de67868](https://github.com/nolotus/bun-nolo/commit/de6786890e47bafb6f19bb80ac42208ab5879ac2))
* **chat:** 收藏分区与最近列表左对齐 ([ed5ad07](https://github.com/nolotus/bun-nolo/commit/ed5ad07ff6338a5a5cab1a5ba9e13bab97bf2ef9))
* **chat:** 窗口外收藏改用类型标签，不再显示「未命名」 ([ee4867e](https://github.com/nolotus/bun-nolo/commit/ee4867e2ee3fb300de78e8c0636861bcc618ef0a))
* **cli:** make the machine connector single-instance and observable ([4ecebd0](https://github.com/nolotus/bun-nolo/commit/4ecebd03a6688e880f0a09cc6c9ccd673731b065))
* **cli:** 补 eval 的命令描述，覆盖率门改读定义源 ([10c077c](https://github.com/nolotus/bun-nolo/commit/10c077ca1940a39e8df93223d2b88879de74d439))
* **connector:** normalize labels and match Latin verbs as tokens ([a953239](https://github.com/nolotus/bun-nolo/commit/a953239d8aeb640ea30c955605f8ebfdf65eb131))
* **connector:** release completed-state labels instead of asking to confirm them ([c6a033b](https://github.com/nolotus/bun-nolo/commit/c6a033b86234e8a7aba6739e651a197f26cfb384))
* **connector:** see through characters that hide a verb from the action gate ([084bb6a](https://github.com/nolotus/bun-nolo/commit/084bb6ab9377dca726cce7b9fea104be40a4d5ce))
* **connector:** 截图摘要统一为 [screenshot WxH NKB → path]，归属标签可提取路径 ([f9245df](https://github.com/nolotus/bun-nolo/commit/f9245df9d85aaaad20376b9f01f57cf033241974))
* **prepush:** 护栏失败文案不再把非零退出一律归因为依赖污染 ([2beebb6](https://github.com/nolotus/bun-nolo/commit/2beebb6cc896eb8139a171a9d3124fb146578255))
* **quota:** 订阅窗口合并改为最新读数为准，修正面板与官方显示不一致 ([6ff93f5](https://github.com/nolotus/bun-nolo/commit/6ff93f564f2b7e04f29a852fa879a58a7443e333))
* **tools:** read_image 真正进入请求面，并按后端可执行能力过滤 ([3287ad4](https://github.com/nolotus/bun-nolo/commit/3287ad46ad7e3682bf9a083ae8d124d97fea5545))

### Performance Improvements

* **prepush:** web bundle 护栏改走独立入口，不再经 test:heavy ([a857824](https://github.com/nolotus/bun-nolo/commit/a857824ea02e0b7f2c89b78450def35345409fb4))


## 0.202.0-alpha.5 (2026-10-28)

### Bug Fixes

* **chat:** 窗口外收藏改用类型标签，不再显示「未命名」 ([ee4867e](https://github.com/nolotus/bun-nolo/commit/ee4867e2ee3fb300de78e8c0636861bcc618ef0a))
* **prepush:** 护栏失败文案不再把非零退出一律归因为依赖污染 ([2beebb6](https://github.com/nolotus/bun-nolo/commit/2beebb6cc896eb8139a171a9d3124fb146578255))


## 0.202.0-alpha.4 (2026-10-28)

### Bug Fixes

* **quota:** 订阅窗口合并改为最新读数为准，修正面板与官方显示不一致 ([6ff93f5](https://github.com/nolotus/bun-nolo/commit/6ff93f564f2b7e04f29a852fa879a58a7443e333))


## 0.202.0-alpha.3 (2026-10-28)

### Bug Fixes

* **connector:** normalize labels and match Latin verbs as tokens ([a953239](https://github.com/nolotus/bun-nolo/commit/a953239d8aeb640ea30c955605f8ebfdf65eb131))


## 0.202.0-alpha.2 (2026-10-28)

### Bug Fixes

* **browser-connector:** 审批弹窗放大到 820×680，并补页面滚动兜底 ([b34fc51](https://github.com/nolotus/bun-nolo/commit/b34fc51aeb74ce236d49b1f9bc5707dcd4615f06))
* **chat:** 收藏分区与最近列表左对齐 ([ed5ad07](https://github.com/nolotus/bun-nolo/commit/ed5ad07ff6338a5a5cab1a5ba9e13bab97bf2ef9))
* **cli:** 补 eval 的命令描述，覆盖率门改读定义源 ([10c077c](https://github.com/nolotus/bun-nolo/commit/10c077ca1940a39e8df93223d2b88879de74d439))

### Performance Improvements

* **prepush:** web bundle 护栏改走独立入口，不再经 test:heavy ([a857824](https://github.com/nolotus/bun-nolo/commit/a857824ea02e0b7f2c89b78450def35345409fb4))


## 0.202.0-alpha.1 (2026-10-28)

### Features

* **browser-connector:** 标签页执行脚本（eval）与对话内审批 ([28b96c2](https://github.com/nolotus/bun-nolo/commit/28b96c296e1bafaaed61a55ccf5ca66990716e6f))
* **cli:** 补齐全部子命令的中文描述并加覆盖率门 ([d3775d7](https://github.com/nolotus/bun-nolo/commit/d3775d7a42f287f7876be55aa1ec07c320525e3a))

### Bug Fixes

* **chat:** 侧边栏补回收藏分区，收藏项不再从列表消失 ([de67868](https://github.com/nolotus/bun-nolo/commit/de6786890e47bafb6f19bb80ac42208ab5879ac2))


## 0.201.0-alpha.1 (2026-10-28)

### Features

* **cli:** 修英文词条残留中文，抽离高频命令报错到 i18n ([edc95e0](https://github.com/nolotus/bun-nolo/commit/edc95e0332621fec12596356ec1c8ec5e83c003e))

### Bug Fixes

* **connector:** see through characters that hide a verb from the action gate ([084bb6a](https://github.com/nolotus/bun-nolo/commit/084bb6ab9377dca726cce7b9fea104be40a4d5ce))


## 0.200.0-alpha.2 (2026-10-28)

### Bug Fixes

* **connector:** release completed-state labels instead of asking to confirm them ([c6a033b](https://github.com/nolotus/bun-nolo/commit/c6a033b86234e8a7aba6739e651a197f26cfb384))


## 0.200.0-alpha.1 (2026-10-27)

### Features

* **connector:** reach same-origin child frames for actions and consent capture ([f7c7463](https://github.com/nolotus/bun-nolo/commit/f7c74635e9eeaa33a9f049645bdd280775c7b774))
* **token:** usage records 支持按 dialogId 查询 + 补跨用户隔离 ([06220e0](https://github.com/nolotus/bun-nolo/commit/06220e07679cb8857e0e1813f4d22a364640203e))
* **token:** 非流式调用记录 canonical timing + CLI 查对话速度 ([679c48b](https://github.com/nolotus/bun-nolo/commit/679c48ba515118a20826ec1079a9a29bb2175fbd))


## 0.199.0-alpha.1 (2026-10-27)

### Features

* **browser-connector:** show the approved option, not the raw value ([3099955](https://github.com/nolotus/bun-nolo/commit/3099955da7630a488d6412af15adf486f44952fb))
* **browser-connector:** show the target site in the approval window ([11ac07c](https://github.com/nolotus/bun-nolo/commit/11ac07c8551cca9f985e18fc3bd05b94c9e085d6))


## 0.198.0-alpha.1 (2026-10-27)

### Features

* **cli:** help 本地化收尾 + 修英文提示写成中文 + 加固 i18n 守卫 ([1daaa07](https://github.com/nolotus/bun-nolo/commit/1daaa07c329e06ad51cbf2bf3c9993ff62571c2c))
* **cli:** 输出统一接入 i18n（zh/en），词条拆域 + 修 update 只读缺口 ([5abaf44](https://github.com/nolotus/bun-nolo/commit/5abaf44a5bb2439206ceb13139be6a48c6a26b2b))


## 0.197.0-alpha.3 (2026-10-27)

### Bug Fixes

* **browser-connector:** prove select identity by node reference, not attributes ([09d743b](https://github.com/nolotus/bun-nolo/commit/09d743b3e3471b56895b750ebb298276ccfbb346))


## 0.197.0-alpha.2 (2026-10-27)

### Bug Fixes

* **cli:** make the machine connector single-instance and observable ([4ecebd0](https://github.com/nolotus/bun-nolo/commit/4ecebd03a6688e880f0a09cc6c9ccd673731b065))


## 0.197.0-alpha.1 (2026-10-27)

### Features

* **browser-connector:** ask the user before irreversible actions ([3588386](https://github.com/nolotus/bun-nolo/commit/35883864b1b4a05088a083a7a10cd4ade47fdeda))
* **browser-connector:** set native select values with readback verification ([a2e5a0a](https://github.com/nolotus/bun-nolo/commit/a2e5a0a89073a1b9cc361c87a5117247bef0edf6))

### Bug Fixes

* **browser-connector:** carry approvalId through select, align merged state ([70a2978](https://github.com/nolotus/bun-nolo/commit/70a29787c680c931f5affae3cf96e8671f862253))


## 0.196.0-alpha.1 (2026-10-27)

### Features

* **cli:** 更新可感知——文案修正 + 完成通知 + 版本变化提示 ([7fb82c8](https://github.com/nolotus/bun-nolo/commit/7fb82c8e12493ec289e3e66802d4ee1b98908136))

### Bug Fixes

* **cli:** Windows 自更新不再阻塞启动，删除等待进程与状态机 ([d20a762](https://github.com/nolotus/bun-nolo/commit/d20a762ebdddb8e099c0bc274d94e2f4e62e012b))

### Performance Improvements

* **deploy:** 预构建与部署门测试并行 + 测试不再写仓库产物路径 ([df839e2](https://github.com/nolotus/bun-nolo/commit/df839e27d1e80560149deec8a4131a6aeb05d7c4))


## 0.195.0-alpha.2 (2026-10-27)

### Bug Fixes

* **capabilities:** antigravity 每请求上限 3→4（原值源自单次观测，已证伪） ([ce24515](https://github.com/nolotus/bun-nolo/commit/ce245156cbcf451bb8bf172979bd3b78b86325f3))


## 0.195.0-alpha.1 (2026-10-27)

### Features

* **capabilities:** 每通道每请求图片上限 + 超限截断补投 ([bf3e586](https://github.com/nolotus/bun-nolo/commit/bf3e5868ca457e83f0fb82e4c99a391ef141fda6))


## 0.194.0-alpha.3 (2026-10-27)

### Bug Fixes

* **agent-runtime:** 渲染器缺参 fail fast，不再静默等到超时 ([a86691e](https://github.com/nolotus/bun-nolo/commit/a86691ee2052ef105c5306128102cffc16f9276f))


## 0.194.0-alpha.2 (2026-10-27)

### Bug Fixes

* **capabilities:** 撤销 antigravity 路由禁图（实测可用，此前结论基于旧代码） ([32ed1f3](https://github.com/nolotus/bun-nolo/commit/32ed1f33bead23ad5560bab41c255fde0b5eaded))


## 0.194.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** read_image 一次多张（≤4）+ 摘要统一为结构化 formatter ([74bb152](https://github.com/nolotus/bun-nolo/commit/74bb1525bc9985889a61020d126eb2f57e8e8d84))

### Bug Fixes

* **agent-runtime:** read_image 宽容合并 path/paths，schema 去掉参数级组合子 ([df8a578](https://github.com/nolotus/bun-nolo/commit/df8a57872b3b189c2cc5346ac34002b620930e58))


## 0.193.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** Responses/codex 通道注入工具图片（原生 output 数组） ([24fb17a](https://github.com/nolotus/bun-nolo/commit/24fb17adf50b7c4bf61243ac3cc184aacc7ad94c))
* **agent-runtime:** Responses/codex 通道注入工具图片（原生 output 数组） ([0684318](https://github.com/nolotus/bun-nolo/commit/06843180c43c0e2d65573225d963034afab417f5))


## 0.192.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** 宿主窗口捕获（xdg-desktop-portal）→ 图片（**需显式声明**） ([54c82dc](https://github.com/nolotus/bun-nolo/commit/54c82dc4a6697e482567d80ab0c85471feab2e67))


## 0.191.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** 页面无头渲染 → 图片（替代用户工作区脚本） ([821e619](https://github.com/nolotus/bun-nolo/commit/821e6192e8c7a30c9fd53afed73748b64081a663))


## 0.190.0-alpha.3 (2026-10-27)

### Bug Fixes

* **agent-runtime:** 评测语料 FLAG 与文件名解耦（防答案泄露） ([24880df](https://github.com/nolotus/bun-nolo/commit/24880dfc071676334a3dded8b686815dc6fca78a))


## 0.190.0-alpha.2 (2026-10-27)

### Bug Fixes

* **agent-runtime:** 超预算图片只记已投递，未投递可续取且不破坏前缀 ([7b4e8e9](https://github.com/nolotus/bun-nolo/commit/7b4e8e9c7564ce5d63a7804a67333d79d2c7be0c))


## 0.190.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** Gemini 原生通道注入工具图片 ([4ee3c55](https://github.com/nolotus/bun-nolo/commit/4ee3c55610d165b03a8aeff98e50e41b4818a0b9))


## 0.189.0-alpha.2 (2026-10-27)

### Bug Fixes

* **connector:** 截图摘要统一为 [screenshot WxH NKB → path]，归属标签可提取路径 ([f9245df](https://github.com/nolotus/bun-nolo/commit/f9245df9d85aaaad20376b9f01f57cf033241974))


## 0.189.0-alpha.1 (2026-10-27)

### Features

* **connector:** 截图工具结果携带图片，模型无需再手动 read_image ([4b11b3c](https://github.com/nolotus/bun-nolo/commit/4b11b3c3ccfbefc093971506bf6813cfd270f104))


## 0.188.0-alpha.2 (2026-10-27)

### Bug Fixes

* **agent-runtime:** 让 agent 声明的 hasVision 真正到达运行时 + 图片归属标签 ([82c1fe4](https://github.com/nolotus/bun-nolo/commit/82c1fe4a8d413c8039053fbdbfddb32ed878ed62))


## 0.188.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** OpenAI Chat Completions 通道注入工具图片（B1） ([4ed5d49](https://github.com/nolotus/bun-nolo/commit/4ed5d49125f29765c5c2e0e56c0854e6941a3f02))

### Bug Fixes

* **agent-runtime:** 去掉 toolImages/openAiToolImages 的 node:crypto（web bundle 可达） ([f432f19](https://github.com/nolotus/bun-nolo/commit/f432f190d3eb0af4bcf17921970d5fc2b2bc48dc))


## 0.187.0-alpha.1 (2026-10-27)

### Features

* **agent-runtime:** 工具结果可携带图片（切片1：Anthropic 通道 + read_image + 护栏） ([dd6d6a6](https://github.com/nolotus/bun-nolo/commit/dd6d6a6b9b45f9724f23f27ff23cc62f1609e038))

### Bug Fixes

* **tools:** read_image 真正进入请求面，并按后端可执行能力过滤 ([3287ad4](https://github.com/nolotus/bun-nolo/commit/3287ad46ad7e3682bf9a083ae8d124d97fea5545))


## 0.186.0-alpha.1 (2026-10-27)

### Features

* **llm:** deepseek-flash 默认改走 LithosAI，失效回落官方 ([7bc15cd](https://github.com/nolotus/bun-nolo/commit/7bc15cd21727182c01d108eb2a0fab1206147465))


## 0.185.0-alpha.2 (2026-10-26)

### Bug Fixes

* **cli:** 终止身份容差按基准来源分级（自报 2s / spawn 30s） ([fd148ea](https://github.com/nolotus/bun-nolo/commit/fd148eab6f62f6f99c68b74d2940847e003f4bb7))
* **cli:** 身份基准改子进程自报，Windows 子 run 不再被身份探测卡死 ([3e31ddf](https://github.com/nolotus/bun-nolo/commit/3e31ddfa407564e15c7a79558f0b2b6d12fe299d))


## 0.185.0-alpha.1 (2026-10-26)

### Features

* **ai:** make commit review gate configurable under auto-review ([7bfeed3](https://github.com/nolotus/bun-nolo/commit/7bfeed33ef5d54539ca05592c930ba99a035b649))

### Bug Fixes

* **cli:** resolve windows process start time and child entrypoint ([ae7771d](https://github.com/nolotus/bun-nolo/commit/ae7771d86ad3620e0debd80c79a60def81ec58a3))


## 0.184.0-alpha.2 (2026-10-26)

### Bug Fixes

* **core:** 允许 HTTP_PORT=0（OS 分配临时端口），修 48631ef0d 引入的回归 ([9c6a90c](https://github.com/nolotus/bun-nolo/commit/9c6a90c14e715b0c5b49017816ad16bf46d62333))
* **server:** HTTP_PORT 缺失时 fail-closed，不再静默退到 80 ([48631ef](https://github.com/nolotus/bun-nolo/commit/48631ef0d541582e9c633ba2051c8bc1b36c8301))


## 0.184.0-alpha.1 (2026-10-26)

### Features

* **ai:** Explore 创作者目录与作者名快照 ([3e8d2a5](https://github.com/nolotus/bun-nolo/commit/3e8d2a5d8b690993d69f416cf1f3ab6f6bc85cb1))

### Bug Fixes

* **ai:** 插件配置页不再把空间共享连接当成个人已连接 ([cd7be41](https://github.com/nolotus/bun-nolo/commit/cd7be41633c3ee9ac3b6faeea0bca2a5ebc8d9a0))


## 0.183.0-alpha.1 (2026-10-26)

### Features

* **cloud-plugins:** serve connections by grant, drop the organization scope ([e6a7a6f](https://github.com/nolotus/bun-nolo/commit/e6a7a6ff8f8bf92e51717e5c5dee2d8fb1c7942b))
* **plugins:** make data-source tools opt-in per user, off by default ([6df08fb](https://github.com/nolotus/bun-nolo/commit/6df08fb1ebbfff61304ccbcd5703c95569aee304))


## 0.182.0-alpha.1 (2026-10-26)

### Features

* **email:** 邮件偏好独立设置页 + 用户可设余额提醒门槛 + 删除静默 ([a8d5404](https://github.com/nolotus/bun-nolo/commit/a8d5404b7c6f42efaee08dd4e5e7d1254c33ab6c))


## 0.181.0-alpha.1 (2026-10-26)

### Features

* **agent:** list and probe cloud resources from the tool surface ([f6d151d](https://github.com/nolotus/bun-nolo/commit/f6d151d4dfbef350a0d3b9ae176f4bb365eae248))
* **cli:** TUI 收到部署事件后响铃并在状态区提示 ([d47a1e9](https://github.com/nolotus/bun-nolo/commit/d47a1e9c8567be537a3d210242fbc419f1e64f63))
* **cli:** TUI 收藏失败可见化 + 部署生效 watcher ([6e70c03](https://github.com/nolotus/bun-nolo/commit/6e70c034e2bbd8c8851e811a667645eaafceaae8))
* **cloud-plugins:** add docker and cloudflare platform spec registry ([a6b00ee](https://github.com/nolotus/bun-nolo/commit/a6b00eec48ba78d697b104b3b67ec6d538afcee3))
* **cloud-plugins:** register cloud_exec behind explicit opt-in ([b2a263d](https://github.com/nolotus/bun-nolo/commit/b2a263daffb6483aa2494fafe6648f960b02e9c4))
* **cloud-plugins:** register gcp, vultr, hetzner and digitalocean ([8406aa6](https://github.com/nolotus/bun-nolo/commit/8406aa6c6813dd6a3217830959e842009afce35b))
* **context:** 上下文占用口径统一：权威 input 优先、实时更新、未知窗口不假装真值 ([7cdb6c7](https://github.com/nolotus/bun-nolo/commit/7cdb6c70fb0b5d1666e101fbe20e513df8526374))
* **explore:** wire docker and cloudflare cards into the plugin page ([de1a124](https://github.com/nolotus/bun-nolo/commit/de1a12438e544da14776f6fa6d8c09b93f40781e))
* **ops:** detect email routes whose mailbox owner is gone ([9691ef1](https://github.com/nolotus/bun-nolo/commit/9691ef168aa00718fdec152f02eabe2accebead7))

### Bug Fixes

* **agent:** 公开 agent 缺 DB 记录时可解析（收藏/TUI 可见） ([eadcd78](https://github.com/nolotus/bun-nolo/commit/eadcd78f41d0eb132b0d264938ebd445b87e108a))
* **cli:** 修复 crypto-js 子路径在 Node ESM 下无法解析导致的启动崩溃 ([41dc5ee](https://github.com/nolotus/bun-nolo/commit/41dc5ee1a18da0e2810e0292e6279d2a9a106bf2))
* **cli:** 凭证冷却按 owner 隔离，失败原因细分并透传，listAgents 四态化 ([cee6385](https://github.com/nolotus/bun-nolo/commit/cee6385a91552135d9b712393e0f1b843f5efce0))
* **cli:** 发布链加产物级 Dynamic require 门，并把 crypto-js/detect-libc 也改 external ([75b3421](https://github.com/nolotus/bun-nolo/commit/75b3421abc37a06d99fb886757e9038e2959e39d))
* **cli:** 恢复 usage 合并的计费口径，占用改走「最近一次 provider input」 ([6186a78](https://github.com/nolotus/bun-nolo/commit/6186a7871ef6c7a8fd38ffe2904ce736673d4d51))
* **cli:** 把 pino 与 clipboardy 保持为发布 external，修复 Node 26 启动崩溃 ([225adeb](https://github.com/nolotus/bun-nolo/commit/225adeb9ddf2d9fa8547afa166eced70bef169f2))
* **cli:** 按上游语义分级 429/额度失败，区分容量饱和、额度耗尽与普通限流 ([cd85bea](https://github.com/nolotus/bun-nolo/commit/cd85bea6653eac51609924e245ae2b61c1de1ba2))
* **database:** 阻止 chat-proxy 角色抢走共享 LevelDB 锁 ([d92e38f](https://github.com/nolotus/bun-nolo/commit/d92e38f06e025f37c74f363d6e61c9de03672447))
* **desktop:** stable 线补齐桌面发布链的 S3 直连与 mac 签名修复 ([76ba79d](https://github.com/nolotus/bun-nolo/commit/76ba79d3507c99fc2520fcbb025e4c249726de78))
* **desktop:** trigger stable 0.172.2 release for sync origin sha256 fix ([221c625](https://github.com/nolotus/bun-nolo/commit/221c6254f6199bbb026bd23a35861c3f0c6ea581))
* **docker:** confirm a cloud sandbox stop with backoff ([5f9b980](https://github.com/nolotus/bun-nolo/commit/5f9b98002061771f0d664b1692b25c74f2af77a6))
* **email:** stop blocking bind on route readiness probe ([8406683](https://github.com/nolotus/bun-nolo/commit/840668355f55fbb9c83cb2fed30e9bde55df0e12))
* **hooks:** report test runner startup failures without masking regressions ([023279e](https://github.com/nolotus/bun-nolo/commit/023279ee8bf66bf5faee5e45705e8a17903afd9e))
* **hooks:** report test runner startup failures without masking regressions ([a90275d](https://github.com/nolotus/bun-nolo/commit/a90275d64e552f19cfdef03d3f7bd00b74e3c42f))
* **release:** restore the cli version to the highest reachable alpha tag ([41e612e](https://github.com/nolotus/bun-nolo/commit/41e612e0cedecacf73eec14727b102459bfb0450))
* **security:** drop the unused zod declaration from the cli ai stub ([2e6349a](https://github.com/nolotus/bun-nolo/commit/2e6349abc6ce79ac071818c4d14075acc3199243))
* **yahoo-finance:** suppress survey and historical notices ([605cb47](https://github.com/nolotus/bun-nolo/commit/605cb470e000083f7e846554528085cb01f043cb))


## 0.180.0-alpha.9 (2026-10-25)

### Bug Fixes

* **release:** legacy alias 校验改走 S3 直连，公开 URL 403 不再阻断发布 ([dfd509a](https://github.com/nolotus/bun-nolo/commit/dfd509a9163ff8e1a28ea59aeeae41358115d687))


## 0.180.0-alpha.8 (2026-10-25)

### Bug Fixes

* **release:** S3 大小校验改走 GET Range，删掉 HEAD 路径 ([c68537b](https://github.com/nolotus/bun-nolo/commit/c68537b6b8010a633c8dc01fb581d3ad2ef80b41))


## 0.180.0-alpha.7 (2026-10-25)

### Bug Fixes

* **desktop:** 无 Apple 证书时用 ad-hoc 签名，macOS 产物仍可安装 ([bdbca94](https://github.com/nolotus/bun-nolo/commit/bdbca944b5fc39bb42a48567d90cf1f20f14260b))
* **release:** 上传后校验改走 S3 直连，不再打公开 CDN URL ([d393ed1](https://github.com/nolotus/bun-nolo/commit/d393ed15381e750272b29758a675707716c3828f))


## 0.180.0-alpha.6 (2026-10-25)

### Bug Fixes

* **desktop:** 更新检查改走 S3 直连，绕开 Cloudflare challenge ([92ce3ec](https://github.com/nolotus/bun-nolo/commit/92ce3ec664ad18bf7fc18e363a8fb9eb18d769b9))


## 0.180.0-alpha.5 (2026-10-24)

### Bug Fixes

* **cli:** fail instabox preparation before any host fallback ([22fa7bf](https://github.com/nolotus/bun-nolo/commit/22fa7bf156900230cbbf4d57c8b88dd39d641aaa))


## 0.180.0-alpha.4 (2026-10-24)

### Bug Fixes

* **cli:** keep isolated runs on one NOLO_HOME so lock paths cannot diverge ([3c0bedf](https://github.com/nolotus/bun-nolo/commit/3c0bedfae8ccdcf7f9f038556ede877f6ccc9da0))


## 0.180.0-alpha.3 (2026-10-24)

### Bug Fixes

* **tools:** take runtime identity from the trusted context only ([148a4e1](https://github.com/nolotus/bun-nolo/commit/148a4e1255987ec239995276a790967ea6397f93))


## 0.180.0-alpha.2 (2026-10-24)

### Bug Fixes

* **instabox:** 免费层不因缺容量字段被拒建机 ([b951dec](https://github.com/nolotus/bun-nolo/commit/b951dec7c4c99de9677b4c51a89590ff9526ce71))


## 0.180.0-alpha.1 (2026-10-24)

### Features

* **instabox:** 低内存自动分流到 Instabox 与探索插件绑定 ([0b51db2](https://github.com/nolotus/bun-nolo/commit/0b51db2167725e7b19307fb0f01dcb12eb9f4f08))


## 0.179.0-alpha.3 (2026-10-24)

### Bug Fixes

* **gate:** 符号检查补数组解构与标准全局白名单 ([0884cb6](https://github.com/nolotus/bun-nolo/commit/0884cb6d21316689d5285e3677929c793fcea075))


## 0.179.0-alpha.2 (2026-10-24)

### Bug Fixes

* **gate:** 加 PCRE2 预检，避免符号检查静默 fail-open ([5a3150a](https://github.com/nolotus/bun-nolo/commit/5a3150a9cfab0df736945fd9fbd3a5c6763c351e))


## 0.179.0-alpha.1 (2026-10-24)

### Features

* **agent:** startAgentRun schema 暴露任务预算参数 ([1967162](https://github.com/nolotus/bun-nolo/commit/19671626b87f181eb4d69e85e15fa174c734ecb7))


## 0.178.0-alpha.1 (2026-10-24)

### Features

* **runtime:** 子任务加硬预算，超限优雅终止并交中间结论 ([67ea036](https://github.com/nolotus/bun-nolo/commit/67ea036b2d8ff64111c94056e51d5529d67169ba))

### Bug Fixes

* **gate:** 符号检查不再把声明误判为未声明调用 ([df90523](https://github.com/nolotus/bun-nolo/commit/df90523d56abb190f84e79944ce163afd7570fdd))


## 0.177.0-alpha.1 (2026-10-24)

### Features

* **ops:** detect email routes whose mailbox owner is gone ([c069c57](https://github.com/nolotus/bun-nolo/commit/c069c570ef06b19940c206ff46015606842b7a89))

### Bug Fixes

* **email:** stop blocking bind on route readiness probe ([07622d2](https://github.com/nolotus/bun-nolo/commit/07622d2ac238fac687b70bc10a1777411d816b90))


## 0.176.0-alpha.2 (2026-10-24)

### Bug Fixes

* **server:** 准入去掉启动时间窗口，仅以 draining 判定部署期 ([c07bd25](https://github.com/nolotus/bun-nolo/commit/c07bd25d4292902b24a58443d7c3218a1585138e))
* **server:** 部署退场时通知连接器重连，准入窗口内返回可重试 503 ([e531674](https://github.com/nolotus/bun-nolo/commit/e531674cd811e5ed377cf1bae7d3ec30d6d8a7a8))


## 0.176.0-alpha.1 (2026-10-24)

### Features

* **downloads:** updateMeta 支持 mirrors 协议字段并加固 mirrors 过滤 ([3d5d9a5](https://github.com/nolotus/bun-nolo/commit/3d5d9a59d53b0cd12efe405ff4d1ef08f366d5ea))


## 0.175.0-alpha.2 (2026-10-24)

### Bug Fixes

* **cli:** 代理准入 403 改为有界重试，500 交回服务端 ([92024bd](https://github.com/nolotus/bun-nolo/commit/92024bdc40a7a4800ce8beaf9ad6574e4561349e))


## 0.175.0-alpha.1 (2026-10-24)

### Features

* **downloads:** 下载镜像 mirrors 与安装器源回退 ([7d28dca](https://github.com/nolotus/bun-nolo/commit/7d28dca64bcf79a8ae9bbb6abe0521018a955885))


## 0.174.0-alpha.4 (2026-10-24)

### Bug Fixes

* **cli:** 更新清理失败不再误报失败，本地下载补时限 ([b1f673f](https://github.com/nolotus/bun-nolo/commit/b1f673fc66e9a27047bce3f9d9dd0a6098533a64))


## 0.174.0-alpha.3 (2026-10-24)

### Bug Fixes

* **cli:** nolo update 独立二进制改为可验证的原子替换，并拒绝降级 ([c8110df](https://github.com/nolotus/bun-nolo/commit/c8110df092b71c6c71dff4852881137937c43700))


## 0.174.0-alpha.2 (2026-10-24)

### Bug Fixes

* **cli:** 安装器断点续传与失败后保留进度 ([4b1f077](https://github.com/nolotus/bun-nolo/commit/4b1f077e0a87a3fc96b5d9522c30b982a7b01097))


## 0.174.0-alpha.1 (2026-10-24)

### Features

* **cli:** run turn 结束归还堆页并提示本机内存 ([d6974ab](https://github.com/nolotus/bun-nolo/commit/d6974abe6a784b9a04c2d72300f4061ba2dcfd5d))

### Bug Fixes

* **agent-runtime:** shell 输出超限改为排空落盘并收紧驻留上限 ([a5e25e9](https://github.com/nolotus/bun-nolo/commit/a5e25e9211f5be6cbde548418fdc0038c5819085))
* **test:** 给安装脚本探测与 curl 下载加超时 ([5e31adc](https://github.com/nolotus/bun-nolo/commit/5e31adc8a110ca0b05d076bc96765e18e8510fd4))


## 0.173.0-alpha.4 (2026-10-24)

### Bug Fixes

* **ai:** 图片能力按实际发送通道判定，降级不再静默丢图 ([ba9d769](https://github.com/nolotus/bun-nolo/commit/ba9d76907967f91be046325f1c0a1ada4a52556b))


## 0.173.0-alpha.3 (2026-10-24)

### Bug Fixes

* **cli:** 发布链加产物级 Dynamic require 门，并把 crypto-js/detect-libc 也改 external ([5349b11](https://github.com/nolotus/bun-nolo/commit/5349b1176c9e59e8c7a8d3c8a46c592d2cc5f804))


## 0.173.0-alpha.2 (2026-10-24)

### Bug Fixes

* **cli:** 把 pino 与 clipboardy 保持为发布 external，修复 Node 26 启动崩溃 ([a5759f6](https://github.com/nolotus/bun-nolo/commit/a5759f62cb659f9da36c02d58abdd0ec24844654))


## 0.173.0-alpha.1 (2026-10-24)

### Features

* **ai:** MiniMax 官方模型规范化接入模型表与上下文真值 ([be3a982](https://github.com/nolotus/bun-nolo/commit/be3a982dc05e87df6d06eec61ddb01c0abe9c263))
* **ai:** 放行 MiniMax 官方端点流式 usage 采集选项 ([1f7fdbf](https://github.com/nolotus/bun-nolo/commit/1f7fdbf873e897643c7637bade2e021887d760f0))


## 0.172.0-alpha.1 (2026-10-23)

### Features

* **agent-runtime:** add client for credential exec broker ([0cb23e6](https://github.com/nolotus/bun-nolo/commit/0cb23e6b96328fac40e4d9db0460911c70d896e6))
* **agent-runtime:** add credential exec broker skeleton ([e0c4e10](https://github.com/nolotus/bun-nolo/commit/e0c4e1086770eee7782ed06b32c2efa63f048266))
* **agent-runtime:** wrap credential exec client as a tool handler ([773dd55](https://github.com/nolotus/bun-nolo/commit/773dd5596985ed823485497cf820ff902493e037))
* **agent:** point credential discovery at secret list --json ([2561bfa](https://github.com/nolotus/bun-nolo/commit/2561bfa130c58afa41d6bba77b223bb033372684))
* **agent:** route credential handling to nolo secret ([f1403aa](https://github.com/nolotus/bun-nolo/commit/f1403aa0640e04b002cc90e089f0267be4cdc58f))
* **ai:** Exa 提为第一搜索源并接通定档信号 ([9efb0ca](https://github.com/nolotus/bun-nolo/commit/9efb0cae785643cb7beb0c24721780b6d7d4c677))
* **ai:** 同步 Exa 3.0 检索档位与自动定档 ([8dded82](https://github.com/nolotus/bun-nolo/commit/8dded824e559e93c0095f03fd1dcfbc492eeb252))
* **audit:** add credential use audit contract ([b48a0ad](https://github.com/nolotus/bun-nolo/commit/b48a0ad6019523ebb8847c62f8a4e5e0afa439ca))
* **audit:** let buildExecutionAuditRecord carry credential uses ([d274e24](https://github.com/nolotus/bun-nolo/commit/d274e249f93a90da94f2101f85c72a1a5fd204d6))
* **chat:** 上下文占用三态展示 + 用量入口移出空抽屉栏 ([b03202f](https://github.com/nolotus/bun-nolo/commit/b03202fdd28f9a2c5644f06de0ae63c2a366b7b2))
* **cli:** add --json to nolo secret list ([8dfb142](https://github.com/nolotus/bun-nolo/commit/8dfb142883fa9c7898be38f7ec0b683b5836d553))
* **credentials:** add local secret resolver for the exec broker ([1e89fae](https://github.com/nolotus/bun-nolo/commit/1e89fae2f2bb14cdb12aad2756949cadfbd03783))
* **docker:** 可选 empty 工作区模式（跳过整仓打包）与阶段诊断 ([67d1903](https://github.com/nolotus/bun-nolo/commit/67d19033ef6d1f743d341d1b8ee31a6a1ce53a1c))
* **explore:** Explore 改由 ?category= 驱动，七分类统一入口 ([d4a41d4](https://github.com/nolotus/bun-nolo/commit/d4a41d44544c4b97d830bf3c29394f8033db67b1))
* **home:** Home 增加「分类」视图（旧式类型筛选 + 全部内容列表） ([75c5d91](https://github.com/nolotus/bun-nolo/commit/75c5d91c586b2fc5177cb6e531850b9121326c31))
* **home:** Work 列表复用侧栏条目，空分组不占位，第三组改称「已完成」 ([84e85ca](https://github.com/nolotus/bun-nolo/commit/84e85cabb60c62cb131a1a7e1967c31b93bb81be))
* **home:** 用「其他内容」类型分组取代独立「分类」视图 ([1e67591](https://github.com/nolotus/bun-nolo/commit/1e675911025e3b6e1a00e563971daa55f7162517))
* **instabox:** 固定工作目录 + 结构化文件工具桥 + 释放状态机 ([1656c13](https://github.com/nolotus/bun-nolo/commit/1656c1382469d704d91df44e75240c78da028c2a))
* **instabox:** 支持原生 stdin（≤1 MiB，按 UTF-8 字节计） ([a9ae76e](https://github.com/nolotus/bun-nolo/commit/a9ae76ebb0c263294ed956846ac5b1923bef3892))
* **navigation:** 44px rail with promoted favorite shortcuts ([a888e23](https://github.com/nolotus/bun-nolo/commit/a888e23947ec61da8d0dc72b8ead480920bc5ff1))
* **navigation:** paginated Work history with authorized shared Space dialogs ([7037edc](https://github.com/nolotus/bun-nolo/commit/7037edc1ef816e4fea63dd593e30af7b85aa90e6))
* **tui:** split permission confirmations into local and remote grants ([c3721d8](https://github.com/nolotus/bun-nolo/commit/c3721d877c52c02e7c81b8086e80d1226b77d57c))
* **work:** 最近工作列表改版并修复历史加载可靠性 ([b32ac90](https://github.com/nolotus/bun-nolo/commit/b32ac9019e9b88c6f3f3cd0e811d42e77da90c79))

### Bug Fixes

* **agent-runtime:** unify response guidance across runtime surfaces ([bc63faa](https://github.com/nolotus/bun-nolo/commit/bc63faae8f42127dc4da706bac08916c4822a023))
* **agent-runtime:** 显式 cwd 与沙盒后端互斥并补派发落点提示词块 ([64f40fd](https://github.com/nolotus/bun-nolo/commit/64f40fd468c8a4011d204dd4138b5b65d3952159))
* **auth:** Web 端凭据双轨支持与生命周期做减法 ([3626d7e](https://github.com/nolotus/bun-nolo/commit/3626d7eaf94f26ca2c8faaf20691364feb5501dd))
* **chat:** 共享历史失败按来源归因，侧栏收敛为单条重试控件 ([cbde341](https://github.com/nolotus/bun-nolo/commit/cbde3419faa1b9eb00dd929daa628849ae79686f))
* **ci:** 基线对照在基线崩溃时显式 inconclusive 而非误报新增失败 ([2e2e919](https://github.com/nolotus/bun-nolo/commit/2e2e919c7dd6f8a4b4d8cd98a8b9aa2da79c0101))
* **database:** 共享 Space 历史端点恒 400，删除 body 准入协议 ([c4f3c54](https://github.com/nolotus/bun-nolo/commit/c4f3c5477228ddf4ba23f9136bc94d8d83484018))
* **database:** 已知记录归属只问该来源并消除消息读取的全库扫描退化 ([03b8ae2](https://github.com/nolotus/bun-nolo/commit/03b8ae2c21b626a1a8b4dd5da783e35660f33d7d))
* **database:** 收紧共享历史终态判定，避免非 400 故障清空来源数据 ([be66269](https://github.com/nolotus/bun-nolo/commit/be6626990868e543c296201cb2290d6b6cf03ed3))
* **home:** Web 端「项目」视图给出说明而不是空白内容区 ([d0c2194](https://github.com/nolotus/bun-nolo/commit/d0c2194c6341706cd3bc4f1ca6df8ca072a4a0c3))
* **instabox:** 修正文件桥根目录与探针判定（真机 probe_failed） ([5217021](https://github.com/nolotus/bun-nolo/commit/5217021479fddc3780615d1cf54b0af548c75fb3))
* **navigation:** 修复收藏误删、共享 401 过度清空与 Work 漏掉本地对话 ([f2049ab](https://github.com/nolotus/bun-nolo/commit/f2049ab14fce12c174c100d9814f3ff9fe9a570a))
* **navigation:** 折叠只隐藏 Context，保留常驻 48px Rail ([4efac05](https://github.com/nolotus/bun-nolo/commit/4efac05ba4721482a9d1e1139ae54fe3b1146936))
* **navigation:** 让 Space 侧边栏在 Context 列内滚动，控件吸顶不遮挡内容 ([6a591ca](https://github.com/nolotus/bun-nolo/commit/6a591cad690b3023691b76bb9ebf398ed853e52d)), closes [#198](https://github.com/nolotus/bun-nolo/issues/198)
* **release:** 主题引导下沉 app 包并补投影白名单 ([f03afd1](https://github.com/nolotus/bun-nolo/commit/f03afd108471216cedc8177245d240ee53f59eee))
* **security:** unify credential environment judgement ([8f7056b](https://github.com/nolotus/bun-nolo/commit/8f7056b13240d66bf8ef291d17f1f2396f27f71c))
* **settings:** publish account chat preferences synchronously and avoid stale completion writes ([#186](https://github.com/nolotus/bun-nolo/issues/186)) ([2705801](https://github.com/nolotus/bun-nolo/commit/27058011554df41b2af7a5f194531fc50815418e))
* **settings:** serialize per-account Settings writes and test failure recovery ([#187](https://github.com/nolotus/bun-nolo/issues/187)) ([a164b9f](https://github.com/nolotus/bun-nolo/commit/a164b9f7cd1a8937de009337db3aa4db198942d2))
* **settings:** 服务端权威回显世代与登出态 toggle 反馈 ([bb5eb66](https://github.com/nolotus/bun-nolo/commit/bb5eb662288a725266af4be3f7d15d7aed22a3c0))
* **settings:** 消除 chat display owner 的渲染期 setAccount ([85bdead](https://github.com/nolotus/bun-nolo/commit/85bdead8bfdb746dd159e6ff13c1ff55e72a799a))
* **settings:** 用本地意图世代守卫 settings hydrate ([e602b91](https://github.com/nolotus/bun-nolo/commit/e602b9173738d836a33f5b939527e2d79bbd889b))
* **settings:** 设置写失败可见、有界重试与权威对账 ([15f2590](https://github.com/nolotus/bun-nolo/commit/15f259018cb4a6291bc725ff0d9ffd9d7c98a525))
* **style:** 提升fluid hover行的特异性以胜过StyleX原子类 ([82876e3](https://github.com/nolotus/bun-nolo/commit/82876e36d770654cba0ee91ed9834087e0e3cbab))
* **table:** 当前表判定改用 dbKey，恢复老 schema 表的只读展示 ([6d72d4b](https://github.com/nolotus/bun-nolo/commit/6d72d4bcbc9e4f7abb56982ef9bd8c7fdb7cac2f))
* **theme:** let read-only appearance consumers render on unbound stores ([c2146bc](https://github.com/nolotus/bun-nolo/commit/c2146bc8b257f47656d1b943419d1faa33378130))

### Performance Improvements

* **sidebar:** 侧边栏摘要行不再逐条读取完整实体 ([ce6be26](https://github.com/nolotus/bun-nolo/commit/ce6be26b60fc4798f7c4416697d6c8f0ef46a85c))
* **web:** 主题与字体静态数据外置为带 hash 的静态资源 ([8671c0d](https://github.com/nolotus/bun-nolo/commit/8671c0d7c12bf12ec5cb3636a3fec05a1ccb38a5))


## 0.171.0-alpha.1 (2026-10-20)

### Features

* **agent-runtime:** execShell 支持显式任务标签 label ([5110663](https://github.com/nolotus/bun-nolo/commit/51106636b535a70d1f752052250db133d909af34))


## 0.170.0-alpha.3 (2026-10-20)

### Bug Fixes

* **navigation:** 修复 Rail 弹层向下展开时高度塌缩 ([fd23793](https://github.com/nolotus/bun-nolo/commit/fd23793d613fffb697df60f158f1b2dfdbd550e6))


## 0.170.0-alpha.2 (2026-10-20)

### Bug Fixes

* **navigation:** Rail 底部弹层按可用空间择向展开并限制高度 ([1e36e8b](https://github.com/nolotus/bun-nolo/commit/1e36e8b0f54471c11e4d2067f32f5a2a1701ecb9))


## 0.170.0-alpha.1 (2026-10-20)

### Features

* **navigation:** Home 单一内容区、Rail 搜索与 Project 作用域 ([f2baadf](https://github.com/nolotus/bun-nolo/commit/f2baadff8267a1e136440f6d71c6c0bbd23ef595))


## 0.169.0-alpha.1 (2026-10-20)

### Features

* **navigation:** Home Work 与 Projects 视图就绪，Rail 底部收敛用户入口 ([85e39bd](https://github.com/nolotus/bun-nolo/commit/85e39bddb8028df41f9467657f4f02f1be139a83)), closes [#169](https://github.com/nolotus/bun-nolo/issues/169)


## 0.168.0-alpha.1 (2026-10-20)

### Features

* **ai:** 实现请教模式、顾问档广场条目与分档计费平替 ([b0c1f14](https://github.com/nolotus/bun-nolo/commit/b0c1f14ec28c32ab2812481844bddc5399540d48))


## 0.167.0-alpha.1 (2026-10-20)

### Features

* **navigation:** Rail 与 Context 分离，Rail 改为路由驱动 ([85b500e](https://github.com/nolotus/bun-nolo/commit/85b500e0de3d89c8b324b65cde535dd6a1f5aa3f)), closes [#168](https://github.com/nolotus/bun-nolo/issues/168) [#168](https://github.com/nolotus/bun-nolo/issues/168) [#7773](https://github.com/nolotus/bun-nolo/issues/7773) [#7772](https://github.com/nolotus/bun-nolo/issues/7772)


## 0.166.0-alpha.1 (2026-10-20)

### Features

* **desktop:** 多本地项目文件夹绑定 Dialog cwd，Space 不再持有工作目录 ([3024e9c](https://github.com/nolotus/bun-nolo/commit/3024e9c91a389a7a2188e01bb94123f133a286ca))

### Bug Fixes

* **compaction:** 备用摘要两模型独立尝试预算 ([d830bb7](https://github.com/nolotus/bun-nolo/commit/d830bb7a064ddfdb308659ef03a30ed72fdeb415))
* **compaction:** 少量超大消息允许安全前缀恢复 ([1403237](https://github.com/nolotus/bun-nolo/commit/1403237787fec9c1e84bdc1689c64d262732fce0))
* **compaction:** 摘要锚点跨端兼容与失败退避计时 ([7eebeac](https://github.com/nolotus/bun-nolo/commit/7eebeac507848cdba7d6ed3cfa63d766189c266f))


## 0.165.0-alpha.4 (2026-10-20)

### Bug Fixes

* **tui:** restore adaptive context status and label process notice origins ([d841043](https://github.com/nolotus/bun-nolo/commit/d8410436d610cf818400c88e6ffce10acf8de4ce))


## 0.165.0-alpha.3 (2026-10-20)

### Bug Fixes

* **desktop:** shorten browser stub chunk names below the tar path limit ([5643588](https://github.com/nolotus/bun-nolo/commit/564358871ea06eda5fc9a770841617e8804614ae))
* **tui:** honor origin auto mode for child shell approvals ([14fd5c0](https://github.com/nolotus/bun-nolo/commit/14fd5c0357ebf82e9d4083e96a941a0cc682ab0c))


## 0.165.0-alpha.2 (2026-10-20)

### Bug Fixes

* **cli:** build shared docker execution boundary without server package ([e7f3f11](https://github.com/nolotus/bun-nolo/commit/e7f3f11190cbf578c0cd4fb66d627ec770327466))


## 0.165.0-alpha.1 (2026-10-20)

### Features

* **ai:** 新增共享上下文占用口径模块 ([0441cf6](https://github.com/nolotus/bun-nolo/commit/0441cf637c53717b44d772a104d52535e68215a5))
* **build:** web 产物注入 CLI 版本，去掉第二份硬编码真值 ([f7e3ab6](https://github.com/nolotus/bun-nolo/commit/f7e3ab61de9ced74daf7922d0f956242a99a08e5))
* **cli:** nolo ci status —— 部署状态的可查出口 ([4f52dc0](https://github.com/nolotus/bun-nolo/commit/4f52dc0e281b6f5e1b977fe52d15e04dd42d9ebd))
* **cli:** support controlled secret bindings from inbound credential vault ([f3b7a9a](https://github.com/nolotus/bun-nolo/commit/f3b7a9aee08e7a787e3e41226b3c3985adc9c4c3))
* **cli:** TUI 内容区增加左右 1 列呼吸留白，滚动条保持贴最右侧 ([c2637a2](https://github.com/nolotus/bun-nolo/commit/c2637a29fdd40e0a13b46367042ca0df0c831e15))
* **cli:** TUI 状态栏显示最近一次部署 ([ad5f632](https://github.com/nolotus/bun-nolo/commit/ad5f6320e67505348e9d85bd8ba8875296bec15a))
* **cli:** 支持通过 cli-local 派发通道运行 instabox 沙盒任务 ([47c6b55](https://github.com/nolotus/bun-nolo/commit/47c6b55ca63e1db4a334c051c3718e61060f207a))
* **desktop:** 桌面端版本支持构建期注入，未注入时行为不变 ([366a8ab](https://github.com/nolotus/bun-nolo/commit/366a8ab788a2a4ab4805eea5aa05bf72e28ba916))
* **navigation:** Navigation V2 首批切片——独立查询状态机与面板目标空间路由 ([c19d947](https://github.com/nolotus/bun-nolo/commit/c19d94777906393399e99b49f2375262cbacfbc3))
* **navigation:** Work 视图三分组预览接入真实运行状态 ([8b78a07](https://github.com/nolotus/bun-nolo/commit/8b78a07a632d175c9208994373480a63a160d462))
* **prompt:** 新增系统层平台风控纪律静态指令块 ([f78bc09](https://github.com/nolotus/bun-nolo/commit/f78bc095f220fcba1a81977776a14172bcd516f0))
* **release:** CLI 二进制 CDN 版本化，回滚不再需要重建旧包 ([e6da42c](https://github.com/nolotus/bun-nolo/commit/e6da42cac9fdffc0af6292cf2f03bf22bfd4eade))
* **release:** CLI 发布支持版本注入，并用 bun 取代 node 跑 esbuild ([7471018](https://github.com/nolotus/bun-nolo/commit/74710183b8decf6329cd425ec9ff3cc6d8bd28b4))

### Bug Fixes

* **agent-runtime:** ask_user 规则改为只传 id/label，并写明按字节判长度 ([6a07259](https://github.com/nolotus/bun-nolo/commit/6a07259a92d9570955d12ab0dd7c251d6c8b7382))
* **agent-runtime:** ask_user 调用规范改为结构定额，防参数截断 ([d6828c1](https://github.com/nolotus/bun-nolo/commit/d6828c1c9564122cf1c96e6c21795105598fe48b))
* **agent:** minimax-api 预设默认改用 MiniMax-M3.1-Flash 并为旧 id 加兼容指向 ([4b67701](https://github.com/nolotus/bun-nolo/commit/4b67701ca3a514ba4112a68f461443f6a3488c98))
* **ai:** agent-loop 路径上报权威 token 以让占用实时更新 ([5b08cfb](https://github.com/nolotus/bun-nolo/commit/5b08cfbbd046a84459ab0fd1644c4eea11a300e7))
* **app-detail:** 修复详情页 URL 规范化回环导致地址栏来回变且不跳转 ([7c213e4](https://github.com/nolotus/bun-nolo/commit/7c213e48da2e2bb55e4c4aaa210b6dc89aca84c3))
* **chat:** 上下文占用与累计计费分离并接上权威遥测 ([f473717](https://github.com/nolotus/bun-nolo/commit/f4737178996d203c1cc3bae4a23b075a7496f2d0))
* **chat:** 修复输入框最下沿遮挡并支持顶部拖拽拉伸高度 ([9e749f9](https://github.com/nolotus/bun-nolo/commit/9e749f998343120b7639f2b8e95a96cc16f235c5))
* **cli:** /compact 后占用按压缩结果重算并对齐权威到达口径 ([7afe103](https://github.com/nolotus/bun-nolo/commit/7afe103ed3a16235c4d401099d6f51cba461d350))
* **cli:** context 芯片按真实上下文占用实时更新 ([e946280](https://github.com/nolotus/bun-nolo/commit/e94628016d761d13c427bd5a7de7cfaf03ecf265))
* **cli:** publish 构建不再把测试文件复制进 dist ([a8690b0](https://github.com/nolotus/bun-nolo/commit/a8690b0355d10d7b33952fc3318647ab3dd2e434))
* **cli:** resolve shared child shell approval owner from runtime record ([ee2b3a4](https://github.com/nolotus/bun-nolo/commit/ee2b3a4090060093ec4ca5142c2631255164e69b))
* **cli:** 删除 4 处零引用死代码包并移除 3 个地图依赖 ([f60009d](https://github.com/nolotus/bun-nolo/commit/f60009da2f152f22329be3a2c4404ad12dd7144a))
* **cli:** 恢复 usage 合并的计费口径，占用改走「最近一次 provider input」 ([8c3497d](https://github.com/nolotus/bun-nolo/commit/8c3497d04a2f9e173e2165918b43b3c6460a037e))
* **cli:** 沙盒 run 终态导出能回收 .worktrees 里的改动 ([06c879e](https://github.com/nolotus/bun-nolo/commit/06c879ee09369b1637b98a94e968c7258f456da6))
* **identity:** isolate cloud lazy imports from public client builds ([6f5e93a](https://github.com/nolotus/bun-nolo/commit/6f5e93af4fb6e07c3afcd636d51b5f7a9037d567))
* **prompt:** 修复模板字符串里的裸反引号导致 CLI 启动崩溃 ([a9ad456](https://github.com/nolotus/bun-nolo/commit/a9ad4565b1a6d925417917acbe02c5af15a8eb7f))
* **routing:** 修复同批次多写入者覆盖查询参数导致地址栏闪回 ([2b5f3ac](https://github.com/nolotus/bun-nolo/commit/2b5f3acaa53ccbca31dd01531968cbd574c692c3))
* **server:** agent 的 apiKeyRef 在写入时归一化后再落库 ([7ecc7cd](https://github.com/nolotus/bun-nolo/commit/7ecc7cd5f3bbffa55c1a5d05bc51c5bd766e4a24))
* **server:** 非法 OAuth provider ref 不再误报成「作者未同步凭据」 ([efa9fd5](https://github.com/nolotus/bun-nolo/commit/efa9fd5b1b7775d331408ec69df0967dcf60a700))
* **tui:** hide CI and context chips from status line ([53f9e86](https://github.com/nolotus/bun-nolo/commit/53f9e8684dc426af2afaed01a03e69bdb9b4e3f5))

### Performance Improvements

* **build:** brotli 预压缩降到 10 档，build-web 省约 19s ([451db89](https://github.com/nolotus/bun-nolo/commit/451db89735dc2c35478ee89d8d4a2e9fad4abc0b))


## 0.164.0-alpha.1

## 0.164.0-alpha.1 (2026-10-19)

### Features

* **agent-run:** allow dispatching a run onto the host, behind explicit consent ([06931f8](https://github.com/nolotus/bun-nolo/commit/06931f80790659680cc1dfcd4324785b765740e4))
* **agent-run:** let loadSkill grant capability-pack tools to the current run ([cf8a891](https://github.com/nolotus/bun-nolo/commit/cf8a891c530097072303c45c10a8470f8c707529))
* **agent-runtime:** add owner-origin execution contract ([afe99cf](https://github.com/nolotus/bun-nolo/commit/afe99cf8f4045f32aef46a80da403fb69b8b5a37))
* **agent-runtime:** Antigravity 接入 Gemini 4 Argon 占位映射 ([763f004](https://github.com/nolotus/bun-nolo/commit/763f0042c3c1d28b6a2bee450234dae392252404))
* **agent-runtime:** Cloudflare Containers execution backend ([73fc987](https://github.com/nolotus/bun-nolo/commit/73fc98724126abfd21dff3905d68eaa650da26e4))
* **agent-runtime:** Docker 配额核实解耦，本机通道免浏览器核实但仍记账 ([5042852](https://github.com/nolotus/bun-nolo/commit/50428529e4e2a33c0067f87463008504142337d8))
* **agent-runtime:** inject host environment facts into turn context ([9a38352](https://github.com/nolotus/bun-nolo/commit/9a3835218034cbae2d977f4e915f578918ca18a4))
* **agent-runtime:** let the Vultr VM backend accept oneshot tickets ([d251fe3](https://github.com/nolotus/bun-nolo/commit/d251fe3b71754b77446be7df6a8ba616750c0542))
* **agent-runtime:** report-only cloud slot reconciler ([225e37f](https://github.com/nolotus/bun-nolo/commit/225e37f0925891d39c9d7924a02bff180fd61b48))
* **agent-runtime:** RepoSource abstraction for github / builtin / bundle ([0623a13](https://github.com/nolotus/bun-nolo/commit/0623a13905b6f7f04654458b353ff07a192b4610))
* **agent-runtime:** Vultr instance execution backend (session class) ([56e857a](https://github.com/nolotus/bun-nolo/commit/56e857a1fcfb2ccf33e2b2286baa33513b950361))
* **agent-runtime:** wire explicit runtimeKey dispatch without silent fallback ([8f3356b](https://github.com/nolotus/bun-nolo/commit/8f3356b714407372d7e288fa9fc923479d14979b))
* **agent-runtime:** 产物存储与 run 收尾导出，修复真实 envelope 与截断误存 ([baeb104](https://github.com/nolotus/bun-nolo/commit/baeb1046c220b915c63c6e9435a273ab318649a0))
* **agent:** add AMR Link aggregator provider preset ([27d7295](https://github.com/nolotus/bun-nolo/commit/27d72957c619129184d9e46460a4961a4d71c14c))
* **agent:** add cwd to startAgentRun and prefer tool dispatch over shell ([300c143](https://github.com/nolotus/bun-nolo/commit/300c143316618603e4eae8bc3daee2778ec86f92))
* **agent:** add Mistral subscription provider preset ([2f5f7e6](https://github.com/nolotus/bun-nolo/commit/2f5f7e6a7ec178130cd084e015387d11b3ef48f0))
* **agent:** define scoped persistent auto-review workflow semantics ([a82a628](https://github.com/nolotus/bun-nolo/commit/a82a6284fd79c69e80841b5767ef2f1c0290e764))
* **agent:** describe the upstream native wire in the custom provider call plan ([81ca206](https://github.com/nolotus/bun-nolo/commit/81ca2065dc5995ce28fda1c4b1156bcaad09c92b))
* **agent:** enhance prompt guidance for low cognitive load and oversight ([56a11c6](https://github.com/nolotus/bun-nolo/commit/56a11c6f5ae750667fc33f485c561d7c5990eb15))
* **agent:** honor an explicit apiKeyHeader on the native wires ([b0fcae2](https://github.com/nolotus/bun-nolo/commit/b0fcae2a7098cd0318c7593744f1b8e24c4a8d19))
* **agent:** make anticipatory guidance an explicit principle ([58e97ec](https://github.com/nolotus/bun-nolo/commit/58e97ec761cdd5f962c2e963b8b14e7a5a5e486d))
* **agent:** merge startAgentRun cwd and dispatch guidance ([0014014](https://github.com/nolotus/bun-nolo/commit/0014014e69e6feed70e701d84e5b50a9e08d8c2d))
* **agent:** share the custom native wire executor and wire the desktop runtime ([5bc6491](https://github.com/nolotus/bun-nolo/commit/5bc649176c04d8ab0dc4ef8ef87cd07256175bac))
* **agent:** show absolute quota reset time on the agent page ([44117c8](https://github.com/nolotus/bun-nolo/commit/44117c8033402fe560b1e13d41adacbce01bac80))
* **agent:** show the upstream plan badge for Mistral subscription agents ([6ba4244](https://github.com/nolotus/bun-nolo/commit/6ba424450bd5e24277e657e7ba139f04f8f3e3b6))
* **agent:** speed-aware agent selection with observed Claude timing ([6aa18e6](https://github.com/nolotus/bun-nolo/commit/6aa18e695fa2503fab6169752fa064499d2411ca))
* **agent:** support Claude Haiku 5.5 and upgrade Claude Code version to 2.1.294 ([465fce9](https://github.com/nolotus/bun-nolo/commit/465fce98709992a2d74e2c190fed16800496955c))
* **agent:** support Devin and Cursor subscription quota probing ([61add26](https://github.com/nolotus/bun-nolo/commit/61add26fcecf7ebc49ef8645661c1b93e182560a))
* **agent:** 出站关联诊断（默认关闭，三条 seam 逐 attempt 配对） ([51c8c06](https://github.com/nolotus/bun-nolo/commit/51c8c06b219fc9b8f02719af108cd630e4f75e57))
* **agent:** 平台接入 Gemini 4 Argon 并下线 Gemini 3.1 Pro ([d784fcd](https://github.com/nolotus/bun-nolo/commit/d784fcd02375737aeaada0df68d49cd533558951))
* **agent:** 订阅通道 live 模型目录（devin-oauth）接入发现/CLI/创建表单 ([64e3c33](https://github.com/nolotus/bun-nolo/commit/64e3c33b44f68781a16d410f37977b3dcd915fbb))
* **ai:** add data-table capability pack and cli subtask fallback ([3088707](https://github.com/nolotus/bun-nolo/commit/3088707d46072be264ee5486dfff2956ac5d2724))
* **ai:** allow pure workspace-link node_modules in verified cleanup ([787edd1](https://github.com/nolotus/bun-nolo/commit/787edd10cd7a2f204f074d8372a4b4044aa4412a))
* **ai:** default to read, plan and delegate; allow same-credential fan-out ([04678bb](https://github.com/nolotus/bun-nolo/commit/04678bb3e688bcf1faa2fadd3a25b67d3792add8))
* **ai:** integrate listRuntimes tool and dynamic surface filtering ([8d78d6b](https://github.com/nolotus/bun-nolo/commit/8d78d6bb604f5e4a148c9e4f2fb6be2d841ac517))
* **ai:** let agents clean up verified-recoverable task leftovers directly ([0c86b3e](https://github.com/nolotus/bun-nolo/commit/0c86b3e24ab5a0b3e69bf2fdaa35bc38f378b99e))
* **ai:** make parallel dispatch the default at the system layer ([5259aa9](https://github.com/nolotus/bun-nolo/commit/5259aa922f56602dda694b249b891da436e440e7))
* **ai:** pick reviewers by model tier, not list position ([a4191bc](https://github.com/nolotus/bun-nolo/commit/a4191bcbe2e0cd683d69b0d606a9e398e1e5146e))
* **ai:** prefer short fast-tier sub-tasks in orchestration prompt ([48fdef5](https://github.com/nolotus/bun-nolo/commit/48fdef5d007b4609915697fdea324608e106f985))
* **ai:** split unconditionally and select agents by domain fit first ([c6cdc79](https://github.com/nolotus/bun-nolo/commit/c6cdc7958bc8447b43185f98c67426a1ffc7eece))
* **ai:** support self-delegation subagents with omitted agentKey ([e2f1d6e](https://github.com/nolotus/bun-nolo/commit/e2f1d6e5b4028fc496d6eedc31b7d36ed4f73b97))
* **app:** apply the handoff OG card content and copy ([1409a65](https://github.com/nolotus/bun-nolo/commit/1409a65b7942ace264dcbd2c0c1f55e0119e7fb0))
* **app:** bring downloads, login and signup onto the home design ([17c1421](https://github.com/nolotus/bun-nolo/commit/17c1421ebb80c2c1a46a1a81731f45d49aef5be3))
* **app:** bring pricing, about, contact and guide onto the home design ([5771702](https://github.com/nolotus/bun-nolo/commit/5771702a3f5838f8ef6939646d79832934aa5ef6))
* **app:** night mode for the guest home and public pages ([474b6af](https://github.com/nolotus/bun-nolo/commit/474b6af5d714d4f9f786a4c110853e2e35b5dd09))
* **app:** redesign the guest home around a team that hands off work ([3e73900](https://github.com/nolotus/bun-nolo/commit/3e73900b8f31bc8df733b4d1ced8fcdf6518cf26))
* **app:** redesign the home OG card around agent handoff ([a78dbda](https://github.com/nolotus/bun-nolo/commit/a78dbda9db1507e403bcc7006fc3f0158b345ec4))
* **app:** remove about and contact pages ([9535f40](https://github.com/nolotus/bun-nolo/commit/9535f40e8fddc835674ee2a01a73471531ef0ef1))
* **chat:** converge agent-run i18n & presentation across Web, RN and TUI ([e6f5bc2](https://github.com/nolotus/bun-nolo/commit/e6f5bc294681cf476621566a6de4b4bae407db62))
* **chat:** polish agent tool call UI and i18n across Web, RN and TUI ([1cce90c](https://github.com/nolotus/bun-nolo/commit/1cce90c6552e2dbdd11867c1e25d6204bf823c33))
* **chat:** progressively reveal top scroll fade ([279c9b5](https://github.com/nolotus/bun-nolo/commit/279c9b520b4aab41a35ba2ea72ab8cf19bf1abe0))
* **chat:** show where tools actually ran on web and desktop ([8f421b2](https://github.com/nolotus/bun-nolo/commit/8f421b2fab106c963f953d8165921e1dd8f829d5))
* **chat:** transcribe 工具支持指定 STT 供应商并透传到单步执行 ([8bc52d5](https://github.com/nolotus/bun-nolo/commit/8bc52d5f2744b5ba50e8c4b9b766ec26c9c7430c))
* **chat:** web media job composer card, persistence, notes page, and W15 context ([010ac52](https://github.com/nolotus/bun-nolo/commit/010ac52122088fe5a5e40f60956ee9055585c338))
* **chat:** 对话内轻交互（show_interaction）：内容与选项同块展示 ([4381e27](https://github.com/nolotus/bun-nolo/commit/4381e27fd807086ea539b2eeb034ba4c81971ddf))
* **chat:** 对话页实时显示后台唤醒并自动重读消息 ([4ef885a](https://github.com/nolotus/bun-nolo/commit/4ef885a68f966d86d01aac2f1ea1ffe2220e0a83))
* **cli:** /switch 支持私有 agent 名称，切换在验证后原子完成 ([60d3f5d](https://github.com/nolotus/bun-nolo/commit/60d3f5de19b3e176da489257d12c8cd17d50d4c2))
* **cli:** add --machine-shell for machine-bound runs ([3b54b2c](https://github.com/nolotus/bun-nolo/commit/3b54b2c8b31a23a7e6b1d2ea34d6460a19d2a6c6))
* **cli:** add `nolo browser` with auto browser pick and paged read-page ([7ce1fae](https://github.com/nolotus/bun-nolo/commit/7ce1faeb27715dd7be671f7ee489de8bbf6d4b3d))
* **cli:** agent picker 热缓存秒开，刷新失败不再冲毁权威缓存 ([a351cb0](https://github.com/nolotus/bun-nolo/commit/a351cb061982c5f8535d42273d5054b45134ff01))
* **cli:** drive OpenCode Go's other three model wires from the local runtime ([dc0552e](https://github.com/nolotus/bun-nolo/commit/dc0552e4e20750419e61260b54385d5801d8518f))
* **cli:** localize non-TUI CLI output for zh/en ([53ffc1b](https://github.com/nolotus/bun-nolo/commit/53ffc1b73fe8227594041917c4fbcb0ac1cc3b0e))
* **cli:** merge --machine-shell for machine-bound runs ([c1cc123](https://github.com/nolotus/bun-nolo/commit/c1cc1231f4359112032cc43df9bb2d5c9943604e))
* **cli:** merge platform secrets store and Firefox 0.1.4 self-updates ([32ea05a](https://github.com/nolotus/bun-nolo/commit/32ea05ae3653de5a711809f03e4b5e1285dffebf))
* **cli:** open TUI transcript links with ctrl+click ([4bd61a3](https://github.com/nolotus/bun-nolo/commit/4bd61a39d8c4b64ef37864d32c25f4b01e5f5f02))
* **cli:** origin-local execution with owner proxy and shell session grant ([aed9937](https://github.com/nolotus/bun-nolo/commit/aed9937cfb284bb5aa736d4062be8317a92a524c))
* **cli:** platform secrets store, secrets-manager skill, Firefox 0.1.4 self-updates ([a5b7eeb](https://github.com/nolotus/bun-nolo/commit/a5b7eebd6c44ba8caa8e26ceb4d3e132953891ec))
* **cli:** report OSC 7501 program status from TUI and one-shot runs ([d07fe13](https://github.com/nolotus/bun-nolo/commit/d07fe135f11009861f3b9c901e5daeecb5ce4af2))
* **cli:** route Gemini-native custom providers over the Gemini wire ([0de2379](https://github.com/nolotus/bun-nolo/commit/0de237901b445edf4c9fe24480514f48442ae170))
* **cli:** speed context in local agent list ([a6b12c8](https://github.com/nolotus/bun-nolo/commit/a6b12c8b597db423fc2a6682717ff646d112f414))
* **cli:** stream OpenCode live events and observe tool execution ([fbdc706](https://github.com/nolotus/bun-nolo/commit/fbdc70669c53170a02c3f9858c09f965f751648e))
* **cli:** TUI 收到部署事件后响铃并在状态区提示 ([bc52f1c](https://github.com/nolotus/bun-nolo/commit/bc52f1cd8eebe71356e90505520c3d1bd4428f1a))
* **cli:** TUI 收藏失败可见化 + 部署生效 watcher ([11fea0d](https://github.com/nolotus/bun-nolo/commit/11fea0dd8d96e7ee8a70a1f2bb2475fd56e51c16))
* **cli:** TUI 收藏失败可见化 + 部署生效 watcher ([246bfba](https://github.com/nolotus/bun-nolo/commit/246bfba85f2558bfe7e096f17b3e9dcd9a870d4a))
* **cli:** turn-billing 审计补逐次调用缓存遥测与离线报告 ([fd4bffd](https://github.com/nolotus/bun-nolo/commit/fd4bffd01724e48cd235ec29bd0172aec9b220d3))
* **cli:** 子 run 结论落盘并在 status 里暴露 resultFile ([9438a5a](https://github.com/nolotus/bun-nolo/commit/9438a5a762f628d4c8223195ed2f208ca7bd72b2))
* **cli:** 本地化 agent run 提示并按 agent 去重 ([d52525f](https://github.com/nolotus/bun-nolo/commit/d52525f1b57e278cfaa6f3775dbda8cef6c7bee0))
* **cli:** 输入区底色真的铺上（默认 terminal 模式也生效） ([dc0b746](https://github.com/nolotus/bun-nolo/commit/dc0b74661b25439d5c87482559090fa4a6daee02)), closes [#181825](https://github.com/nolotus/bun-nolo/issues/181825)
* **cli:** 输入区铺一层 surface 底色 ([1ef00bc](https://github.com/nolotus/bun-nolo/commit/1ef00bc43fb97583d5a736c97b94ad2639c38cab))
* **cli:** 进程退出后在运行区短暂停留 ([fab7d31](https://github.com/nolotus/bun-nolo/commit/fab7d3176490e0fe5f5f755c6651004c1c093d13))
* **compaction:** keep evidence lines and record disproven hypotheses ([69eb0f7](https://github.com/nolotus/bun-nolo/commit/69eb0f759530fffd4880d86209b0f24bf2734445))
* **connector:** support targeted container scrolling and measurements ([1e1e216](https://github.com/nolotus/bun-nolo/commit/1e1e2161d709ab7c1d620506472c3afb697a7858))
* **desktop-chrome-connector:** 浏览器敏感操作不可变挑战与意图授权闭环 ([7ec2e36](https://github.com/nolotus/bun-nolo/commit/7ec2e3620d2965f9785b8560d99231d0e7d5a25f))
* **docker:** deliver a real repository (git bundle) instead of a snapshot ([9f44d12](https://github.com/nolotus/bun-nolo/commit/9f44d12c43e0986139ebaa712b1232d7c4ad1bf8))
* **docker:** deliver the workspace into the sbx sandbox so runs can edit code ([8c35e22](https://github.com/nolotus/bun-nolo/commit/8c35e229f27915482679fda6cee914623fd33519))
* **docker:** run file tools inside the docker sandbox ([c0d5287](https://github.com/nolotus/bun-nolo/commit/c0d5287f830930d9c3e97271a096ceba7ce4abbe))
* **email:** require one-time owner confirmation for external recipients ([8e35002](https://github.com/nolotus/bun-nolo/commit/8e35002828fd3924a21bec15b1e18ac6ef59b430))
* **execution:** local bwrap sandbox for execShell, GCP backend, acceptance harness ([9d80845](https://github.com/nolotus/bun-nolo/commit/9d80845627fac73dbc176ed2d108944db937c027))
* **execution:** provider-agnostic audit, routing and Instabox backend ([0b82fc0](https://github.com/nolotus/bun-nolo/commit/0b82fc0fdbcd237ef9a8e6a15e2a78fc9276d79d))
* **execution:** sandbox-default subagent dispatch with audited multi-backend execution ([957d7e5](https://github.com/nolotus/bun-nolo/commit/957d7e5e08f15440421f396a4ae156d0b7101732))
* **export:** 双语对照按句合并显示（导出与笔记页），带段数/字符/间隔上限 ([af38df8](https://github.com/nolotus/bun-nolo/commit/af38df8acc0af02974f58f2f140849e8b97601bb))
* **home:** pitch-ready landing with ad attribution and funnel tracking ([ad1e124](https://github.com/nolotus/bun-nolo/commit/ad1e12432d4bbee7c43a94b4ad0bd5c028d7c99a))
* **image:** 图片模型换代到 GPT Image 2.5 / Nano Banana 2.1，并按 token 精确记账 ([a1fb0a7](https://github.com/nolotus/bun-nolo/commit/a1fb0a7876aa8716d5d48febdb857107068ea9ff))
* **llm:** 上架 Claude Sonnet 5.5，旧代 Claude 退市并迁移存量 ([f48ed97](https://github.com/nolotus/bun-nolo/commit/f48ed971e0eb27bece4b79827d54f0f229ed429a))
* **media:** default to Deepgram nova-3, drop DeepInfra whisper, allow engine multi-select ([cfcb991](https://github.com/nolotus/bun-nolo/commit/cfcb9910e64e6180d0ff58a51c59564a0d2e516f))
* **media:** drive lecture upload pricing through chat instead of a form ([2832568](https://github.com/nolotus/bun-nolo/commit/28325683e838c36b1166f301f3c4289ad851f33f))
* **media:** honor explicit STT provider selection in runtime ([851f202](https://github.com/nolotus/bun-nolo/commit/851f20224d56edef76bd6e96c53c353a5133b988))
* **media:** register mediaJobTool and close UI interaction gaps ([8d081d7](https://github.com/nolotus/bun-nolo/commit/8d081d725caa181f2939b9af010d711f6d4129ff))
* **media:** support Scribe v2 and CF Whisper with model preferences ([f33d580](https://github.com/nolotus/bun-nolo/commit/f33d58036a5b7d5283e0778a634954e9f676875a))
* **media:** 分阶段通知契约、start 绑定对话与通知幂等存储 ([b926e0f](https://github.com/nolotus/bun-nolo/commit/b926e0f1fb1f40560d8ec5fa2cbb51b0b22e6dd5))
* **media:** 单步媒体卡与「以后 ≤N 不用问」免问按钮 ([1631942](https://github.com/nolotus/bun-nolo/commit/1631942b109e6213a45a53ca007632bf4abd9995))
* **media:** 完成卡改为选格式下载，默认 DOCX ([50ed5d5](https://github.com/nolotus/bun-nolo/commit/50ed5d53b80e3382d39207860aab8b9e1a286875))
* **media:** 新增 4 个原子媒体工具，退役三档 mediaJobTool ([ef71864](https://github.com/nolotus/bun-nolo/commit/ef71864794413fe3e445a601e24ab349cc5a74e8))
* **media:** 翻译改为 agent 能力，译文由 agent 写回任务 ([940bb1d](https://github.com/nolotus/bun-nolo/commit/940bb1d1770729543a9d5f1c269ac1357bdf1ee2))
* **media:** 转写后翻译确认绑定执行代次与只读就绪检查 ([4507715](https://github.com/nolotus/bun-nolo/commit/4507715869366b9f4b31ab40893309c87a2ced30))
* **media:** 转写阶段接入 STT 兜底链，按 Modal T4 成本计费 ([01d165f](https://github.com/nolotus/bun-nolo/commit/01d165f9e0eda8cfb38b89865bf50787c43026d1))
* **media:** 阶段委派（agent-first）pipeline 语义 + 委派模块 + 接线（缺省仍 provider） ([5b3d5d1](https://github.com/nolotus/bun-nolo/commit/5b3d5d1765892cc796eeca0deb3b84817c853578))
* **models:** 价格页下线旧代模型并上架 Claude Haiku 5.5 ([7401270](https://github.com/nolotus/bun-nolo/commit/7401270de7196d2243c8e1152d408dac27b5e30c))
* **pricing:** agent 卡片与详情页显示缓存价格 ([3798bca](https://github.com/nolotus/bun-nolo/commit/3798bca714795785c35cc445b741f8b5934d3a68))
* **pricing:** 模型价格表改综合排序，并重构为三层结构 ([c9f414e](https://github.com/nolotus/bun-nolo/commit/c9f414ed8ee16eba4893153bb3e90e7f2e9ad81a))
* **prompt:** enforce mandatory concurrency in system instructions without user query ([ce68652](https://github.com/nolotus/bun-nolo/commit/ce68652f960fdcac68c9a0d3de53bdbe14d21e16))
* **providers:** add LithosAI as a metered provider preset ([0c78177](https://github.com/nolotus/bun-nolo/commit/0c78177ae19b05b326fb7d11d831d301976cc11a))
* **remote-task:** 远程任务可见性契约与端到端控制面打通 ([c07bf87](https://github.com/nolotus/bun-nolo/commit/c07bf87d15bb9cf3017d2965404e049dd62249c7))
* **render:** iframe artifact data channel, event whitelist, and lecture overview ([8d52279](https://github.com/nolotus/bun-nolo/commit/8d52279fa1d4718eb8bd5ebac7139ab53086813e))
* **render:** wire structured preview targets, secure html artifact hosting and workbench split ([9d9b817](https://github.com/nolotus/bun-nolo/commit/9d9b817e4ca4d65e3c87feb1ee77902d50331fb8))
* **rn:** show where tools actually ran ([4e8bf32](https://github.com/nolotus/bun-nolo/commit/4e8bf32ba73f98a61781da70ec48149728328baf))
* **routing:** route the default deepseek-flash agent to LithosAI during official peak ([df7fe1a](https://github.com/nolotus/bun-nolo/commit/df7fe1a0acf813ad02c6b03b7f65c644e13869d3))
* **runtime:** add docker cloud sandbox execution backend ([4f0fbad](https://github.com/nolotus/bun-nolo/commit/4f0fbad3f7f22a31f8719351437df1940bb55861))
* **runtime:** add docker runtime readiness probe with closed gate ([20d500c](https://github.com/nolotus/bun-nolo/commit/20d500caaa0b54438dd9c0b4cedadc822c38680e))
* **runtime:** add standalone ExecutionLease authority validation ([#112](https://github.com/nolotus/bun-nolo/issues/112)) ([09bed0f](https://github.com/nolotus/bun-nolo/commit/09bed0fcb8c66731bd5fb4a6b44e1c22d699f566))
* **runtime:** experimental fail-closed Bubblewrap ExecutionBackend (not wired) ([55f4fa0](https://github.com/nolotus/bun-nolo/commit/55f4fa02613697f61850f9627b1d5c9ccf15f6cc))
* **runtime:** explicit machine placement decisions without changing dispatch ([#123](https://github.com/nolotus/bun-nolo/issues/123)) ([5d04c49](https://github.com/nolotus/bun-nolo/commit/5d04c491b9751cdc63561c6992683799a80e518a))
* **runtime:** integrate docker unified quota admission and entry script ([b3cfb36](https://github.com/nolotus/bun-nolo/commit/b3cfb36ab171a862e34efc5265fed2a872e8fa9e))
* **runtime:** land ExecutionBackend protocol on alpha ([#110](https://github.com/nolotus/bun-nolo/issues/110)) ([a63f3b7](https://github.com/nolotus/bun-nolo/commit/a63f3b72c26fb71ae3e469d2a0d7760072b44ed3))
* **runtime:** land RunGrant shared protocol on alpha ([#107](https://github.com/nolotus/bun-nolo/issues/107)) ([7bf0723](https://github.com/nolotus/bun-nolo/commit/7bf072374d6720bca6516b03f65172ea6d8a905e))
* **runtime:** let subagents run docker workloads with bound-owner admission ([6c71277](https://github.com/nolotus/bun-nolo/commit/6c7127768b0a406bdbeac5a7efc7f51772319e78))
* **runtime:** non-invasive cross-surface shell execution observation ([#120](https://github.com/nolotus/bun-nolo/issues/120)) ([38d9aad](https://github.com/nolotus/bun-nolo/commit/38d9aad006d3e1c59d3d422ce223e05d1d1aeeec))
* **runtime:** non-invasive shell request shape observation ([#121](https://github.com/nolotus/bun-nolo/issues/121)) ([cebfe6a](https://github.com/nolotus/bun-nolo/commit/cebfe6a62938bbaffdbfdc4ba153c75ecf4685b6))
* **runtime:** separate RunGrant read/write authority ([#109](https://github.com/nolotus/bun-nolo/issues/109)) ([11b2d82](https://github.com/nolotus/bun-nolo/commit/11b2d8213b8fcad2262ff3ac9b6d8bcdfb973b6b))
* **runtime:** support per-dialog runtime target selection across machines ([d473bd5](https://github.com/nolotus/bun-nolo/commit/d473bd58cb6d4faa628a37a7cf00b969cdcef075))
* **server:** durable media job pipeline with quote, idempotent ledger, and resume ([95796ac](https://github.com/nolotus/bun-nolo/commit/95796ac4aee58de6f1c2d093debf58e57ef763e9))
* **server:** route platform Claude/GPT through Cloudflare ([7a89e38](https://github.com/nolotus/bun-nolo/commit/7a89e38b97f9b2f10471dddb63be72fe1b295301))
* **server:** stream anthropic thinking deltas as reasoning_content frames ([ce90613](https://github.com/nolotus/bun-nolo/commit/ce906134ced20a801552a6642d6a4e43cf7b74d2))
* **server:** verify origin machineId against caller connector registry ([a4f3334](https://github.com/nolotus/bun-nolo/commit/a4f333426c92cea45d03a829b4bf4dc3b56235aa))
* **server:** wire cloudflare containers quota and widget with auth guard ([61f956b](https://github.com/nolotus/bun-nolo/commit/61f956b2d8c5075ed3688eb90037070775398dd4))
* **server:** 服务端 mediaJobTool 执行器与真实报价卡直连路径 ([0d63b1f](https://github.com/nolotus/bun-nolo/commit/0d63b1fdd7884ac403b45d4f9baeda22bd918920))
* **server:** 机器工具路由加权限门，写授权默认拒绝 ([a8cd9c6](https://github.com/nolotus/bun-nolo/commit/a8cd9c61b5dde7177d727e7e6f8e119a96c8f8da))
* **settings:** 媒体自动执行额度设置页与专属写入端点 ([4d20554](https://github.com/nolotus/bun-nolo/commit/4d20554d267c9a6ea6cc2e822cd5800c6f671058))
* **skills:** formalize three-layer preview specification and alignment ([2f6e895](https://github.com/nolotus/bun-nolo/commit/2f6e895c2c73a31d2d470ae06b37dd3e0fc0ddb2))
* **space:** 侧栏行内改置顶、「加入对话」移入更多菜单 ([165dab6](https://github.com/nolotus/bun-nolo/commit/165dab6a427b050a16bfe6dae4604cbf05d3085d))
* **space:** 空间同名文件保留历史版本并封堵文件读写安全缺口 ([cb80648](https://github.com/nolotus/bun-nolo/commit/cb80648f747f0a83ec788e60e93343c8143f8f8f))
* **table:** 多选自定义筛选、看板自定义分组与顶栏安全改名 ([3976d91](https://github.com/nolotus/bun-nolo/commit/3976d911a16192fbd976e48c838b924bba83cc93)), closes [#154](https://github.com/nolotus/bun-nolo/issues/154)
* **theme:** unify default app appearance with nature landing palette ([b64be57](https://github.com/nolotus/bun-nolo/commit/b64be57cc1c772820db50aa7912a3dcacc450f07))
* **tools:** add execution semantics contract ([aa3691d](https://github.com/nolotus/bun-nolo/commit/aa3691d840bc91b113ff18310f62dc09c3d4d993))
* **transcribe:** resolve Douyin links over plain HTTP without desktop browser ([9aec593](https://github.com/nolotus/bun-nolo/commit/9aec593bbcc10a6cd779a1e8ab3a1a7ede6495c9))
* **tui:** add cached self-review prompt for /learn ([da255d5](https://github.com/nolotus/bun-nolo/commit/da255d5c78705f769e760e74e449787f6ebc71ea))
* **tui:** add Jev-backed historical learn ([b2bdfb6](https://github.com/nolotus/bun-nolo/commit/b2bdfb62e1966fd29815c9d7e5e983d6dde87bcf))
* **tui:** audio/video drag-and-drop transcription with trim and denoise ([f4a498d](https://github.com/nolotus/bun-nolo/commit/f4a498d6f4c60e737c87063365f12e2b11bbbacb))
* **tui:** merge /learn + Evolution Deep Review followup into alpha ([d6c1b2c](https://github.com/nolotus/bun-nolo/commit/d6c1b2c9348d2f8ed508534d1545a1fe3f491093))
* **tui:** render PNG attachments inline via the kitty graphics protocol ([ab5f912](https://github.com/nolotus/bun-nolo/commit/ab5f912d7e1f2cc30cf8a422476ef86a13d79fff))
* **tui:** wire /learn into current dialog ([558a43d](https://github.com/nolotus/bun-nolo/commit/558a43d3352b759dcdd068a4cae393e16362bcc6))
* **web:** unify guest login/signup with the home landing look ([fa7e36b](https://github.com/nolotus/bun-nolo/commit/fa7e36b72cc9d4ec3cc799f24e50e798e3f79b09))

### Bug Fixes

* **agent-inbox:** 解码 quoted-printable 正文并按 HTML 渲染 ([bbcecc2](https://github.com/nolotus/bun-nolo/commit/bbcecc2e31d218666cdc93c634c4112906f47110))
* **agent-runtime:** keep capability-pack write tools out of read-only runs ([56787f1](https://github.com/nolotus/bun-nolo/commit/56787f187673693efcc0e9f6b12a0e4fe2ac933c))
* **agent-runtime:** keep reasoningEffort=max end to end ([8813115](https://github.com/nolotus/bun-nolo/commit/8813115952c52e9428789943a92298cbe73ee0bb))
* **agent-runtime:** merge tool history pairing repair into alpha ([7789f4f](https://github.com/nolotus/bun-nolo/commit/7789f4f8b7253827c258017423ba17fe6efaea30))
* **agent-runtime:** pair replayed tool results within contiguous turns ([1934ab3](https://github.com/nolotus/bun-nolo/commit/1934ab3d806fcf8af55056f5d42f2babd5e05775))
* **agent-runtime:** read GCP Cloud Run job output from Cloud Logging ([5dba399](https://github.com/nolotus/bun-nolo/commit/5dba39968b5b3daba56b6a1afbf82e37a79d46ab))
* **agent-runtime:** replay a reasoning placeholder for opencode-go deepseek ([b5d2c11](https://github.com/nolotus/bun-nolo/commit/b5d2c11f53a02af9c80868f94bfd972e93dbc258))
* **agent-runtime:** runtime 侧平台 chat body 也收敛 luna 的 tools+reasoning_effort ([6481c2a](https://github.com/nolotus/bun-nolo/commit/6481c2a482e2a0b87f56a6a517618c248f30e462))
* **agent-runtime:** tolerate sbx warning lines before the cloud sandbox listing ([db706ad](https://github.com/nolotus/bun-nolo/commit/db706ad9b5d83b5e3b0735040595cbd4adc5f9ac))
* **agent-runtime:** writeTranslations 登记进只读阻断名单 ([8541586](https://github.com/nolotus/bun-nolo/commit/85415864544ff6bedd0ffae510eb63803aba19e7))
* **agent-runtime:** 统一平台 Agent 代码目录权威覆盖根治历史旧模型残留 ([c430005](https://github.com/nolotus/bun-nolo/commit/c430005c4adf2127a8c840203a3b31aa96edc379))
* **agent-run:** 宿主派发补传 --allow-host-writes，避免子 run 秒级 orphaned ([ac4f629](https://github.com/nolotus/bun-nolo/commit/ac4f6291e4a95d0b998c3e3954e2e1d543b5e6b8))
* **agent-run:** 收口五处「按 key/指针读取后不校验记录身份」 ([03b3788](https://github.com/nolotus/bun-nolo/commit/03b37884a0ae8ea9ddb85e264ccf2ca902e01270))
* **agent:** align cancel and session semantics across the custom native wire channels ([04654c6](https://github.com/nolotus/bun-nolo/commit/04654c67e412196bbe6682d68edf884bf887c00c))
* **agent:** bound compaction retry and fall back to the platform summary ([8545949](https://github.com/nolotus/bun-nolo/commit/85459490bae452dd748873ce2216068b94618c26))
* **agent:** bound control list output and preserve pagination identities ([def1309](https://github.com/nolotus/bun-nolo/commit/def13090be09d3217c475a346f966e72603a0e24))
* **agent:** classify subscription endpoints as user_subscription ([590d4c4](https://github.com/nolotus/bun-nolo/commit/590d4c416653a804f34d9561c7ed4c67dc4a66a2))
* **agent:** keep independent delegated tasks parallel ([d32bafc](https://github.com/nolotus/bun-nolo/commit/d32bafc4a50b5204ad7a0239f305b86272e1f086))
* **agent:** keep OAuth provider refs when credential sync is on ([c9b3be1](https://github.com/nolotus/bun-nolo/commit/c9b3be1d6e22521fd4f9fc3f7377c567a4bb8a77))
* **agent:** let a record's own custom provider key outrank a stale apiKeyRef ([1a9a8a3](https://github.com/nolotus/bun-nolo/commit/1a9a8a3313b6795d7a6826788232975ac68a780a))
* **agent:** make the custom native wire endpoint resolution idempotent ([6b8359e](https://github.com/nolotus/bun-nolo/commit/6b8359e8d0f631ef1c06dedbd3bf007f3b87b537))
* **agent:** pairing 整体剥离的降级工具轮补来源标记 ([df7c5b7](https://github.com/nolotus/bun-nolo/commit/df7c5b71053cd0714e60bd257a4fa553ab0cc059))
* **agent:** preserve incremental handoff and authorized task continuity ([5526fa6](https://github.com/nolotus/bun-nolo/commit/5526fa67f9600355fc4734d54454e9b419b98bdc))
* **agent:** require task titles across delegated run surfaces ([6637247](https://github.com/nolotus/bun-nolo/commit/66372478741f19ed33ec9904a97c5feed52e5d58))
* **agent:** route the gemini native wire to the inference base on opencode.ai ([8767f31](https://github.com/nolotus/bun-nolo/commit/8767f31b288337d57c74dd03001767d885dab54b))
* **agent:** validate the antigravity Cloud Code host by parsing, not substring matching ([caeaecc](https://github.com/nolotus/bun-nolo/commit/caeaecc51121d787ccc86f3d3ade0753ad8b7dcb))
* **agent:** 专属线真增量流式翻译 + reasoning 保真（修「模型返回了空响应」） ([03afe05](https://github.com/nolotus/bun-nolo/commit/03afe053342085d3f451b1dfa424be10f39f8502))
* **agent:** 公开 agent 缺 DB 记录时可解析（收藏/TUI 可见） ([cf3fe4e](https://github.com/nolotus/bun-nolo/commit/cf3fe4e8281b3b58bb53a8baceda9d38e4d849f2))
* **agent:** 内置 agent 身份按 catalog id 认定，覆盖 owned key 形态 ([24acd96](https://github.com/nolotus/bun-nolo/commit/24acd967187d3cce71940a789afd68d40f79b1c2))
* **agent:** 压缩超时的取消接线与失败分段埋点 ([fd67c62](https://github.com/nolotus/bun-nolo/commit/fd67c622215fe4cd8e93b1f30ff2e28449879ed9))
* **agent:** 将 show_interaction 登记进 Web 服务端托管审计基线 ([c052e09](https://github.com/nolotus/bun-nolo/commit/c052e09268506c249fca0742d5d5d527752f3806))
* **agent:** 工具参数分类文案改为形状描述，去掉因果断言 ([150616d](https://github.com/nolotus/bun-nolo/commit/150616d6c54b0139655335e19eb5e76f936bd364))
* **agent:** 工具参数错误按类别区分文案（截断 vs 语法非法） ([25df747](https://github.com/nolotus/bun-nolo/commit/25df747c2cac735ef8a3c3d4519a7b9bcc3461f9))
* **agent:** 显式化 transport 判定的 host 分歧，并修正 IPv6 loopback 误判 ([b53b401](https://github.com/nolotus/bun-nolo/commit/b53b4012cf2c198da609941428a70919bfb73c95))
* **agent:** 服务端 agent run 发往任何 provider 的平台文件图片统一内联 ([9a861c1](https://github.com/nolotus/bun-nolo/commit/9a861c15f0e2f59d3867b296c773fd6a46e7aed4))
* **agent:** 统一 DeepSeek thinking 回放占位到活跃出站 seam ([841477e](https://github.com/nolotus/bun-nolo/commit/841477e1ba10d3ae76e1758f7ff4099995ed76e0))
* **agent:** 补 reasoning 回放盲区（降级来源跨 sanitize 保留）+ 事故记录重构 ([d8b1939](https://github.com/nolotus/bun-nolo/commit/d8b1939ceb2c762ad3146148c614f3511f3f39ee))
* **ai:** ask_user 入参语义校验，两个入口都拒绝非法题面 ([3bc0cda](https://github.com/nolotus/bun-nolo/commit/3bc0cda121533fb18c7218bcd7b1b6963bae9a77))
* **ai:** ask_user 描述补上「界面自带其他输入行」的约束 ([86514f7](https://github.com/nolotus/bun-nolo/commit/86514f7e73cebfc2d0cffacc93cca891233eaaf9))
* **ai:** gate review family preference and domain evidence order ([5d715d5](https://github.com/nolotus/bun-nolo/commit/5d715d53affc8454ca4a711b7a7f120991974cbb))
* **ai:** gemini-4-argon 改按官方促销价计价 ([a096995](https://github.com/nolotus/bun-nolo/commit/a0969950abc7baa88e84fa3be3ca3755345e6456))
* **ai:** recognize GPT-6.1 Sol 500k context window ([c452bf2](https://github.com/nolotus/bun-nolo/commit/c452bf22af14946f4811358b2f70f0ab9383e859))
* **ai:** require an unfiltered agent sweep before declaring a channel exhausted ([dd2b3d4](https://github.com/nolotus/bun-nolo/commit/dd2b3d4fd89b48e9f819df4ff2373a7e22540446))
* **ai:** 不再向模型声明 ask_user 的 recommended ([a34b96d](https://github.com/nolotus/bun-nolo/commit/a34b96d75fdb633de5e3bcb58f1849698699eee4))
* **ai:** 严格禁止在有可用候选时派自身review并删除矛盾旧豁免 ([f84a8ef](https://github.com/nolotus/bun-nolo/commit/f84a8efe84a2f1e1baf5dfb779ee11534550a773))
* **alpha:** 修掉合并后在 alpha 上新增的 5 个门禁失败 ([99dfbab](https://github.com/nolotus/bun-nolo/commit/99dfbab4f9c63d5079d168b4810a1c7a133336aa))
* **app:** complete home landing locales and keep quiet footer on the UI scale ([fe7a764](https://github.com/nolotus/bun-nolo/commit/fe7a7640183cce12ec1773f6df74362020823d32))
* **app:** graceful empty favorites fallback and suppress DrawerLayout deprecation in dev ([b406c6b](https://github.com/nolotus/bun-nolo/commit/b406c6bf66f33532c812feb07cb918ced379026a))
* **app:** snap downloads page css back to the ui scale ([e8acedd](https://github.com/nolotus/bun-nolo/commit/e8aceddbd93e8d380ba53c38e54c236544816864))
* **app:** 放行 foreground-turn 系列的 Redux 读端并收紧 3 个过期白名单条目 ([67a691a](https://github.com/nolotus/bun-nolo/commit/67a691aa9ad5a717f3969c489307f3502a7bfba8)), closes [#80](https://github.com/nolotus/bun-nolo/issues/80)
* **app:** 课程笔记页样式接入与渲染修复（空大纲崩溃/音频 404/错误文案） ([216476b](https://github.com/nolotus/bun-nolo/commit/216476bbdd0e481e21e6e4aa41bdbb3f251985fc))
* **auth:** align login and register targets with runtime origin and prevent redirect loops ([e7c6b11](https://github.com/nolotus/bun-nolo/commit/e7c6b112cd65ff511a57c37d735710855e026f88))
* **auth:** guard auth submit buttons until hydration to prevent premature native submission ([7061199](https://github.com/nolotus/bun-nolo/commit/7061199c0251e1fb359110b51018740672c0fbdf))
* **auth:** satisfy personalization onboarding source contract in useRegister ([e99f0ba](https://github.com/nolotus/bun-nolo/commit/e99f0ba547c481eda771de2915457f6b6169c7a4))
* **auth:** update Codex OAuth client version to 0.162.1 ([3ece27d](https://github.com/nolotus/bun-nolo/commit/3ece27d32b1592b5c42073b6dbd55cd622f083c2))
* **auth:** 统一高阶模型199充值门槛判定并补齐服务端调用计划拦截 ([0caa561](https://github.com/nolotus/bun-nolo/commit/0caa56133a8b662118fecda528956f81920655d1))
* **billing:** give the charge ledger a contract-compliant store ([f1825bf](https://github.com/nolotus/bun-nolo/commit/f1825bf43c41e4f01719175d8fc17ad82572edc2))
* **billing:** 计费记录/统计幂等收口，并修删号跨用户连坐 ([4d16edf](https://github.com/nolotus/bun-nolo/commit/4d16edf88636a0f6c4d6774512a3169ad6adaf0c))
* **build:** stop the web bundle from pulling server-only docker modules ([67019fb](https://github.com/nolotus/bun-nolo/commit/67019fbe792bf67d77752c4ecddf8372d02331d8))
* **build:** 客户端构建不再把 node:child_process 拉进 web 图 ([539304b](https://github.com/nolotus/bun-nolo/commit/539304bfe0ea73abb2b2474963099a0949efbdb6))
* **chat:** allow audio and video in the course file picker ([72981af](https://github.com/nolotus/bun-nolo/commit/72981afaa8cb3e5658385a21a7b4caca5efcb7b3))
* **chat:** bind runtime target badge name to its machine identity ([f092587](https://github.com/nolotus/bun-nolo/commit/f092587ee9348a8d8a5d566f51aed53cca0c4019))
* **chat:** bound the history read by progress, not a fixed deadline ([9b85450](https://github.com/nolotus/bun-nolo/commit/9b85450e1f96b4849eca6328117fe44196af7e12))
* **chat:** check auth before reading agent config in server-owned gate ([14ee38c](https://github.com/nolotus/bun-nolo/commit/14ee38ca7d619f075b7c52ed3cd78a09ea6f4588))
* **chat:** degrade malformed execution location input to unknown ([3fd1e7a](https://github.com/nolotus/bun-nolo/commit/3fd1e7af747fa6ad990020d7d72e88c1ecef53b7))
* **chat:** honour explicit machine targets on desktop turns ([8c779ed](https://github.com/nolotus/bun-nolo/commit/8c779ed141172380e91e2c31e4569079ce62e2e6))
* **chat:** keep recovering a reentry turn instead of going silent ([e6d7dab](https://github.com/nolotus/bun-nolo/commit/e6d7dab47eda6dd713a4e83a5489c6f23d466903))
* **chat:** keep tool confirm cards alive across reloads and stop re-execution ([3e433c4](https://github.com/nolotus/bun-nolo/commit/3e433c43e10ec2d129f6aa4c9ab95328bbd6dae9))
* **chat:** mount the tool confirm bar on tool-loop narration rows ([6b3eaaa](https://github.com/nolotus/bun-nolo/commit/6b3eaaa26e4dba423426907e71c94a0d06e3e061))
* **chat:** move runtime target badge styles into a compiled styles module ([ab9fa25](https://github.com/nolotus/bun-nolo/commit/ab9fa25104312e33ea698dc2dd384820250a2b37))
* **chat:** preserve media quote tiers and reveal pending course choices ([7c932ae](https://github.com/nolotus/bun-nolo/commit/7c932aee2261bf61c499b50a9b4a8e5bb4fb3689))
* **chat:** preserve safe routing diagnostics in copied dialog reports ([030d97d](https://github.com/nolotus/bun-nolo/commit/030d97d89a6d42cff4e3e458e7f85d55e67c99ec))
* **chat:** show chat history without waiting on stale sources ([6bb0a8a](https://github.com/nolotus/bun-nolo/commit/6bb0a8acd210587bb2ade9c4a2ccb50add7f0514))
* **chat:** show media upload card instantly with progress on drop ([f6d443e](https://github.com/nolotus/bun-nolo/commit/f6d443e1fde129cc543a03fe965f93699464db4d))
* **chat:** unify attachment readers and preserve media context across turns ([c050a68](https://github.com/nolotus/bun-nolo/commit/c050a687b012a160cfb48393b7ca2a6e3a939863))
* **chat:** 上游 401/403 使用独立文案，并修正 glm-5.3-flash 上游模型 id ([d752334](https://github.com/nolotus/bun-nolo/commit/d7523347999c5de2c55b863fdd6a1b61bbed68b1))
* **chat:** 上游 401/403 使用独立文案，并修正 glm-5.3-flash 上游模型 id ([be63bca](https://github.com/nolotus/bun-nolo/commit/be63bcac5f01d3ee617e4e8b2368ca52be683b9b))
* **chat:** 写入未落库时不再发起 keyless 读取，并补齐已知 dialogKey ([8ff17ec](https://github.com/nolotus/bun-nolo/commit/8ff17ec011060b13e7416f18757ee8c7002b2ed6))
* **chat:** 前台轮 done 即收工、canonical 补读带完整 key、阶段埋点 ([6fbe39a](https://github.com/nolotus/bun-nolo/commit/6fbe39aa934249b14a6905a689568f16622ac2c0))
* **chat:** 合并写入未落库时不发 keyless 读取（fix/dialog-write-before-read） ([c31bb45](https://github.com/nolotus/bun-nolo/commit/c31bb4581a2e315f92f8cf4f927bfe40fa46f9ad))
* **chat:** 媒体卡「打开笔记」可点击，档位卡补译文语言选择并修正高亮 ([e32b963](https://github.com/nolotus/bun-nolo/commit/e32b9636e485bfa5b8c6b938e3a956655280afd1))
* **chat:** 媒体卡挂载对账服务端真值，确认后冻结并补全进度信息 ([0b01bd8](https://github.com/nolotus/bun-nolo/commit/0b01bd8345366870cfb70d4a1eaee4dda4be6080))
* **chat:** 媒体步骤卡 quoted 状态可开始转写，完成卡可直接下载 TXT ([62c6ad3](https://github.com/nolotus/bun-nolo/commit/62c6ad3705191980cbd8b12f7f9f9c77c2028359))
* **chat:** 客户端出站 seam 补齐 reasoning strip 通道，三 seam 判据对齐 ([ba3ffd1](https://github.com/nolotus/bun-nolo/commit/ba3ffd1ea73457aab978265df00974bff7944e0a))
* **chat:** 带下载入口的媒体产出卡默认展开，不再被折叠吞掉 ([612df63](https://github.com/nolotus/bun-nolo/commit/612df63fef0830764afa85dd5b325a6c8534571e))
* **chat:** 平台凭据缺失时引导登录而非显示原始 401 ([8af73bd](https://github.com/nolotus/bun-nolo/commit/8af73bd1b3ed8dd1f8766027d7d743358c7e1778))
* **chat:** 并入 C 修正提交（移除读闸门，保留 dialogKey 透传） ([e6ab920](https://github.com/nolotus/bun-nolo/commit/e6ab92078dea3307fb1aaa6bf89b2d21b59fc093))
* **chat:** 恢复 compact 工具组的层级缩进 ([056421f](https://github.com/nolotus/bun-nolo/commit/056421f841dfac5e5ad2d8d05b2d5628ba86f3f2))
* **chat:** 生图失败错误分类与 Gemini 工具签名回放 ([ae1aa10](https://github.com/nolotus/bun-nolo/commit/ae1aa10e98df640f9c2a66add54427e2e9e53475))
* **chat:** 移除与 initMsgs 契约冲突的读闸门，保留 dialogKey 透传 ([6015bc6](https://github.com/nolotus/bun-nolo/commit/6015bc6c58874c333f28beffbce3d9914714b3a5))
* **chat:** 非流式回包按实际发出 wire 解析，服务端补 Responses→chat 保险 ([38ce760](https://github.com/nolotus/bun-nolo/commit/38ce760a38752bd0191c7063ad97067af892d867))
* **chat:** 首页占位输入框上传按钮一次点击即打开文件选择器 ([bd88650](https://github.com/nolotus/bun-nolo/commit/bd88650122b58428b26781bd81ba3450d44371c1))
* **chrome:** default the connector upload root to ~/.nolo/uploads ([016b7c6](https://github.com/nolotus/bun-nolo/commit/016b7c63013289149d604bf34b355ad4000012b9))
* **ci:** compare identical exact test files in pre-push baseline gate ([70c8ccf](https://github.com/nolotus/bun-nolo/commit/70c8ccffa21c6f4e9082f7674590fc0e59c79e09))
* **ci:** keep untracked local drafts out of the push test gate ([200e105](https://github.com/nolotus/bun-nolo/commit/200e105f894eb90501326c2cdc1a7018a57c1f3a))
* **ci:** sync the push-scope expectations, and stop new test files from blocking pushes ([dbdf4ff](https://github.com/nolotus/bun-nolo/commit/dbdf4ff6c9e6609db2170593b2362bc7fbbe8629))
* **cli:** 402 余额不足识别与紧凑显示，并清理 statusInferred 死字段 ([798cdee](https://github.com/nolotus/bun-nolo/commit/798cdee07766eea1efb968042dd4fabeed6a2096))
* **cli:** 429 失败提示压缩为跟随 locale 的 3 行并去重噪音 ([6126190](https://github.com/nolotus/bun-nolo/commit/6126190357e30a39b685feed84f1c7a26aa78b83))
* **cli:** align tui orchestration tools and localize labels ([6e4f566](https://github.com/nolotus/bun-nolo/commit/6e4f566139e5cec909a2fcf3560312eb01a83420))
* **cli:** ask_user 文本上屏前统一清洗（转义/控制字符/凭据） ([2793777](https://github.com/nolotus/bun-nolo/commit/2793777813f9746c65b18405b3a66f2b6ffffc26))
* **cli:** attribute the connector precheck to the connector hint ([4f1bcde](https://github.com/nolotus/bun-nolo/commit/4f1bcdedc416f26761902a8f3482be5de26a44ff))
* **cli:** avoid ephemeral port collisions for the local authority broker ([34d5051](https://github.com/nolotus/bun-nolo/commit/34d50517855e31b18384334780e1a5b5c63d1c32))
* **cli:** clarify shared subscription notice ([afe1e7b](https://github.com/nolotus/bun-nolo/commit/afe1e7bb318f53076a368c17b65bf8e0d3fca33d))
* **cli:** discover standard OpenCode user installation ([c3a90ae](https://github.com/nolotus/bun-nolo/commit/c3a90ae4bb7b2cb40139a41a9f688f6d9681d858))
* **cli:** distinguish agent creation from provider verification ([96bb953](https://github.com/nolotus/bun-nolo/commit/96bb9531b19352a97a1b2f97c62bd6914755b6bc))
* **cli:** explain 429 cooldown recovery and auto-clear on quota reset ([37d63f2](https://github.com/nolotus/bun-nolo/commit/37d63f2106c41f9a147364c639d781b3f4934beb))
* **cli:** gate the platform gemini sentinel by the model that actually reaches upstream ([b2423ec](https://github.com/nolotus/bun-nolo/commit/b2423ec4961a22291df7691c7d14b4205b328d5a))
* **cli:** implement per-call shell approval bridge for shared agents ([fa9e8f4](https://github.com/nolotus/bun-nolo/commit/fa9e8f43998b6fea0b38c8cd7ca01e541f423977))
* **cli:** integrate Codex cancellation and phase diagnostics ([ae5a6ab](https://github.com/nolotus/bun-nolo/commit/ae5a6ab626448d2f669831f36ec776a3656a0f63))
* **cli:** keep the TUI run panel scoped to the current dialog ([b3b4bfb](https://github.com/nolotus/bun-nolo/commit/b3b4bfbf29ef74b1ea00e82bfd0284d85e2aa566))
* **cli:** keep Web/UI dependencies out of the CLI bundle graph ([c9e2cbf](https://github.com/nolotus/bun-nolo/commit/c9e2cbf7d517ed6add4621f804feda7c773409d3))
* **cli:** let the local run branch accept runtimeKey=local ([0cc50ce](https://github.com/nolotus/bun-nolo/commit/0cc50cecb7901ac54b3a5e99acc0aa61e4a6cfd9))
* **cli:** merge remote dialog history restore ([e48a05c](https://github.com/nolotus/bun-nolo/commit/e48a05ca2cbbd418bc9499230abe35039718bfac))
* **cli:** narrow string type in shell command preview ([a49f57e](https://github.com/nolotus/bun-nolo/commit/a49f57e84c0973779218505aca5bf5c29a08fd2d))
* **cli:** pin ps locale when reading process start time ([55984cd](https://github.com/nolotus/bun-nolo/commit/55984cd0894e02d859c9367ac0ffaed524048263))
* **cli:** point owner_origin_mismatch 403 at the missing connector, not credentials ([4b38641](https://github.com/nolotus/bun-nolo/commit/4b386417233a642f8ee71f86f5957764ae2817b4))
* **cli:** preserve local authority database ownership ([7bfd253](https://github.com/nolotus/bun-nolo/commit/7bfd2532535a7cd40983d8da0db55bebf8665c56))
* **cli:** propagate Codex cancellation and trace request phases ([548ff9a](https://github.com/nolotus/bun-nolo/commit/548ff9ae2ca066d1ffbb358eb3580bd474848bb5))
* **cli:** refresh the TUI switcher without reviving deleted agents ([c0a17ab](https://github.com/nolotus/bun-nolo/commit/c0a17abf403afa5e8c0ca753c549b9fce28f3971))
* **cli:** report Chrome and Firefox connector status independently ([add35e9](https://github.com/nolotus/bun-nolo/commit/add35e9ffd8f9cba17cf7aa86692d555266d06aa))
* **cli:** report idle instead of done when a run's stream is interrupted ([1df0430](https://github.com/nolotus/bun-nolo/commit/1df0430625521ff59ded3f0bba408edb33c4c357))
* **cli:** restore remote dialog history when the local copy is empty ([eb008d8](https://github.com/nolotus/bun-nolo/commit/eb008d897a8778fca1641dabbbdaee851c5b8fa8))
* **cli:** restore the bundle boundary so the publish artifact builds ([771d81b](https://github.com/nolotus/bun-nolo/commit/771d81b9395a20a1e3f6ecbb46c91e99a72972ce))
* **cli:** route shared OAuth agents to the local owner proxy in auto mode ([f91fce6](https://github.com/nolotus/bun-nolo/commit/f91fce61bf28e9a6189b9d0d57fbc6d2813f1ed5))
* **cli:** startAgentRun 遇到非本地 runtimeKey 直接报错 ([3b5a2c8](https://github.com/nolotus/bun-nolo/commit/3b5a2c8e290a5d1c0e8d4a0397e57793bf3ad3c4))
* **cli:** stop blaming /switch history for every invalid_request_error 400 ([14db24f](https://github.com/nolotus/bun-nolo/commit/14db24f3827c01cdaa951e732bc9ab5958f03e35))
* **cli:** strip admission OVERRIDES fields from owner-required chat body ([9d01235](https://github.com/nolotus/bun-nolo/commit/9d01235f3c1097a6ddc1228efb46da5642b27e42))
* **cli:** surface HTTP failure before owner route ack and classify owner proxy ([4b6d24f](https://github.com/nolotus/bun-nolo/commit/4b6d24fbc90f03ebc600969fc7780d7419c3484b))
* **cli:** treat --prompt "" as explicit prompt clearing ([65a0100](https://github.com/nolotus/bun-nolo/commit/65a01005ccbfda5592c97692a15510302cc9bfb0))
* **cli:** TUI context 占用口径统一，当前 agent 窗口按 slug 解析 ([94b5872](https://github.com/nolotus/bun-nolo/commit/94b5872627276bde2085bc6db95cd3f5b4516a18))
* **cli:** TUI 渲染 show_interaction 卡片并统一失败文案脱敏 ([ec0a515](https://github.com/nolotus/bun-nolo/commit/ec0a515376b50d4e4c35a5ee1a648b260deafa95))
* **cli:** 修复 nolo connect --ws 的静默卡死与热重连 ([5fdd8a3](https://github.com/nolotus/bun-nolo/commit/5fdd8a34db4ab614f47375a3a021be26f21b1a82))
* **cli:** 删除/更新 agent 后失效本地缓存（此前静默残留） ([db9034c](https://github.com/nolotus/bun-nolo/commit/db9034ca9059d1e32b714400fa2f56f264a86a6b))
* **cli:** 子对话默认不显示，各端统一隐藏 run 派发产生的对话 ([fd352d9](https://github.com/nolotus/bun-nolo/commit/fd352d94e52a891ea916e531ebf3e2cdf86de070))
* **cli:** 把后台进程计数搬进运行区并显示标题与耗时 ([e3f509c](https://github.com/nolotus/bun-nolo/commit/e3f509c601e7b5d20e56ee50561e0bb29900c273))
* **cli:** 机器工具路由 LOW 分片 L1/L2/L4/L5 收紧为 fail-closed ([38ce543](https://github.com/nolotus/bun-nolo/commit/38ce543a92734a0beb4f783b738ddacef778f10c))
* **cli:** 派发时回填 agent 展示名，避免 run 卡片只显示「子智能体」 ([04fafce](https://github.com/nolotus/bun-nolo/commit/04fafce63c930be779da5f5105331ee65794cb57))
* **commandcode:** 修正 MiMo V2.6 Pro 上下文窗口并校准模型目录 ([3d69bfa](https://github.com/nolotus/bun-nolo/commit/3d69bfaf518774eed2e709e3c4c84862e0818db3))
* **compaction:** bound summary fallback and propagate cancellation ([c430ffe](https://github.com/nolotus/bun-nolo/commit/c430ffe27e38b3611bacc69d2c41c2a7df705ad0))
* **compaction:** cap summary input by absolute token budget ([e0c6f93](https://github.com/nolotus/bun-nolo/commit/e0c6f9356c1983785131c8dfe3a95d129062c3c5))
* **compaction:** integrate absolute summary-input token cap into alpha ([a9ee46c](https://github.com/nolotus/bun-nolo/commit/a9ee46c86853044cfd3377d85024da53ed8dba0a))
* **credit-gates:** gate 199 tier only on platform-paid premium models ([585e395](https://github.com/nolotus/bun-nolo/commit/585e3952340968a89b8d75eecc1e22445ac50e92))
* **database-engine:** 用 sha256 锁消除 blob refCount 的并发丢失更新 ([0eecd37](https://github.com/nolotus/bun-nolo/commit/0eecd37ec96d9a2363435a41fdbb17a475498fc3))
* **database:** authenticate uploads and prevent cross-user file overwrites ([972bdf6](https://github.com/nolotus/bun-nolo/commit/972bdf6f4869889412dae2723fb0879032273445))
* **database:** blob 归零被清空而非删除，共享内容随之丢失 ([6ef00e2](https://github.com/nolotus/bun-nolo/commit/6ef00e2d35b397fa69d267543b851f5152e3ca14))
* **database:** 阻止 chat-proxy 角色抢走共享 LevelDB 锁 ([7e04a53](https://github.com/nolotus/bun-nolo/commit/7e04a532a5a19186963d9e9b18e045d9aabaf786))
* **desktop:** support concurrent Chrome and Firefox browser connectors ([3d67aed](https://github.com/nolotus/bun-nolo/commit/3d67aed82f170f6ee3542114bd6951a1a98d473b))
* **desktop:** take the gemini image-inlining origin from the desktop's existing resolvers ([e2762e0](https://github.com/nolotus/bun-nolo/commit/e2762e0cb89ef8e7a72c74e8d5d541e634800b34))
* **dev:** 基线对照工具异常退出也自清（两线策略统一） ([726c151](https://github.com/nolotus/bun-nolo/commit/726c15172f201e25d0f8947b5b15e2ab5454f59d))
* **e2e:** 空间上传定位器冲突、过期 read_page 断言与 playwright 启动器告警 ([f18025e](https://github.com/nolotus/bun-nolo/commit/f18025e00786e631330004934d5e059b66b87ee9))
* **evolution:** prioritize deep review and reject incomplete actionable verdicts ([b9fb053](https://github.com/nolotus/bun-nolo/commit/b9fb053f73060cb0343df253d4bef6054bf84116))
* **layout:** replace illustrated camp footer with quiet footer and fix scroll phantom space ([0a46b46](https://github.com/nolotus/bun-nolo/commit/0a46b461f97e49a5d34567bbf3713fd328a1e504))
* **llm:** correct Mistral context windows from the live model list ([8149209](https://github.com/nolotus/bun-nolo/commit/8149209b50f725fc567851dc487f0fa62b60dfc1))
* **media:** close review follow-ups on confirmation, depth and progress card ([df1a8b8](https://github.com/nolotus/bun-nolo/commit/df1a8b888978e704415b621b81694e4be82ff678))
* **media:** confirm media job starts from the card without silent billing ([4183d29](https://github.com/nolotus/bun-nolo/commit/4183d299ff546bc636cf142d30961f906de7c4f6))
* **media:** guard the pending card against malformed numbers and ranges ([113bd32](https://github.com/nolotus/bun-nolo/commit/113bd328babd01ebdd3b0e8a09ecb4394a183624))
* **media:** integrate authoritative transcription cards into alpha ([a81b72e](https://github.com/nolotus/bun-nolo/commit/a81b72e8ea6572c6bd6611a8d27e5c18fffecbea))
* **media:** integrate read-only transcription queries into alpha ([b0d3168](https://github.com/nolotus/bun-nolo/commit/b0d3168b4ac94814d7c6bfe51669cc48356bd54e))
* **media:** keep back-to-quote on the pending job's own quote card ([e27dcb6](https://github.com/nolotus/bun-nolo/commit/e27dcb6e1aec4e947832ac9b9c52d49700d0e5d6))
* **media:** keep target language in the translate confirmation envelope ([3ba699e](https://github.com/nolotus/bun-nolo/commit/3ba699e459e06948e101b1a0e02a9dd8b9f72eb4))
* **media:** let failed or cancelled jobs resume and open notes from chat ([d4f6582](https://github.com/nolotus/bun-nolo/commit/d4f65823705544a7375d01f60a92e9db162d9bf3))
* **media:** make confirmation a real pause instead of a false success ([9e323ee](https://github.com/nolotus/bun-nolo/commit/9e323eeb95aed71aca9ed15f771ffb52d92b67e3))
* **media:** query transcription progress and reuse existing text ([2e99ebb](https://github.com/nolotus/bun-nolo/commit/2e99ebb0d059c55446237bbbe0a7131f02ba5145))
* **media:** reject translation requests without a target language ([3df8629](https://github.com/nolotus/bun-nolo/commit/3df8629c721deb3b9e3f2a4b13fc676f2b135967))
* **media:** restore authoritative transcription card state and text ([60ef27c](https://github.com/nolotus/bun-nolo/commit/60ef27c03bdbe18305c07724f8677b5ac2b455a2))
* **media:** show the pending job's own quote and cancel a slow quote request ([8b14864](https://github.com/nolotus/bun-nolo/commit/8b148647ec71ff38bd57692bfd981b7d87dd0c39))
* **media:** STT 门禁按有效路由判定，外部工具禁止负余额扣费，DeepSeek 关思考 ([2a22e25](https://github.com/nolotus/bun-nolo/commit/2a22e252b2a0fc4acff6139946e4faac2040e4ef))
* **media:** 修双语 DOCX 链路的授权等待、job 复用与产物可读性 ([b2068b8](https://github.com/nolotus/bun-nolo/commit/b2068b86240c175c1ce85be19db85d44b4b8f698))
* **media:** 媒体任务启动改为服务端授权，新增自动执行额度 ([118cac6](https://github.com/nolotus/bun-nolo/commit/118cac67674875553e96a965a94b9ca5b96517a5))
* **media:** 媒体任务绑定对话并以可信 agent 兜底唤醒 ([1a45b55](https://github.com/nolotus/bun-nolo/commit/1a45b550552df6c95929a37b05e623a19a2f6b3a))
* **media:** 媒体原子工具的模型可见内容不再被 UI 状态行顶替 ([48b0f47](https://github.com/nolotus/bun-nolo/commit/48b0f47e4b07bb9946d9318244142ea85676cbd9))
* **media:** 媒体链路去 xAI 硬依赖，并修两条计费缺陷 ([f039972](https://github.com/nolotus/bun-nolo/commit/f0399722a2cea76b8556cbc0fda7a15e961ba455))
* **memory:** clarify deletion preview target mismatches ([7f336a8](https://github.com/nolotus/bun-nolo/commit/7f336a86f909791585e8807c81ad889acc89dfbf))
* **memory:** let deleteMemory retire recalled vNext states ([00b7fab](https://github.com/nolotus/bun-nolo/commit/00b7fabbaec26b01126ae7b19e4b7179f0e4c750))
* **memory:** vNext shadow read 纳入同一套后台节流（单飞 + 冷却） ([0ec9985](https://github.com/nolotus/bun-nolo/commit/0ec9985fdb7baefdcea7f2d1227cffb253f54662))
* **memory:** 收紧 vNext 懒提升的并发与频率（进程单飞 + owner 冷却 + 默认超时） ([ace3d73](https://github.com/nolotus/bun-nolo/commit/ace3d73435b3e11099d9c9cd4cc4eaab7e7c6e61))
* **message:** carry explicit dialog id for execution-layer message writes ([fed8637](https://github.com/nolotus/bun-nolo/commit/fed8637f89a490e33936e677e9c1faa828cf6239))
* **message:** exclude transient dialog routing hint from fixed-id persistence ([de7808a](https://github.com/nolotus/bun-nolo/commit/de7808a885025f85e2de5a6fc5510cf836d8f823))
* **message:** fail closed for tool messages without dialog identity ([a0c4278](https://github.com/nolotus/bun-nolo/commit/a0c4278550bf2d48fe5803c60645a32a725a5367))
* **message:** parse dialog identity without fixed dash positions ([915e9e8](https://github.com/nolotus/bun-nolo/commit/915e9e856c86f9a78213f6342f0e468b47be034f))
* **message:** reject unscoped streaming writes instead of targeting active dialog ([67b45d8](https://github.com/nolotus/bun-nolo/commit/67b45d8330f5cb1f4bd51aa45df64342ab2f9226))
* **message:** strip execution-only dialog id from durable tool messages ([d26d739](https://github.com/nolotus/bun-nolo/commit/d26d739f6ec0d798ad3fcea80ad504a557fa43a6))
* **message:** use delimiter-aware dialog identity for message writes ([6a5955a](https://github.com/nolotus/bun-nolo/commit/6a5955a2227b4e4246ea82c4b9603e2b8603c9aa))
* **openai:** luna 的 tools+reasoning_effort 规则收敛到唯一构造点 ([42ab61e](https://github.com/nolotus/bun-nolo/commit/42ab61eff53462377c2ebed15a30035296701c10))
* **prompt:** align lifecycle budgets and delivery scope contracts ([f59b9e3](https://github.com/nolotus/bun-nolo/commit/f59b9e3421d9bbae89b0948e00fd5380cf79a318))
* **provider-errors:** honor LithosAI upstream contracts (retry-after-ms, x-should-retry, quota 402) ([2150bb9](https://github.com/nolotus/bun-nolo/commit/2150bb91ade7f6c70dc047a288ff4f68cede509b))
* **providers:** register lithosai-api in the provider key preset allowlist ([0c94a09](https://github.com/nolotus/bun-nolo/commit/0c94a095e63a0e4dd0f98b256100d72436114b73))
* **quick-chat:** 取消档位与模型层覆盖，选中 agent 即执行对象（1:1） ([ce35b31](https://github.com/nolotus/bun-nolo/commit/ce35b313ae757f1ae403358dd0dc057ade79be17))
* **recharge:** activate the popular and best-value tier badges ([95f3b79](https://github.com/nolotus/bun-nolo/commit/95f3b79da7c90b8a259e02aba68156986cff5032))
* **release:** 恢复 CLI/desktop 版本基线到最高可达 alpha tag ([3a8b682](https://github.com/nolotus/bun-nolo/commit/3a8b6827edafdb58677dc1a5b6b490e280f380c5))
* **render:** make the topbar active state unmistakable and calm the download cta ([60103e8](https://github.com/nolotus/bun-nolo/commit/60103e836bfe9794beb1ff5ca08649cc3fa307df))
* **render:** show code copy failure feedback ([0e0ecb2](https://github.com/nolotus/bun-nolo/commit/0e0ecb297b4db88a8ed893076b531dd9412793d7))
* **render:** 修复表格页行加载被静默丢弃与表切换状态竞争 ([5fba9c1](https://github.com/nolotus/bun-nolo/commit/5fba9c1f009cb82def7eaf075784162cc227a126))
* **render:** 新建页面不再先渲染上一篇正文 ([7b045cf](https://github.com/nolotus/bun-nolo/commit/7b045cfe602a6cc98d97e3960c636e1bc5e2933e))
* **rn:** bind message submission to the screen dialog key ([f5d64d5](https://github.com/nolotus/bun-nolo/commit/f5d64d5a38a465e0431939628e068f3b007e3051))
* **rn:** scope composer stop/queue/draft to the screen dialog key ([75ae86e](https://github.com/nolotus/bun-nolo/commit/75ae86e4eff511fb156f9bc6a9994034e36b2f5f))
* **runtime:** construct isolated mount namespace root before Bubblewrap mounts ([1928152](https://github.com/nolotus/bun-nolo/commit/19281521c42cb68293b19eef9153820b154cec61))
* **runtime:** harden docker sandbox admission invariants ([dc72859](https://github.com/nolotus/bun-nolo/commit/dc72859e4c14e46d2e847e5137e79bd8ecf4d971))
* **runtime:** keep Gemini tool enums string-only ([068effa](https://github.com/nolotus/bun-nolo/commit/068effa8206094c1874ebd41f34307a9d1ac1d89))
* **runtime:** RunGrant/ExecutionBackend 权限归一化与路由改为 fail-closed ([6f1bfe6](https://github.com/nolotus/bun-nolo/commit/6f1bfe6a6f570521370c669e35a968b72b30f354))
* **sandbox:** F6 以 seccomp 禁止沙箱创建 AF_UNIX socket 与 io_uring ([0f235ca](https://github.com/nolotus/bun-nolo/commit/0f235ca6ac25df6cb5194530fee0d322c4a8e4c6))
* **sandbox:** reject invalid deadlines and report timed-out commands as failures ([3a77059](https://github.com/nolotus/bun-nolo/commit/3a77059b49d8b1642d45668f8f00fa622d5a8ac6))
* **sandbox:** require explicit execShell tool authority in ticket ([d551bea](https://github.com/nolotus/bun-nolo/commit/d551bead610afc827e6c11b62399a8102b2a0cbb))
* **sandbox:** revalidate lease roots immediately before sandbox launch ([c097d4f](https://github.com/nolotus/bun-nolo/commit/c097d4f403ecb105bcf80c89522a37605678ba8a))
* **sandbox:** 本地验证修复 Bubblewrap 后端 F1–F4 并记录 F6 发布阻塞 ([b7b9727](https://github.com/nolotus/bun-nolo/commit/b7b9727ad4153c2cc111f173863f86c8dd0a19b4)), closes [#114](https://github.com/nolotus/bun-nolo/issues/114)
* **security:** restrict machine runs to the caller's own machines ([e167a53](https://github.com/nolotus/bun-nolo/commit/e167a5356680d51d037153a787ef14c758676659))
* **server:** admit quickChatModelOverride only when it resolves back to the caller ([145f6c3](https://github.com/nolotus/bun-nolo/commit/145f6c319b4bfda0bc06dce65c0ac0d44ff59676))
* **server:** bind OAuth-sourced credentials to their official upstream endpoints ([f418d54](https://github.com/nolotus/bun-nolo/commit/f418d54e8676d645a4e2bfb81d6124a932799d48))
* **server:** clear the server typecheck errors alpha added over main ([497cc72](https://github.com/nolotus/bun-nolo/commit/497cc7278fe51ed0ab64bc95e78d6e3559169202))
* **server:** count implemented anthropic.messages routes as routed ([6e47a61](https://github.com/nolotus/bun-nolo/commit/6e47a61243bb95ef3a3d9aebffe8edf1e8676a65))
* **server:** DeepSeek Flash 兜底改走 Baseten 并修正 Responses→chat 转换 ([e4621ef](https://github.com/nolotus/bun-nolo/commit/e4621ef38d6084f3e889f43424bd81c381c5ab62))
* **server:** return readable media job errors when ffmpeg is missing ([977e8c6](https://github.com/nolotus/bun-nolo/commit/977e8c60b145c08c70138af759fc19627f53c6b1))
* **shared:** register mistral-plan and openrouter-api in the key preset allowlist ([1091586](https://github.com/nolotus/bun-nolo/commit/10915864d03107461d744a3bb36e0fd0c8b88ba0))
* **skills:** make subscription agent setup project independent ([a9c90ba](https://github.com/nolotus/bun-nolo/commit/a9c90bab7c1436d299dc7762fea851e4a7309a72))
* **sync:** write main-side fixes back into alpha ([baa2fc2](https://github.com/nolotus/bun-nolo/commit/baa2fc2e579b2bb1c24010cd652606b55f1297c9))
* **test:** use @babel/parser AST in reduxBoundaryGuard ([0a1d501](https://github.com/nolotus/bun-nolo/commit/0a1d501319890cb2d37bc87c3d3ad54f41eba843))
* **theme:** align first-paint font preferences with runtime ([52e2c56](https://github.com/nolotus/bun-nolo/commit/52e2c5630e45e899d8c6dab8ce88c4a2a8633c39))
* **theme:** elevate dark chat composer background ([3238958](https://github.com/nolotus/bun-nolo/commit/3238958c795f3ce508f6bd15746a6356fe129390))
* **tui:** cancel startup memory recall with the active turn ([9ad6824](https://github.com/nolotus/bun-nolo/commit/9ad68243be26739aed20c6829714d9a5b08223d0))
* **tui:** clear stale composer lines after welcome resize ([edae83b](https://github.com/nolotus/bun-nolo/commit/edae83b063d882c87a251948b237624fc723b29d))
* **tui:** ground learn review in visible evidence ([1395a09](https://github.com/nolotus/bun-nolo/commit/1395a09004cf539326576779af7e98ec94b37866))
* **tui:** preserve help i18n contract for /learn ([3c03976](https://github.com/nolotus/bun-nolo/commit/3c03976919e9d6250a7ff489064104f4b976aaa0))
* **tui:** stop welcome banner overlapping the first transcript turn ([49d14ff](https://github.com/nolotus/bun-nolo/commit/49d14ff25ff189c87ccd7f0dcc15961555de95c5))
* **types:** clear pre-existing typecheck errors in web, server and ai ([b589477](https://github.com/nolotus/bun-nolo/commit/b58947721deaf97e837a6ad96a5a4aae60c57256))
* **types:** restore agent-runtime typecheck on alpha ([#108](https://github.com/nolotus/bun-nolo/issues/108)) ([d033dcc](https://github.com/nolotus/bun-nolo/commit/d033dcc69b342a90d4dd3bcbeca09aae8d114d5f))
* **types:** 清理既有类型错误与 skillProjectionGuard 失败（零运行时行为变化） ([73f1bf1](https://github.com/nolotus/bun-nolo/commit/73f1bf13f9216f5e020dc42b04af49310437d79a))
* **web:** bootstrap first-frame currentServer from the runtime origin ([dfef3f2](https://github.com/nolotus/bun-nolo/commit/dfef3f25e63cba7ebaa76394d28812ab3cafc958))
* **web:** ensure native button type forwarding and boost QuickChat focus-within specificity ([248639f](https://github.com/nolotus/bun-nolo/commit/248639f71883ea6598278c27886bd6e5326b7bb3))
* **web:** resolve post-deploy chunk purge hang, server-owned message flicker, and stylex hover/focus defects ([a66a64c](https://github.com/nolotus/bun-nolo/commit/a66a64c265fddcb659a11b7ce8916c7bca0cbdf7))
* **workbench:** cancel pane resize on Escape ([48496ec](https://github.com/nolotus/bun-nolo/commit/48496eca29ab687689c4778542303a5d4229e215))
* **workbench:** ignore click jitter below the drag deadzone ([313d43d](https://github.com/nolotus/bun-nolo/commit/313d43dd86fc9c13e538951d676e9271550c4bb0))

### Performance Improvements

* **agent-runtime:** Anthropic prompt cache 回合边界 1h 断点 ([e27e122](https://github.com/nolotus/bun-nolo/commit/e27e122fd813136aa74ac1b86b662d14214aaf1d))
* **agent-runtime:** Codex/Devin 请求身份按会话稳定，修回合内缓存路由失效 ([e22020d](https://github.com/nolotus/bun-nolo/commit/e22020d0c9e42952ebc9afe382d87f6e195458dc))
* **agent-runtime:** optimize agent loop speed via read concurrency and stream fast-exit ([c0cb48a](https://github.com/nolotus/bun-nolo/commit/c0cb48a060ef341b74c180ab75137c29de705982))
* **agent-runtime:** optimize cache routing affinity and tool token governance ([9c39e7c](https://github.com/nolotus/bun-nolo/commit/9c39e7cbf9f7ba33b49f4b7d172f3fc9de70088e))
* **agent-runtime:** optimize shell execution via non-login default and memoize tool projections ([36df14a](https://github.com/nolotus/bun-nolo/commit/36df14ab37f21eac2f7ce5141bed7066825e4e26))
* **agent-runtime:** stream codex first output timing and support delta callbacks ([4642a20](https://github.com/nolotus/bun-nolo/commit/4642a20c485ae0eca2393b3e5802f3934d67503e))
* **agent:** agent run 对话读取带上 key，避免全库扫描 ([b328190](https://github.com/nolotus/bun-nolo/commit/b3281905ecd0ee2cd72112edeff02dd69acbe275))
* **agent:** 收窄 dispatchIntent 正则，避免日常词误锁完整编排协议 ([b04cc80](https://github.com/nolotus/bun-nolo/commit/b04cc8081f4817347f48fcc2cef3323edb1dc7fa))
* **agent:** 瘦身 TUI 常驻上下文（技能清单/shell 生命周期段/网页段） ([196682b](https://github.com/nolotus/bun-nolo/commit/196682b94f4d076b1cf0dae053340d623d6ee03e))
* **auth:** integrate reviewed US identity bootstrap and module preloads ([514d7e0](https://github.com/nolotus/bun-nolo/commit/514d7e045f8a94306b47c8208ef7dec2d44e7f1a))
* **auth:** restore cloud identity before hydration and preload entry modules ([5132970](https://github.com/nolotus/bun-nolo/commit/51329700b1c9c8ee8d6f99bd002d9e1bf86eb640))
* **chat:** stop redundant Markdown re-render on thinking section scroll ([e233022](https://github.com/nolotus/bun-nolo/commit/e2330226a9296e95bffceb553c18108827201e87))
* **chat:** 新对话首条消息等写 ACK 后再发 run（有界 best-effort） ([c4af8cc](https://github.com/nolotus/bun-nolo/commit/c4af8cc1a1eead2340e143955d58d3b63d46d548))
* **cli:** speed up /switch load and humanize agent run cards ([33311ed](https://github.com/nolotus/bun-nolo/commit/33311ed7c14113358dbf1bdad4b3b08c802e3d1b))
* **cli:** stream AGY responses through shared local transport ([a1a267f](https://github.com/nolotus/bun-nolo/commit/a1a267f0ccf369c2a1f15f29a229e9be54c2d763))
* **cli:** stream codex output deltas in local agent runtime ([2ac35ea](https://github.com/nolotus/bun-nolo/commit/2ac35ead3f0ec799eb853b5ae7e11fb0b834554e))
* **cli:** 同一 turn 复用 agent 配置，去掉重复加载 ([d4d4dfb](https://github.com/nolotus/bun-nolo/commit/d4d4dfb01231fccd4c83e0bafecbfc9d2da08aff))
* **cli:** 新会话首轮跳过远端兜底读取，去掉首字白等 ([b4589fc](https://github.com/nolotus/bun-nolo/commit/b4589fc41f786037a6122c914efb4f1874ae2301))
* **server:** 合入对话读取稳定性两块到 alpha（keys-only 回退扫描 + dialogKey 透传） ([f6a6b8d](https://github.com/nolotus/bun-nolo/commit/f6a6b8d632d9777b56deb184014572a9d45a17aa))
* **server:** 合并服务端对话读取 keys-only 回退扫描（fix/dialog-scan-budget） ([152b156](https://github.com/nolotus/bun-nolo/commit/152b15659013a863e23c0cb97f86131298bf843f))
* **server:** 对话读取回退扫描改 keys-only，加预算与降级可观测 ([dd96545](https://github.com/nolotus/bun-nolo/commit/dd965454cebff7c834b47cc146b8c7b6cfa99849))
* **shared:** date-fns 改为按函数导入、yahoo-finance2 改为首次调用时加载，三端启动内存降 5~14MB ([bbbdcd6](https://github.com/nolotus/bun-nolo/commit/bbbdcd6071557fcaeb1e5fa9cdec2824a2d7c513))
* **tui:** bound selection layout and eliminate quadratic long-line wrapping ([eff5e62](https://github.com/nolotus/bun-nolo/commit/eff5e6281b52b58e57fa1f97b3515232cd29adb5))
* **tui:** overlap first-turn memory recall with skill preparation ([9e865aa](https://github.com/nolotus/bun-nolo/commit/9e865aa9dcfb4f29455e73346b24971f2ace22af))
* **tui:** reuse prepared metadata with current turn executors ([63dfdb4](https://github.com/nolotus/bun-nolo/commit/63dfdb413b306da42f56d4796748c83ffe8d7208))
* **tui:** 精简 i18n 运行时入口并按需加载 Cursor provider，TUI 启动内存 -15MB ([d325bab](https://github.com/nolotus/bun-nolo/commit/d325bab5678c543765aa717f5ac824f301c1e36b))
* **tui:** 轮末空闲时把释放的 JS 堆页还给系统，长会话常驻内存不再滞留在峰值 ([0249b27](https://github.com/nolotus/bun-nolo/commit/0249b2710a58afcb3b403110d158bb1ffac92eaf)), closes [#1](https://github.com/nolotus/bun-nolo/issues/1)
* **web:** defer route modules and load locale resources on demand ([951c183](https://github.com/nolotus/bun-nolo/commit/951c183073eda5445681a4e59908dd5757b2f34d))
* **web:** integrate reviewed startup loading into alpha ([890f798](https://github.com/nolotus/bun-nolo/commit/890f798826a811d63ba46500609e34003842e2ba))


## 0.157.0-alpha.4

## 0.157.0-alpha.4 (2026-09-30)

### Bug Fixes

* **cli:** restore the four secret classes the name-form check excluded ([720d3f7](https://github.com/nolotus/bun-nolo/commit/720d3f77bda3da24cbd57f475745ec855f5e23d9))
* **memory:** stop no_op legacy items from pinning the lazy-promotion head ([60da072](https://github.com/nolotus/bun-nolo/commit/60da0725301415928de8a9de664b8163661b609c))


## 0.157.0-alpha.3

## 0.157.0-alpha.3 (2026-09-30)

### Bug Fixes

* **chat:** keep recovered foreground turns stoppable from the composer ([b318832](https://github.com/nolotus/bun-nolo/commit/b318832970365f4b7b67e7e34c94874357ae25eb))


## 0.157.0-alpha.2

## 0.157.0-alpha.2 (2026-09-30)

### Bug Fixes

* **agent:** close the tool-name normalization gap in the credential-ref guard ([29afcd4](https://github.com/nolotus/bun-nolo/commit/29afcd46f6f26ef95892a3e01eb3ed65e1e7415b))
* **cli:** stop flagging code expressions as secrets while still catching pasted ones ([4547cfb](https://github.com/nolotus/bun-nolo/commit/4547cfbcbfbaadafe49e3afc7fa4ad5404a3a218))


## 0.157.0-alpha.1

## 0.157.0-alpha.1 (2026-09-30)

### Features

* **agent:** isolate inbound credentials and block shell-based exfiltration ([15c7854](https://github.com/nolotus/bun-nolo/commit/15c78542329b372cb89473d71e359de83430aff4))
* **tools:** render readAgent result as a scannable card ([eb1edd1](https://github.com/nolotus/bun-nolo/commit/eb1edd1a0b63e4b7a38a1e61e4f0573e82787092))


## 0.156.0-alpha.1

## 0.156.0-alpha.1 (2026-09-30)

### Features

* **home:** land product positioning v0.3 and streamline landing page ([e195a60](https://github.com/nolotus/bun-nolo/commit/e195a60f5176474bdc567b6ce1b2db45ffd3c468))

### Bug Fixes

* **tui:** remove duration and output tokens summary from turn end ([b86d1e9](https://github.com/nolotus/bun-nolo/commit/b86d1e96cf5406a71f0c22723fa4bce0679d1aee))


## 0.155.0-alpha.2

## 0.155.0-alpha.2 (2026-09-30)

### Bug Fixes

* **ai:** resolve memory vNext lazy promotion starvation and detach shadow read ([bed087d](https://github.com/nolotus/bun-nolo/commit/bed087d97d22c85fee74eeda11213c1100fa50d6))


## 0.155.0-alpha.1

## 0.155.0-alpha.1 (2026-09-30)

### Features

* **agent:** capture foreground execution id from stream ([2e2172a](https://github.com/nolotus/bun-nolo/commit/2e2172a4647ef21bf389139302eb5c81507a84e2))
* **agent:** track foreground execution identity on client ([d3de935](https://github.com/nolotus/bun-nolo/commit/d3de9352bf15a28fd1dbc49ae3bbf7e2af6cab04))
* **chat:** include observed execution id in foreground stop ([423edc1](https://github.com/nolotus/bun-nolo/commit/423edc138565963ed9042d20a4c1494c5127626c))
* **chat:** retain recovered execution identity for stop ([a02cc8c](https://github.com/nolotus/bun-nolo/commit/a02cc8c03b677c92315de890ef0945422de5e5ba))
* **chat:** target foreground stop by execution id ([229dfae](https://github.com/nolotus/bun-nolo/commit/229dfae6b7c50098b6fe41076becdf2092a7396a))

### Bug Fixes

* **chat:** preserve live execution id across recovery cleanup ([13e4c57](https://github.com/nolotus/bun-nolo/commit/13e4c578b1c6286da2b99f2e0b86927a8c8455bc))


## 0.154.0-alpha.1

## 0.154.0-alpha.1 (2026-09-30)

### Features

* **ai:** 新增 auto-review 内置 skill，并把 review 合并细节收敛为指针 ([3d91137](https://github.com/nolotus/bun-nolo/commit/3d91137c77fd77963b1d937e5181073c83e8a366))
* **chat:** 侧边栏类型筛选改用 Phosphor 图标，选中态用 fill ([bc75b2e](https://github.com/nolotus/bun-nolo/commit/bc75b2e896c413c74b23a3c54d59863ca5696a28))


## 0.153.0-alpha.2

## 0.153.0-alpha.2 (2026-09-30)

### Bug Fixes

* **agent:** make foreground turns survive tab lifetime ([#80](https://github.com/nolotus/bun-nolo/issues/80)) ([7a189fb](https://github.com/nolotus/bun-nolo/commit/7a189fbf5bb882cc6496b4f3f945c0a701d8d949))


## 0.153.0-alpha.1

## 0.153.0-alpha.1 (2026-09-30)

### Features

* **chat:** guide guests to login on send and restore their draft afterwards ([9e61371](https://github.com/nolotus/bun-nolo/commit/9e61371c098bc11d0f8aad2cd64639e19def3cab))
* **downloads:** route iOS to the web entry and put the detected platform first ([2d210b8](https://github.com/nolotus/bun-nolo/commit/2d210b8c5928fe97df3c70e27c8fac9cd602f991))

### Bug Fixes

* **guide:** replace internal smoke-test copy with a 3-step quick start ([4a43bf5](https://github.com/nolotus/bun-nolo/commit/4a43bf5c2b68ebc02c964b7e3b7db22f283b6fbe))
* **ui:** converge home page font weights, radii and type scale to UI standard ([1f09edf](https://github.com/nolotus/bun-nolo/commit/1f09edfa36a0320b4e789073cffc5927847f3e25))
* **ui:** raise price-text contrast, label pricing search, keep avatar text >=12px ([3bbae4c](https://github.com/nolotus/bun-nolo/commit/3bbae4c90b0d0f161a3e54bc03acfadd3c54569e))


## 0.152.0-alpha.2

## 0.152.0-alpha.2 (2026-09-30)

### Bug Fixes

* **stylex:** expand last 5 silently-dropped background/border shorthands ([f5f4fa9](https://github.com/nolotus/bun-nolo/commit/f5f4fa968570c4f97ed666a84f4838d89546ba8d))


## 0.152.0-alpha.1

## 0.152.0-alpha.1 (2026-09-30)

### Features

* **agent:** add Claude Sonnet 5.5 to Anthropic presets and OAuth model table ([2ed502d](https://github.com/nolotus/bun-nolo/commit/2ed502d74e62a48dd16a9e895ad37f3b34899889))
* **agent:** add GPT-6.1 Sol to OpenAI presets and reasoning models ([d3a4b6f](https://github.com/nolotus/bun-nolo/commit/d3a4b6f3d057aa5168a115ab3f77502526e20977))
* **agent:** 推理强度入口全面接入模型级真实档位 ([f1dd0a5](https://github.com/nolotus/bun-nolo/commit/f1dd0a5181a3e9480d9c11046872e1e0f2454c98))
* **server:** 订阅制 Coding 套餐（Kimi/GLM）额度主动探测与 /switch 展示 ([619d3a2](https://github.com/nolotus/bun-nolo/commit/619d3a2d92a6ca44af55079387ed9f02d15953d7))


## 0.151.0-alpha.3

## 0.151.0-alpha.3 (2026-09-29)

### Bug Fixes

* **web:** 修复暗色模式下开源可信区块白底浅色字 ([771f9c3](https://github.com/nolotus/bun-nolo/commit/771f9c3b13f44b6045604ccb16ed1a0a65a8ca06))


## 0.151.0-alpha.2

## 0.151.0-alpha.2 (2026-09-29)

### Bug Fixes

* **copy:** unify auth error presentation and recharge currency display ([9596cf9](https://github.com/nolotus/bun-nolo/commit/9596cf9deb578d090c26e6a9ce1703caf60df70e))
* **desktop:** prevent onboarding loss on path click and close only on real completion ([87bc342](https://github.com/nolotus/bun-nolo/commit/87bc342def3c0950260fdf42fe369de7c92e7a43))
* **test:** keep git hook env from rewriting the real repository ([a8808a5](https://github.com/nolotus/bun-nolo/commit/a8808a5413949c750b1950731b002945dea18793))


## 0.151.0-alpha.1

## 0.151.0-alpha.1 (2026-09-29)

### Features

* **chat:** relationship-based vertical rhythm in message list ([ac6238c](https://github.com/nolotus/bun-nolo/commit/ac6238c7020beadd0974c249c1a62083765a39b1))
* **tui:** hierarchical vertical rhythm for transcript spacing ([7e22ebc](https://github.com/nolotus/bun-nolo/commit/7e22ebc9c87ab85dcfa9a503ece78143d325ff95))


## 0.150.0-alpha.2

## 0.150.0-alpha.2 (2026-09-29)

### Bug Fixes

* **agent-runtime:** stop Claude OAuth empty end_turn replies after tool results ([e07e077](https://github.com/nolotus/bun-nolo/commit/e07e077adebe2d42e81f609007ae2eaadd5e132e))


## 0.150.0-alpha.1

## 0.150.0-alpha.1 (2026-09-29)

### Features

* **home:** center quick chat composer on desktop and streamline default widgets ([3cae33f](https://github.com/nolotus/bun-nolo/commit/3cae33f8beadf815fa8eb4f85933b76e5465cdbf))

### Bug Fixes

* **home:** align quick chat greeting with ui scale and sync its source contract ([f904b32](https://github.com/nolotus/bun-nolo/commit/f904b32fae0550a9248d487440e48a22928998ff))
* **test:** stop StyleX runtime crash in full suite and stop pre-push misflagging shared unhandled errors ([f3b794f](https://github.com/nolotus/bun-nolo/commit/f3b794f6aec4382d7cc945ab6297d8a6e96b8aac))


## 0.149.0-alpha.1

## 0.149.0-alpha.1 (2026-09-29)

### Features

* **agent:** support Claude Opus 5.5 OAuth subscription and CLI preset create flow ([b95b3af](https://github.com/nolotus/bun-nolo/commit/b95b3af08266670555bac7c2890e662db6c7a02c))
* **share:** simplify share UX to unified entry with lightweight transparent modal ([f627ec7](https://github.com/nolotus/bun-nolo/commit/f627ec7b70f912e33070deec27f4199460d46357))
* **tui:** polish markdown typography and breathing in terminal assistant output ([8985b85](https://github.com/nolotus/bun-nolo/commit/8985b855a622b31a7c4e9cbb598fcf764b7a49f9))
* **tui:** sharpen live feedback, turn summary, and throttle-like wheel scrolling ([dfe2a9e](https://github.com/nolotus/bun-nolo/commit/dfe2a9e930424113b760bb7bc085e4291dad4592))

### Bug Fixes

* **i18n:** add missing zh-Hant and ja share dialog keys ([1121891](https://github.com/nolotus/bun-nolo/commit/112189199a973881ca05d340b3e0c77fa8e46dfc))


## 0.148.0-alpha.1

## 0.148.0-alpha.1 (2026-09-29)

### Features

* **agent:** add OpenRouter metered API template to create page ([bca3f78](https://github.com/nolotus/bun-nolo/commit/bca3f7875f0d69fbe9efa11d573bffccef4db2de))
* **chat:** add copy button and mermaid auto-preview to message code blocks ([1ec3b4d](https://github.com/nolotus/bun-nolo/commit/1ec3b4d69bfb26f88a301f2edb7ccd8c87d4fba6))

### Bug Fixes

* **i18n:** 补齐首页小组件及全站缺失语言键消除中英文混排 ([fc60933](https://github.com/nolotus/bun-nolo/commit/fc60933f6082418a2fce103779241b0c78867179))


## 0.147.0-alpha.2

## 0.147.0-alpha.2 (2026-09-29)

### Bug Fixes

* **ai:** preserve legacy content-only docs in [@mention](https://github.com/mention) reference injection ([8d7d4a2](https://github.com/nolotus/bun-nolo/commit/8d7d4a2880960012eaf82a401a6de788059e0157)), closes [#74](https://github.com/nolotus/bun-nolo/issues/74)


## 0.147.0-alpha.1

## 0.147.0-alpha.1 (2026-09-29)

### Features

* **agent:** add OpenRouter metered API template to create page ([50153dc](https://github.com/nolotus/bun-nolo/commit/50153dca7574bf4290d263817d5fe09dc18a2d8a))
* **agent:** support exact OpenRouter reasoning effort mapping and fix missing key on web proxy ([5f54851](https://github.com/nolotus/bun-nolo/commit/5f54851a245f3531bb3b9f16365d8f11b455b537))


## 0.146.0-alpha.2

## 0.146.0-alpha.2 (2026-09-29)

### Bug Fixes

* **ai:** preserve legacy document content in read tools ([e234e64](https://github.com/nolotus/bun-nolo/commit/e234e64369365422247106771e988d2bd4e7c5d5))
* **ai:** share document read compatibility resolver ([442728f](https://github.com/nolotus/bun-nolo/commit/442728f5703877df8e139cb1b4f1a18bd677cf0f))


## 0.146.0-alpha.1

## 0.146.0-alpha.1 (2026-09-29)

### Features

* **agent:** add reset-aware economics selection guidance ([f146ead](https://github.com/nolotus/bun-nolo/commit/f146ead78cd5477a2c59a23130efbfeb4d462430)), closes [#75](https://github.com/nolotus/bun-nolo/issues/75) [#75](https://github.com/nolotus/bun-nolo/issues/75)


## 0.145.0-alpha.2

## 0.145.0-alpha.2 (2026-09-29)

### Bug Fixes

* **cli:** guard TUI alt-screen during subprocess handoff, route self-update output through renderer sink ([ac54653](https://github.com/nolotus/bun-nolo/commit/ac5465387bf770c384fb3da06eea6e6a345ea019))


## 0.145.0-alpha.1

## 0.145.0-alpha.1 (2026-09-29)

### Features

* **cli:** TUI diagnostics pipeline — console bridge, structured sinks, single-line error normalization ([22ba692](https://github.com/nolotus/bun-nolo/commit/22ba69206e305e71a2eaa5189e9b1ec710def206))
* **connector:** point users to Chrome/Firefox connector install when offline ([b6ec213](https://github.com/nolotus/bun-nolo/commit/b6ec213c7175bdc6e4f48a57625af58351505515))


## 0.144.0-alpha.1

## 0.144.0-alpha.1 (2026-09-29)

### Features

* **desktop:** add Firefox connector download entry on /downloads ([4c3603d](https://github.com/nolotus/bun-nolo/commit/4c3603dafeef60b059a7ab1f617d4daeefbecf7b))
* **desktop:** mount host shell tools by default and make workspace executors always registered ([259425c](https://github.com/nolotus/bun-nolo/commit/259425cc37f106de74150d0a2c740eab0f2684fc))
* **desktop:** trim linux bundle payload and fail-closed trim guards ([1688d17](https://github.com/nolotus/bun-nolo/commit/1688d17a880e5e3f5afdc62c7e5b88875520533f))

### Bug Fixes

* **desktop:** resolve repo root two levels up in APK release scripts ([bc95574](https://github.com/nolotus/bun-nolo/commit/bc9557472031c8f2508851aa3e3eb611fcd4e9d6))


## 0.143.0-alpha.2

## 0.143.0-alpha.2 (2026-09-28)

### Bug Fixes

* **cli:** derive credential group for custom API agents to unblock parallel fanout ([4b81147](https://github.com/nolotus/bun-nolo/commit/4b81147ea54e782d68d58ae5d833c0fd2eb4d63e))


## 0.143.0-alpha.1

## 0.143.0-alpha.1 (2026-09-28)

### Features

* **i18n:** rewrite open-and-auditable section as privacy-first plain copy ([4ad88cc](https://github.com/nolotus/bun-nolo/commit/4ad88cc52fef34ce472e434bb8d119e7f70e3e59))
* **ui:** switch light theme primary to sunny azure [#006](https://github.com/nolotus/bun-nolo/issues/006)EDC ([1a7c01a](https://github.com/nolotus/bun-nolo/commit/1a7c01add43740a155c635ae4693d36eec82f3c3)), closes [#006EDC](https://github.com/nolotus/bun-nolo/issues/006EDC)


## 0.142.0-alpha.1

## 0.142.0-alpha.1 (2026-09-28)

### Features

* **ui:** switch light theme primary color to ocean blue ([adcf03e](https://github.com/nolotus/bun-nolo/commit/adcf03e1c0aea68bb4350e87825fdc9da8652cbc))


## 0.141.0-alpha.2

## 0.141.0-alpha.2 (2026-09-28)

### Bug Fixes

* **ui:** keep stylex classes on SearchInput clear button hook ([a264a0b](https://github.com/nolotus/bun-nolo/commit/a264a0b71a3077a989568ff3c0b552226403b6f1))


## 0.141.0-alpha.1

## 0.141.0-alpha.1 (2026-09-28)

### Features

* **desktop-chrome-connector:** add Firefox (AMO) port with capability degrade ([523cd4b](https://github.com/nolotus/bun-nolo/commit/523cd4b1bb55c335ce1ad66fa583a09f9d4915f8))
* **ui:** polish homepage, pricing, downloads, community and quick-chat visuals ([d3d85fd](https://github.com/nolotus/bun-nolo/commit/d3d85fd6e54f5949920c4d749541bf4092476781))


## 0.140.0-alpha.2

## 0.140.0-alpha.2 (2026-09-27)

### Bug Fixes

* **redux:** drop three post-freeze boundary violations (recharge hook, retry thunk, table peel) ([723912c](https://github.com/nolotus/bun-nolo/commit/723912c798264619d2f6ec3891835406b1574752))
* **server:** converge same-name app deploys, restore desktop dev orchestrator, harden broker timeout ([f01c37a](https://github.com/nolotus/bun-nolo/commit/f01c37ab29eb393a796d3be257bdd9e8f30184c4))


## 0.140.0-alpha.1

## 0.140.0-alpha.1 (2026-09-27)

### Features

* **agent-runtime:** add OAuth credential account-scoping slice 1 (protocol + pure store) ([b4e30c3](https://github.com/nolotus/bun-nolo/commit/b4e30c3795e89205d4b86d7a489f88f61eb5c3d9))
* **agent-runtime:** add shell task lifecycle contract, reliable background execShell, and launchProcess output capture ([8a75f94](https://github.com/nolotus/bun-nolo/commit/8a75f94ea099a6fc49aec4d682d1a042e19559c1))

### Bug Fixes

* **chat:** surface context-overflow failures with bounded compaction and recovery actions ([4e25d1f](https://github.com/nolotus/bun-nolo/commit/4e25d1fa0b281cd9d5d0610744350232cb565059))


## 0.139.0-alpha.1

## 0.139.0-alpha.1 (2026-09-26)

### Features

* **tui:** add visual hierarchy for tool activity ([d7903fa](https://github.com/nolotus/bun-nolo/commit/d7903fa693f75c1f6e98fb254c83553a07aa9f41))

### Bug Fixes

* **tui:** keep tool hierarchy locale-independent and stream-parity exact ([1d41138](https://github.com/nolotus/bun-nolo/commit/1d4113819007d41f6db10567b71857bbe3048256))
* **tui:** scope activity styling to real tool rows ([748d7b8](https://github.com/nolotus/bun-nolo/commit/748d7b8ae207286a6174e2d9c1f84ef8b64f99fd))


## 0.138.0-alpha.1

## 0.138.0-alpha.1 (2026-09-26)

### Features

* **agent-runtime:** inject delete-safety red line at the top of every system prompt ([57589d2](https://github.com/nolotus/bun-nolo/commit/57589d250e5e8ec52355fe7dba929bf88f7b7de5))


## 0.137.0-alpha.1

## 0.137.0-alpha.1 (2026-09-26)

### Features

* **chat:** add five more view transition patterns and harden wave-1 leftovers ([9ccc240](https://github.com/nolotus/bun-nolo/commit/9ccc240d31b621ee8a9dc52edee7f9a6d343a664))


## 0.136.0-alpha.1

## 0.136.0-alpha.1 (2026-09-26)

### Features

* **connector:** douyin publish/delete automation + douyin-publisher skill ([e957af9](https://github.com/nolotus/bun-nolo/commit/e957af9ea66051561f27b64ec2e807c02e1a9edf))


## 0.135.0-alpha.2

## 0.135.0-alpha.2 (2026-09-26)

### Bug Fixes

* **tui:** keep blank-line narration transient until next event ([1761ae8](https://github.com/nolotus/bun-nolo/commit/1761ae8530dd9951f30e3064c9f208c31155176e))


## 0.135.0-alpha.1

## 0.135.0-alpha.1 (2026-09-26)

### Features

* **chat:** add view transition morph patterns for dialog nav, tabs and sidebar lists ([394c078](https://github.com/nolotus/bun-nolo/commit/394c07885b0c52224b5d0584579f64dbf004b795))


## 0.134.0-alpha.1

## 0.134.0-alpha.1 (2026-09-26)

### Features

* **skills:** add xhs-publisher skill and upgrade chrome-connector & x-publisher ([bf54b12](https://github.com/nolotus/bun-nolo/commit/bf54b12db4f364253b158b8d4edc870611424272))


## 0.133.0-alpha.1

## 0.133.0-alpha.1 (2026-09-26)

### Features

* **agent:** support query filter in listAgents and allow credential concurrency ([b7d9999](https://github.com/nolotus/bun-nolo/commit/b7d9999110316b93eee828c28127e9f4df4c38f9))


## 0.132.0-alpha.2

## 0.132.0-alpha.2 (2026-09-26)

### Bug Fixes

* **dx:** guard the worktree index after the pre-push gates run ([89dc341](https://github.com/nolotus/bun-nolo/commit/89dc341498ce99f3cd35d20e21c60c1e2992335e))


## 0.132.0-alpha.1

## 0.132.0-alpha.1 (2026-09-26)

### Features

* **tui:** reduce transcript noise and sharpen activity hierarchy ([17667b0](https://github.com/nolotus/bun-nolo/commit/17667b00f1c99d06d161cadd8c092cf6f70f6e70))

### Bug Fixes

* **tui:** separate abort from failure and stop leaking generated identities ([2a1092d](https://github.com/nolotus/bun-nolo/commit/2a1092d1b3be099a2895929b365d1b8f15f50470))


## 0.131.0-alpha.3

## 0.131.0-alpha.3 (2026-09-26)

### Bug Fixes

* **agent:** write back email automation run terminal state to the automation record ([b5bca63](https://github.com/nolotus/bun-nolo/commit/b5bca63403140958005298a186d9d0217fe36945))


## 0.131.0-alpha.2

## 0.131.0-alpha.2 (2026-09-26)

### Bug Fixes

* **agent:** write back email-automation run state and tag its run dialogs ([4fb8cd4](https://github.com/nolotus/bun-nolo/commit/4fb8cd46c664ca0313aa469044280b18ab22cc29))


## 0.131.0-alpha.1

## 0.131.0-alpha.1 (2026-09-26)

### Features

* **agent:** email automation acceptAll filters, update/delete tools, and web management ([dc813b8](https://github.com/nolotus/bun-nolo/commit/dc813b82bf71b6ae1efcc6a27feb1fcf49181e23))


## 0.130.0-alpha.2

## 0.130.0-alpha.2 (2026-09-26)

### Bug Fixes

* **cli:** guide users through the Google one-time verification instead of a dead end ([d5dd2bb](https://github.com/nolotus/bun-nolo/commit/d5dd2bbf93324ee89821efd88c35296a4e868971))


## 0.130.0-alpha.1

## 0.130.0-alpha.1 (2026-09-26)

### Features

* **i18n:** 语言包加固——lint 漏检口修复、繁/日缺键补全 ([9bb17b9](https://github.com/nolotus/bun-nolo/commit/9bb17b9cdd09251585abd88e5d419b54b6a5e98f))

### Bug Fixes

* **web:** 广场卡片价格字号移动端不随 compact 密度缩到 11px ([b800394](https://github.com/nolotus/bun-nolo/commit/b800394d9121fe116c81444606878549b6571a6f))


## 0.129.0-alpha.4

## 0.129.0-alpha.4 (2026-09-26)

### Bug Fixes

* **cli:** keep upstream error.details in antigravity failure message so the Google validation link reaches the TUI ([f09021b](https://github.com/nolotus/bun-nolo/commit/f09021b7dfb8944e64b03ecd148c761297c991f8))


## 0.129.0-alpha.3

## 0.129.0-alpha.3 (2026-09-26)

### Bug Fixes

* **ai:** 广场卡片价格标签标点收敛进 locale，消除中英标点混排 ([8371a1c](https://github.com/nolotus/bun-nolo/commit/8371a1cf0b5528d07302fe084ebaabafafd026b7))
* **web:** 可读性字号 token 化与断点收敛 ([9546623](https://github.com/nolotus/bun-nolo/commit/954662330f7dfc8025c6931459f9502a639363b7))


## 0.129.0-alpha.2

## 0.129.0-alpha.2 (2026-09-26)

### Bug Fixes

* **web:** 修复移动端可访问性与显示问题 ([d6f1e20](https://github.com/nolotus/bun-nolo/commit/d6f1e203a6e690d0f90ac61a1d6fff670d26fd56))
* **web:** 统一品牌口号并修复多语言文案缺陷 ([8656104](https://github.com/nolotus/bun-nolo/commit/8656104f34178ea731424d4a49eec5cbdf3e28c1))


## 0.129.0-alpha.1

## 0.129.0-alpha.1 (2026-09-26)

### Features

* **email:** rebuild attachment ingress on latest alpha ([3a71cb9](https://github.com/nolotus/bun-nolo/commit/3a71cb9ba53e98c622dd75824d66b8dab3c24a60))

### Bug Fixes

* **automation:** require at least one email filter in schema ([b9b12d0](https://github.com/nolotus/bun-nolo/commit/b9b12d0bdf0b73feaa1ceba38ea6b6fec849e24c))
* **email:** tombstone saved attachments on partial persist failure ([79cbbda](https://github.com/nolotus/bun-nolo/commit/79cbbdac78fe691d6a65bb0141010fba92ea75b5))
* **server:** run email_read/email_search and dispatch types in agent mode ([203cf03](https://github.com/nolotus/bun-nolo/commit/203cf03ebb1b94c3662524d3eca1d9969844fbc0))


## 0.128.0-alpha.1

## 0.128.0-alpha.1 (2026-09-26)

### Features

* **home:** add compact FAQ and mobile audit hierarchy ([683f46b](https://github.com/nolotus/bun-nolo/commit/683f46b6fdb19c613566985a28bd677740f31ca5))
* **home:** add compact FAQ and receipt copy ([41f01d4](https://github.com/nolotus/bun-nolo/commit/41f01d460143c7df9a526c7d94fce8bed5e806e1))
* **home:** add outcome-first landing hero copy ([4e1b123](https://github.com/nolotus/bun-nolo/commit/4e1b123de1132f731d8c5c6974b1577e5baac457))
* **home:** add single-ai comparison copy ([a909496](https://github.com/nolotus/bun-nolo/commit/a9094966bbcd9c3c5391ee77e9b90cd095842603))
* **home:** add visual single-ai comparison ([717808a](https://github.com/nolotus/bun-nolo/commit/717808a3c9e1ef9256ec93ccc57fe5eb9f0af773))
* **home:** align hero CTA with task outcome ([7edf4d2](https://github.com/nolotus/bun-nolo/commit/7edf4d2e6a8e55429d9ddb4410949bcc3918a950))
* **home:** compact FAQ and audit proof on mobile ([7834d73](https://github.com/nolotus/bun-nolo/commit/7834d739078a09d426fff955c9291842035a562c))
* **home:** make landing hero outcome-first ([bcbb4c3](https://github.com/nolotus/bun-nolo/commit/bcbb4c3c1e29755596555d26f2a289e1f45dcca4))
* **home:** register landing hero locale ([b5a2b15](https://github.com/nolotus/bun-nolo/commit/b5a2b15b52d07b4a065fd62c48232c1277471b30))
* **home:** shape comparison and outcome sections ([d71a2dd](https://github.com/nolotus/bun-nolo/commit/d71a2dd65a1767055f6c7d7fb3c18ee7aba0b2ba))
* **home:** style task receipt and compact home narrative ([2e1bce1](https://github.com/nolotus/bun-nolo/commit/2e1bce1f555143a7bb158f952fd4aed27860c1ba))
* **home:** wire story styles and task evidence receipt ([daa9b15](https://github.com/nolotus/bun-nolo/commit/daa9b154d5d16c6b2a2ba360f3838208e86cb04b))

### Bug Fixes

* **home:** avoid overstating automatic model routing ([1ed9fc2](https://github.com/nolotus/bun-nolo/commit/1ed9fc29e9e39053a8b58a0f6af9fce0dc5f3926))
* **home:** compress mobile landing layout ([b73927f](https://github.com/nolotus/bun-nolo/commit/b73927fdc6fb9a9b6f0e1f64f76e720e1785e3e5))
* **home:** hide source link reliably on mobile ([efaee97](https://github.com/nolotus/bun-nolo/commit/efaee971045aeb492a060af111079274ca27f574))
* **home:** keep mobile audit source link hidden under StyleX ([28067b6](https://github.com/nolotus/bun-nolo/commit/28067b63582fc1193f45a802eb5c73f25108cca7))
* **home:** make mobile landing outcome-first ([aceeb43](https://github.com/nolotus/bun-nolo/commit/aceeb433ab2d680af19911681a8abd0ebb516ae9))
* **home:** override mobile audit source link display ([755358c](https://github.com/nolotus/bun-nolo/commit/755358ccfb010fe2b677adc2522ec0f055afd916))
* **home:** remove technical kicker from mobile hero ([3f34ede](https://github.com/nolotus/bun-nolo/commit/3f34ede888bcdc78ba7fd77c4716b58202ef5cb4))


## 0.127.0-alpha.3

## 0.127.0-alpha.3 (2026-09-25)

### Bug Fixes

* **cli:** include the in-flight turn when /links reads the transcript ([9aded37](https://github.com/nolotus/bun-nolo/commit/9aded37765a8c85f4c96df60e05a99d18e2a7b06))


## 0.127.0-alpha.2

## 0.127.0-alpha.2 (2026-09-25)

### Bug Fixes

* **cli:** forward the transcript to /links on both paths ([5ac3712](https://github.com/nolotus/bun-nolo/commit/5ac371222b7d21b84179048928ce4666a531e8b9))


## 0.127.0-alpha.1

## 0.127.0-alpha.1 (2026-09-25)

### Features

* **evolution:** add Deep Review evidence loader and agent v0 with claim release ([ef265c9](https://github.com/nolotus/bun-nolo/commit/ef265c996f75161fe6742f69f766614a8427cced))


## 0.126.0-alpha.2

## 0.126.0-alpha.2 (2026-09-25)

### Bug Fixes

* **agent-runtime:** add pre-dispatch tool argument gate for local tool surface ([24d9131](https://github.com/nolotus/bun-nolo/commit/24d913149d30e07d30119ea2de5181c67e85ee6f))
* **agent-runtime:** switch Gemini functionCallingConfig from VALIDATED to AUTO ([1c1a2ad](https://github.com/nolotus/bun-nolo/commit/1c1a2ad6cf63aad440c77eeef9e3828c52aa7f63))
* **chat:** prefer process-task label over opaque taskId in status line ([dde746e](https://github.com/nolotus/bun-nolo/commit/dde746e2a8abe0a5a193f129e7e690589a08827d))


## 0.126.0-alpha.1

## 0.126.0-alpha.1 (2026-09-25)

### Features

* **cli:** make TUI links clickable via OSC 8 with plain-text fallbacks ([dd52ed2](https://github.com/nolotus/bun-nolo/commit/dd52ed2fda79664c4065ac02397a51f3d53506e3))

### Bug Fixes

* **cli:** surface Google account-verification link in local run auth failures ([2d8383d](https://github.com/nolotus/bun-nolo/commit/2d8383d84d9e4db7651a4145f92a1315337fccf3))
* **cli:** surface quota in TUI agent catalog/picker and drop husk-only summaries ([77f872f](https://github.com/nolotus/bun-nolo/commit/77f872f7561a6612848b9b3e3e087a7bd68bba51))
* **core:** normalize validation URLs and keep auth Detail on one line ([610a14a](https://github.com/nolotus/bun-nolo/commit/610a14a65887b3b59c8cf15d3e03ba4ffd53f854))


## 0.125.0-alpha.2

## 0.125.0-alpha.2 (2026-09-25)

### Bug Fixes

* **desktop:** use native window decoration on Linux for reliable resize and maximize ([a050c30](https://github.com/nolotus/bun-nolo/commit/a050c303ba47dc133a045e4e9e28f4c62adf855f))


## 0.125.0-alpha.1

## 0.125.0-alpha.1 (2026-09-25)

### Features

* **ai:** support multi-window agent quota snapshot and CLI list display ([51bceb2](https://github.com/nolotus/bun-nolo/commit/51bceb28164e6d1bf0b25ca311ad9d38b1d65746))
* **ui:** surface agent quota snapshot on web/desktop agent cards and RN agent views ([b42a821](https://github.com/nolotus/bun-nolo/commit/b42a821d8ac7b9d0e4ceda8432364ab2cf6fe947))


## 0.124.0-alpha.1

## 0.124.0-alpha.1 (2026-09-24)

### Features

* **payments:** support partial refunds with proportional clawback and refund quotes ([0cbcf8e](https://github.com/nolotus/bun-nolo/commit/0cbcf8e943fee0cd5e1d3d4596a4876dede11e77))


## 0.123.0-alpha.1

## 0.123.0-alpha.1 (2026-09-24)

### Features

* **admin:** group the life sidebar, add breadcrumbs and localize the admin area ([2dac7f4](https://github.com/nolotus/bun-nolo/commit/2dac7f4b36af8fa7b0a92c88d1fa5dfbd7abea87))
* **recharge:** disclose the refund policy on the checkout page ([2e820bb](https://github.com/nolotus/bun-nolo/commit/2e820bb5093a188c776170ae3a59ad9c6e5be0a0))


## 0.122.0-alpha.1

## 0.122.0-alpha.1 (2026-09-24)

### Features

* **recharge:** preset tiers from pricing entries and guard expired checkout sessions ([50b6dc7](https://github.com/nolotus/bun-nolo/commit/50b6dc72ea415534c6a4c17827e7158ce5788cd0))


## 0.121.0-alpha.1

## 0.121.0-alpha.1 (2026-09-24)

### Features

* **recharge:** make the recharge flow stateful, recoverable and global ([c83b1a8](https://github.com/nolotus/bun-nolo/commit/c83b1a8ec8faa717361861d5fabd507a3b26e319))


## 0.120.0-alpha.1

## 0.120.0-alpha.1 (2026-09-24)

### Features

* **dx:** make the pre-push test gate baseline-aware ([0a5ccf8](https://github.com/nolotus/bun-nolo/commit/0a5ccf845e8ee94e39b7cada73cd0dfb074afa08))

### Bug Fixes

* **cli:** repair drifted agent-store writes, dist inlining and stale test contracts ([68ae5cf](https://github.com/nolotus/bun-nolo/commit/68ae5cffaa15cd5d32eb354397041bb60c8053e2))
* **recharge:** rename transfer channel to Manual payment and stop preferring it ([dc03504](https://github.com/nolotus/bun-nolo/commit/dc0350486cacbd93aa816a55b62546b5c739141b))


## 0.119.0-alpha.3

## 0.119.0-alpha.3 (2026-09-24)

### Bug Fixes

* **cli:** bound terminateRunProcess waits by iteration count ([b29fc5c](https://github.com/nolotus/bun-nolo/commit/b29fc5c34e16de77aafb608167b53ac805be13b5))
* **recharge:** render online payment entries and fix i18n key prefixes ([5fc298a](https://github.com/nolotus/bun-nolo/commit/5fc298aeeb01836a61da14adb8e86ec462d47a76))


## 0.119.0-alpha.2

## 0.119.0-alpha.2 (2026-09-24)

### Bug Fixes

* **agent-runtime:** cap waitForRunTerminal iterations when worker timers degrade ([8185a08](https://github.com/nolotus/bun-nolo/commit/8185a08f07c1111ab96f247be5268b13b33e9c56))
* **ai:** clamp the post-compression retention below the trigger line ([4976860](https://github.com/nolotus/bun-nolo/commit/49768605d20bb83184601fac72b1913a57b05450))


## 0.119.0-alpha.1

## 0.119.0-alpha.1 (2026-09-24)

### Features

* **payments:** support dual-channel Waffo checkout (USD card + CNY WeChat) ([03f2712](https://github.com/nolotus/bun-nolo/commit/03f27126daf8de95e3c16e87dfa01a5660bef9d8)), closes [PKCS#8](https://github.com/nolotus/PKCS/issues/8) [PKCS#1](https://github.com/nolotus/PKCS/issues/1)


## 0.118.0-alpha.3

## 0.118.0-alpha.3 (2026-09-24)

### Bug Fixes

* **agent-runtime:** run the in-loop compaction decision every round and bound the first turn ([1ccaeae](https://github.com/nolotus/bun-nolo/commit/1ccaeaed2fece7b1c4d605a09924e3f129f39095))
* **agent-runtime:** stop waitForRunTerminal from spinning when sleep resolves synchronously ([2a16985](https://github.com/nolotus/bun-nolo/commit/2a169851076f60e4093bc7e0427c7ab60bc55e5d))


## 0.118.0-alpha.2

## 0.118.0-alpha.2 (2026-09-24)

### Bug Fixes

* **dx:** map nested non-workspace packages into the pre-push scope gate ([c6621a9](https://github.com/nolotus/bun-nolo/commit/c6621a930ee57f19eb9d6ca1e4b1b616227d8cba))


## 0.118.0-alpha.1

## 0.118.0-alpha.1 (2026-09-24)

### Features

* **agent:** harden the dispatch discipline with guards, failure classes and latching ([6544163](https://github.com/nolotus/bun-nolo/commit/65441636189cb9a253282a280e4b7e688b79b868))

### Bug Fixes

* **ai:** fix circular-payload serialization cost and refresh stale pricing assertions ([6735c5c](https://github.com/nolotus/bun-nolo/commit/6735c5c40a9a014222e8918b9773e6cd868a0b49))


## 0.117.0-alpha.1

## 0.117.0-alpha.1 (2026-09-24)

### Features

* **security:** add AIGC output moderation, blocklist and audit retention ([a554683](https://github.com/nolotus/bun-nolo/commit/a5546839906e892eed45e1986daf26f4ed34948f))


## 0.116.0-alpha.6

## 0.116.0-alpha.6 (2026-09-24)

### Bug Fixes

* **ai:** guard reset-time parsing against trace-id noise; review followups ([c0d20a4](https://github.com/nolotus/bun-nolo/commit/c0d20a49825f9873cc10c92b4c99d493dbffa5b0))


## 0.116.0-alpha.5

## 0.116.0-alpha.5 (2026-09-24)

### Bug Fixes

* **agent:** close availability wiring for gemini-native and cursor transports ([0cd6d2d](https://github.com/nolotus/bun-nolo/commit/0cd6d2d034268e58271f2d6fa43d9f5162a27f8a))


## 0.116.0-alpha.4

## 0.116.0-alpha.4 (2026-09-24)

### Bug Fixes

* **cli:** clear local credential cooldown after successful HTTP dispatch ([ca74be8](https://github.com/nolotus/bun-nolo/commit/ca74be869d02d7ae0dc834a38c563e7e210fd055))


## 0.116.0-alpha.3

## 0.116.0-alpha.3 (2026-09-24)

### Bug Fixes

* **devin:** sync the credential cooldown with transport outcomes ([adfdf4c](https://github.com/nolotus/bun-nolo/commit/adfdf4ce915a793da6df73e8dcd3e92c22ae9750))


## 0.116.0-alpha.2

## 0.116.0-alpha.2 (2026-09-24)

### Bug Fixes

* **scripts:** repair three operator-tooling papercuts that misled debugging ([0da1f2e](https://github.com/nolotus/bun-nolo/commit/0da1f2ef56aae4502550ee03e98b8d39874c81f7))


## 0.116.0-alpha.1

## 0.116.0-alpha.1 (2026-09-24)

### Features

* **home:** reposition brand landing around subscriptions + APIs as one workspace ([043e3cf](https://github.com/nolotus/bun-nolo/commit/043e3cfda03ae2ccb426b8291616f5dd7f25392b))


## 0.115.0-alpha.1

## 0.115.0-alpha.1 (2026-09-24)

### Features

* **agent:** make catalog+seed the single truth for platform agent presets ([e6ba2c6](https://github.com/nolotus/bun-nolo/commit/e6ba2c65e0dfe3b1e0ab4c715ffb576da7e4158c))


## 0.114.0-alpha.1

## 0.114.0-alpha.1 (2026-09-24)

### Features

* **llm:** add Artificial Analysis snapshot to modelAbility ([6fb5234](https://github.com/nolotus/bun-nolo/commit/6fb52346c5500af4267eddbbb49efe3b8c36145d))
* **llm:** add long_context and science quality domains from AA ([fee9312](https://github.com/nolotus/bun-nolo/commit/fee931236eb7560e7424d3a47b5124d9d2c35613))


## 0.113.0-alpha.1

## 0.113.0-alpha.1 (2026-09-24)

### Features

* **agent:** refresh Claude catalog on DeepInfra and close the orphan-record hole ([96863d5](https://github.com/nolotus/bun-nolo/commit/96863d53205e6b73d82868ceeb2d0978c5b6924f))
* **chrome:** add file upload capability to the Chrome connector ([c63bd3a](https://github.com/nolotus/bun-nolo/commit/c63bd3ab3ff3e2e07ee26e1fbe47d8a7f72f2397))
* **server:** add dev-only cross-dialog full-text search endpoint ([017132a](https://github.com/nolotus/bun-nolo/commit/017132ad173188b53d264ece7d94b1a6e88567b5))

### Bug Fixes

* **chat:** land desktop dialog-remediation leftovers ([586c72d](https://github.com/nolotus/bun-nolo/commit/586c72db077dc4bd3fc967c5d51cb0a8dc014a00))


## 0.112.0-alpha.1

## 0.112.0-alpha.1 (2026-09-24)

### Features

* **agent:** converge platform agent lifecycle onto stable ids and the nolo provider ([d1946eb](https://github.com/nolotus/bun-nolo/commit/d1946eba4841ffd27b144ee205d08833dc2b237f))

### Bug Fixes

* **billing:** correct three platform pricing defects found by official-price audit ([b399e93](https://github.com/nolotus/bun-nolo/commit/b399e9390226427699efa48af2883a9423ea2030))


## 0.111.0-alpha.1

## 0.111.0-alpha.1 (2026-09-24)

### Features

* **agent-runtime:** add execution observation collector ([3697221](https://github.com/nolotus/bun-nolo/commit/3697221e11fa19debc0a178a0e37f2ed997602cf))
* **agent:** add cognitive delegation value policy ([51fcb59](https://github.com/nolotus/bun-nolo/commit/51fcb5936be4cbeab7008b7a81397752288a90ae))
* **agent:** add shared human-centered working philosophy ([7bf20f8](https://github.com/nolotus/bun-nolo/commit/7bf20f87250bfb88d00737b90e82ec179f3a5066))
* **agent:** support platform-hosted MiMo models and switch builtin dialog LLM ([8438721](https://github.com/nolotus/bun-nolo/commit/8438721398668321a67d11090552371f150bc73c))
* **app:** surface cost routing on the landing page and localize the OG card ([09c0207](https://github.com/nolotus/bun-nolo/commit/09c0207d8d3cf8cfa8fffb2b43888791bd1fa82e))
* **cli:** ask once on login whether to sync OAuth credential, remember per provider ([b67e71e](https://github.com/nolotus/bun-nolo/commit/b67e71e982166674faf75966184430f8dd9afeb1))
* **evolution:** add all-run baseline sink ([59660d5](https://github.com/nolotus/bun-nolo/commit/59660d5a63a3b55bcf913b6b8bfbfc510b5c9c6f))
* **evolution:** add all-run baseline writer ([5f6bef1](https://github.com/nolotus/bun-nolo/commit/5f6bef1bf996a52789560b178f676283d26341da))
* **evolution:** add bounded historical baseline reader + resolver ([6896cd8](https://github.com/nolotus/bun-nolo/commit/6896cd8f2d00b425109fa1a01850ba8e63756853))
* **evolution:** add bounded investigation queue + claim/complete lifecycle ([e02794a](https://github.com/nolotus/bun-nolo/commit/e02794aaac40dfa7c6fd166b8361fe902191661f))
* **evolution:** add candidate writer ([bacf33c](https://github.com/nolotus/bun-nolo/commit/bacf33c0410a91026aa7931870ce125770f0ba84))
* **evolution:** add case writer ([bd1ab6b](https://github.com/nolotus/bun-nolo/commit/bd1ab6b0f23fe5e2efe07bdbb4581a611f7cfead))
* **evolution:** add compact all-run baseline record ([5cdea5f](https://github.com/nolotus/bun-nolo/commit/5cdea5ffaea5a17bf120e3eaa37960684220edae))
* **evolution:** add compact candidate record ([ed77cc9](https://github.com/nolotus/bun-nolo/commit/ed77cc90b0922b2478449908380a4a13309686b8))
* **evolution:** add deterministic comparable run baseline ([7a48ad8](https://github.com/nolotus/bun-nolo/commit/7a48ad87af64952e236eb6a33a77272df8db4885))
* **evolution:** add ephemeral case materialization ([fb674ef](https://github.com/nolotus/bun-nolo/commit/fb674efbbc6c245306b73ea9594e484e43df46e3))
* **evolution:** add host-provided Jev configuration ([738f495](https://github.com/nolotus/bun-nolo/commit/738f495b2f416ff3ee80202300ba96535279b817))
* **evolution:** add interesting candidate sink ([44c1ae0](https://github.com/nolotus/bun-nolo/commit/44c1ae0786e02205079e76b04f16b479b1104396))
* **evolution:** add Jev triage decision adapter ([f3b8edc](https://github.com/nolotus/bun-nolo/commit/f3b8edc2ce0714ced02e387f6f589dde4ac0c5d4))
* **evolution:** add minimal case record ([1d6e0c2](https://github.com/nolotus/bun-nolo/commit/1d6e0c2b149834e3ec68c0ac8bd63af815b300b2))
* **evolution:** add run snapshot and signal contracts ([3340424](https://github.com/nolotus/bun-nolo/commit/33404245a737c6281f542af1e3613ff2fb1984b6))
* **evolution:** add runtime-neutral completion seam ([a9142f9](https://github.com/nolotus/bun-nolo/commit/a9142f9d0023f968a8a3cf6bc94ef081c8eb03fe))
* **evolution:** add structural trajectory projection ([7bfbff9](https://github.com/nolotus/bun-nolo/commit/7bfbff9781962c7eacf52b8229cfef134cc1698d))
* **evolution:** add transition-based first divergence ([e401079](https://github.com/nolotus/bun-nolo/commit/e4010792bc2fa73b1991ec7a7628039e8862778e))
* **evolution:** add triage decision contracts ([f8af647](https://github.com/nolotus/bun-nolo/commit/f8af6470f2022284f18d6afc6d6c73e3b737f196))
* **evolution:** add triage policy gate ([49a69f2](https://github.com/nolotus/bun-nolo/commit/49a69f273d134baf00e581f20db5f9888e93fe8f))
* **evolution:** derive snapshots from runtime observations ([af32b63](https://github.com/nolotus/bun-nolo/commit/af32b631d35ad4ece1998ceaef1679a3b38555cc))
* **evolution:** detect deterministic run signals ([1e68fda](https://github.com/nolotus/bun-nolo/commit/1e68fda21721490a335e5804ff9efdfb6a97c0a8))
* **evolution:** export all-run baseline pipeline ([ebf98f0](https://github.com/nolotus/bun-nolo/commit/ebf98f085465807aeb4bfae1a97e879365f21979))
* **evolution:** export candidate pipeline ([4ff86bd](https://github.com/nolotus/bun-nolo/commit/4ff86bded684b10e44e916103010f4ae3c7a2773))
* **evolution:** export case materialization ([b97b503](https://github.com/nolotus/bun-nolo/commit/b97b503149101e2b8f3c52ba9431bc5ea0db416e))
* **evolution:** export case pipeline ([b9b665b](https://github.com/nolotus/bun-nolo/commit/b9b665ba32a28351072aa80695baf039367f441b))
* **evolution:** export comparable runs ([de5d466](https://github.com/nolotus/bun-nolo/commit/de5d466409def8f8e6f2a682202783033a03ab10))
* **evolution:** export completion analysis seam ([087c543](https://github.com/nolotus/bun-nolo/commit/087c54318276ed952fa0d2f1f0d9f21a5f3d66d7))
* **evolution:** export decision layer ([b73ae9f](https://github.com/nolotus/bun-nolo/commit/b73ae9f75ba700ddfc1013fc4e952bff31d624de))
* **evolution:** export decision layer ([876f578](https://github.com/nolotus/bun-nolo/commit/876f578ea885a6de9d0c231b746f20f1462cca8e))
* **evolution:** export observation primitives ([d334f62](https://github.com/nolotus/bun-nolo/commit/d334f62f1a4449ffd560974855c69c905a1892d7))
* **evolution:** export trajectory divergence primitives ([8ef91ee](https://github.com/nolotus/bun-nolo/commit/8ef91ee2ea644c4a1054fa8898b0175fbc806bcb))
* **evolution:** harden tool identity and triage evidence ([ab308e1](https://github.com/nolotus/bun-nolo/commit/ab308e1ed593bd5e44161ed0f4e6b7006c907efd))
* **evolution:** merge observation, triage, and investigation queue into alpha ([0914bc5](https://github.com/nolotus/bun-nolo/commit/0914bc5285cef4510d1ed8253e49bf10283b60e8))
* **evolution:** persist compact interesting candidates ([dff36c2](https://github.com/nolotus/bun-nolo/commit/dff36c2a7a16419e45ebc6f135ae7188a5c5db83))
* **home:** add human-centered Nolo brand landing ([b929f33](https://github.com/nolotus/bun-nolo/commit/b929f33f0990939485787717b65e424261423fc4))
* **home:** end the homepage on human agency after open proof ([a15694e](https://github.com/nolotus/bun-nolo/commit/a15694eb70295df6d87239632fce76afba53e47d)), closes [#64](https://github.com/nolotus/bun-nolo/issues/64)
* **home:** lead with Nolo human-centered brand story ([9478816](https://github.com/nolotus/bun-nolo/commit/9478816e8743bc3315bd478d7862059434ae0465))
* **home:** put product proof directly under brand hero ([2584353](https://github.com/nolotus/bun-nolo/commit/2584353c88fc7aa1610f08aa14a33488a97282a7)), closes [#64](https://github.com/nolotus/bun-nolo/issues/64)
* **memory:** add best-effort vNext lazy promotion ([8e25b2f](https://github.com/nolotus/bun-nolo/commit/8e25b2f1be125f9f14c189b6989d6d001dc6f2e5))
* **memory:** add best-effort vNext lazy promotion ([e1671a8](https://github.com/nolotus/bun-nolo/commit/e1671a8d9beec0c0929206a06ec92a5ad3d46550))
* **pricing:** expand FAQ, add tier bestFor tags and header trust badges ([e23bf06](https://github.com/nolotus/bun-nolo/commit/e23bf06484dde5da5f67dd60eb09865706299a84))
* **providers:** add Opus 5.5 and GPT-6 Sol/Luna selectors to devin-oauth catalog ([5f81a48](https://github.com/nolotus/bun-nolo/commit/5f81a483460593655df1ecf7051bafeafbfb27b9))
* **render:** rebuild the site footer as a layered riverbank camping scene ([1e4e648](https://github.com/nolotus/bun-nolo/commit/1e4e648300bfaf8a766531ecaa2a56af89b98729)), closes [#8482AD](https://github.com/nolotus/bun-nolo/issues/8482AD) [#d5eed2](https://github.com/nolotus/bun-nolo/issues/d5eed2) [#a5cba5](https://github.com/nolotus/bun-nolo/issues/a5cba5)
* **skills:** make recommended skills actionable discovery ([d117215](https://github.com/nolotus/bun-nolo/commit/d1172156b3ba25e8d6a39dece4784c79c0e3d257))

### Bug Fixes

* **agent:** classify owner subscription channels ([db7f497](https://github.com/nolotus/bun-nolo/commit/db7f497d5925cd0096615441195099ea8d205572))
* **agent:** correct devin context windows to the live-catalog values ([8282ebe](https://github.com/nolotus/bun-nolo/commit/8282ebe83663280552125aabcbaf01e785eb66ed)), closes [#18](https://github.com/nolotus/bun-nolo/issues/18) [#7](https://github.com/nolotus/bun-nolo/issues/7)
* **agent:** decode Devin usage tokens and correct SWE context window ([a33694c](https://github.com/nolotus/bun-nolo/commit/a33694c142fd9c55cb3f3cbda073a6ed1322b687)), closes [#7](https://github.com/nolotus/bun-nolo/issues/7) [#7](https://github.com/nolotus/bun-nolo/issues/7)
* **agent:** hoist delegation-value policy ahead of tiering, add executor escalation gate ([c17eeec](https://github.com/nolotus/bun-nolo/commit/c17eeec9d3995c9e7ead72f7a83e013df4e228a0)), closes [#63](https://github.com/nolotus/bun-nolo/issues/63)
* **agent:** isolate pure devin oauth predicate from node builtins ([c2fc3df](https://github.com/nolotus/bun-nolo/commit/c2fc3dfe67579d8b88186b019dba9f7066c312b0))
* **agent:** make cognitive delegation override explicit ([ebbfcb6](https://github.com/nolotus/bun-nolo/commit/ebbfcb68f057479d5a07d8aa3679365fed4a768f))
* **agent:** preserve shared agent keys ([c36a945](https://github.com/nolotus/bun-nolo/commit/c36a9455b0311794fd56f5dec966fae0b97ce34e))
* **agent:** sync devin registry with the live catalog and drop dead selectors ([9ab3f2a](https://github.com/nolotus/bun-nolo/commit/9ab3f2a9ca5313ae3435db8dd10e02e32f68f2db))
* **chat:** align settled message typography with streaming state ([324d009](https://github.com/nolotus/bun-nolo/commit/324d00964ce894caeed741e9a81ff52c448cf270))
* **cli:** classify upstream rate-limit/quota errors without HTTP status ([453c0f5](https://github.com/nolotus/bun-nolo/commit/453c0f57c1135ecf59493cd9d43826b439727faf))
* **cli:** Ctrl+C while generating copies selection instead of aborting ([ccfdeac](https://github.com/nolotus/bun-nolo/commit/ccfdeacd7d4ce52db3d894b940e9a3748623402f))
* **cli:** keep background runs provably alive before their first loop event ([fcfcdd1](https://github.com/nolotus/bun-nolo/commit/fcfcdd1ad792b7537e3e8f11e98c6d887aa1df79))
* **cli:** stop /switch hanging on "loading agents" ([00d0c78](https://github.com/nolotus/bun-nolo/commit/00d0c78996b777cce26b737088d894a29b6558e7))
* **cli:** treat undici `terminated` as transient; expose shared favorite agentKey ([5b68ed1](https://github.com/nolotus/bun-nolo/commit/5b68ed1089904a07855db84c18575133e3894aa9))
* **desktop:** prune staged payload dirs that exceed tar 100-char limit ([7b52d79](https://github.com/nolotus/bun-nolo/commit/7b52d7923fcc07c5d1ca36d0fd425d0e335e7fef))
* **desktop:** ship a real Inno installer as the stable Windows download ([776bf66](https://github.com/nolotus/bun-nolo/commit/776bf663940c280f1cdce5971c19b94803727dc5))
* **evolution:** bound materialized trajectory to selected task ([0579918](https://github.com/nolotus/bun-nolo/commit/0579918a9f4eda6f3f9d1bc47aa716c4872096cc))
* **evolution:** correct baseline import path + add writer tests ([e009437](https://github.com/nolotus/bun-nolo/commit/e00943705c4c79fcf50adea868d4f8fcab6ed5f6))
* **evolution:** dedupe optional distribution calls + float-safe p95 assert ([52a53d4](https://github.com/nolotus/bun-nolo/commit/52a53d45cbfe5241c0df68600d0a0ae9416cb86b))
* **evolution:** include run failures in triage evidence ([431b9ff](https://github.com/nolotus/bun-nolo/commit/431b9ff2d3fed3269d37c8c37b978ebebaee33c0))
* **evolution:** keep hard failures in candidate funnel ([9aa4762](https://github.com/nolotus/bun-nolo/commit/9aa4762158e39867ab689bea6ff549c572b8a649))
* **evolution:** keep partial observations from undercounting aggregates ([8de6d45](https://github.com/nolotus/bun-nolo/commit/8de6d45a37045e59c53a172db2a6d5a0293757c5))
* **evolution:** merge trace and observation tool evidence ([06d06ff](https://github.com/nolotus/bun-nolo/commit/06d06ff8f85a31661bbd4af106d48a4b4c73508d))
* **evolution:** prefer runtime identity in run snapshot precedence ([1d0aad5](https://github.com/nolotus/bun-nolo/commit/1d0aad5ba9af6c17a3e734bb07761058125d8a39))
* **evolution:** surface hard run failures as signals ([edfaea3](https://github.com/nolotus/bun-nolo/commit/edfaea343d9f2d9f2bb84e71cb530ac8166651c8))
* **home:** carry orchestration motion tokens with brand host ([9c2bcf5](https://github.com/nolotus/bun-nolo/commit/9c2bcf52f216f8234bf1524ed219e3d1812d60de))
* **home:** hide legacy hero after brand intro ([f5dbcb8](https://github.com/nolotus/bun-nolo/commit/f5dbcb84c0153228edc4b08a5fda4acb4e470c5b))
* **home:** land brand proof page without i18n hacks or duplicate mounts ([fd17d82](https://github.com/nolotus/bun-nolo/commit/fd17d82b0ded95145a956e742ba3e0f99ab66fef))
* **home:** restore orchestration svg theme variables ([cacafe7](https://github.com/nolotus/bun-nolo/commit/cacafe7659457c107371e61b1e47f182c3f5c95e))
* **i18n:** add open auditable homepage translations ([eca5af3](https://github.com/nolotus/bun-nolo/commit/eca5af310f485e5da1d6bc0820afc8b01af20fc6))
* **i18n:** register open auditable translations ([3f7fc02](https://github.com/nolotus/bun-nolo/commit/3f7fc02f933429b888f982c8b35b82046abb479c))
* **memory:** harden vNext lazy promotion ([d52429e](https://github.com/nolotus/bun-nolo/commit/d52429efc956974faa7bd5f8241250a2924eddfd))
* **memory:** harden vNext lazy promotion ([93003f6](https://github.com/nolotus/bun-nolo/commit/93003f6c064eb6a2654c43e53e768519c8392c82))
* **prompt:** rewrite agent-run wait rules into three explicit environment cases ([287e4fa](https://github.com/nolotus/bun-nolo/commit/287e4fa4f42f9278de23f073fdd3d5347f5b96da))
* **prompt:** rewrite agent-run wait rules into three explicit environment cases ([8cd3f6f](https://github.com/nolotus/bun-nolo/commit/8cd3f6ff1cfdc13194132939c6a3c622e4324bc8))
* **release:** audit main in maintenance and realign alpha version files ([0f41848](https://github.com/nolotus/bun-nolo/commit/0f41848e49d34ba723457678fbc6ecafbbaffda7))
* **render:** correct footer river geometry ([e4e32fb](https://github.com/nolotus/bun-nolo/commit/e4e32fba76446f5091a6f99c9bcc039683c6d770))


## 0.80.0

## 0.80.0 (2026-09-22)

### Features

* **agent:** add cognitive delegation value policy ([51fcb59](https://github.com/nolotus/bun-nolo/commit/51fcb5936be4cbeab7008b7a81397752288a90ae))
* **agent:** add shared human-centered working philosophy ([7bf20f8](https://github.com/nolotus/bun-nolo/commit/7bf20f87250bfb88d00737b90e82ec179f3a5066))
* **agent:** support platform-hosted MiMo models and switch builtin dialog LLM ([8438721](https://github.com/nolotus/bun-nolo/commit/8438721398668321a67d11090552371f150bc73c))
* **home:** add human-centered Nolo brand landing ([b929f33](https://github.com/nolotus/bun-nolo/commit/b929f33f0990939485787717b65e424261423fc4))
* **home:** end the homepage on human agency after open proof ([a15694e](https://github.com/nolotus/bun-nolo/commit/a15694eb70295df6d87239632fce76afba53e47d)), closes [#64](https://github.com/nolotus/bun-nolo/issues/64)
* **home:** lead with Nolo human-centered brand story ([9478816](https://github.com/nolotus/bun-nolo/commit/9478816e8743bc3315bd478d7862059434ae0465))
* **home:** put product proof directly under brand hero ([2584353](https://github.com/nolotus/bun-nolo/commit/2584353c88fc7aa1610f08aa14a33488a97282a7)), closes [#64](https://github.com/nolotus/bun-nolo/issues/64)
* **memory:** add best-effort vNext lazy promotion ([8e25b2f](https://github.com/nolotus/bun-nolo/commit/8e25b2f1be125f9f14c189b6989d6d001dc6f2e5))
* **skills:** make recommended skills actionable discovery ([d117215](https://github.com/nolotus/bun-nolo/commit/d1172156b3ba25e8d6a39dece4784c79c0e3d257))

### Bug Fixes

* **agent:** correct devin context windows to the live-catalog values ([8282ebe](https://github.com/nolotus/bun-nolo/commit/8282ebe83663280552125aabcbaf01e785eb66ed)), closes [#18](https://github.com/nolotus/bun-nolo/issues/18) [#7](https://github.com/nolotus/bun-nolo/issues/7)
* **agent:** decode Devin usage tokens and correct SWE context window ([a33694c](https://github.com/nolotus/bun-nolo/commit/a33694c142fd9c55cb3f3cbda073a6ed1322b687)), closes [#7](https://github.com/nolotus/bun-nolo/issues/7) [#7](https://github.com/nolotus/bun-nolo/issues/7)
* **agent:** hoist delegation-value policy ahead of tiering, add executor escalation gate ([c17eeec](https://github.com/nolotus/bun-nolo/commit/c17eeec9d3995c9e7ead72f7a83e013df4e228a0)), closes [#63](https://github.com/nolotus/bun-nolo/issues/63)
* **agent:** isolate pure devin oauth predicate from node builtins ([c2fc3df](https://github.com/nolotus/bun-nolo/commit/c2fc3dfe67579d8b88186b019dba9f7066c312b0))
* **agent:** make cognitive delegation override explicit ([ebbfcb6](https://github.com/nolotus/bun-nolo/commit/ebbfcb68f057479d5a07d8aa3679365fed4a768f))
* **agent:** sync devin registry with the live catalog and drop dead selectors ([9ab3f2a](https://github.com/nolotus/bun-nolo/commit/9ab3f2a9ca5313ae3435db8dd10e02e32f68f2db))
* **home:** carry orchestration motion tokens with brand host ([9c2bcf5](https://github.com/nolotus/bun-nolo/commit/9c2bcf52f216f8234bf1524ed219e3d1812d60de))
* **home:** hide legacy hero after brand intro ([f5dbcb8](https://github.com/nolotus/bun-nolo/commit/f5dbcb84c0153228edc4b08a5fda4acb4e470c5b))
* **home:** land brand proof page without i18n hacks or duplicate mounts ([fd17d82](https://github.com/nolotus/bun-nolo/commit/fd17d82b0ded95145a956e742ba3e0f99ab66fef))
* **home:** restore orchestration svg theme variables ([cacafe7](https://github.com/nolotus/bun-nolo/commit/cacafe7659457c107371e61b1e47f182c3f5c95e))
* **i18n:** add open auditable homepage translations ([eca5af3](https://github.com/nolotus/bun-nolo/commit/eca5af310f485e5da1d6bc0820afc8b01af20fc6))
* **i18n:** register open auditable translations ([3f7fc02](https://github.com/nolotus/bun-nolo/commit/3f7fc02f933429b888f982c8b35b82046abb479c))
* **memory:** harden vNext lazy promotion ([d52429e](https://github.com/nolotus/bun-nolo/commit/d52429efc956974faa7bd5f8241250a2924eddfd))


## 0.79.0

## 0.79.0 (2026-09-22)

### Features

* **memory:** add best-effort vNext lazy promotion ([e1671a8](https://github.com/nolotus/bun-nolo/commit/e1671a8d9beec0c0929206a06ec92a5ad3d46550))

### Bug Fixes

* **memory:** harden vNext lazy promotion ([93003f6](https://github.com/nolotus/bun-nolo/commit/93003f6c064eb6a2654c43e53e768519c8392c82))


## 0.78.0

## 0.78.0 (2026-09-21)

### Features

* **ai:** promote 4 generic skills to builtin registry and drop repo copies ([46ac415](https://github.com/nolotus/bun-nolo/commit/46ac415b428f2246566c752129d53960d549e278))
* **ai:** ship worktree-isolation builtin skill with default recommended hint ([397f17d](https://github.com/nolotus/bun-nolo/commit/397f17d2f8b042ca2e5c28848c27e329d033e63f))
* **cli:** data-driven provider preset onboarding for custom/subscription agents ([cbd221d](https://github.com/nolotus/bun-nolo/commit/cbd221d66395b4169ac782a8c273b18655fb5957))
* **memory:** add atomic applyMemoryInterpreterMutation for vNext store ([3508b22](https://github.com/nolotus/bun-nolo/commit/3508b22c0595c0c5d32f0c8b3c65a74d6ddd7dde))
* **memory:** add controlled legacy Evidence apply seam ([4c07efd](https://github.com/nolotus/bun-nolo/commit/4c07efd311b91a3870daf4ddca4be42ed53e97e1))
* **memory:** add vNext shadow read with minimal comparison telemetry ([c7fae57](https://github.com/nolotus/bun-nolo/commit/c7fae573833087d3ff43b719be66ef2f4e64ace0))
* **memory:** migrate legacy records through vNext shadow path ([ba13b05](https://github.com/nolotus/bun-nolo/commit/ba13b05f54cfc6c8649a232dedfd4897738a10cf))
* **trust:** expose auditable desktop release provenance ([25960f5](https://github.com/nolotus/bun-nolo/commit/25960f551333e4cd42ce9548495789f26a136958))

### Bug Fixes

* **agent:** stop naming taskWait in the tool-round-economy prompt ([431eaf2](https://github.com/nolotus/bun-nolo/commit/431eaf269004b5b86b0f8b3f56144d6b83d44a76))
* **cli:** record the post-expansion tool list in the runtime checkpoint ([5cdd277](https://github.com/nolotus/bun-nolo/commit/5cdd277dc1e76c1786c9f2ea315433bfbec4780d))
* **devin:** align the temperature default with the upstream client ([c01ec6c](https://github.com/nolotus/bun-nolo/commit/c01ec6c42b81cbf76428e513a5ea7974eec87518))
* **devin:** hand the host tool bundle and temperature to the Connect wire ([d5300f1](https://github.com/nolotus/bun-nolo/commit/d5300f11307063073c2e675c6eee36f0431b4356))
* **devin:** keep the upstream finish reason on tool-call turns ([512caac](https://github.com/nolotus/bun-nolo/commit/512caac988d2acd3f93401cace90e396001b8320))
* **devin:** speak the tool-calling protocol on the Connect wire ([513d0d5](https://github.com/nolotus/bun-nolo/commit/513d0d520cd22997005096c8c15eb9f2cc33ab89))


## 0.77.0

## 0.77.0 (2026-09-20)

### Features

* **agent-runtime:** attach bounded result capsule to promoted execShell terminals ([4d6b00a](https://github.com/nolotus/bun-nolo/commit/4d6b00ada6fd80e3932add701bf11481e27dd14c))
* **agent:** add DeepSeek official API preset and brand logos in provider pickers ([1760676](https://github.com/nolotus/bun-nolo/commit/1760676d2fda8a7387289124de5d409614248fde))
* **ai:** integrate StepFun Step Plan subscription and metered API providers ([f3b31f7](https://github.com/nolotus/bun-nolo/commit/f3b31f714f298a125b740bb8bfa035a6e012309e))
* **app:** surface cost routing on the landing page and localize the OG card ([412a6ca](https://github.com/nolotus/bun-nolo/commit/412a6ca87417f413a05259cd5b0193ca19f36766))
* **auth:** support Devin Pro subscription with native ConnectRPC and SWE-2 ([4236e6f](https://github.com/nolotus/bun-nolo/commit/4236e6f2c9eefc07a3cccce7ceab6e79ec8cdb59))
* **cli:** auto-resume agent when owned background process reaches terminal state ([7804cd6](https://github.com/nolotus/bun-nolo/commit/7804cd6fd41b217571d98341d1141c11e2fcbb32))
* **desktop:** enable devin in desktopOAuthHandler allowlist and login runner ([67751eb](https://github.com/nolotus/bun-nolo/commit/67751eb367b298d52a06fe9e1e29b7b5b8a41578))
* **devin:** promote swe-2-max as default model and refine auth flow ([73a8d98](https://github.com/nolotus/bun-nolo/commit/73a8d98e0990c1fe3cdcd3ae14f375220f1dbfdd))
* **memory:** add adaptive recall context ([8cc022b](https://github.com/nolotus/bun-nolo/commit/8cc022b699f500c83bcc4b98870a95f8f42567fd))
* **memory:** add lifetime benchmark runner protocol ([6ed8a4f](https://github.com/nolotus/bun-nolo/commit/6ed8a4fba55b3b4c22dcc09c23b7b6b492e244b5))
* **memory:** add lifetime benchmark scale generator ([2c5ab5c](https://github.com/nolotus/bun-nolo/commit/2c5ab5c0e9f1e9d2c5dc76da656254709f911e59))
* **memory:** add LLM checkpoint evaluator ([d2ebd64](https://github.com/nolotus/bun-nolo/commit/d2ebd643ff4665e357c53210a4c02df629292032))
* **memory:** add one-hop memory inspect ([21e95d4](https://github.com/nolotus/bun-nolo/commit/21e95d499e8cbf101d2044882368d6e2ed882466))
* **memory:** add provider-backed shadow interpreter ([49d76dd](https://github.com/nolotus/bun-nolo/commit/49d76ddc01480b579f33f3994681cbb41db11327))
* **memory:** add semantic interpreter wire protocol ([91d2e2d](https://github.com/nolotus/bun-nolo/commit/91d2e2d41f9ee700f8d50d45eabf28d45a652dde))
* **memory:** add structure health metrics ([77d28b1](https://github.com/nolotus/bun-nolo/commit/77d28b1e8b7bb0bae75f910f457822e549d1ad8d))
* **memory:** add validated shadow interpreter protocol ([b5f06ee](https://github.com/nolotus/bun-nolo/commit/b5f06ee6c0b888108f23cd5ba5d18aef0e19687a))
* **memory:** add vnext core memory types ([e231004](https://github.com/nolotus/bun-nolo/commit/e23100413a6a6a554674ae7cc84471cba3ca7b23))
* **memory:** add vnext interpreter entity contract ([000952d](https://github.com/nolotus/bun-nolo/commit/000952dec41da71e6b3c633c8a68dfc62a177443))
* **memory:** add vnext shadow store ([59a24d4](https://github.com/nolotus/bun-nolo/commit/59a24d41d6eef23a82240461c6ef479aeb7eb245))
* **memory:** add vNext state recall ([3fe0737](https://github.com/nolotus/bun-nolo/commit/3fe07376f61843e4948a196075d8dd0ceb7da912))
* **memory:** adopt user-world relevance contract ([1a731c6](https://github.com/nolotus/bun-nolo/commit/1a731c67164a53ebea9dcb99766efd2be7a98c42))
* **memory:** allow adaptive checkpoint context ([c589aeb](https://github.com/nolotus/bun-nolo/commit/c589aebe4c53b7c8582ecf797d03fe65c44ce215))
* **memory:** define lifetime benchmark judge contract ([bdcc8cf](https://github.com/nolotus/bun-nolo/commit/bdcc8cff21e7dbd8b6e37d4e8104f830ccd5f64c))
* **memory:** expose benchmark checkpoint artifacts ([5b4bb01](https://github.com/nolotus/bun-nolo/commit/5b4bb01661b95b52980cd9c35940d80aec432c9e))
* **memory:** expose benchmark memory context trace ([dadb693](https://github.com/nolotus/bun-nolo/commit/dadb693400e1cac4fae8cb1784830aeba3023506))
* **memory:** expose benchmark provider usage ([3a7e973](https://github.com/nolotus/bun-nolo/commit/3a7e973e3b0776dea194359f0b689d2c08d705ef))
* **memory:** include strict interpreter output contract ([c0649b4](https://github.com/nolotus/bun-nolo/commit/c0649b4c4ff4d3f63df831a8c6f0f5dcff4c3241))
* **memory:** meter benchmark provider calls ([b435538](https://github.com/nolotus/bun-nolo/commit/b435538204a907fd6f38868f72db0c794207d432))
* **memory:** require user-world relevance for third-party facts ([636fa5f](https://github.com/nolotus/bun-nolo/commit/636fa5f3282f7d37ed2b494c75a4e5b862a4f620))
* **memory:** retain checkpoint debug artifacts ([0648e91](https://github.com/nolotus/bun-nolo/commit/0648e918a7deb08ce6ab2ff340550c22d824385f))
* **memory:** summarize lifetime benchmark metrics ([63fbe35](https://github.com/nolotus/bun-nolo/commit/63fbe3568e41fcf8db322a16638ad3e593588ad3))
* **render:** rebuild the site footer as a layered riverbank camping scene ([15083f9](https://github.com/nolotus/bun-nolo/commit/15083f907a7beacd90b7bbcfb67d8dbe8478ad16)), closes [#8482AD](https://github.com/nolotus/bun-nolo/issues/8482AD) [#d5eed2](https://github.com/nolotus/bun-nolo/issues/d5eed2) [#a5cba5](https://github.com/nolotus/bun-nolo/issues/a5cba5)
* **runtime:** wire devinProvider in desktop and CLI local runtime adapters ([d9da46e](https://github.com/nolotus/bun-nolo/commit/d9da46e376008ec6218d7465afe4b54f76e8f59a))

### Bug Fixes

* **agent-runtime:** align host adapter context usage contract and explicit test notice types ([805cdbc](https://github.com/nolotus/bun-nolo/commit/805cdbcdee6257209f1f6b0977e01ea21f5a5740))
* **agent-runtime:** keep a retrievable ref for every lossy task capsule ([2aa19eb](https://github.com/nolotus/bun-nolo/commit/2aa19eb860dfc81cf598109d6deac0c1aea4ccfc))
* **agent-runtime:** restrict process terminal auto-resume to promoted execShell tasks ([c651395](https://github.com/nolotus/bun-nolo/commit/c65139521785c625007a08e44da989705efc490f))
* **agent-runtime:** spill whenever result capsule truncates inline output ([28a5575](https://github.com/nolotus/bun-nolo/commit/28a55759859db4599692fcfc748a80434e79b4a4))
* **agent:** classify owner subscription channels ([f27320d](https://github.com/nolotus/bun-nolo/commit/f27320d1b5160ea831dcace3f8f2afa8ae83903e))
* **agent:** keep accent chips at AA contrast in every theme ([85c8845](https://github.com/nolotus/bun-nolo/commit/85c8845402d15185da644e794e1b517e65bb0605))
* **agent:** preserve shared agent keys ([2936fce](https://github.com/nolotus/bun-nolo/commit/2936fce4b9ba8f6ee90ab29a4708d9882600c7f5))
* **auth:** point Devin auth URLs and token extraction directly to app.devin.ai ([f3310c4](https://github.com/nolotus/bun-nolo/commit/f3310c477bd1722f5c9e2b5ca3670682b34d3a15))
* **cli:** color user message text and fix invisible light-mode bubble ([28ba1a9](https://github.com/nolotus/bun-nolo/commit/28ba1a9818320da07ddf32ec2c5cbbbcec35ad9f)), closes [#F2F2F3](https://github.com/nolotus/bun-nolo/issues/F2F2F3) [#DDEAFA](https://github.com/nolotus/bun-nolo/issues/DDEAFA)
* **cli:** read auth tokens from the modern profile.tokens[] shape ([3137aa0](https://github.com/nolotus/bun-nolo/commit/3137aa08d177f87b2e7446f3fe19d2151e8ffffb))
* **desktop:** static import createDevinProvider in desktopAgentRuntimeAdapter ([4620cdd](https://github.com/nolotus/bun-nolo/commit/4620cddd9bfd47c5a314572e0d1118153f3c4acd))
* **devin:** calibrate GetChatMessage request schema with double-precision completion config ([20b435b](https://github.com/nolotus/bun-nolo/commit/20b435b118d896a6743e601cdbc7f79f7636eaee)), closes [#15](https://github.com/nolotus/bun-nolo/issues/15) [#21](https://github.com/nolotus/bun-nolo/issues/21)
* **devin:** fail closed on incomplete streams and preserve wire-order deltas ([d924ae1](https://github.com/nolotus/bun-nolo/commit/d924ae1155cba7bc7fde61ad22c15a46169ee6ee))
* **devin:** harden local transport tests and remove dead sync flag ([aded2f6](https://github.com/nolotus/bun-nolo/commit/aded2f666cbebf952febe2d4e8050ac9ec0c7db5))
* **devin:** reject frames after terminal ConnectRPC trailer ([f85d130](https://github.com/nolotus/bun-nolo/commit/f85d130978d8ce4bafe346716caa2fbc8b6795f8))
* **home:** align landing-page spacing scale, surface radii and copy ([5ba9383](https://github.com/nolotus/bun-nolo/commit/5ba93835a8e34fe03b8b7d579a705e47632b4c3e))
* **home:** close residual reduced-motion and contrast gaps ([042f104](https://github.com/nolotus/bun-nolo/commit/042f104d8078290674511adfadd052172b9e89e4))
* **home:** normalize diagram icons, bind z-index tiers and drop dead CSS ([5cce984](https://github.com/nolotus/bun-nolo/commit/5cce984b95aaa3bc43163ddf13babf5d878c476d))
* **home:** put the remaining visible icons back on the 16/20/24 grid ([0b45d01](https://github.com/nolotus/bun-nolo/commit/0b45d014260ed17d04b1e2b05f4ceb6edc0c5434))
* **home:** repair landing-page a11y, SSR hydration and copy issues ([2e46dbe](https://github.com/nolotus/bun-nolo/commit/2e46dbe7f56c12859e2dcfdd296a53c7ca1d9bd3))
* **i18n:** gloss the zh Terms of Service entry like its siblings ([6a63f62](https://github.com/nolotus/bun-nolo/commit/6a63f628f463ba2e0a34aa762ade3445e2e7c3a5))
* **memory:** close the first-round review findings in memory vNext ([d1c7ba0](https://github.com/nolotus/bun-nolo/commit/d1c7ba0a8c5a8ad49399ceed6bdea8f29da3838e))
* **memory:** harden vNext mutation references ([9485160](https://github.com/nolotus/bun-nolo/commit/948516053fee9eee12cd1afda15e855fb39810cf))
* **memory:** preserve state provenance during materialization ([24df7b0](https://github.com/nolotus/bun-nolo/commit/24df7b0603de8a2414bee0939e2b3f01efc6ef21))
* **memory:** refuse to update or supersede an already retired State ([3bf77d6](https://github.com/nolotus/bun-nolo/commit/3bf77d65391d06417b4d22d74f40c39b0dd57eee))
* **memory:** retain prior state evidence in LLM adapter ([4ef5a1e](https://github.com/nolotus/bun-nolo/commit/4ef5a1ece1657329ee4c0681dd6f8de3d2d82f26))
* **oauth:** allow devin provider in createOAuthApiKeyRefResolver ([a4179f5](https://github.com/nolotus/bun-nolo/commit/a4179f542bb9ffef28aa9dff75bbe78ec3c4814e))
* **render:** correct footer river geometry ([ca700c5](https://github.com/nolotus/bun-nolo/commit/ca700c57c17a75345942f1d7728947ab51c6e067))
* **security:** do not auto-sync sensitive OAuth credentials to server by default ([408ea2e](https://github.com/nolotus/bun-nolo/commit/408ea2ec466c3dcb5357e3fc0bd8c11b667d65d6))
* **tui:** describe taskLogs as lifecycle-only in process notices ([c92e01f](https://github.com/nolotus/bun-nolo/commit/c92e01ff7c23fe4df82efaa7dbdf4ecc64a1ddff))
* **tui:** make paste and drag intuitive across terminals ([a09a546](https://github.com/nolotus/bun-nolo/commit/a09a5464c9a7e09b128483df1fc8a6d3674424b0))
* **tui:** preserve user message contrast ([f958013](https://github.com/nolotus/bun-nolo/commit/f9580138ccc8964105dbaa96f7cb939f7501d72e))
* **tui:** stop a duplicate OSC 52 write from restoring stale clipboard content ([76cb5aa](https://github.com/nolotus/bun-nolo/commit/76cb5aae5018185ddce4c414df1ed2e34e396927))


## 0.76.0

## 0.76.0 (2026-09-18)

### Features

* **render:** rebuild the site footer as a layered riverbank camping scene ([1e4e648](https://github.com/nolotus/bun-nolo/commit/1e4e648300bfaf8a766531ecaa2a56af89b98729)), closes [#8482AD](https://github.com/nolotus/bun-nolo/issues/8482AD) [#d5eed2](https://github.com/nolotus/bun-nolo/issues/d5eed2) [#a5cba5](https://github.com/nolotus/bun-nolo/issues/a5cba5)

### Bug Fixes

* **agent:** classify owner subscription channels ([db7f497](https://github.com/nolotus/bun-nolo/commit/db7f497d5925cd0096615441195099ea8d205572))
* **agent:** preserve shared agent keys ([c36a945](https://github.com/nolotus/bun-nolo/commit/c36a9455b0311794fd56f5dec966fae0b97ce34e))
* **render:** correct footer river geometry ([e4e32fb](https://github.com/nolotus/bun-nolo/commit/e4e32fba76446f5091a6f99c9bcc039683c6d770))


## 0.75.0

## 0.75.0 (2026-09-18)

### Features

* **agent-runtime:** guide agents to render mermaid for structured explanations ([87d0fd4](https://github.com/nolotus/bun-nolo/commit/87d0fd4b676f8358b1a5af697cf1a36f80147281))
* **app:** surface cost routing on the landing page and localize the OG card ([09c0207](https://github.com/nolotus/bun-nolo/commit/09c0207d8d3cf8cfa8fffb2b43888791bd1fa82e))
* **cli:** let the TUI drive the user's Chrome through the Nolo connector ([9ada25d](https://github.com/nolotus/bun-nolo/commit/9ada25dcb536022ae09132e0f295785b95d440b6))
* **cli:** nolo chrome 组补充操作子命令（读页面/点击/输入等 11 个） ([d44444e](https://github.com/nolotus/bun-nolo/commit/d44444e772b95984842d80c18093838b5ed82ac0))
* **cli:** render mermaid diagrams via lovely-mermaid ([249d944](https://github.com/nolotus/bun-nolo/commit/249d9440b0dc8a7ac8be17d572fa05bffd0835b5))
* **desktop:** add Chrome connector tab lifecycle and debugger release ([f601aae](https://github.com/nolotus/bun-nolo/commit/f601aae7a9de84b30225e0716a3002f3a7d4d6e1))
* **desktop:** add compact Chrome observation protocol ([dae7f9d](https://github.com/nolotus/bun-nolo/commit/dae7f9d8b8b5fca28fdecbb845b4f16625ffd9da))
* **desktop:** add the Chrome Web Store publishing kit ([00315ea](https://github.com/nolotus/bun-nolo/commit/00315ea16e33920b463e403a02887e26718b4aa6))
* **desktop:** negotiate Chrome connector capabilities instead of failing on any skew ([f2a10bb](https://github.com/nolotus/bun-nolo/commit/f2a10bb0bbbb63bc0865cca63d0a76d5e64c02c2))
* **desktop:** refuse irreversible Chrome actions before acting ([e12f159](https://github.com/nolotus/bun-nolo/commit/e12f1595be0030fcd8892e8148534706711e5ff3))
* **desktop:** self-reload the unpacked extension and localise its surface ([403d355](https://github.com/nolotus/bun-nolo/commit/403d35595f66c7b9e8f5ac69b8019009f83da2cd))

### Bug Fixes

* **agent-runtime:** 工具参数尾截断可无损补全时直接执行，不再白跑一轮重试 ([da894d4](https://github.com/nolotus/bun-nolo/commit/da894d4decb97beeaad476f3796faf093637dc4a))
* **ask-user:** reduce choice interaction steps ([1c7b631](https://github.com/nolotus/bun-nolo/commit/1c7b6316ab0f9c955055e599f71610bdae31cddd))
* **cli:** consume git stderr in connector runGit to avoid hang ([f0d1b28](https://github.com/nolotus/bun-nolo/commit/f0d1b2839efe025deb531d0092c033bba39ff6fe))
* **cli:** fuse runGit with a timeout and tidy post-incident leftovers ([4d9e245](https://github.com/nolotus/bun-nolo/commit/4d9e245539c6eb5d11f80c5cee05b1c7e6b49b41))
* **desktop:** import the protected-page code and pin it with a driven worker test ([e93c6e4](https://github.com/nolotus/bun-nolo/commit/e93c6e40378507aa928f8d182ea216e036f8518e))
* **desktop:** install the Chrome native host on the right per-platform path ([4ac33c1](https://github.com/nolotus/bun-nolo/commit/4ac33c16478bdffde5c044f77839a7eaa422f385))
* **desktop:** keep electrobun 安装载荷 tar 兼容并加验证闸门 ([1a12f8b](https://github.com/nolotus/bun-nolo/commit/1a12f8b26c14dc6f5902ce21aa1ed6ebaa8e1b82))
* **desktop:** Linux 官方安装器发布到 R2 并作为推荐下载 ([f24a7e9](https://github.com/nolotus/bun-nolo/commit/f24a7e9a36fba0431cebdb1a7a36f54a50546c33))
* **desktop:** name protected pages and reuse the shipped brand icons ([d184770](https://github.com/nolotus/bun-nolo/commit/d1847701792febda93f7536db34b57c99a1f78dd))
* **desktop:** Windows 安装器落到 electrobun 托管目录（恢复应用内自更新） ([11d1a7f](https://github.com/nolotus/bun-nolo/commit/11d1a7fab7b103d9cab4ba1c8454b348e9864c22)), closes [#define](https://github.com/nolotus/bun-nolo/issues/define)
* **desktop:** 更新面板文案人话化（保留原文可查） ([38164e4](https://github.com/nolotus/bun-nolo/commit/38164e4129eae98cb4b44b25d091d81f38a26f5b))
* **desktop:** 桌面登录导入 CLI profile tokens[] 形状 ([c8480e5](https://github.com/nolotus/bun-nolo/commit/c8480e56ddcbcc21a6f9a10ac4cc9a988908338b))
* **desktop:** 浏览器地址栏贴顶并补齐站点图标与安全指示 ([ca337a6](https://github.com/nolotus/bun-nolo/commit/ca337a64d74719b1bd599c205ca988a6f431b20a))
* **desktop:** 载荷闸门迁入 desktop 包，锁死跨树 import 在公开投影缺失 ([840ed09](https://github.com/nolotus/bun-nolo/commit/840ed0998c728ec47c890e1132413f1d3fb9b672))
* **desktop:** 非受管理安装不再给必然失败的「下载更新」按钮 ([caceedc](https://github.com/nolotus/bun-nolo/commit/caceedc9020a0523e6c6d33ca738b2ecec8d3a93))
* **desktop:** 预热 electrobun 安装元数据并迁移 legacy 数据目录，修复打包版检查更新失败 ([94aebdb](https://github.com/nolotus/bun-nolo/commit/94aebdb047ac4eb6308259ef9415b5e18a0b2031))
* **dx:** serialize green typechecks to reduce peak memory ([9842453](https://github.com/nolotus/bun-nolo/commit/9842453e8ccd7b72c7c24525dbcfa6ed4ff5e60a))
* **table:** 修正重命名列显示名/重命名表的命令参数名 ([9cfc459](https://github.com/nolotus/bun-nolo/commit/9cfc4595cc08eeaffcf36d9840c70ce85e1ecb67))
* **table:** 去掉 setTableFocusContext 的 dispatch 包装，修复表格页渲染崩溃 ([8586fa9](https://github.com/nolotus/bun-nolo/commit/8586fa99a0017f50952c1319fb66cb62fe7347af)), closes [#7](https://github.com/nolotus/bun-nolo/issues/7)
* **table:** 给 listTableRows 的服务器读取加 5s 超时，修复表格加载可卡 60s+ ([66afa8a](https://github.com/nolotus/bun-nolo/commit/66afa8a883833abe1e1e9b547a52455a88b9b659))
* **tui:** reduce wheel scrolling backlog with adaptive catch-up ([bba6016](https://github.com/nolotus/bun-nolo/commit/bba601658622dba14169705901da0d259569532c))
* **tui:** soften user messages on light backgrounds ([50d80c3](https://github.com/nolotus/bun-nolo/commit/50d80c3d0a8f7cc602861b3d0bea8325d806f482))

### Performance Improvements

* **cli:** avoid pathological Bun JSON.stringify on cyclic delegation payloads ([aea5535](https://github.com/nolotus/bun-nolo/commit/aea553559629a2397fb48e6659a48fa2f0d6ad09))


## 0.74.0

## 0.74.0 (2026-09-16)

### Features

* **brand:** unify website and desktop Nolo head icons ([44276eb](https://github.com/nolotus/bun-nolo/commit/44276ebe0323c3788b39db018e1fac62b0db08f0))


## 0.73.0

## 0.73.0 (2026-09-15)

### Features

* **server:** add watchCompletion — business-task terminal subscription with parent-dialog wake ([321a930](https://github.com/nolotus/bun-nolo/commit/321a93048ecbb6d0c7d6d39cb855f34fa3bbd163))


## 0.72.1

## 0.72.1 (2026-09-15)

### Bug Fixes

* **desktop:** recover stale cross-host CEF lock before CEF init on Linux ([1b77eda](https://github.com/nolotus/bun-nolo/commit/1b77eda16452220bf489ecae55e46c246a7a4b31))
* **llm:** replace dead crof upstream with baseten; restore real Claude & add GPT-5.6/6 hosted models ([4e28ad6](https://github.com/nolotus/bun-nolo/commit/4e28ad6ccedb33989f15ebd020c894f5bbc903f6))


## 0.72.0

## 0.72.0 (2026-09-15)

### Features

* **ai:** 会商模式注入提示词补齐实战决策纪律 ([3031da4](https://github.com/nolotus/bun-nolo/commit/3031da4f85d0e27c8f8e6e75b35e22584afdeea4))
* **memory:** 常驻偏好集——跨话题用户偏好无条件进入注入层 ([43ead3a](https://github.com/nolotus/bun-nolo/commit/43ead3ad18c930f3c756f11c796a7dbdb7cb109a))

### Bug Fixes

* **ask-user:** unify explicit multi-question interaction ([3afbef9](https://github.com/nolotus/bun-nolo/commit/3afbef9361b51b705b0f6ddca050ec93ffea9162))
* **tui:** distinguish user messages from AI output ([8dac8fc](https://github.com/nolotus/bun-nolo/commit/8dac8fc8dc774782d20b1e1497ef87deacd56473))


## 0.71.0

## 0.71.0 (2026-09-15)

### Features

* **agent-runtime:** 上下文压缩重构：轮内真实遥测主防线 + 触发收敛 ([4dadecf](https://github.com/nolotus/bun-nolo/commit/4dadecf4eaa9480c2d9df3d3c50f703d0c1d0cca))
* **chat:** 压缩决策接入真实遥测 + 压缩结果 toast 可见性 ([e4fc9d4](https://github.com/nolotus/bun-nolo/commit/e4fc9d4cbbf766897669117925fdee1306f518a1))

### Bug Fixes

* **desktop:** ship hutch's Setup zip as the stable Windows download ([3342bde](https://github.com/nolotus/bun-nolo/commit/3342bde7f98798b4039267da4f8d31ee305a6be2))


## 0.70.0

## 0.70.0 (2026-09-15)

### Features

* **agent:** add tool-use discipline guidance section ([7125503](https://github.com/nolotus/bun-nolo/commit/7125503840709a1ba496d43eafe0fd554d75dba6))

### Bug Fixes

* **agent:** expand a leading ~/ in workspace tool paths ([2f5e0ed](https://github.com/nolotus/bun-nolo/commit/2f5e0ed8c0ebe2f61fc07a590d85e20321bba874))
* **desktop:** adapt the Windows VBS entry to the v2 wrapper payload ([a2bead4](https://github.com/nolotus/bun-nolo/commit/a2bead4c4f2ea87a7adc4575d2c5432098429099))
* **desktop:** build the stable Windows smoke from the runnable app payload ([218ccaa](https://github.com/nolotus/bun-nolo/commit/218ccaa5395c8c86c5b7c85bf93f29dc0805038f))
* **desktop:** extract Windows tarballs with a portable-first tar strategy ([b6486f1](https://github.com/nolotus/bun-nolo/commit/b6486f1fa5d09203ee396abe6454e1b464458a77))


## 0.69.0

## 0.69.0 (2026-09-15)

### Features

* **agents:** handle credentials as the routing unit and stop teaching ephemeral ([f1cfc83](https://github.com/nolotus/bun-nolo/commit/f1cfc83c9d8376ba8398f3fdcf066b562220a2fa))
* **ai:** restore deepseek-v4-pro as platform-hosted model ([20351be](https://github.com/nolotus/bun-nolo/commit/20351be1ca6f1d8ea9557f520558ba8e432b5af4))

### Bug Fixes

* **agent:** keep key decision context with the orchestrator ([ea246ce](https://github.com/nolotus/bun-nolo/commit/ea246cefc31f30d135edddaacd089055ee40e7c7))
* **agent:** make thread admission fail closed ([382864f](https://github.com/nolotus/bun-nolo/commit/382864fdccff591c039784195e66fdd92bda521d))
* **ai:** keep node:crypto out of the browser bundle (credential group hash) ([7f5ef12](https://github.com/nolotus/bun-nolo/commit/7f5ef12ae107da8d844842bae8bfa760f3fc3297))
* **cli:** restore agent availability helper export ([0ca1648](https://github.com/nolotus/bun-nolo/commit/0ca1648e69b2ebe09bff98fe603ef9c678df7dfb))
* **desktop:** restore stable Windows packaging ([3d5307e](https://github.com/nolotus/bun-nolo/commit/3d5307e465336ee286728ddf47df45c544f496ff))
* **read-dialog:** bound agent readDialog responses with a shared projection seam ([55cfd65](https://github.com/nolotus/bun-nolo/commit/55cfd6544ba10d827e44c52b4c73c34a3659ccb7))
* **tui:** bold user message body so input stands out from AI output ([e65426e](https://github.com/nolotus/bun-nolo/commit/e65426e4d15f948674a66b7491d24ada97275b42))


## 0.68.0

## 0.68.0 (2026-09-14)

### Features

* **tui:** smooth wheel scrolling via paced scroll animation ([5e2471d](https://github.com/nolotus/bun-nolo/commit/5e2471df9fb7cc0ed8efababcf50baef91c4e3ab))


## 0.67.0

## 0.67.0 (2026-09-14)

### Features

* **release:** publish desktop releases per platform with loud accounting ([b8249f0](https://github.com/nolotus/bun-nolo/commit/b8249f0ab56603da62f5ffe1f23361f0154b55a7))


## 0.66.0

## 0.66.0 (2026-09-14)

### Features

* **release:** add a build-only dispatch mode and structured payload diagnostics ([6900c67](https://github.com/nolotus/bun-nolo/commit/6900c679791faf3fd0e7b18ff02b5515a4ecc146))

### Bug Fixes

* **cli:** put nolo on PATH from the installer for bash and zsh ([e34f3f8](https://github.com/nolotus/bun-nolo/commit/e34f3f812c787be330f1ee85456ed3d4408b1a3d))


## 0.65.3

## 0.65.3 (2026-09-14)

### Bug Fixes

* **desktop:** stop forcing delta-patch off in the stable Windows build and diagnose incomplete payloads ([4e219e5](https://github.com/nolotus/bun-nolo/commit/4e219e5a6526baebb8df5374af9337953559fb9d))


## 0.65.2

## 0.65.2 (2026-09-14)

### Bug Fixes

* **agent-runtime:** 自动压缩改用真实上下文占用触发 ([e390c57](https://github.com/nolotus/bun-nolo/commit/e390c579cfea57dada94ced12743e402794bd6f2))
* **cli:** 修复 /compact 全链路并补全进度、本地化与超限友好提示 ([14651c4](https://github.com/nolotus/bun-nolo/commit/14651c45e45aaf06f38d8ef0319b6b4cbb2430e8))
* **desktop:** keep Windows capability evidence single-sourced and enforce it at the release gate ([b5b18cb](https://github.com/nolotus/bun-nolo/commit/b5b18cb63c0c7974edc291f890db47e1cac46180))


## 0.65.1

## 0.65.1 (2026-09-14)

### Bug Fixes

* **desktop:** fail closed when the Windows installer recovery payload is incomplete ([84bc1d5](https://github.com/nolotus/bun-nolo/commit/84bc1d572d5e59b2858f58b5b783e5229e2dcb16))
* **desktop:** harden the Windows recovery payload gate against crafted and truncated payloads ([1f094e7](https://github.com/nolotus/bun-nolo/commit/1f094e722469bf3e8f9764577271e7668cfa78ac))


## 0.65.0

## 0.65.0 (2026-09-14)

### Features

* **desktop:** ship a real desktop account edition and a release capability gate ([a1c6e5e](https://github.com/nolotus/bun-nolo/commit/a1c6e5e0acea52ae643301c78859048cc8e29cc0))

### Bug Fixes

* **ledger:** make offline repair survive a still-locked database ([97eefb0](https://github.com/nolotus/bun-nolo/commit/97eefb024559239e4a186b95476589ebf4385ade))


## 0.64.1

## 0.64.1 (2026-09-14)

### Bug Fixes

* **ledger:** adapt the authority store so ledger repair and adjustments can actually write ([1c954dd](https://github.com/nolotus/bun-nolo/commit/1c954ddd901cf5e9b46e94a66ed313478d058a87))


## 0.64.0

## 0.64.0 (2026-09-14)

### Features

* **ledger:** repair tx-consistent entry hashes and add a guarded compensation endpoint ([7670b52](https://github.com/nolotus/bun-nolo/commit/7670b52cfaad4c6ae5eeb59dcea5159d2119710a))

### Bug Fixes

* **billing:** converge ledger idempotency keys without weakening the marker gate ([9b64c9d](https://github.com/nolotus/bun-nolo/commit/9b64c9d93cc341de1ac10348c844fd5b5f36aa88))
* **desktop:** handle win32 process termination and optimistic process stop ([f2b8e40](https://github.com/nolotus/bun-nolo/commit/f2b8e404168edaf354b890ddf30503831df24108))
* **desktop:** harden updates and release truth ([39b1472](https://github.com/nolotus/bun-nolo/commit/39b147291f3e0735b607130d18b6a5e98aeb8f52))


## 0.63.0

## 0.63.0 (2026-09-13)

### Features

* **agent:** add CommandCode subscription preset ([e512ab2](https://github.com/nolotus/bun-nolo/commit/e512ab2adb1961e6ba9236a4434f5de6c852bdfe))
* **agent:** add privilege escalation guidance section ([dd7878c](https://github.com/nolotus/bun-nolo/commit/dd7878c0ea7173ee0a8210d0b7e418612a8f8915))
* **agent:** recommend GPT-6 Astra and add OpenAI prompt cache key ([4854f1d](https://github.com/nolotus/bun-nolo/commit/4854f1dfb1cee32684e7d98302e13ce4c34629a3))
* **cli:** box and bold device-code display in nolo auth flows ([a322a14](https://github.com/nolotus/bun-nolo/commit/a322a14354e56876871101eb45da735bfb235a33))
* **desktop:** clarify first-run onboarding choices ([f17eb79](https://github.com/nolotus/bun-nolo/commit/f17eb793142c5242e7c5430efb1c01b17b71a761))
* **payments:** add CNY WeChat channel with per-channel minimums ([e7e3189](https://github.com/nolotus/bun-nolo/commit/e7e31891b9c3fc6f875296a8864cce7476269f8f))
* **tui:** show platform credits live during a turn instead of only at turn end ([5b0daf7](https://github.com/nolotus/bun-nolo/commit/5b0daf779c92848a1bea5b087afea9617d0a054c))
* **web:** drop new-chat from create menu, rename manual agent create ([39cea16](https://github.com/nolotus/bun-nolo/commit/39cea168cfb1ae7dcd83cf27df2487b63f6cd8cc))

### Bug Fixes

* **agent:** bump Codex client version to 0.154.0 for gpt-6-astra ([5ffd65b](https://github.com/nolotus/bun-nolo/commit/5ffd65b26ca2a687853a99c6c3000e20efdc5ee8))
* **agent:** inherit provider configuration when creating agents ([b99fa0c](https://github.com/nolotus/bun-nolo/commit/b99fa0c2d0ead5d2a277299def2cd12b4fe7e5a6))
* **agent:** only prune stale public-agent cache on authoritative results ([c7ff520](https://github.com/nolotus/bun-nolo/commit/c7ff520c03b4264fadad2fee041038576c09c0cb))
* **app:** freeze redux consumer entry points ([737a88b](https://github.com/nolotus/bun-nolo/commit/737a88b365fd7458d432fe753fc86844303abf98))
* **app:** narrow redux boundary to canonical app/store entry ([436f68d](https://github.com/nolotus/bun-nolo/commit/436f68dce6be293dfc02264daa8b32ef6835f5d8))
* **cli:** platform agents with runtimeBinding route to machine connector instead of CLI misdispatch ([ab02c60](https://github.com/nolotus/bun-nolo/commit/ab02c608c10c84946d76eb2f1898cd6e464fdf5b))
* **desktop:** center and restore window geometry ([3bdceb4](https://github.com/nolotus/bun-nolo/commit/3bdceb439e5c86c55148c6ada786c2126c8a4674))
* **desktop:** remove duplicate Linux titlebar ([e108a3d](https://github.com/nolotus/bun-nolo/commit/e108a3d3d53c61464f79fda8407fe32505207b24))
* **desktop:** show onboarding for local users ([34690c6](https://github.com/nolotus/bun-nolo/commit/34690c66c0fa1d700fc8abc95acbf761a035be67))
* **i18n:** guard double init so SSR language negotiation survives ([f81825e](https://github.com/nolotus/bun-nolo/commit/f81825efa690f16856d56316d19e811453cd98d6))
* **pricing:** drop zero-markup promise from FAQ copy ([0cda539](https://github.com/nolotus/bun-nolo/commit/0cda539ac113a9c8e4b1b23a5527941a5596c669))
* **tui:** preserve text paste when clipboard has no image ([58e7e9a](https://github.com/nolotus/bun-nolo/commit/58e7e9a79353f5ec423c849a4b3f1af4a18847ab))
* **tui:** prevent stale mouse selection clipboard writes ([d310532](https://github.com/nolotus/bun-nolo/commit/d310532552e0df99677017a1c7f82707ec6be2d3))
* **welcome:** repair mobile horizontal overflow on guest homepage ([ee329f0](https://github.com/nolotus/bun-nolo/commit/ee329f0fbff6679d82423479fe21ee0dfacca235))

### Performance Improvements

* **dev:** periodic esbuild watch restart + --smol for test:heavy ([855f77b](https://github.com/nolotus/bun-nolo/commit/855f77bafc6d3c53d048abd132c571adac686145))
* **scripts:** esbuild watchdog linux collector + memory-capped test:heavy ([3f26165](https://github.com/nolotus/bun-nolo/commit/3f261658c1d05bb46939228d6053f0001274ebad))
* **test:** lazy @babel/core in stylexBunPlugin + test:light for pure-logic packages ([bceb211](https://github.com/nolotus/bun-nolo/commit/bceb21143127bbd69b5f9ff6c8f5b00edc37a344))
* **tui:** bound cross-server agent catalog fetch with deadline and circuit breaker ([1b6f50c](https://github.com/nolotus/bun-nolo/commit/1b6f50c9926174ce8541d9561a39b3ea003517e6))


## 0.62.0

## 0.62.0 (2026-09-11)

### Features

* **agent:** add platform-wide response behavior guidelines ([73d02f2](https://github.com/nolotus/bun-nolo/commit/73d02f24b82e83b9a909cd367c9b515326b2f6a2))
* **browser:** add minimal browser workbench ([8c64326](https://github.com/nolotus/bun-nolo/commit/8c64326d484beb6e8209193ba4b2cabad36710e7))
* **chat:** remove quick-chat tiers and switch default nolo agent to deepseek-flash ([e9b21a2](https://github.com/nolotus/bun-nolo/commit/e9b21a22f32797e7f2d014595a58e7ed4c6d677d))
* **cli:** in-TUI /login device-code auth + accurate not-logged-in 401 hint ([21280ed](https://github.com/nolotus/bun-nolo/commit/21280edf1967bf4e86da958db10a922a31502769))
* **cli:** refresh welcome screen — daily tips, neutral daylight sky, non-blocking sweep animation ([0045c83](https://github.com/nolotus/bun-nolo/commit/0045c8335b6e179cb6439e5c45e6737806e3a122))
* **payments:** rework Waffo CNY recharge with shared quote module ([8ccc3a4](https://github.com/nolotus/bun-nolo/commit/8ccc3a41892dd915a85d01b4e1be46e78cadb45e))
* **tui:** notify agent when background OS tasks reach terminal state ([3e1254e](https://github.com/nolotus/bun-nolo/commit/3e1254e1e1c35d61190b09af4a14b782476d0d28))

### Bug Fixes

* **app:** isolate browser probe routes from production ([37061bb](https://github.com/nolotus/bun-nolo/commit/37061bbd517323ca02bdccc1b101900283633c2a)), closes [app/utils/env#isDevelopment](https://github.com/app/utils/env/issues/isDevelopment)
* **chat:** merge fix/sidebar-scroll-chain → alpha ([75489ba](https://github.com/nolotus/bun-nolo/commit/75489ba5c6a478f58013d724b157bfb0b4f5fef2))
* **chat:** 侧边栏嵌套滚轮被 overscroll contain 吞掉，恢复 scroll chaining ([d6e448d](https://github.com/nolotus/bun-nolo/commit/d6e448d0f413395547e6dae157ad254022cf83ed))
* **cli:** close ANSI formatting after user message gutter to prevent accent color leak ([12013c2](https://github.com/nolotus/bun-nolo/commit/12013c25c3211cac71290572cf142470e84b3ce0))
* **cli:** expose process task tools in CODE pack so prompt and gate agree ([cbf25eb](https://github.com/nolotus/bun-nolo/commit/cbf25ebf5530e8a16165462795150ecb3c7da626))
* **cli:** upgrade dark mode accent ansi fallback to bright blue and modernize status icon ([4d2c7d9](https://github.com/nolotus/bun-nolo/commit/4d2c7d9c8ae6f5f3b2f8a02d0287ac1c585e08c2))


## 0.61.0

## 0.61.0 (2026-09-10)

### Features

* **agent:** consolidate DeepSeek catalog to deepseek-flash with legacy migration ([f0d9a24](https://github.com/nolotus/bun-nolo/commit/f0d9a24ed1ec70f827d0a79ed0e53ed21e956114))
* **layout:** add companion placement preference ([3ab7b23](https://github.com/nolotus/bun-nolo/commit/3ab7b2340a7ca660e3a554a10a84d1489db80e19))
* **layout:** add navigation placement preference ([f6d153f](https://github.com/nolotus/bun-nolo/commit/f6d153f2df118ba83da33c2dc58a4ffef73d6665))
* **layout:** add responsive workbench presentation ([54b5628](https://github.com/nolotus/bun-nolo/commit/54b562800bfd937592361be4fb31ce68ccb21c99))
* **layout:** use WorkbenchSplit for AppEditor chat mode ([6d5b8e7](https://github.com/nolotus/bun-nolo/commit/6d5b8e7d6b51ae3ccf7f279dd9572f34928edccc))

### Bug Fixes

* **agent:** default new-agent model to nolo-hosted deepseek-v4-flash ([0854198](https://github.com/nolotus/bun-nolo/commit/08541986db7db24f774d45d4b037aa324a55d816))
* **billing:** sync DeepSeek Flash peak/off-peak prices with 2026-09-10 official cut ([b988331](https://github.com/nolotus/bun-nolo/commit/b98833128999c60d7051c93ea82cc561b540ac70))
* **cli:** fix TUI Ollama context tracking, stream usage and truncation ([33e4461](https://github.com/nolotus/bun-nolo/commit/33e4461beae687a05188aeeb76e3ff09a0939837))
* **layout:** clamp companion below preferred min on narrow stages ([d6edaa5](https://github.com/nolotus/bun-nolo/commit/d6edaa56789b8af0342b9514ddfea25352916cd2))
* **layout:** normalize workbench active surface control ([39453dc](https://github.com/nolotus/bun-nolo/commit/39453dc4f5e32506c72c09bcac241de6d0805256))
* **layout:** restore dialog page height chain in LocalPreviewSplit ([27398ea](https://github.com/nolotus/bun-nolo/commit/27398ea7a00a27724fb57f98e26643900868e7e0))
* **layout:** restore dialog page height chain in LocalPreviewSplit ([0bf855c](https://github.com/nolotus/bun-nolo/commit/0bf855cbd6e426cc419ec5e7d2919747e5479d7e))
* **tui:** make /cd take effect end-to-end across runtime, git status and notice lifecycle ([d03ae65](https://github.com/nolotus/bun-nolo/commit/d03ae654a785a2377370b92f06c3e5fc5e6aea28))


## 0.60.0

## 0.60.0 (2026-09-10)

### Features

* **agent:** add GPT-6 Astra model to OpenAI catalog and agent creation pickers ([5e6ac2e](https://github.com/nolotus/bun-nolo/commit/5e6ac2ebc1488981f96ecd5c0a7a274355a646f4))
* **ai:** add dimension-aware quality evidence and writing.creative domain ([98c451c](https://github.com/nolotus/bun-nolo/commit/98c451cc5a81e3e5e2c2a7a885da4000362e970f))
* **chat:** fold execShell/readFile tool rows by default with TUI-style summaries ([e982f3f](https://github.com/nolotus/bun-nolo/commit/e982f3f308749f84f23c8969db023957f9f19c4d))
* **chat:** sidebar 虚拟化列表接入 fluid hover 连续高亮 ([7e22c56](https://github.com/nolotus/bun-nolo/commit/7e22c569f0744d7a37f33eebf0c4ffee16f8559d))
* **layout:** add WorkbenchSplit dual-surface split primitive ([2599726](https://github.com/nolotus/bun-nolo/commit/2599726556f48a0b3dbd5df030e0498435f8def0))
* **onboarding:** add local CLI option to desktop first-run guide ([d6e6856](https://github.com/nolotus/bun-nolo/commit/d6e6856bb60287f69172b737a2c12fd2817480de))

### Bug Fixes

* **ai:** judge creative-writing code context structurally ([11db185](https://github.com/nolotus/bun-nolo/commit/11db185a4d34558fed9aa84cb53c9e06aa490acc))
* **ai:** keep code-context tasks out of writing.creative ([18a2b4d](https://github.com/nolotus/bun-nolo/commit/18a2b4dbfe493ca0706c5c5024f9c670296174b1))
* **chat:** fluid hover enabled=false 契约与 rowSize 几何推导 ([1fb5382](https://github.com/nolotus/bun-nolo/commit/1fb53824370790ea4c4d5e90c28f54321c1ece4a))
* **chat:** 折叠 exec 工具卡片中的超长 shell 命令 ([87dfffc](https://github.com/nolotus/bun-nolo/commit/87dfffcbd3a164ef08858db20f2492460795afc9))
* **desktop:** stable 安装脚本 electrobun exit 0 分支补产 smoke installer ([97e82dc](https://github.com/nolotus/bun-nolo/commit/97e82dcb852f39506d07731cc1f879c932c79a5e))
* **desktop:** 修复 Windows 更新安装卡死（helper 干等文件锁） ([cd08e9a](https://github.com/nolotus/bun-nolo/commit/cd08e9ae71fa5ce74c80abf4e842e71873f29000))
* **desktop:** 对齐 package.json 版本至 tag 声明的 0.56.0-alpha.1 ([f0b1b77](https://github.com/nolotus/bun-nolo/commit/f0b1b774831827c386d84ec31570666aab09c185))
* **desktop:** 恢复被合并静默吞掉的 dev 编排器脚本入口 ([09508d9](https://github.com/nolotus/bun-nolo/commit/09508d9d977119dc72128d4527fe8a9095433989))
* **desktop:** 桌面端交互 agent 默认补齐 exa_search/fetchWebpage ([4163f9f](https://github.com/nolotus/bun-nolo/commit/4163f9fc55eb434c647ccd0eb19e3d2b5e5ae3d1))
* **layout:** LocalPreviewSplit must fill MainLayout__main height ([df6a2ad](https://github.com/nolotus/bun-nolo/commit/df6a2ad062c0feab22e79cc1021c37e5ba79cd9d))
* **layout:** polish WorkbenchSplit interaction and accessibility ([dd4694d](https://github.com/nolotus/bun-nolo/commit/dd4694d8addaad879f73790b29465a5579f28f83))
* **layout:** WorkbenchSplit drag follows pointer in real time ([32e75b8](https://github.com/nolotus/bun-nolo/commit/32e75b879a83ffba186c31d5b1eca8fb50107dbd))
* **webview:** 消除 stable 客户端 bundle 模块顶层裸 process.env 引用 ([6526ba3](https://github.com/nolotus/bun-nolo/commit/6526ba3e61815b93564220d4bbdf837686ae644a)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)

## 0.59.0 (2026-09-10)

### Features

* **layout:** WorkbenchSplit 双工作面分栏 primitive（Chat+Preview 自由分配空间/交换位置/比例偏好持久化） ([2599726](https://github.com/nolotus/bun-nolo/commit/259972655))
* **chat:** sidebar 虚拟化列表接入 fluid hover 连续高亮 ([7e22c56](https://github.com/nolotus/bun-nolo/commit/7e22c569f))
* **chat:** execShell/readFile 工具行默认折叠 + TUI 式摘要 ([e982f3f](https://github.com/nolotus/bun-nolo/commit/e982f3f30))
* **agent:** GPT-6 Astra 模型进 OpenAI 目录与创建选择器 ([5e6ac2e](https://github.com/nolotus/bun-nolo/commit/5e6ac2ebc))
* **ai:** dimension-aware quality evidence 与 writing.creative domain ([98c451c](https://github.com/nolotus/bun-nolo/commit/98c451cc5))
* **desktop:** 首次运行引导加「本机 CLI 已登录」直达选项 ([d6e6856](https://github.com/nolotus/bun-nolo/commit/d6e6856bb))
* **ai:** 支持 gemini-2.5-pro / gemini-3.1-pro ([c731b99](https://github.com/nolotus/bun-nolo/commit/c731b997b))

### Bug Fixes

* **layout:** 分栏拖拽实时跟手（track 引用 CSS 变量） ([32e75b8](https://github.com/nolotus/bun-nolo/commit/32e75b879))
* **layout:** LocalPreviewSplit 占满容器高度（对话框顶到上方的根因） ([df6a2ad](https://github.com/nolotus/bun-nolo/commit/df6a2ad06))
* **layout:** 分栏交互收尾：swap 按钮/键盘可访问性/disabled 态 ([dd4694d](https://github.com/nolotus/bun-nolo/commit/dd4694d8a))
* **desktop:** stable 客户端 bundle 模块顶层裸 process.env 引用 ([6526ba3](https://github.com/nolotus/bun-nolo/commit/6526ba3e6))
* **webview:** 消除 stable 客户端 bundle 顶层 process 引用 ([eea434d](https://github.com/nolotus/bun-nolo/commit/eea434d86))
* **chat:** 折叠 exec 工具卡片超长 shell 命令 ([87dfffc](https://github.com/nolotus/bun-nolo/commit/87dfffcbd))
* **desktop:** 桌面端交互 agent 默认补齐 exa_search/fetchWebpage ([4163f9f](https://github.com/nolotus/bun-nolo/commit/4163f9fc5))

### Chores

* **desktop:** electrobun 工具链 2.0.1 → 2.0.2-beta.17（Hutch 0.26 + Cottontail 0.6） ([8e7897b](https://github.com/nolotus/bun-nolo/commit/8e7897bcf))



## 0.56.0

## 0.56.0 (2026-09-09)

### Features

* **chat:** explain context reprocessing ([a631508](https://github.com/nolotus/bun-nolo/commit/a63150862d5caa83526c190cba4256ddc6ca7234))
* **desktop:** 重做更新设置页并修正更新状态机语义 ([15bf1cd](https://github.com/nolotus/bun-nolo/commit/15bf1cd59479386682f84f078158875cb62d5168))

### Bug Fixes

* **desktop:** pin electrobun 2 build.mainProcess to bun to restore installer size ([94d9fdb](https://github.com/nolotus/bun-nolo/commit/94d9fdba872cf7952a94bff79644b45bcf4c791b))
* **desktop:** 消除 dev 启动的 web 资源复制竞态（黑屏根因） ([3ecbbe3](https://github.com/nolotus/bun-nolo/commit/3ecbbe3a58de143d6717ace6faab827c38db68cb))
* **stream:** respect downstream backpressure in chat proxy ([1b8affb](https://github.com/nolotus/bun-nolo/commit/1b8affbe6f81f8ec4f9c1079b6a5c345181f500c))


## 0.55.0

## 0.55.0 (2026-09-09)

### Features

* **agent:** add Antigravity semantic and credential seams ([07fe166](https://github.com/nolotus/bun-nolo/commit/07fe166376616ed13f4d1fbbc381ebe646473365))
* **agent:** consume Antigravity semantic runtime results ([7950d11](https://github.com/nolotus/bun-nolo/commit/7950d11f361a9d4e1221c71a29bbbb36f83a8801))
* **agent:** record observed provider timing facts ([945735b](https://github.com/nolotus/bun-nolo/commit/945735b73444ce09b7b7ecafed727c2c72b108c2))
* **ai:** 编排注入新增「任务分型与收工预算」段，纪律从项目 skill 上移产品级 ([3f82cd4](https://github.com/nolotus/bun-nolo/commit/3f82cd4d5d4bbcf0dab4ea4f13f006c50d6793c0))
* **auth:** complete account session phase 3 ([655ae70](https://github.com/nolotus/bun-nolo/commit/655ae7060d8831115ac97b2834401f343ff474cd))
* **auth:** introduce cross-platform AccountSessionCore for session read truth (Phase 1) ([2bde302](https://github.com/nolotus/bun-nolo/commit/2bde302a2fe50ed1e79a566a1b7f02e91232d1cb))
* **auth:** make account session service the lifecycle owner ([13159cd](https://github.com/nolotus/bun-nolo/commit/13159cd08589891d1dc4da606601041b2180995c))
* **auth:** purify Redux reducer and establish unidirectional AccountSessionReduxBridge (Phase 1.1) ([25213e2](https://github.com/nolotus/bun-nolo/commit/25213e296125f452c19480bd5b956a8842bfcff2))
* **auth:** remove redux account session compatibility ([31c0a00](https://github.com/nolotus/bun-nolo/commit/31c0a00a383369617070c43347007de7b13d698b))
* **cli:** execute machine-routed read-only tool invocations in connector daemon ([4779c28](https://github.com/nolotus/bun-nolo/commit/4779c288299c5f153ed288a357a21806abc5c740))
* **cli:** integrate TUI account sessions ([62a2ffd](https://github.com/nolotus/bun-nolo/commit/62a2ffde42bb363c97c32a80ee0046d07daa2c02))
* **desktop:** patch electrobun cstring 回调兼容 bun >= 1.4.0，恢复 bunVersion 1.4.2 ([3d51bfa](https://github.com/nolotus/bun-nolo/commit/3d51bfa70c379cda0b93db65929f4bb46107217f))
* **desktop:** 迁移 electrobun 1.18.4-beta.6 → 2.0.1（Hutch 工具链） ([50f92ee](https://github.com/nolotus/bun-nolo/commit/50f92eec7f77ae905f18049e945e25d3a4522733))
* **observability:** 合并 chat-proxy 流生命周期事件与 stale sweep TypeError 修复 ([f5febf9](https://github.com/nolotus/bun-nolo/commit/f5febf99f763883b26efbb38e94dc6fcdb270c9f))
* **observability:** 补齐 chat-proxy 流生命周期事件并修复 stale dialog sweep TypeError ([50b0e29](https://github.com/nolotus/bun-nolo/commit/50b0e291f443220efed179f92f445be29a2aa9ad))

### Bug Fixes

* **agent:** align Codex timing with logical invocations ([aad5790](https://github.com/nolotus/bun-nolo/commit/aad5790a311a9b1659f2097a893ba96d8fab0b3c))
* **agent:** finalize Antigravity invocation timeout semantics ([c471c6f](https://github.com/nolotus/bun-nolo/commit/c471c6f994c51e1ea7a7976b394c53848e371aaf))
* **agent:** keep local Antigravity credential refresh semantic ([e7f3e0b](https://github.com/nolotus/bun-nolo/commit/e7f3e0b41c8b85572ad4bb065d88530f9d77f616))
* **agent:** pin declared-tool boundary in empty-turn repair prompt ([fa50c85](https://github.com/nolotus/bun-nolo/commit/fa50c8507d7c3abe4dc922f6fbe4324cd568b5fd))
* **agent:** restore Gemini semantic type boundaries ([c1f9589](https://github.com/nolotus/bun-nolo/commit/c1f958924aa3abf27c5f899ed5e036ea16face4b))
* **auth:** compose legacy credential migration explicitly ([b95f32b](https://github.com/nolotus/bun-nolo/commit/b95f32bbcbbae8ea2f470e08662b1c46fb3cd1fa))
* **auth:** enforce atomic session transition and explicit sign-out state ([e010ce9](https://github.com/nolotus/bun-nolo/commit/e010ce968f6b0634e4b0d1f39f606017687b9c8f))
* **auth:** harden session migration boundary ([f7c2d17](https://github.com/nolotus/bun-nolo/commit/f7c2d17d27a49288cb01214b0b448436d711d5b0))
* **auth:** make credential migration fail-closed ([3b70b6c](https://github.com/nolotus/bun-nolo/commit/3b70b6ca68639f82a763b7664976cbe9b7dfda9e))
* **auth:** migrate credentials into NOLO_HOME ([a50507a](https://github.com/nolotus/bun-nolo/commit/a50507a650819750097932d5b96204cfff94ab50))
* **auth:** restore multi-account session consistency ([7f5474e](https://github.com/nolotus/bun-nolo/commit/7f5474e3c1c69f54b9a99032db6abc734cd0584c))
* **chat:** hide mid-turn empty-reply placeholder and settle tool UI after turn ends ([0d6793a](https://github.com/nolotus/bun-nolo/commit/0d6793a1104335b626d36a07d67b79c0fb308f8f))
* **cli:** complete legacy credential migration for auth sync-only ([189cce1](https://github.com/nolotus/bun-nolo/commit/189cce1d2c668f7e6dd3dcbff25855db1bb007cc))
* **cli:** preserve image input for Kimi Code models ([02277bb](https://github.com/nolotus/bun-nolo/commit/02277bb6ee7630c9197d305464ef1971977d8094))
* **desktop:** disable rpm strip for CEF-bundled Linux package ([72f2757](https://github.com/nolotus/bun-nolo/commit/72f275788444e7065947c6edefff6e47b26b5c2a))
* **desktop:** stop dev --watch rebuild storm from .generated staging ([7da6366](https://github.com/nolotus/bun-nolo/commit/7da6366e41d876f86307c958dec7ddd722b9e458))
* **desktop:** tolerate drive-prefixed member names in Windows tarball extraction ([a2b9187](https://github.com/nolotus/bun-nolo/commit/a2b91871b2ef1404b2cdf3fbf9233c2b2e62467c))
* **desktop:** upgrade Electrobun websocket port byte-patch to v2 encoding ([509f098](https://github.com/nolotus/bun-nolo/commit/509f098a705076587e2707c22c0c8c204f34ced4))
* **desktop:** 修复 dev 启动崩溃与 webview 桥断连——argv0 绝对化 + bun pin 1.3.8 ([f8d5581](https://github.com/nolotus/bun-nolo/commit/f8d55812e946acc413d3fcdf9dacf9ad1392b1eb))
* **dev:** report profiler artifact only when generated ([b557bc7](https://github.com/nolotus/bun-nolo/commit/b557bc776aee378f3964ec1ec363aca2948ddfcf))
* **open-source:** decouple auth imports from public packages via identity edition injection ([ed46fb8](https://github.com/nolotus/bun-nolo/commit/ed46fb8527099624d4666a657c71d0024bd2c5de))
* **search:** finalize workspace search phase 2 ([215e19b](https://github.com/nolotus/bun-nolo/commit/215e19b2db76dbc334b819c17f859cec28a85719))
* **search:** restore fast lexical search fallback ([d486659](https://github.com/nolotus/bun-nolo/commit/d486659534f120860d5716b1fdd1a8913974ada8))
* **search:** separate lexical mechanism from policies ([29b0a80](https://github.com/nolotus/bun-nolo/commit/29b0a805ff7cff138fc0c8c21eebdc9dfe77234a))
* **search:** separate workspace and source search semantics ([21dacef](https://github.com/nolotus/bun-nolo/commit/21dacefabe4730d45f8f9c877f0ff0e85d6e9d6d))


## 0.54.0-alpha.7

## 0.54.0-alpha.7 (2026-09-09)

### Bug Fixes

* **deps:** packages/app 显式声明 date-fns-tz/date-fns 直接依赖 ([459ba02](https://github.com/nolotus/bun-nolo/commit/459ba0262b92260fbc02db019429d99b8b7f2129))
* **desktop:** 修复 stable 打包白屏——embedded server 静态路由与动态 HTML 壳 ([6966c81](https://github.com/nolotus/bun-nolo/commit/6966c81c0c5678860266c1b2df987c88fe3ea259))
* **desktop:** 修复所有 trusted-desktop API 403——embedded server 补全局 server 实例注入 ([23247c7](https://github.com/nolotus/bun-nolo/commit/23247c79aa5ffa66c9bd3e3b4f49941086ed61ef))
* **release:** stable 通道污染自愈 + Linux 桌面构建依赖安装 ([4d7f352](https://github.com/nolotus/bun-nolo/commit/4d7f3526dbaf2cc5e219843c8ae3e951a7b379b5))


## 0.54.0-alpha.6

## 0.54.0-alpha.6 (2026-09-09)

### Bug Fixes

* **chat:** hide mid-turn empty-reply placeholder and settle tool UI after turn ends ([0d6793a](https://github.com/nolotus/bun-nolo/commit/0d6793a1104335b626d36a07d67b79c0fb308f8f))


## 0.54.0-alpha.5

## 0.54.0-alpha.5 (2026-09-09)

### Bug Fixes

* **dev:** report profiler artifact only when generated ([b557bc7](https://github.com/nolotus/bun-nolo/commit/b557bc776aee378f3964ec1ec363aca2948ddfcf))


## 0.54.0-alpha.4

## 0.54.0-alpha.4 (2026-09-09)

### Bug Fixes

* **desktop:** disable rpm strip for CEF-bundled Linux package ([72f2757](https://github.com/nolotus/bun-nolo/commit/72f275788444e7065947c6edefff6e47b26b5c2a))


## 0.54.0-alpha.3

## 0.54.0-alpha.3 (2026-09-09)

### Bug Fixes

* **desktop:** upgrade Electrobun websocket port byte-patch to v2 encoding ([509f098](https://github.com/nolotus/bun-nolo/commit/509f098a705076587e2707c22c0c8c204f34ced4))


## 0.54.0-alpha.2

## 0.54.0-alpha.2 (2026-09-09)

### Bug Fixes

* **desktop:** tolerate drive-prefixed member names in Windows tarball extraction ([a2b9187](https://github.com/nolotus/bun-nolo/commit/a2b91871b2ef1404b2cdf3fbf9233c2b2e62467c))


## 0.54.0-alpha.1

## 0.54.0-alpha.1 (2026-09-09)

### Features

* **agent-runtime:** add effect wait terminal kernel ([30ffc1d](https://github.com/nolotus/bun-nolo/commit/30ffc1dd51cbd9d506fa886577db46350e601546))
* **agent-runtime:** antigravity 空补全轮打出 wire 结构日志 ([0cb5ecb](https://github.com/nolotus/bun-nolo/commit/0cb5ecb2e69e6588a65a7cfc055b55bf83542361))
* **agent-runtime:** record tool execution time as observation-only metadata ([6da68c5](https://github.com/nolotus/bun-nolo/commit/6da68c55c73c687b3eae0a99379a678c98990f01))
* **agent-runtime:** track progress and throw PlatformStreamInterruptedError on stream interruption ([9c25e94](https://github.com/nolotus/bun-nolo/commit/9c25e94f38a1cca9180e55e2f51939cf1c10e0ad))
* **agent-runtime:** 增加子进程输出流式字节硬上限防爆拦截 ([350c82e](https://github.com/nolotus/bun-nolo/commit/350c82e88da4513f4aa8ae4a395888f4e19e1e73))
* **agent-runtime:** 联动 workspaceShell 截断与 Spill 溢出落盘保护 ([6846512](https://github.com/nolotus/bun-nolo/commit/6846512bb9d081cf9f0c4097c0aa3cc0fa66fb5a))
* **agent:** add Antigravity semantic and credential seams ([07fe166](https://github.com/nolotus/bun-nolo/commit/07fe166376616ed13f4d1fbbc381ebe646473365))
* **agent:** add thin task quality-domain resolver ([24baa27](https://github.com/nolotus/bun-nolo/commit/24baa27c6dbde08618892f043688b75f1e29e8d9))
* **agent:** add time-aware economics snapshots ([e217bf8](https://github.com/nolotus/bun-nolo/commit/e217bf892acd3f6d7c9551025f6cc0f102820d5c))
* **agent:** complete public discovery scopes ([98bb0ab](https://github.com/nolotus/bun-nolo/commit/98bb0ab9a45f2a2f8ab256d8fefe1c7c7a211889))
* **agent:** consume Antigravity semantic runtime results ([7950d11](https://github.com/nolotus/bun-nolo/commit/7950d11f361a9d4e1221c71a29bbbb36f83a8801))
* **agent:** consume task-scoped model quality evidence ([775638f](https://github.com/nolotus/bun-nolo/commit/775638f949b23c72fafd91da18cadbffa5f6ec81))
* **agent:** harden task domain + add compact candidate quality facts ([c89c11a](https://github.com/nolotus/bun-nolo/commit/c89c11a8fd3e9adce6a3bfc54092ab48f30541a7))
* **agent:** listAgents 两阶段 discovery（scope preferred/public/all）+ 显式 billingSource ([6ffaf5b](https://github.com/nolotus/bun-nolo/commit/6ffaf5b16f2d902bf15691341c289901a35e4066))
* **agent:** record observed provider timing facts ([945735b](https://github.com/nolotus/bun-nolo/commit/945735b73444ce09b7b7ecafed727c2c72b108c2))
* **agent:** review 阶段划分——实现/测试阶段不被 review 阻塞，提交前循环由用户确认触发 ([6e52b41](https://github.com/nolotus/bun-nolo/commit/6e52b4152c7c22ebd734d209bd5bf013bfe3b255))
* **agents:** 派发选人收藏优先硬门写入选人契约与 AGENTS.md ([8a5a374](https://github.com/nolotus/bun-nolo/commit/8a5a374fbb57036d9060f5dd23d9585ab5f08adf))
* **agent:** upgrade Gemini plaza agent to 3.8 ([384ee3e](https://github.com/nolotus/bun-nolo/commit/384ee3eb5390612fb81677619640f8b11fd91623))
* **agent:** 编码任务分档改为两账判据，review 独立性放宽为与执行者不同 ([c817e35](https://github.com/nolotus/bun-nolo/commit/c817e35f4b5d6a27626e082c4f37865a59e24a79))
* **ai:** add economics execution boundary check ([2aa967d](https://github.com/nolotus/bun-nolo/commit/2aa967da695b653ee028b9a98e379fc3c785781e))
* **ai:** add Gemini 3.8 OAuth model support ([2338cbc](https://github.com/nolotus/bun-nolo/commit/2338cbcd008c6c1fc47b1bed3c0c382d05637d42))
* **ai:** 增加 projectTodosFromRuns 纯投影函数 ([1f87ea2](https://github.com/nolotus/bun-nolo/commit/1f87ea2261bd7a4a8c1e92fc9739b9ae0067d694))
* **ai:** 支持 gemini-2.5-pro 与 gemini-3.1-pro 并升级 bun 1.4.2 ([c731b99](https://github.com/nolotus/bun-nolo/commit/c731b997b663f7ace8f6b13f6ad789d5dd0ea766))
* **ai:** 编排注入新增「任务分型与收工预算」段，纪律从项目 skill 上移产品级 ([3f82cd4](https://github.com/nolotus/bun-nolo/commit/3f82cd4d5d4bbcf0dab4ea4f13f006c50d6793c0))
* **auth:** complete account session phase 3 ([655ae70](https://github.com/nolotus/bun-nolo/commit/655ae7060d8831115ac97b2834401f343ff474cd))
* **auth:** introduce cross-platform AccountSessionCore for session read truth (Phase 1) ([2bde302](https://github.com/nolotus/bun-nolo/commit/2bde302a2fe50ed1e79a566a1b7f02e91232d1cb))
* **auth:** make account session service the lifecycle owner ([13159cd](https://github.com/nolotus/bun-nolo/commit/13159cd08589891d1dc4da606601041b2180995c))
* **auth:** purify Redux reducer and establish unidirectional AccountSessionReduxBridge (Phase 1.1) ([25213e2](https://github.com/nolotus/bun-nolo/commit/25213e296125f452c19480bd5b956a8842bfcff2))
* **auth:** remove redux account session compatibility ([31c0a00](https://github.com/nolotus/bun-nolo/commit/31c0a00a383369617070c43347007de7b13d698b))
* **chat:** add AICSS image generation progress card ([8bb34c0](https://github.com/nolotus/bun-nolo/commit/8bb34c0ad70f8f88a8adb52a4616dd9dda13e002))
* **chat:** AICSS 风格 thinking/orb/diff 视觉升级 ([7e507f1](https://github.com/nolotus/bun-nolo/commit/7e507f17c346f92eec89481dcf4179edc46aa68b))
* **chat:** compact grouped tool call rows ([2ad56e5](https://github.com/nolotus/bun-nolo/commit/2ad56e54eef3a2feaa9c16f9ee98a4967addb261))
* **chat:** connect AICSS streaming thinking state ([9a4ed14](https://github.com/nolotus/bun-nolo/commit/9a4ed14aae3c99b60a8d13dab09b96a6c48796d0))
* **chat:** introduce lightweight ComposerDrawer for secondary context ([83ecf1e](https://github.com/nolotus/bun-nolo/commit/83ecf1e39bdeddd070fa1cd6df8bf041a4b95797))
* **chat:** unify composer suggestions ([d24fd48](https://github.com/nolotus/bun-nolo/commit/d24fd48d0f21c7b99ed0a5e3c5570c2b92223a64))
* **chat:** upgrade composer to container-responsive density ([0113cc0](https://github.com/nolotus/bun-nolo/commit/0113cc0b8a420439f27731e8dcbf77680fa86c24))
* **chat:** 发送失败链路改造——错误分类、结构化失败卡片与手动重试 ([dfb0339](https://github.com/nolotus/bun-nolo/commit/dfb03395764e887920e3f47626939323d2da0427))
* **chat:** 后台 run 终态唤醒不再伪造用户消息，落 wakeEvents 渲染系统行 ([86eff1b](https://github.com/nolotus/bun-nolo/commit/86eff1bd7f2e5261413e406ed02e879fafd6823b))
* **chat:** 标题模型定为 glm-5-3-flash，json mode 泛化为标题路径统一实现 ([256d5c6](https://github.com/nolotus/bun-nolo/commit/256d5c68931467b6c6ff1221418d4d64aa900a1c))
* **cli:** add turn-level billing audit log for cli-local TUI dialogs ([06d9aee](https://github.com/nolotus/bun-nolo/commit/06d9aee1ca8272c4ef2f179b676488e396d5e50c))
* **cli:** execute machine-routed read-only tool invocations in connector daemon ([4779c28](https://github.com/nolotus/bun-nolo/commit/4779c288299c5f153ed288a357a21806abc5c740))
* **cli:** integrate TUI account sessions ([62a2ffd](https://github.com/nolotus/bun-nolo/commit/62a2ffde42bb363c97c32a80ee0046d07daa2c02))
* **cli:** log stream interruption diagnostics and provide user error messaging ([d99548d](https://github.com/nolotus/bun-nolo/commit/d99548d9b92171a5546413c52f8d3221020649b5))
* **cli:** normal-mode tool rows show duration and secret-gated gists ([396d0e9](https://github.com/nolotus/bun-nolo/commit/396d0e93613e65c3767cdd6e077f538100accc8b))
* **cli:** readPastedText 续读 footer 在剩余多页时给出并行切段提示 ([d29aea5](https://github.com/nolotus/bun-nolo/commit/d29aea5a3b96313e04c4ed9cdd509c8c4799de11))
* **cli:** Run 行 gist 改全命令安全投影 ([c066b51](https://github.com/nolotus/bun-nolo/commit/c066b517367750d4f7a63ee33a9aad6f20b4f602))
* **desktop:** open external links in the preview split ([a23ea18](https://github.com/nolotus/bun-nolo/commit/a23ea186b3323fc62f8f4d49372edbbb6944834e))
* **desktop:** patch electrobun cstring 回调兼容 bun >= 1.4.0，恢复 bunVersion 1.4.2 ([3d51bfa](https://github.com/nolotus/bun-nolo/commit/3d51bfa70c379cda0b93db65929f4bb46107217f))
* **desktop:** 迁移 electrobun 1.18.4-beta.6 → 2.0.1（Hutch 工具链） ([50f92ee](https://github.com/nolotus/bun-nolo/commit/50f92eec7f77ae905f18049e945e25d3a4522733))
* **llm:** add domain-aware model quality evidence skeleton ([b11013f](https://github.com/nolotus/bun-nolo/commit/b11013f40f289ee8e5fb1cb36861977cf2f1c49b))
* **llm:** record first curated real quality evidence ([3e460af](https://github.com/nolotus/bun-nolo/commit/3e460af622c762ddfa8175bf46599f0568dac9af))
* **observability:** 合并 chat-proxy 流生命周期事件与 stale sweep TypeError 修复 ([f5febf9](https://github.com/nolotus/bun-nolo/commit/f5febf99f763883b26efbb38e94dc6fcdb270c9f))
* **observability:** 补齐 chat-proxy 流生命周期事件并修复 stale dialog sweep TypeError ([50b0e29](https://github.com/nolotus/bun-nolo/commit/50b0e291f443220efed179f92f445be29a2aa9ad))
* **plaza:** 下架 Claude 系模型，兼容路由统一指向 glm-5-3-flash ([09b55e8](https://github.com/nolotus/bun-nolo/commit/09b55e83097c19c2bb3456b2114bd20433552790))
* **runtime:** contextual fragment markers for wake notifications ([590629a](https://github.com/nolotus/bun-nolo/commit/590629ae31f726b6a3d48851b34b4da8ee1cef23))
* **runtime:** 写入门第三轮收口——Cursor 穿透 + readline 语义 + 测试补全 ([c06e7eb](https://github.com/nolotus/bun-nolo/commit/c06e7ebda4a7773bcad29feaf464589dc5cfabcb))
* **server:** T2 close the loop - consume CallPlan in chat-proxy role ([aee3877](https://github.com/nolotus/bun-nolo/commit/aee38772c255115b0ce87d7f1d649ed952b5d221))
* **stylex:** add shorthand and JSX collision guards ([ed75d28](https://github.com/nolotus/bun-nolo/commit/ed75d28cf609c051214c47b96b32d2add5bd7a17))
* **stylex:** runtime closure - typecheck:web gate, boundary guard, browser smoke ([9ced5bd](https://github.com/nolotus/bun-nolo/commit/9ced5bd9e6491c774f6a44365a26235158564cd2))
* **tui:** add /cd command to switch working directory ([6b7d6b8](https://github.com/nolotus/bun-nolo/commit/6b7d6b89cd1233f80b434cdb14f77260f622e491))
* **tui:** fold consecutive tool calls into detail trees (Run/Read/Search/Fetch) ([a9907dc](https://github.com/nolotus/bun-nolo/commit/a9907dcac3808a15550c70d07c22af694b8359ce))
* **tui:** make /cd actually usable — switch message, path completion, cd - ([0f53c53](https://github.com/nolotus/bun-nolo/commit/0f53c53d2468e282d93b83ee34820a28f1b4f5bd))
* **tui:** make modal layout state-driven ([db2cab4](https://github.com/nolotus/bun-nolo/commit/db2cab4ed16b03cf60af9079ac0e913f22637643))
* **tui:** merge tool display into single mode with gist and folding ([5ee8fae](https://github.com/nolotus/bun-nolo/commit/5ee8fae691496005bb3189ed8b6444f3d3945772))
* **tui:** show actionable tool details and edit diffs ([7e017b2](https://github.com/nolotus/bun-nolo/commit/7e017b29643cf3df228c64668f36ca63ae0f33f6))
* **tui:** show tool activity details ([32b5f9f](https://github.com/nolotus/bun-nolo/commit/32b5f9f2dc9a06f41266f285e38e09c07ed9ba01))
* **tui:** terminal attention with BEL base and Windows Terminal OSC 9;4 fallback ([a64f7c2](https://github.com/nolotus/bun-nolo/commit/a64f7c2a2b844a80952b18d8925840365e15a0ef))
* **tui:** unify framed dialog session ownership ([5fdd29c](https://github.com/nolotus/bun-nolo/commit/5fdd29c7a4e37c82f43877edbf136a8e752cfc96))
* **tui:** unify modal terminal ownership under DialogHost (Phase 1) ([4fc6201](https://github.com/nolotus/bun-nolo/commit/4fc620160f2a1e68fe2d9ce6e05c6c3b5d4d1b58))
* **tui:** 写文件确认门补齐逃生口——/auto 覆盖 + NOLO_CLI_WRITE_GATE ([9e1d9c7](https://github.com/nolotus/bun-nolo/commit/9e1d9c7aa5a4e4ceecc5fdf1526e24b038228582))
* **tui:** 后台 run 终态唤醒直接注入当前 agent loop，不再排队 ([c449feb](https://github.com/nolotus/bun-nolo/commit/c449feb6dabf5e8e428696ce168cd2dc1d2ebe1e))
* **tui:** 显示选择收敛——干掉 /tools /density /thinking，唯一默认体验+环境变量兜底 ([0f1d81b](https://github.com/nolotus/bun-nolo/commit/0f1d81b658dd28bf1c89d6d38de20ef9b31542a9))
* **tui:** 粘贴体验优化——附件条+Backspace撤销、macOS osascript 剪贴板兜底、临时文件清扫、折叠 chip 首行预览 ([d6fefc7](https://github.com/nolotus/bun-nolo/commit/d6fefc7a0a74461e5c3f77a8d2fe1e21535c7bdb))
* **tui:** 默认显示打磨——问答成组间距、thinking 痕迹、工具行降噪 ([4502342](https://github.com/nolotus/bun-nolo/commit/450234264ce752611c3cfebfd4f15d5edb945909))
* **web:** pricing 页 StyleX 改版，价格表新增缓存命中价列 ([617a106](https://github.com/nolotus/bun-nolo/commit/617a106e10a0e74faed460ec596b25d2ede4de16))

### Bug Fixes

* **agent-runtime:** align auto-dialog continuation with quick-chat first turn (nolo) ([bc1b142](https://github.com/nolotus/bun-nolo/commit/bc1b142d3d7de3a5d139615bea15dd2a3efd8234))
* **agent-runtime:** antigravity 200 空流返回 502 而非伪装 stop 空补全 ([7d419d3](https://github.com/nolotus/bun-nolo/commit/7d419d305a1159ae3abbe1aa297d4c0b961d47ce))
* **agent-runtime:** Gemini 工具 schema 递归净化，修复 MALFORMED_FUNCTION_CALL 空轮熔断 ([9c6b01f](https://github.com/nolotus/bun-nolo/commit/9c6b01f82c36264bf3ad84eb1fc81dc2bd88a6d8))
* **agent-runtime:** Gemini 流聚合透传 finishReason 与思考文本，修正截断误判 ([6492958](https://github.com/nolotus/bun-nolo/commit/6492958eee9f310160eab38bbdfabcc8df950d4e))
* **agent-runtime:** preserve wait seams and timeout state ([b92669b](https://github.com/nolotus/bun-nolo/commit/b92669b8e4b5b2b8fba6459eb4e07bf30c0f5c67))
* **agent-runtime:** record gemini cache hits and cli-local stable prefix hash in token usage ([94bc052](https://github.com/nolotus/bun-nolo/commit/94bc052ca1e07dd41308cf6c56c5379d54939a22))
* **agent-runtime:** resolve type errors in wait kernel and transition tests ([88b72a3](https://github.com/nolotus/bun-nolo/commit/88b72a3b4b4bf27328ee6c361d3f1d43b069a7fd))
* **agent-runtime:** Responses wire 保留缓存 token 细分字段 + 统一缓存字段别名读取 ([724de83](https://github.com/nolotus/bun-nolo/commit/724de83f2c1cc99f038995357f58e9b59b431b78))
* **agent:** agentRunHosted 模型平台 key 缺失快速失败 + Claude 兼容计价兜底 ([7b1ad1d](https://github.com/nolotus/bun-nolo/commit/7b1ad1d8d70745dd1bb0a8d6e02a3dc5dccbbbd1))
* **agent:** align Codex timing with logical invocations ([aad5790](https://github.com/nolotus/bun-nolo/commit/aad5790a311a9b1659f2097a893ba96d8fab0b3c))
* **agent:** auto-allow read-only reads of runtime-owned spill files ([a701c1b](https://github.com/nolotus/bun-nolo/commit/a701c1b28cced9a6acaf87a3b50801f414e91342))
* **agent:** close symlink TOCTOU in runtime-owned spill trust boundary ([35bcb2f](https://github.com/nolotus/bun-nolo/commit/35bcb2f7c0c4a7d8b68af0836b45a140f2f6257f))
* **agent:** downgrade unparsable tool_call arguments before send to un-deadlock dialogs ([f14cb88](https://github.com/nolotus/bun-nolo/commit/f14cb881f96e78e48dca825b59bf05f89150a2f4))
* **agent:** enforce tool_call args size discipline to prevent stream truncation ([79239b6](https://github.com/nolotus/bun-nolo/commit/79239b65a26019bccab09fe473a01b27403c4dfd))
* **agent:** finalize Antigravity invocation timeout semantics ([c471c6f](https://github.com/nolotus/bun-nolo/commit/c471c6f994c51e1ea7a7976b394c53848e371aaf))
* **agent:** harden economics source boundaries ([448a71f](https://github.com/nolotus/bun-nolo/commit/448a71f3e90fad0108e95b1402117e7744214042))
* **agent:** intercept unparsable tool_call arguments before executor with explicit diagnosis ([c120c4e](https://github.com/nolotus/bun-nolo/commit/c120c4eb8e639647a87487d20b6812f0fb9d5696))
* **agent:** keep local Antigravity credential refresh semantic ([e7f3e0b](https://github.com/nolotus/bun-nolo/commit/e7f3e0b41c8b85572ad4bb065d88530f9d77f616))
* **agent:** make host wake capability explicit and local stop idempotent ([e2dd5e2](https://github.com/nolotus/bun-nolo/commit/e2dd5e20c9d9e771f168810854c68f3db088e343))
* **agent:** mark 403 quota-exhausted agents unavailable like 429 ([addb7b0](https://github.com/nolotus/bun-nolo/commit/addb7b0062a3d793fc7e32a080efbf70e65a8f48))
* **agent:** pin declared-tool boundary in empty-turn repair prompt ([fa50c85](https://github.com/nolotus/bun-nolo/commit/fa50c8507d7c3abe4dc922f6fbe4324cd568b5fd))
* **agent:** restore Gemini semantic type boundaries ([c1f9589](https://github.com/nolotus/bun-nolo/commit/c1f958924aa3abf27c5f899ed5e036ea16face4b))
* **agents:** correct parallel dialog guidance and require fee consent ([732a55e](https://github.com/nolotus/bun-nolo/commit/732a55ed74da8ac2e14c98dc896633275223fa9d))
* **agent:** 收敛后台 run wake 语义——status 收缩为诊断 API，移除轮询 affordance ([acc2df0](https://github.com/nolotus/bun-nolo/commit/acc2df0320539da1cc6ab5e77fd342151d885cb7))
* **ai:** request stream usage for kimi-code and custom kimi endpoints ([c4f0ece](https://github.com/nolotus/bun-nolo/commit/c4f0ecec7aab31d3555112ebf8cb57ba6a1d1668))
* **ai:** 修正 GLM 5.3 Flash「思考不可关闭」的错误断言并透出可关闭口径 ([2fa6fef](https://github.com/nolotus/bun-nolo/commit/2fa6fef0f4aba32df6e373a2bbbba822c3b7e708))
* **auth:** compose legacy credential migration explicitly ([b95f32b](https://github.com/nolotus/bun-nolo/commit/b95f32bbcbbae8ea2f470e08662b1c46fb3cd1fa))
* **auth:** enforce atomic session transition and explicit sign-out state ([e010ce9](https://github.com/nolotus/bun-nolo/commit/e010ce968f6b0634e4b0d1f39f606017687b9c8f))
* **auth:** harden session migration boundary ([f7c2d17](https://github.com/nolotus/bun-nolo/commit/f7c2d17d27a49288cb01214b0b448436d711d5b0))
* **auth:** make credential migration fail-closed ([3b70b6c](https://github.com/nolotus/bun-nolo/commit/3b70b6ca68639f82a763b7664976cbe9b7dfda9e))
* **auth:** migrate credentials into NOLO_HOME ([a50507a](https://github.com/nolotus/bun-nolo/commit/a50507a650819750097932d5b96204cfff94ab50))
* **auth:** repair 判定对齐 audit 口径，消除 deleted-user projection 盲区 ([54829bb](https://github.com/nolotus/bun-nolo/commit/54829bba7479fb6132a3f511f140be34b7eaa1f2))
* **auth:** restore multi-account session consistency ([7f5474e](https://github.com/nolotus/bun-nolo/commit/7f5474e3c1c69f54b9a99032db6abc734cd0584c))
* **billing:** baseten GLM flash fallback gating, legacy cache tokens, NaN guard ([4885ddc](https://github.com/nolotus/bun-nolo/commit/4885ddca0415792657ac9f1921c43e9ee218c2d0))
* **billing:** builtin 平台 agent 无视记录价快照并在写端断根 ([978a5dc](https://github.com/nolotus/bun-nolo/commit/978a5dc10fa760095fb81e583dce6d979644181a))
* **billing:** clamp cache_read 超界负成本，防止 sanitizeCost 归零免单 ([e2730bf](https://github.com/nolotus/bun-nolo/commit/e2730bf2fd158c07fdd94bc21cae250097214fc5))
* **billing:** price provider fallback calls separately ([dffd72f](https://github.com/nolotus/bun-nolo/commit/dffd72f48e3ade4687cb6a8ed66c256759e165ae))
* **billing:** token 扣费锁粒度改 per-user + ledger conflict 重试 + CLI 402 重试 ([fb7d705](https://github.com/nolotus/bun-nolo/commit/fb7d70535439f0908915c12d0fdf7254ab6b7a97))
* **billing:** 移除 prepareTokenUsageData 空 agentId throw（客户端漏记修复） ([efd28ac](https://github.com/nolotus/bun-nolo/commit/efd28acd29bc0842acf0dd6a06d996865a1ebae2))
* **chat:** add missing getActiveDialogAgentId import in useMessageInputSend ([4c7a13d](https://github.com/nolotus/bun-nolo/commit/4c7a13df46603c5c3bfe7ae23841028ecd25d6e3))
* **chat:** add missing withLiteralClass import to VoiceInputButton ([fd7b8d1](https://github.com/nolotus/bun-nolo/commit/fd7b8d12a466d24ac56b0bf1fd52b5f8091ac44e))
* **chat:** harden composer context chips and mobile hit targets ([05839df](https://github.com/nolotus/bun-nolo/commit/05839df57a3cba2896f5e94fbae4db2a4ccfed46))
* **chat:** harden unified suggestion surface semantics and bounds ([9a23c92](https://github.com/nolotus/bun-nolo/commit/9a23c92a2a79bbf24e917c1f2e9a52a43c69db88))
* **chat:** make streaming text monotonic and responsive ([3c6a3bb](https://github.com/nolotus/bun-nolo/commit/3c6a3bbcb5ed3faf1afe853f5052663a9362ffcd))
* **chat:** review fixes - abort passthrough, early-path request id, self-contained correlation tests ([4a8d928](https://github.com/nolotus/bun-nolo/commit/4a8d9287268437b6b1683b650a141e229c84eff4))
* **chat:** stabilize compact tool call disclosure ([ae02d49](https://github.com/nolotus/bun-nolo/commit/ae02d49d1f2c3d93f9376ed0b599a80b9c4a31c2))
* **chat:** tighten compact tool call presentation ([eeff683](https://github.com/nolotus/bun-nolo/commit/eeff6839201878f73aae29a899ccc70997fcd7c4))
* **chat:** wire tool card StyleX styles and keep DOM class anchors ([15dc5e0](https://github.com/nolotus/bun-nolo/commit/15dc5e0ccbaec90fa97efef98855d984b9f1cd71))
* **chat:** 修复重试取消竞态、auth 误判、重试锚定、URL 白名单与 stylex 动画 ([8f935d5](https://github.com/nolotus/bun-nolo/commit/8f935d56661a3506a8ea37c533997e51d1193b93))
* **chat:** 思考区对齐 AICSS thinking-reasoning 交互 ([33d44e4](https://github.com/nolotus/bun-nolo/commit/33d44e49150f2a44a44aedec0e772b901acf0f3c))
* **cli:** agent run 结果契约——status 与 exitCode 永远一致，前台超时生效 ([1d1a46e](https://github.com/nolotus/bun-nolo/commit/1d1a46e4faed1b8a34a17802306fc6ae51c781a3))
* **cli:** classify authority broker timeout failures ([c51096a](https://github.com/nolotus/bun-nolo/commit/c51096a04ea145b56688fde35894401d268e1fd1))
* **cli:** clientLogger 循环引用误报修复与构建链路加固——codex 会话遗留改动收编 ([7a25a81](https://github.com/nolotus/bun-nolo/commit/7a25a81d1ef5cdeea9b0cfea53443199039d4112))
* **cli:** complete legacy credential migration for auth sync-only ([189cce1](https://github.com/nolotus/bun-nolo/commit/189cce1d2c668f7e6dd3dcbff25855db1bb007cc))
* **cli:** guard terminal agent run transitions ([9a40bc6](https://github.com/nolotus/bun-nolo/commit/9a40bc60d0405b6781bd78f2f9e0aa9dc5cd31f5))
* **cli:** macOS 截图拖入识别失败时自动走剪贴板兜底 ([3f4f351](https://github.com/nolotus/bun-nolo/commit/3f4f3514d8c2f369357d633fae9f08e376ed79b7))
* **cli:** preserve image input for Kimi Code models ([02277bb](https://github.com/nolotus/bun-nolo/commit/02277bb6ee7630c9197d305464ef1971977d8094))
* **cli:** preserve piped TUI input on Bun 1.4 ([5fdd62a](https://github.com/nolotus/bun-nolo/commit/5fdd62abbddcd3913a9d03b0f766238b823585dc))
* **cli:** preserve provider stream finish reasons ([9a89bb1](https://github.com/nolotus/bun-nolo/commit/9a89bb18ee43242f568d6bdbbc8d603914802f08))
* **cli:** remove pino from published runtime ([1534e25](https://github.com/nolotus/bun-nolo/commit/1534e254187a4e0b3843ae877e3ccfb50f9d8aed))
* **cli:** retry authoritative child settlement under record-lock contention ([6058988](https://github.com/nolotus/bun-nolo/commit/6058988dd5be302062526db4bf31187b893d5aed))
* **cli:** route live agent-run status observation to dock only ([f03ad5b](https://github.com/nolotus/bun-nolo/commit/f03ad5b4dfd7d13d415d69e8e4edef8437a88fd2))
* **cli:** show safe command prefixes in TUI runs ([24a1e2a](https://github.com/nolotus/bun-nolo/commit/24a1e2ab4b1dc065df7993abc12b21ee235f6553))
* **cli:** strict terminal arbitration and narrow orphan correction authority ([8284597](https://github.com/nolotus/bun-nolo/commit/8284597882e89ce9a74925d47666fb205333e3c7))
* **cli:** surface 429 cooldown in agent list and gate HTTP dispatch locally ([a5fab6d](https://github.com/nolotus/bun-nolo/commit/a5fab6d8cb21bc515020bd79200923f3baf4453e))
* **cli:** TUI 工具表去掉 controlAgentRun 的 wait 动作与 startAgentRun 的空头同步参数 ([1ec83c4](https://github.com/nolotus/bun-nolo/commit/1ec83c48543627222ea42554824751552f226fa2))
* **cli:** 合入 fix/stream-stall 子 run 结算修复 ([6b71d1b](https://github.com/nolotus/bun-nolo/commit/6b71d1b7d8a2ac39c98a5342b9f9ee4ba5553108))
* **cli:** 外来 OAuth agent 的派发冷却预检不再误读本机凭据条目 ([10971cc](https://github.com/nolotus/bun-nolo/commit/10971cce6a17d02c1375098764c11b35ca4d3d66))
* **cli:** 所有者通道路由提示每会话只打印一次 ([d70ab31](https://github.com/nolotus/bun-nolo/commit/d70ab312fb13c5ffe4e98a600b3fccaa12221430))
* **cli:** 收藏/共享的 OAuth 订阅 agent 不再被本地 runtime 静默认领 ([c5cd001](https://github.com/nolotus/bun-nolo/commit/c5cd001cae3cb0a072b0db703e3e7edf4bba028a))
* **cli:** 正文完整的收尾帧缺失不再把子 run 结算为 failed ([2df8b0c](https://github.com/nolotus/bun-nolo/commit/2df8b0cc5588dbf0365482a2a13faf17ce896036))
* **cli:** 确认门鼠标误取消 + n 键失效 ([a3030e4](https://github.com/nolotus/bun-nolo/commit/a3030e4cd318b017e90c166d924438caf251455b))
* **database:** hydrate server record on patch local miss ([8581452](https://github.com/nolotus/bun-nolo/commit/85814525bb8fed2f8179a32ee6b637a44515d6fc))
* **database:** patch hydrate 前重读本地，避免覆盖并发写入 ([074020f](https://github.com/nolotus/bun-nolo/commit/074020f224b3b2e1a1a91b8ee5045ae2ec345228))
* **deploy:** point chat-proxy's CallPlanClient at core (NOLO_CORE_INTERNAL_URL) ([64a587b](https://github.com/nolotus/bun-nolo/commit/64a587b869b75ed436ae88ef05027b9ea91ce583))
* **deps:** packages/app 显式声明 date-fns-tz/date-fns 直接依赖 ([181d7e0](https://github.com/nolotus/bun-nolo/commit/181d7e0d18094364e4917a6497bc4a9524815726))
* **desktop:** harden electrobun windows core port patch ([dde9de8](https://github.com/nolotus/bun-nolo/commit/dde9de87dba97577e798313b38dd93f966973c67))
* **desktop:** keep client alive after post-boot uncaught exceptions ([0f59396](https://github.com/nolotus/bun-nolo/commit/0f593964f698823e2f4e79a8d6346b0df4d78ca1))
* **desktop:** make dev watchIgnore globs actually match (project-relative) ([de2a5c9](https://github.com/nolotus/bun-nolo/commit/de2a5c902fe3da75d3932efaabca73ec01c8693c))
* **desktop:** shift Windows ElectrobunCore websocket base port to 50001 ([0da7ffd](https://github.com/nolotus/bun-nolo/commit/0da7ffd8cf2aeceec03f728b7a3512f57c895612))
* **desktop:** stop dev --watch rebuild storm from .generated staging ([7da6366](https://github.com/nolotus/bun-nolo/commit/7da6366e41d876f86307c958dec7ddd722b9e458))
* **desktop:** Windows shell 兼容——shell kind 识别、5.1 去除 $PSStyle、默认 cwd 修复 ([a966cd9](https://github.com/nolotus/bun-nolo/commit/a966cd9fdd24ec7de81fc06b782bdcdde0acf2d5))
* **desktop:** 修复 dev 启动崩溃与 webview 桥断连——argv0 绝对化 + bun pin 1.3.8 ([f8d5581](https://github.com/nolotus/bun-nolo/commit/f8d55812e946acc413d3fcdf9dacf9ad1392b1eb))
* **desktop:** 修复 stable 打包白屏——embedded server 静态路由与动态 HTML 壳 ([3ac36d3](https://github.com/nolotus/bun-nolo/commit/3ac36d367bea6ae672e2a7dd8410aef84ade2980))
* **desktop:** 修复所有 trusted-desktop API 403——embedded server 补全局 server 实例注入 ([d0af3e8](https://github.com/nolotus/bun-nolo/commit/d0af3e8e10284bf01155752042848fe8e4f36568))
* **dev:** resolve .cloud/.local condition variants in SSR bundle alias ([c904992](https://github.com/nolotus/bun-nolo/commit/c9049921c4e0acb86913f0f235e2f994e0355c33))
* **dev:** stylex 编译管线 4 处入口对齐 enableMediaQueryOrder:false ([bcfaf25](https://github.com/nolotus/bun-nolo/commit/bcfaf25d2748a8a9bbe8f31465a2f0c8e7fe5342))
* **dev:** StyleX 编译通道提为顶层 preload + cloudLazy 移除 dev 空壳早退 ([ee843c2](https://github.com/nolotus/bun-nolo/commit/ee843c20690c9e7a26fc9c725ba71f637baaef50))
* **drain:** 浏览器顶层导航撞 drain 窗口改返回自动重试页，红点刷新先探测再 reload ([29121a3](https://github.com/nolotus/bun-nolo/commit/29121a31d8bfac544a034d2be9f2129dfacd254a))
* **memory:** add similar-memory soft dedupe to stop version pile-up on write ([9956a8e](https://github.com/nolotus/bun-nolo/commit/9956a8ea026168476b715bf09bb7a79ed0460100))
* **memory:** overlay 预算提到 3200 并把默认值收敛为单一真值源 ([0352940](https://github.com/nolotus/bun-nolo/commit/0352940cf59c42972f7f7ef3cc8b977e4a9bd414))
* **memory:** queryMemory deeper recall + corroborated procedural reserve ([d8ff0f2](https://github.com/nolotus/bun-nolo/commit/d8ff0f208805d83ef29f3ee6196252b7eb812021))
* **memory:** retrieval 语义正名，去重 upsert 不再误记 retrieval ([1d931a1](https://github.com/nolotus/bun-nolo/commit/1d931a148e58a8212e058be4dc991c0a86281ec4))
* **memory:** retrieval 语义正名，去重 upsert 不再误记 retrieval ([2516cda](https://github.com/nolotus/bun-nolo/commit/2516cdab23e3d59089ed936b6024195bfec35f84))
* **memory:** 修复 queryMemory 从不下发、procedural 错分与 user 偏好被挤占 ([0cbbd54](https://github.com/nolotus/bun-nolo/commit/0cbbd5481ece7173ca266d5a89025d0e94853ebf))
* **memory:** 合入 fix/memory-budget overlay 预算与真值源收敛 ([2a3adaa](https://github.com/nolotus/bun-nolo/commit/2a3adaa0bfa5a784b0dd12aaeb7f47997935914f))
* **memory:** 合入 fix/memory-loading 记忆加载机制优化 ([249841e](https://github.com/nolotus/bun-nolo/commit/249841e67e6cb2dfd0843655ca191f76b6614750))
* **memory:** 合入 fix/memory-p0 记忆层三处结构性修复 ([f7234b6](https://github.com/nolotus/bun-nolo/commit/f7234b65956e78d69c53abcb6432276770273a5f))
* **memory:** 收紧 correction attribution，消除连坐误伤 ([753710b](https://github.com/nolotus/bun-nolo/commit/753710b24deca2adb0dd56be499afc643484b959))
* **memory:** 收紧 correction attribution，消除连坐误伤 ([23542b2](https://github.com/nolotus/bun-nolo/commit/23542b282ef5b90b562e7546851c81c04737025c))
* **memory:** 补齐 dialogLearning 的 procedural 硬门 ([3760632](https://github.com/nolotus/bun-nolo/commit/3760632e247c7abb30e19df420a55d0b8327426a))
* **memory:** 补齐 dialogLearning 的 procedural 硬门 ([1dfc30e](https://github.com/nolotus/bun-nolo/commit/1dfc30ebdcb67e5bfbcea17a75801efb8251f451))
* **memory:** 预算不足时截断保留而非静默丢弃，并降权僵尸记忆 ([3dcee75](https://github.com/nolotus/bun-nolo/commit/3dcee75173e413cb6ddc148297b6e016f28bd2f0))
* **open-source:** decouple auth imports from public packages via identity edition injection ([ed46fb8](https://github.com/nolotus/bun-nolo/commit/ed46fb8527099624d4666a657c71d0024bd2c5de))
* **realtime:** direct fallback without BroadcastChannel, reset backoff on connect ([ec5a412](https://github.com/nolotus/bun-nolo/commit/ec5a4124f7eff5295d6b8430a4f3337b0273bfad))
* **realtime:** per-key SSE cursor + Effect realtime kernel ([e254e9b](https://github.com/nolotus/bun-nolo/commit/e254e9b8c6e0def93fc5cbe78c5bc66cab8ffd33))
* **release:** stable 通道污染自愈 + Linux 桌面构建依赖安装 ([ac09403](https://github.com/nolotus/bun-nolo/commit/ac09403a48cc78a39fd12bb12d75d9dd40672548))
* **render:** break docStore -> spaceSlice circular static import ([cefea19](https://github.com/nolotus/bun-nolo/commit/cefea19dbd35a88ad305e8b1b4fc7c226265592b))
* **render:** 拆出 toastStore 纯 TS 模块——修复 run worker/CLI 裸 bun 崩溃 ([6b4d319](https://github.com/nolotus/bun-nolo/commit/6b4d319ac446b6d0ea92ad55ffa0505eeb314df8))
* **search:** finalize workspace search phase 2 ([215e19b](https://github.com/nolotus/bun-nolo/commit/215e19b2db76dbc334b819c17f859cec28a85719))
* **search:** restore fast lexical search fallback ([d486659](https://github.com/nolotus/bun-nolo/commit/d486659534f120860d5716b1fdd1a8913974ada8))
* **search:** separate lexical mechanism from policies ([29b0a80](https://github.com/nolotus/bun-nolo/commit/29b0a805ff7cff138fc0c8c21eebdc9dfe77234a))
* **search:** separate workspace and source search semantics ([21dacef](https://github.com/nolotus/bun-nolo/commit/21dacefabe4730d45f8f9c877f0ff0e85d6e9d6d))
* **server:** accept FILE metadata writes on write route with sanitization ([91dac8f](https://github.com/nolotus/bun-nolo/commit/91dac8ff0548232a7732b094e482fb7ae47ad8ce))
* **server:** dialog 投影在 dialog 记录缺失时不再写幂等 marker ([75bef07](https://github.com/nolotus/bun-nolo/commit/75bef0736fe139abc07eb51cc089a322e86105f0))
* **server:** fallback GLM Flash to Baseten ([9ae2f7b](https://github.com/nolotus/bun-nolo/commit/9ae2f7bd1030500a0d161fe1b6e8eb4f66fb56c7))
* **server:** GLM 5.3 Flash connect-timeout 时自动切换 baseten fallback ([ef7584c](https://github.com/nolotus/bun-nolo/commit/ef7584cd9f5ef2ed3c99549b6d3f21dc248a964a))
* **server:** repair server typecheck contracts ([bb217ea](https://github.com/nolotus/bun-nolo/commit/bb217ead8e02e08e31ccba637f5c846e36927af2))
* **server:** 修复增量引入的 typecheck:server 阻塞项 ([f8d6aab](https://github.com/nolotus/bun-nolo/commit/f8d6aab185a912349158791113518f4a6d694863))
* **server:** 按 RunInfra 契约处理上游错误与幂等重试 ([d576b46](https://github.com/nolotus/bun-nolo/commit/d576b46471508891f2586e252b4fb6e3153409f2))
* **stylex:** convert silent-drop shorthand properties to longhand ([0f03911](https://github.com/nolotus/bun-nolo/commit/0f039116e86c5fba9cb0af241c62689a72ae6c70))
* **stylex:** resolve props clobbering, dead hooks, and inline style dual control ([e53e5db](https://github.com/nolotus/bun-nolo/commit/e53e5db55737dfd7a0739312ed661c2e4ca38cbb))
* **stylex:** separate BaseTable className from rest props; pin guard baselines ([3f08c9c](https://github.com/nolotus/bun-nolo/commit/3f08c9c1f36c52eea7753360a4c7929233295081))
* **table:** 中文输入法选字 Enter 不再误触发表格编辑指令 ([66c6f2f](https://github.com/nolotus/bun-nolo/commit/66c6f2f06beeda8e0e1a709d0ef904f8f5e8daeb))
* **table:** 无显式排序时按最近活动置顶，修复右键插入行落错位置 ([e82b66d](https://github.com/nolotus/bun-nolo/commit/e82b66d3bee8ef0c33ee8dc5d1b7c8e8fcf087aa))
* **table:** 表格区域撑满页面底部并移除底部「新增一行」，样式迁移至 StyleX ([23840bd](https://github.com/nolotus/bun-nolo/commit/23840bd3fca0ecfaaf0bc009031ee8af76e5bd68))
* **thinking:** make web/tui thinking live-expand state machine actually work ([2aea127](https://github.com/nolotus/bun-nolo/commit/2aea127b7b3bf492af8c5c63519719bfe104b393))
* **tui:** authorize modal underlay repaints ([a50f7c2](https://github.com/nolotus/bun-nolo/commit/a50f7c224ea62a10e8e74812cd5dcfc3a211909d))
* **tui:** backfill parentDialogId for runs spawned in a session's first turn ([321a653](https://github.com/nolotus/bun-nolo/commit/321a653797fdf21737d0f518b6333afcf55f2cd8))
* **tui:** clear terminal attention on workspace teardown ([ba2ef5e](https://github.com/nolotus/bun-nolo/commit/ba2ef5eaaa52938069bd7f883f37b3087a36e931))
* **tui:** fix phase-level thinking lifecycle, bounded buffer, and i18n ([37b4a2f](https://github.com/nolotus/bun-nolo/commit/37b4a2fcda575c25bdc2a2d6ec72f5d20f0e65f8))
* **tui:** harden terminal lifecycle cleanup ([23d08ae](https://github.com/nolotus/bun-nolo/commit/23d08ae82b14875d278037b35118d3eede60a222))
* **tui:** 写文件确认门接入 dialogHost，修复弹窗被重绘擦掉导致 turn 假死 ([522659a](https://github.com/nolotus/bun-nolo/commit/522659a91ad59b909ce3b57fed4f996955f96dfb))
* **tui:** 收敛贴图体积根治长上下文 413 (FUNCTION_PAYLOAD_TOO_LARGE) ([71a5ce7](https://github.com/nolotus/bun-nolo/commit/71a5ce728d3279bc856436ffe78b481e036e4786))
* **tui:** 状态行 ⚡ 积分随行修复——fold 收敛重建白名单，run 级积分跨轮累计 ([8537c33](https://github.com/nolotus/bun-nolo/commit/8537c3339c8dd0dcf761114de0d048b99612add5))
* **tui:** 状态行积分改为会话累计 + 对话基数 seed，只认平台计费帧 ([3b90cfe](https://github.com/nolotus/bun-nolo/commit/3b90cfe2f2d011bac28beca6fa3c376ab3aca290))
* **tui:** 补齐 tui-paste-optimize 合并时丢失的 readlineWorkspace 集成点 ([7a6f709](https://github.com/nolotus/bun-nolo/commit/7a6f7098e577537f2b9de495ee337cc115d64975))
* **ui:** hide site footer on logged-in home ([19ecae4](https://github.com/nolotus/bun-nolo/commit/19ecae4ca0f0460bba81946d754937b057d0dd6b))
* **ui:** toast loading icon needs animationName longhand ([1aa2d8e](https://github.com/nolotus/bun-nolo/commit/1aa2d8ebeeecfed166d66074031623d6e3f26a55))
* **web:** 补回 pricing 页 StyleX 迁移漏掉的容器/表格/卡片层样式 ([07895bf](https://github.com/nolotus/bun-nolo/commit/07895bf12291372e3908cc2b6556edb9fd720d54))

### Performance Improvements

* **agent-runtime:** add --long loop bench and record loop/TUI/persistence baselines ([8dd034c](https://github.com/nolotus/bun-nolo/commit/8dd034c7f8aa8abfa59de089313f3d060fa58528))
* **agent-runtime:** clamp hybrid remote-read fallback with timeout ([ac227bc](https://github.com/nolotus/bun-nolo/commit/ac227bc2bd1be4df968de99673b30035e77f2178))
* **agent-runtime:** drop blocking git diff spawns from writeFile ([5aac982](https://github.com/nolotus/bun-nolo/commit/5aac98204c15beb26df17a9e741ed6451a087980))
* **agent-runtime:** throttle spill cleanup per directory ([6c73f37](https://github.com/nolotus/bun-nolo/commit/6c73f375055aa4f51f955ac89f831af5a02f94f2))
* **agent-runtime:** 削减 tool 往返轮次——轮次经济学纪律、taskWait 默认预算、删除占用误判 ([9f2e036](https://github.com/nolotus/bun-nolo/commit/9f2e036cab51e02692a21d0387c362485a6555e7))
* **agent-runtime:** 平台 chat 请求带稳定 prompt_cache_key（多副本缓存亲和） ([9e93465](https://github.com/nolotus/bun-nolo/commit/9e934653a49e3be9b1598bbdc1b482fe547af08d))
* **agent:** compact leaf subtask handoffs ([2c797bc](https://github.com/nolotus/bun-nolo/commit/2c797bc9dc75dc257d14ac0fe60f309606733bf2))
* **agent:** minimize delegated subtask payloads ([ca88bc2](https://github.com/nolotus/bun-nolo/commit/ca88bc254ee68db63ca6977880e14330fc8b2591))
* **agent:** move turn-scope dynamic blocks out of system for upstream prompt cache ([bb63cfe](https://github.com/nolotus/bun-nolo/commit/bb63cfe481448b81df782ddc01eec818d910c593))
* **agents:** default glm-5-3-flash seed to reasoning_effort=low ([cc84c46](https://github.com/nolotus/bun-nolo/commit/cc84c46a4726461fd4e9582b83de992dc47e743e))
* **agent:** stabilize tool output cache projections ([d388ee8](https://github.com/nolotus/bun-nolo/commit/d388ee8997d0b8b66b6e21f079a1967a3af5636b))
* **agent:** trim implicit subtask tool defaults ([515d4d5](https://github.com/nolotus/bun-nolo/commit/515d4d547c6e081b7b14728749dbf7e01e82a5e1))
* **cli:** add external stage-differential probe for alpha server timing ([a34abe0](https://github.com/nolotus/bun-nolo/commit/a34abe0e06213942cf9b325325cc096fefc15c1d))
* **cli:** add LLM round-trip stage breakdown probe ([b84cb59](https://github.com/nolotus/bun-nolo/commit/b84cb59e0c2d817478395e80d193073f8bcd58d6))
* **cli:** add loop-shaped upstream prefix cache probe ([c7bbd67](https://github.com/nolotus/bun-nolo/commit/c7bbd67ad60f80eef6ce16b8ee1795b16083a3de))
* **cli:** add TTFT tail probe; measurement refutes the heavy-tail hypothesis ([51505db](https://github.com/nolotus/bun-nolo/commit/51505dbfbc3c83ecbfb1ad13719a342325000207))
* **cli:** incremental streaming turn render in TUI history ([f9859fc](https://github.com/nolotus/bun-nolo/commit/f9859fc30592139c275774ceae4c9729db9277f4))
* **server:** trim subtask tool surface and align runtimeToolSurface provenance ([fb25dba](https://github.com/nolotus/bun-nolo/commit/fb25dbac2a8897a22961574c9fac668ba4cc6f65))
* **server:** 流式路径排除出 Caddy encode + 平台流式请求放弃压缩协商 ([57bcba5](https://github.com/nolotus/bun-nolo/commit/57bcba57ed9758bd6c92d2845fa64928040d8e62))


## 0.35.0

## 0.35.0 (2026-08-31)

### Features

* **cli:** 402 余额原因行按 locale 渲染（解析 details 数字走 i18n 模板） ([41b19d3](https://github.com/nolotus/bun-nolo/commit/41b19d318d0bcede800e50ee5586ccb31b1de403))
* **plaza:** 上架 Grok 4.6 公开 agent 并校准 xai 官方定价 ([2add273](https://github.com/nolotus/bun-nolo/commit/2add2735016d18723df852e8f81c5fbb42c40fc9))
* **plaza:** 公开 seed 用户文案守门 + 清理上游渠道词 ([15632a3](https://github.com/nolotus/bun-nolo/commit/15632a31eb3620c7c69a98d7d0db7fbebdc5af03))
* **plaza:** 平台聊天端点表补 xai，桌面/CLI 本地 runtime 直跑 Grok 4.6 ([e93abe0](https://github.com/nolotus/bun-nolo/commit/e93abe0b8acf55cd508061e111dfe2ba1800996c))
* **prompt:** 询问/执行平衡再平衡——日常小事不打扰，规模化开工先确认 ([e5ebac2](https://github.com/nolotus/bun-nolo/commit/e5ebac2f32adf9d2fd712362d468230988578a70))
* **tui:** add normal and pro transcript display ([6df9aea](https://github.com/nolotus/bun-nolo/commit/6df9aea074fec7f40daee9caecb8389c455ef8db))

### Bug Fixes

* **chat:** messages 组 73 处 StyleX shorthand 转 longhand，修复消息 hover 按钮无背景 ([0c9d7e7](https://github.com/nolotus/bun-nolo/commit/0c9d7e7ff9d70950af338e38b8bd2f638c1824ac))
* **chat:** 内置 object assistants 私有存量记录价格自愈（ensure-and-repair） ([f11155b](https://github.com/nolotus/bun-nolo/commit/f11155b88f8e6c9e03f212c9519a937f0f53047a))
* **cli:** 402 余额失败行只留一句人话，充值指引交给本地化提示 ([402d1d6](https://github.com/nolotus/bun-nolo/commit/402d1d69cc10b2b6069794714725e5cfbcc42e0c))
* **cli:** agent run 失败文案降噪与 402 余额提示可读化 ([d8e6cde](https://github.com/nolotus/bun-nolo/commit/d8e6cde2a06fa9ed65d6c723ca98fdcb4c5e9d41))
* **cli:** 补齐 runDock normal 模式安全投影缺失的 sanitizeRunSnapshotForNormal ([19448fa](https://github.com/nolotus/bun-nolo/commit/19448fa7c93205ec6db4e61d7156fca0257a5e49))
* **deploy:** revert the stray origin-sync reapply (restores v0.51.0-alpha.1 release files) ([d72604e](https://github.com/nolotus/bun-nolo/commit/d72604e4a8e28b3a38e54389920046aab2e246a4))
* **tui:** run 面板只显示当前对话相关 run，并去噪双时长与机器级计数 ([92e580f](https://github.com/nolotus/bun-nolo/commit/92e580f297f486464b60d90967bfe4113587b9b5))


## 0.34.0

## 0.34.0 (2026-08-31)

### Features

* **ai:** deepseek-v4-pro 上游切换到 RunInfra 并统一美元计价口径 ([f53be0c](https://github.com/nolotus/bun-nolo/commit/f53be0c998b603c1351c728682e1e707f5a2aedf))
* **cli:** controlAgentRun 支持运行中入队（文件队列 + 跨进程锁） ([be4f8f6](https://github.com/nolotus/bun-nolo/commit/be4f8f6c0f5bc3babac68a0b335425322e5e870b))

### Bug Fixes

* **agent-runtime:** recognize SSE done as terminal evidence ([e9a8952](https://github.com/nolotus/bun-nolo/commit/e9a895238e955b3f76db4db7035570328eaf6d31))
* **agents:** 平台公共 agent 记录价格清零，让位目录价（D1/D4 对齐） ([0789e07](https://github.com/nolotus/bun-nolo/commit/0789e070c93b7679e5d3fb9ad8e5f5942ab6ae87))
* **agents:** 阻塞等待仅限三条例外，多分钟 run 一律异步派发靠 wake 接力 ([4022aa4](https://github.com/nolotus/bun-nolo/commit/4022aa4f890affa5e73b10a5747dc8edd513bf55))
* **billing:** prevent charges for failed chat streams ([76ce585](https://github.com/nolotus/bun-nolo/commit/76ce585eba3f559db73449738df78d72a2dbc8b4))
* **chat:** 修复聊天输入框工具栏纵向堆叠为横向布局 ([2a48514](https://github.com/nolotus/bun-nolo/commit/2a4851488bec7680701c437d3409b2200fb440b7))
* **cli:** drain 窗口重试保护下沉共享层，读对话/查状态路径不再裸奔 ([5026bec](https://github.com/nolotus/bun-nolo/commit/5026bec175d21c927b2d728a199b436b1b2020b0))
* **cli:** ephemeral run 不再对外暴露读不到的合成 dialogId ([10db7c0](https://github.com/nolotus/bun-nolo/commit/10db7c06a0bd89481f7d5c3166d134438975978c))
* **dialog:** 修复标题 LLM 链路超时静默降级并切换到 RunInfra glm-5-3-flash ([b755765](https://github.com/nolotus/bun-nolo/commit/b7557652b1e447b66fb3c6bdd74bf89eff4078bb))
* **stylex:** dialog 面白底收尾——68 条 shorthand 转 longhand + 未知属性闸门 ([84133da](https://github.com/nolotus/bun-nolo/commit/84133dabd668833dead6d2608e2766a6ae031df6))
* **stylex:** 清除 shorthand 静默丢弃引发的聊天面白底回归（150 条转换 + 条件态守护） ([350ceff](https://github.com/nolotus/bun-nolo/commit/350ceff6836d4d35a512f3663d03cfcd17a2af61))
* **tui:** ensure parentDialogId injection, unowned run dock fallback, and agent runs in status bar ([aeb30d6](https://github.com/nolotus/bun-nolo/commit/aeb30d604350fa8d21ac66c034ab12e5b2be3917))
* **tui:** throttle agent run status line count and annotate unassigned multi-run rows ([90b6703](https://github.com/nolotus/bun-nolo/commit/90b67037076fbb21a25d04fe8ff92d1c753def3c))


## 0.33.0

## 0.33.0 (2026-08-30)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** localLoop 无进展熔断，止住模型复读空转 ([0c27832](https://github.com/nolotus/bun-nolo/commit/0c27832d027f9b44b660ec09e8ac7de55b51c753))
* **agent-runtime:** ProcessTask 层 Envelope 预登记与追加式事件表 ([436cecf](https://github.com/nolotus/bun-nolo/commit/436cecf64e9e9af172a8d05e5e05574036ba8c18))
* **agent-runtime:** ProcessTask 工具层四件套（异步任务 Phase 1） ([edf5e3d](https://github.com/nolotus/bun-nolo/commit/edf5e3d3cc9ccb6ca01696123117746f8e529a0c))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent-runtime:** 事件表保留策略与 killed 归属裁决固化 ([e5553e8](https://github.com/nolotus/bun-nolo/commit/e5553e83ef63a4b8290c0e6e16508c8c839083d6))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** enhance cross-platform response layout guidelines for TUI/Web/RN ([bfc0fc5](https://github.com/nolotus/bun-nolo/commit/bfc0fc58bb46e042000bd8b8edd0e4c00b659d30))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** support viewport and isMobile context passthrough for TUI and narrow-screen guidelines ([589aa57](https://github.com/nolotus/bun-nolo/commit/589aa578509fbb0b0e6544a109490a7dd5265210))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **ai:** 通用派发纪律上移注入层（基线钉数字 + 同家族降级 reviewer） ([4da0f39](https://github.com/nolotus/bun-nolo/commit/4da0f39c66c20b6c9f059b910b577a60ac53f38b))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** gate Kimi K3 behind GPT Pro 199 recharge tier, add fable to tier ([814d5fa](https://github.com/nolotus/bun-nolo/commit/814d5fadf84f4afebab974382a9d7e6af4076bb8))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **chat:** switch web TUI default nolo agent to glm-5-3-flash ([b706e41](https://github.com/nolotus/bun-nolo/commit/b706e4170ee2c77249d7b7dcfa6622782e8cc9e9))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** add thinking display toggle ([83fac87](https://github.com/nolotus/bun-nolo/commit/83fac873ddc5898cc2b4c3e33b91469c502a95cb))
* **cli:** controlAgentRun 补上 append action（终态续跑） ([4af854b](https://github.com/nolotus/bun-nolo/commit/4af854bf1216746dcf9451617df243533d05f153))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** mark startup rate-limit cooldown for agent runs ([8461e17](https://github.com/nolotus/bun-nolo/commit/8461e17a743794a48b7d8e90df2dbcb83e0a385e))
* **cli:** PLATFORM_LLM_BUSY(服务器紧张) 自动重试与 busy 文案瘦身 ([17055c4](https://github.com/nolotus/bun-nolo/commit/17055c482034c1427f6e050aefef6cc04cb98e9e))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** 工程化 agent supervise 无人值守监督器 ([5502be2](https://github.com/nolotus/bun-nolo/commit/5502be227e2dccd5b17b9a79f4c222ae93f9da7c))
* **cli:** 本地 run 终态自动生成验收报告 ([57b1b01](https://github.com/nolotus/bun-nolo/commit/57b1b0156cb2495b0e00f91c3403416b13ab0ac0))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** add old tool-output stub tier for local auto-compaction ([f939b24](https://github.com/nolotus/bun-nolo/commit/f939b247cadf690ed038ad6b6271091856463895))
* **context:** emit compaction observation event with TUI summary line ([466570e](https://github.com/nolotus/bun-nolo/commit/466570ebadc17ce60a1cfc9354ff7d9a56523e30))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **context:** validate dialog summary with source hash ([aaaab24](https://github.com/nolotus/bun-nolo/commit/aaaab24c03b60d2a9f5d04524e83a12ad2a8835e))
* **context:** version dialog summary records for invalidation ([2241683](https://github.com/nolotus/bun-nolo/commit/2241683544acd04e057fe6fcf48256bc7194c84f))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **llm:** switch GLM 5.3/5.2 hosted upstream from OpenRouter to crof ([467bde9](https://github.com/nolotus/bun-nolo/commit/467bde9307aed37c36551566248ec0e270605523))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **routing:** switch platform DeepSeek V4 Flash/Pro from official Responses API to DeepInfra chat.completions ([3da71b3](https://github.com/nolotus/bun-nolo/commit/3da71b3c3eb7f25c25d877f58229af3e42e81dda))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
* **stylex:** 接入 @stylexjs/unplugin 的 esbuild 构建管线 ([26126ba](https://github.com/nolotus/bun-nolo/commit/26126baa95d352146cf603459c7f6281c34fa62a))
* **stylex:** 政策页三页试点迁移至 policyPageStyles ([f0cccfa](https://github.com/nolotus/bun-nolo/commit/f0cccfa9995d4d26b7e711d6d4bd595151e74a38))
* **tui:** add /auto <on|off> session switch to skip permission confirms ([a332e85](https://github.com/nolotus/bun-nolo/commit/a332e8506f9e63a1f2e536e691247e5ac3646d77))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** follow terminal-native colors ([6c0dfa4](https://github.com/nolotus/bun-nolo/commit/6c0dfa4419d23e23d8f34201df4d554322013179))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **usage:** split usage stats by billing category (platform vs subscription) ([6a6ed41](https://github.com/nolotus/bun-nolo/commit/6a6ed41ff04d43d17dac9f03d784d46d465d3dcc))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent-runtime:** transient 守卫下沉进 processRegistry.kill() ([53556fb](https://github.com/nolotus/bun-nolo/commit/53556fbf44d596c1073fe231c653b4b9a709ae1a))
* **agent-runtime:** 平台 Responses 线误发 stream_options.include_usage 致上游 400 ([86c2d6a](https://github.com/nolotus/bun-nolo/commit/86c2d6abdec191c19521d4a2392f3f6dd90fd459))
* **agent-runtime:** 收紧 ask_user 触发判据，止住把执行决策推给用户 ([de76b79](https://github.com/nolotus/bun-nolo/commit/de76b79de1c9cc2a9c23effd7190d7c97161b1a0))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** expose 429-unavailable agents via unavailableAgents in listAgents ([cd74892](https://github.com/nolotus/bun-nolo/commit/cd748920850221603307cc5c3df81d97a1bd1a56))
* **agent:** follow-ups 两卡——loop.test 考古修绿 + 版本闸门三层 detail 贯通 ([57da67d](https://github.com/nolotus/bun-nolo/commit/57da67d7922d9a9b111039fc01cd002e853228e2))
* **agent:** glm-5.3-flash 托管线补 minClientVersion 客户端版本闸门 ([938a017](https://github.com/nolotus/bun-nolo/commit/938a0178182b202d8730577511672d86b50abf1f))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** listAgents 默认精简投影，防止 agentKey 被截断丢失 ([7b40454](https://github.com/nolotus/bun-nolo/commit/7b4045444bc7bdbc4738a2b6a66b93b648e9732f))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 客户端版本闸门——旧客户端用不了的新模型明确拒绝并提示升级 ([35b29cb](https://github.com/nolotus/bun-nolo/commit/35b29cbfa10a8fa30035d102ec2fcd661c708a77))
* **agent:** 平台托管 K3 本地直连 quirk 缺失与 usage provider 双出口统一 ([853dbdd](https://github.com/nolotus/bun-nolo/commit/853dbdd5ec477c39a39816319c3f2a833181f7e7))
* **agent:** 流截断语义三分——reasoning 落盘、失败轮可观测、半截输出告警 ([f870afb](https://github.com/nolotus/bun-nolo/commit/f870afb3cb82d4f76864e9d7f32992f5ac0e1d7c))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** mark GLM 5.3 and GLM 5.3 Flash as vision-capable and normalize aliases ([d27cdb4](https://github.com/nolotus/bun-nolo/commit/d27cdb40aa925937b77fe5614f359ea836776c03))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** dedupe dialog usage projection ([e1cd922](https://github.com/nolotus/bun-nolo/commit/e1cd922e3931aebfcd3dec0b140df74722a4d999))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** surface real upstream cause in PLATFORM_LLM_BUSY errors ([4a61d73](https://github.com/nolotus/bun-nolo/commit/4a61d7355dca1e53de976e8802eb84813ad022ef))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **chat:** 历史截断轮归一化 trim 加固与半截正文轮边界沉淀 ([651d0f9](https://github.com/nolotus/bun-nolo/commit/651d0f9d156de11d8353bf820148984948247005))
* **chat:** 历史截断轮的 reasoning_content 装载期归一化，打通思考折叠展示 ([c4c71a5](https://github.com/nolotus/bun-nolo/commit/c4c71a57dcad9ff23cdea890f22164b947d139ae))
* **ci:** SSR render bundle 随 artifact 送达运行时槽位，补齐部署守卫与 live 探针 ([c91f7db](https://github.com/nolotus/bun-nolo/commit/c91f7dbcbcfebd2a368e2562ac6907984bdd0201))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** custom agent 无 credentialRef 时 429 冷却落盘，恢复 cooldown gate ([8b80c64](https://github.com/nolotus/bun-nolo/commit/8b80c64b0cbc48853fe852ec25997dcc69f568a5))
* **cli:** dialog read falls back to NOLO_HOME data dir, lock errors stay distinct ([793e38d](https://github.com/nolotus/bun-nolo/commit/793e38d5f57a671a0a5f8a2c6f25d51ec7780c71))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** make Windows self-update safe ([1694ac2](https://github.com/nolotus/bun-nolo/commit/1694ac29a84593e9b57437a239d6dd343687dcef))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** readDialog 失败输出 attempts 明细与 next-step，读路径候选补本地 origin ([068a328](https://github.com/nolotus/bun-nolo/commit/068a328bbcb79c155bc237689354e5b86dd1daa2))
* **cli:** readDialog 本地命中不再因冗余 dbKey 偏差被丢弃 ([339a3b0](https://github.com/nolotus/bun-nolo/commit/339a3b079314b142fd46ea9189446a7eb7bdeff3))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** run 报告默认不写盘，supervise/环境变量按需生成 ([7e4b560](https://github.com/nolotus/bun-nolo/commit/7e4b5609fd0569d0f68f071f7a5365d688abd6c1))
* **cli:** run 验收报告补子 agent 产出与结果指引，门控误导性 git 摘要 ([ccccb0d](https://github.com/nolotus/bun-nolo/commit/ccccb0d4e267dfb61c566c22cef4b189c046b9af))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 后台 run 输出被截断时结算为 failed，不再假成功 ([95b33be](https://github.com/nolotus/bun-nolo/commit/95b33bea0fc8950eaf6197c9c5ca0544ea61ab78))
* **cli:** 后台子进程入口存在性校验，坏入口回退默认解析 ([53b0b11](https://github.com/nolotus/bun-nolo/commit/53b0b11b74b86edc68126798ef8ace0bd6539c5c))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **context:** honor persisted stub across non-compaction turns and stop double-counting stubbed savings ([98ecf26](https://github.com/nolotus/bun-nolo/commit/98ecf262390ab688ab81f2392814d07ea93c8651))
* **context:** treat malformed schema version as invalid summary ([7f2573d](https://github.com/nolotus/bun-nolo/commit/7f2573d43712330fbb920e8a3385ab2dc4972b29))
* **context:** wire invalid_summary reason and event-only token numbers ([a92840f](https://github.com/nolotus/bun-nolo/commit/a92840f1ed95e4563a26c7c115ecd8d1d6df1c5c))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **desktop:** use forward-slash xcopy switches on Windows (backslash tokens made xcopy exit 4) [no-review: mechanical slash-direction fix, 1 line x4] ([6f0e9ee](https://github.com/nolotus/bun-nolo/commit/6f0e9ee2a7b868eb4997a856a28b6aa44804200b))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* **routing:** 路由钩子 SSR-safe 化，修复 /agents SSR 500（StyleX 迁移事故收尾） ([efd5aa7](https://github.com/nolotus/bun-nolo/commit/efd5aa740f17b213522e1bcb4d7656c15048b0ee))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **runtime:** length 截断时把 reasoning 尾部落盘，不再整轮丢失 ([23909e5](https://github.com/nolotus/bun-nolo/commit/23909e5228c4c7ce24220790b479c8351fa69faf))
* **security:** ssr-selfcheck 端点部署级 token 门控 + routing 降级可见性 ([f11200a](https://github.com/nolotus/bun-nolo/commit/f11200ac9e66046784a7a4e8307a0b8dfbc5420e))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** SSR 渲染 bundle 预编译，修复 StyleX 上线引发的全站 500 ([b2c1dd9](https://github.com/nolotus/bun-nolo/commit/b2c1dd9c23d6b6b1745281725618ed5497f78a54))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **stylex:** 修复 review 发现的 metafile 副作用 ([4bf2b21](https://github.com/nolotus/bun-nolo/commit/4bf2b21547e2f9d92ef188933ff43e773afe0a7e))
* **stylex:** 关闭 CSS layers 并按对手实际特异性消解 292 条级联冲突 ([d15a59b](https://github.com/nolotus/bun-nolo/commit/d15a59b8e3c5bbc444cc8f8825c6bd0559303c82))
* **stylex:** 显式合并 stylex.props className 与手写 hook 类，修复 composer 裸样式回归 ([cd48dfe](https://github.com/nolotus/bun-nolo/commit/cd48dfe3999ffbfbc250461133550be457671d94))
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** ask_user 面板变高时逐增量滚动，避免覆盖上方消息 ([ebb8ec0](https://github.com/nolotus/bun-nolo/commit/ebb8ec0885412982c0bcbc850fcf98a1a8b220e6))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** consume attachedImages after send to stop cross-turn image accumulation ([40aa0e9](https://github.com/nolotus/bun-nolo/commit/40aa0e9ec5e486502fa99e94dba240b3916ed1ee))
* **tui:** dock 面板发现宿主工具派发的本地 run ([4d03b58](https://github.com/nolotus/bun-nolo/commit/4d03b58184fe5244d87daaaffaa63ab3816df6d9))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** emit chat image preview in non-interactive (pipe) mode ([e6ef272](https://github.com/nolotus/bun-nolo/commit/e6ef272152a5715460b60d46d311101ce6a17047))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** markdown 表格 EA=A 宽度约定可配置（默认 narrow）+ 多行记录分隔线 ([7174a32](https://github.com/nolotus/bun-nolo/commit/7174a32ae2fe2eaebd4401b3f5d062e2e2972534))
* **tui:** markdown 表格 inline 标记跨行残留与 ambiguous 字符框线错位 ([a63c1f3](https://github.com/nolotus/bun-nolo/commit/a63c1f38a0a131423963884d76946366d2fb6cb1))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 终态唤醒投递时刻复核 ack，杜绝已消费 run 的重复通知 ([c3d8c17](https://github.com/nolotus/bun-nolo/commit/c3d8c17060f7f3e743545056b95a0840e6543e8d))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **types:** settle script-dev loader typing and identity test toBe generics ([e99fcf8](https://github.com/nolotus/bun-nolo/commit/e99fcf8cca35262f5992703a7045925d55206e05))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))

### Reverts

* Revert "feat(routing): switch platform DeepSeek V4 Flash/Pro from official Responses API to DeepInfra chat.completions" ([33c246f](https://github.com/nolotus/bun-nolo/commit/33c246f6bc012c30da50d6d4b274c3ef1c5f08a9))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-28)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** enhance cross-platform response layout guidelines for TUI/Web/RN ([bfc0fc5](https://github.com/nolotus/bun-nolo/commit/bfc0fc58bb46e042000bd8b8edd0e4c00b659d30))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** support viewport and isMobile context passthrough for TUI and narrow-screen guidelines ([589aa57](https://github.com/nolotus/bun-nolo/commit/589aa578509fbb0b0e6544a109490a7dd5265210))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** controlAgentRun 补上 append action（终态续跑） ([4af854b](https://github.com/nolotus/bun-nolo/commit/4af854bf1216746dcf9451617df243533d05f153))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **cli:** 工程化 agent supervise 无人值守监督器 ([5502be2](https://github.com/nolotus/bun-nolo/commit/5502be227e2dccd5b17b9a79f4c222ae93f9da7c))
* **cli:** 本地 run 终态自动生成验收报告 ([57b1b01](https://github.com/nolotus/bun-nolo/commit/57b1b0156cb2495b0e00f91c3403416b13ab0ac0))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
* **stylex:** 接入 @stylexjs/unplugin 的 esbuild 构建管线 ([26126ba](https://github.com/nolotus/bun-nolo/commit/26126baa95d352146cf603459c7f6281c34fa62a))
* **stylex:** 政策页三页试点迁移至 policyPageStyles ([f0cccfa](https://github.com/nolotus/bun-nolo/commit/f0cccfa9995d4d26b7e711d6d4bd595151e74a38))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** follow terminal-native colors ([6c0dfa4](https://github.com/nolotus/bun-nolo/commit/6c0dfa4419d23e23d8f34201df4d554322013179))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** readDialog 失败输出 attempts 明细与 next-step，读路径候选补本地 origin ([068a328](https://github.com/nolotus/bun-nolo/commit/068a328bbcb79c155bc237689354e5b86dd1daa2))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **stylex:** 修复 review 发现的 metafile 副作用 ([4bf2b21](https://github.com/nolotus/bun-nolo/commit/4bf2b21547e2f9d92ef188933ff43e773afe0a7e))
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** markdown 表格 inline 标记跨行残留与 ambiguous 字符框线错位 ([a63c1f3](https://github.com/nolotus/bun-nolo/commit/a63c1f38a0a131423963884d76946366d2fb6cb1))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-28)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** controlAgentRun 补上 append action（终态续跑） ([4af854b](https://github.com/nolotus/bun-nolo/commit/4af854bf1216746dcf9451617df243533d05f153))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **cli:** 工程化 agent supervise 无人值守监督器 ([5502be2](https://github.com/nolotus/bun-nolo/commit/5502be227e2dccd5b17b9a79f4c222ae93f9da7c))
* **cli:** 本地 run 终态自动生成验收报告 ([57b1b01](https://github.com/nolotus/bun-nolo/commit/57b1b0156cb2495b0e00f91c3403416b13ab0ac0))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
* **stylex:** 接入 @stylexjs/unplugin 的 esbuild 构建管线 ([26126ba](https://github.com/nolotus/bun-nolo/commit/26126baa95d352146cf603459c7f6281c34fa62a))
* **stylex:** 政策页三页试点迁移至 policyPageStyles ([f0cccfa](https://github.com/nolotus/bun-nolo/commit/f0cccfa9995d4d26b7e711d6d4bd595151e74a38))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** follow terminal-native colors ([6c0dfa4](https://github.com/nolotus/bun-nolo/commit/6c0dfa4419d23e23d8f34201df4d554322013179))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** readDialog 失败输出 attempts 明细与 next-step，读路径候选补本地 origin ([068a328](https://github.com/nolotus/bun-nolo/commit/068a328bbcb79c155bc237689354e5b86dd1daa2))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **stylex:** 修复 review 发现的 metafile 副作用 ([4bf2b21](https://github.com/nolotus/bun-nolo/commit/4bf2b21547e2f9d92ef188933ff43e773afe0a7e))
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** markdown 表格 inline 标记跨行残留与 ambiguous 字符框线错位 ([a63c1f3](https://github.com/nolotus/bun-nolo/commit/a63c1f38a0a131423963884d76946366d2fb6cb1))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-28)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** controlAgentRun 补上 append action（终态续跑） ([4af854b](https://github.com/nolotus/bun-nolo/commit/4af854bf1216746dcf9451617df243533d05f153))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **cli:** 工程化 agent supervise 无人值守监督器 ([5502be2](https://github.com/nolotus/bun-nolo/commit/5502be227e2dccd5b17b9a79f4c222ae93f9da7c))
* **cli:** 本地 run 终态自动生成验收报告 ([57b1b01](https://github.com/nolotus/bun-nolo/commit/57b1b0156cb2495b0e00f91c3403416b13ab0ac0))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
* **stylex:** 接入 @stylexjs/unplugin 的 esbuild 构建管线 ([26126ba](https://github.com/nolotus/bun-nolo/commit/26126baa95d352146cf603459c7f6281c34fa62a))
* **stylex:** 政策页三页试点迁移至 policyPageStyles ([f0cccfa](https://github.com/nolotus/bun-nolo/commit/f0cccfa9995d4d26b7e711d6d4bd595151e74a38))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** follow terminal-native colors ([6c0dfa4](https://github.com/nolotus/bun-nolo/commit/6c0dfa4419d23e23d8f34201df4d554322013179))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** readDialog 失败输出 attempts 明细与 next-step，读路径候选补本地 origin ([068a328](https://github.com/nolotus/bun-nolo/commit/068a328bbcb79c155bc237689354e5b86dd1daa2))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **stylex:** 修复 review 发现的 metafile 副作用 ([4bf2b21](https://github.com/nolotus/bun-nolo/commit/4bf2b21547e2f9d92ef188933ff43e773afe0a7e))
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** markdown 表格 inline 标记跨行残留与 ambiguous 字符框线错位 ([a63c1f3](https://github.com/nolotus/bun-nolo/commit/a63c1f38a0a131423963884d76946366d2fb6cb1))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-28)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** controlAgentRun 补上 append action（终态续跑） ([4af854b](https://github.com/nolotus/bun-nolo/commit/4af854bf1216746dcf9451617df243533d05f153))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **cli:** 工程化 agent supervise 无人值守监督器 ([5502be2](https://github.com/nolotus/bun-nolo/commit/5502be227e2dccd5b17b9a79f4c222ae93f9da7c))
* **cli:** 本地 run 终态自动生成验收报告 ([57b1b01](https://github.com/nolotus/bun-nolo/commit/57b1b0156cb2495b0e00f91c3403416b13ab0ac0))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
* **stylex:** 接入 @stylexjs/unplugin 的 esbuild 构建管线 ([26126ba](https://github.com/nolotus/bun-nolo/commit/26126baa95d352146cf603459c7f6281c34fa62a))
* **stylex:** 政策页三页试点迁移至 policyPageStyles ([f0cccfa](https://github.com/nolotus/bun-nolo/commit/f0cccfa9995d4d26b7e711d6d4bd595151e74a38))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** follow terminal-native colors ([6c0dfa4](https://github.com/nolotus/bun-nolo/commit/6c0dfa4419d23e23d8f34201df4d554322013179))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** readDialog 失败输出 attempts 明细与 next-step，读路径候选补本地 origin ([068a328](https://github.com/nolotus/bun-nolo/commit/068a328bbcb79c155bc237689354e5b86dd1daa2))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **stylex:** 修复 review 发现的 metafile 副作用 ([4bf2b21](https://github.com/nolotus/bun-nolo/commit/4bf2b21547e2f9d92ef188933ff43e773afe0a7e))
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** markdown 表格 inline 标记跨行残留与 ambiguous 字符框线错位 ([a63c1f3](https://github.com/nolotus/bun-nolo/commit/a63c1f38a0a131423963884d76946366d2fb6cb1))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-27)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-27)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-27)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-25)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残��旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-25)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-25)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))
* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))
* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))
* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop-runtime:** drop private server dep in agent availability adapter ([68cfe3a](https://github.com/nolotus/bun-nolo/commit/68cfe3a0e319aad6800d0ce2ebf0417d0767558a))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))
* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0-alpha.64](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.63...desktop-v0.32.0-alpha.64) (2026-08-25)

### Features

* **app:** 充值页重做并按通道费重算档位 ([1b994ba](https://github.com/nolotus/bun-nolo/commit/1b994ba5b2adce78536b92ec18f155cdb0143d5b))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([2d19bd4](https://github.com/nolotus/bun-nolo/commit/2d19bd4d0e36f72e6dc42834e04a1c8dc88bbc1b))
* **server:** wire queryModelUsage prefixChurn diagnostic ([6ecc886](https://github.com/nolotus/bun-nolo/commit/6ecc886cff4a8f2bd0bdc6c510045f3d9beb7f0b))

## [0.32.0-alpha.63](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.62...desktop-v0.32.0-alpha.63) (2026-08-25)

### Features

* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))

### Bug Fixes

* **tui:** include ollama-cloud in stream usage whitelist ([f5de4eb](https://github.com/nolotus/bun-nolo/commit/f5de4ebed17c05a61a22d67d08817eb9b3c63245))

## [0.32.0-alpha.62](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.61...desktop-v0.32.0-alpha.62) (2026-08-25)

### Bug Fixes

* **agent:** allow reasoning-only empty turns to repair up to cap ([b898ebd](https://github.com/nolotus/bun-nolo/commit/b898ebd7cd97836ba08c5f4c5df608d4a9fb1800))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **desktop-runtime:** drop private server dep in agent availability adapter ([8507ef7](https://github.com/nolotus/bun-nolo/commit/8507ef7de8f3c4269cd83d879234fe3535758e5e))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([d7d6932](https://github.com/nolotus/bun-nolo/commit/d7d69323aeba64f3ece3315365924cfcc9bc8266))
* **tui:** drain composer decoder on ask_user close via workspace hook ([db6d072](https://github.com/nolotus/bun-nolo/commit/db6d07222a48bddf3212000fba355702030353ad))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))

### Performance Improvements

* **cli:** bound history restore to a limited getConvMsgs fetch ([21424c8](https://github.com/nolotus/bun-nolo/commit/21424c847a8c3dd5aa73633e6bcf4f82b3ecf242))
* **cli:** skip redundant meta fetch when restoring dialog history ([f403954](https://github.com/nolotus/bun-nolo/commit/f403954f6980971789c186f935864eb991cc1ee2))

## [0.32.0-alpha.61](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.60...desktop-v0.32.0-alpha.61) (2026-08-25)

### Features

* **agent-runtime:** implement tool prune and spill with recoverable overflow metadata ([5ca025a](https://github.com/nolotus/bun-nolo/commit/5ca025a88373d65c7cd77fb1bfa20e66176dae29))
* **app:** 站内补齐服务条款/隐私政策/AUP 入口 ([960a08e](https://github.com/nolotus/bun-nolo/commit/960a08e3ada9fdde8e14c4a6edbacf0ad0d4f735))
* **ask-user:** Web/TUI 默认启用 ask_user ([ee4c0f3](https://github.com/nolotus/bun-nolo/commit/ee4c0f3b3c9971cebd84fc87df389c9b7558335f))
* **ask-user:** 新增 header 短标签用于多问题 tab 栏 ([79baa1b](https://github.com/nolotus/bun-nolo/commit/79baa1b64c66172ffd9d5b882f11da7513c209a2))
* **chat-queue:** support steer, draft recall on up-key and aborted draft refill ([e1c1ba5](https://github.com/nolotus/bun-nolo/commit/e1c1ba5e2c70742fc40db85507417f106c01093e))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([e32aae8](https://github.com/nolotus/bun-nolo/commit/e32aae8ab2b395a5c0ce778afcb5b0e272b3447a))
* **cli:** render mermaid flowchart as box-drawing diagram in TUI ([6891ad7](https://github.com/nolotus/bun-nolo/commit/6891ad724502ccd3646c3b78113cc12982c7a2ee))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **home:** remove compliance footer entirely from landing page ([5f2c058](https://github.com/nolotus/bun-nolo/commit/5f2c058ea6bc01861b00bc63027b0eeee99d7224))
* **legal:** add aup page and home compliance footer for waffo compliance ([a056d7f](https://github.com/nolotus/bun-nolo/commit/a056d7f05f24c2add860ddc78f40aac8a11766db))
* **legal:** refine brand name to nolo and clarify points refund policy ([89026d2](https://github.com/nolotus/bun-nolo/commit/89026d2f8771e9ed5b90e91af49f0cf34c6486a3))
* **nolo-connector:** channel-agnostic IM bridge to bun-nolo agents ([3f4d2e6](https://github.com/nolotus/bun-nolo/commit/3f4d2e6b7e8d806498d090ce4cdcc7a04c3edc51))
* **payments:** integrate waffo tier packages and server amount mapping ([a9472f1](https://github.com/nolotus/bun-nolo/commit/a9472f115d39d97d1032d6e3edc2db834a61c415))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** smooth terminal window resize with coalescing and line-count caching ([e780d02](https://github.com/nolotus/bun-nolo/commit/e780d029c9ed3bbf753596f5cf08ed1142035dda))

### Bug Fixes

* **agent-runtime:** content-address spill filenames to restore prefix caching ([4667976](https://github.com/nolotus/bun-nolo/commit/46679769a5b5ee69e76bde4a2e297bd8888ba044))
* **agent-runtime:** guarantee user turn prefix before Gemini function calls ([3198c6a](https://github.com/nolotus/bun-nolo/commit/3198c6a44ba8698d41bd95e72b01416773aeb882))
* **agent-runtime:** handle CRLF line endings in SSE frame boundary ([5c8011f](https://github.com/nolotus/bun-nolo/commit/5c8011fb7f429cc6b7a7d4dc7fe03869f40f93f9))
* **agent-runtime:** keep upstream Codex error structure so 429 cooldown is accurate ([52fbb1f](https://github.com/nolotus/bun-nolo/commit/52fbb1ffe5e46a03716f39805db6de3e93f5febb))
* **agent:** stream reasoning deltas to TUI on direct openai-compatible path ([fe5e3ba](https://github.com/nolotus/bun-nolo/commit/fe5e3bae5651980cd2a34f0118b46be1f381541b))
* **chat:** ensure stop button always visible during generation and soften compliance footer ([00e1a66](https://github.com/nolotus/bun-nolo/commit/00e1a665808f84ae0245d70bafc991aede628dcb))
* **chat:** preserve upstream error structure across providers and read gRPC retryDelay ([9d06752](https://github.com/nolotus/bun-nolo/commit/9d06752ada105bd40fb83f646b92f6efb688aafb))
* **chat:** remove duplicate activeControllers variable declaration ([ff75c0e](https://github.com/nolotus/bun-nolo/commit/ff75c0eccda0c14899b6880dd4bca152112eaa3b))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** key 429 cooldown by credential so it actually persists ([da0d70a](https://github.com/nolotus/bun-nolo/commit/da0d70ab046a85120f0a6d7ebe65700643f3dd61))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **identity:** route app store token read through identity public contract ([2901fa8](https://github.com/nolotus/bun-nolo/commit/2901fa80a7c4a81b96f4ec0bffe36b81ebcd3f6e))
* **mirror:** rewrite auth imports to identity public contract in open-source projection ([1437bde](https://github.com/nolotus/bun-nolo/commit/1437bde1f4a312158fcc516f928a5d60bc602cb0))
* **ts7:** ts7 类型检查下修复 core/scripts-dev gate ([30d5210](https://github.com/nolotus/bun-nolo/commit/30d52108b8867fb9a49223b923d086808fe8e1d0))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** drain composer decoder buffer when a modal closes ([8952280](https://github.com/nolotus/bun-nolo/commit/8952280c16e9874ffcc05616befdb15b000decf7))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** optimize flicker-free rendering, hardware cursor positioning and image summary ([a418a5f](https://github.com/nolotus/bun-nolo/commit/a418a5ffd3b8f55b014811a644e26de0b21a37cd))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))

### Performance Improvements

* **chat:** reuse authenticated account snapshot ([d4ae41c](https://github.com/nolotus/bun-nolo/commit/d4ae41cc426cf09d8d154aa9dc3bbb6926ea555e))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-24)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **cli:** support native terminal scrollback and direct turn commit ([3fabc6d](https://github.com/nolotus/bun-nolo/commit/3fabc6d455226c2336e7a1987c3b6aa2cad14ff2))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **tui:** add native-feeling drag selection ([b59e0f8](https://github.com/nolotus/bun-nolo/commit/b59e0f8bedb5fac35d61c713052717aa8bed78ff))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** stabilize platform proxy critical path ([dd89d84](https://github.com/nolotus/bun-nolo/commit/dd89d84bf541650511b55cbae173242521c2dbb9))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** guard TTY-only reset sequence in restoreAltScreen ([2921b8d](https://github.com/nolotus/bun-nolo/commit/2921b8d3b34c3f0374cd817d73836776cfa38e66))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([502de4b](https://github.com/nolotus/bun-nolo/commit/502de4bdb5ee1f049cae66fef93338cef304d3ba))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([b0c6169](https://github.com/nolotus/bun-nolo/commit/b0c6169b8978010dca0188a5160807c7dad77258))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([5057f4f](https://github.com/nolotus/bun-nolo/commit/5057f4f2cb9b86ce0996e6757d766b5e9b144a50))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([3f7aa43](https://github.com/nolotus/bun-nolo/commit/3f7aa43571c82e11a360faf35088a4ce8db7a91d))
* **tui:** align mouse selection highlight and copy ([ff295b3](https://github.com/nolotus/bun-nolo/commit/ff295b39642ba80fe9b14290eb726f6abe50bc01))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** complete production promotion safety ([5d3f86e](https://github.com/nolotus/bun-nolo/commit/5d3f86efb132d99a225cfa2bd66dc4d20cfb8d91))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([6a6b302](https://github.com/nolotus/bun-nolo/commit/6a6b302c0267f2be5d2fb96774d410d8d2f79303))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([aa63ff7](https://github.com/nolotus/bun-nolo/commit/aa63ff76f423e17ee42e0fd81992fa6c9065012a))
* **tui:** harden mouse selection edge cases ([71f8810](https://github.com/nolotus/bun-nolo/commit/71f881030d76c7ed4bec57111bb90b7533207902))
* **tui:** make mouse selection character-precise ([3680943](https://github.com/nolotus/bun-nolo/commit/368094346593f6e46fc982a98682a84d804efcac))
* **tui:** remove redundant copy view ([00e3a1c](https://github.com/nolotus/bun-nolo/commit/00e3a1c42e9d10afb1af22b8a6a3c462ac313c3e))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** restore stable fullscreen behavior and text copying ([1972f80](https://github.com/nolotus/bun-nolo/commit/1972f80300dfed0da902aa062543aa0f7fd99e2f))
* **tui:** stop fullscreen history repaint on main screen ([49bda0e](https://github.com/nolotus/bun-nolo/commit/49bda0e2ce1db3e20153bc3614562fefe6b4eb51))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([70267a6](https://github.com/nolotus/bun-nolo/commit/70267a6d5be0ce1e5a77d26669856e26626657d2))
* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([ff0121a](https://github.com/nolotus/bun-nolo/commit/ff0121adafe851027b919a112bdff891904d11a5))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-22)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-22)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-22)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-form:** publish settings as collapsible section instead of tab ([31b91ef](https://github.com/nolotus/bun-nolo/commit/31b91ef5ef5d7becee2a3aa05fd39b029c34e69c))
* **agent-form:** publish settings as collapsible section instead of tab ([61fc981](https://github.com/nolotus/bun-nolo/commit/61fc9814c37f8dd5171afd51aac3d127b7ede851))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent-runtime:** cross-wire history sanitize layer for /switch replay ([b49af71](https://github.com/nolotus/bun-nolo/commit/b49af71b29ba8a91b850be87b77cdf8ff4d8b645))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([b858e9e](https://github.com/nolotus/bun-nolo/commit/b858e9e12e1ecb8f3afe4c4231fbade5878bf9d6))
* **agent-runtime:** readDialog 增加 status 模式与 run 场景导航 ([1a4ed49](https://github.com/nolotus/bun-nolo/commit/1a4ed49899f49edf23b2468d16f4bc2983813d01))
* **agent:** add deepseek-v4-pro:cloud to ollama-cloud subscription preset ([b8ffad3](https://github.com/nolotus/bun-nolo/commit/b8ffad313581597c459094279befe2e6114a9fde))
* **agent:** flip collaboration tier to prefer dispatch over self-execution ([ca4e7e5](https://github.com/nolotus/bun-nolo/commit/ca4e7e51e0571032c1a15ee2645532a48cbcb2ae))
* **agent:** inject handoff execution discipline via toolGuidedSections ([c0344a6](https://github.com/nolotus/bun-nolo/commit/c0344a67ada9f1ae60415eaf47a0cbd21c63efe2))
* **agent:** provider key auto-remember + edit-mode shared key display + runtime provider-key resolution ([7070881](https://github.com/nolotus/bun-nolo/commit/7070881fc9f512082c2591e810c94359010449b9))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **agent:** upgrade platform Claude opus to 5, add fable 5 (coeff x8) ([fc23503](https://github.com/nolotus/bun-nolo/commit/fc2350369447d9dd28677d974abe1d39788e588c))
* **ai:** add token analytics tool + Life/Usage cache tab + pricing simulator UI ([8acc39a](https://github.com/nolotus/bun-nolo/commit/8acc39a69f0a38dd9367619c015b11b871125555))
* **ai:** extend token pre-aggregation with cache fields and pricing simulator ([1aab6f1](https://github.com/nolotus/bun-nolo/commit/1aab6f13a19e9c18fdc3a8936d368efc8e97b3a1))
* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **catalog:** incorporate all public agents into builtin catalog (P1) ([3d99329](https://github.com/nolotus/bun-nolo/commit/3d9932981d15f1f6df5ee852ebfe0dd6ebfe8402))
* **cli:** enhance TUI diff display with dynamic width and expanded lines budget ([0d08cb7](https://github.com/nolotus/bun-nolo/commit/0d08cb711a4e1ed97f1d1bf654027781719b3672))
* **cli:** fuse syntax highlighting with Zed-style surface wash in TUI diff ([81af71b](https://github.com/nolotus/bun-nolo/commit/81af71b33a3c7f8ff2fafa6c08fd31906af227c8))
* **context:** add compaction metrics for observability (P1-8) ([2096018](https://github.com/nolotus/bun-nolo/commit/2096018fdd5f30ce7b120510891af4ee37c09be1))
* **context:** enhance compaction prompt with first-person handoff (P0-3) ([12fd86d](https://github.com/nolotus/bun-nolo/commit/12fd86dcc37de9001de8fe562b0c71d02d52a89e))
* **explore:** catalog overlay for fetchPublicAgents (P3) ([efc3788](https://github.com/nolotus/bun-nolo/commit/efc37886bdef24b8e918dcd9371e89685c5f3a4b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([cc1f443](https://github.com/nolotus/bun-nolo/commit/cc1f443f623017a6bff763f61d40f0ea6d2cfc3b))
* **form:** add valibot + useForm hook, migrate auth & rn forms (phase 1) ([82498c2](https://github.com/nolotus/bun-nolo/commit/82498c2abdc2b04c40eea80800e902804bbd4ad9))
* **identity:** add isCloudEdition flag for conditional cloud-only module loading ([caec82f](https://github.com/nolotus/bun-nolo/commit/caec82f904c5d8e85608bd307b833fb17c6d868a))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **memory:** add contentKey for cross-instance deduplication ([38712b0](https://github.com/nolotus/bun-nolo/commit/38712b075059031e8df6ef2e65106d371be1d26c))
* **memory:** add token budget to memory overlay injection ([5ccaf6f](https://github.com/nolotus/bun-nolo/commit/5ccaf6f75b51f4327404df08df581e2591efd3c2))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **release:** add CLI publish + version-bump workflows to public repo ([5345626](https://github.com/nolotus/bun-nolo/commit/5345626651a0f5d1c1306d66e1fc69e4233bc90f))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **runtime:** extract desktop-runtime package from server ([55efd57](https://github.com/nolotus/bun-nolo/commit/55efd570de24a66ea67006f35a8e631b50867a92))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **tui:** local turn rendering for slash command echo ([202e71a](https://github.com/nolotus/bun-nolo/commit/202e71a076f8ca13feb3ffcf31d552de569cf9d9))
* **verify:** add Linux desktop artifact and CLI bundle verification ([a950f54](https://github.com/nolotus/bun-nolo/commit/a950f54e8823b54af3e13d0ed91f7a7afa9fe4b8))
* **vision:** add image preprocessing pipeline for text-only LLMs ([0ca3383](https://github.com/nolotus/bun-nolo/commit/0ca33833248188385ed3fb615c0fc5eb89fe3922))
* **vision:** add image preprocessing pipeline for text-only LLMs ([9018fa0](https://github.com/nolotus/bun-nolo/commit/9018fa0e7ab0eefcfdccc03894d1dcdf40eccbb3))
* **vision:** switch image preprocessor to Qwen 3.7 Flash via OpenRouter ([131a9e4](https://github.com/nolotus/bun-nolo/commit/131a9e4b94c5b1681ab286196236996dc990544b))

### Bug Fixes

* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([367a38f](https://github.com/nolotus/bun-nolo/commit/367a38fe24c8398fd89f16a60c68902b146541f7))
* **agent-form:** i18n for knowledgeTools tab + subscription preset restore on edit ([f430c71](https://github.com/nolotus/bun-nolo/commit/f430c71e1e1f6b292f82d82c052420c618341643))
* **agent-form:** use existing AgentPublishDialog + fix source contract tests ([46b7fef](https://github.com/nolotus/bun-nolo/commit/46b7fef9d9ac4aeddf08e49f5d7bfdb603ff161c))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([3bdf3c9](https://github.com/nolotus/bun-nolo/commit/3bdf3c95567353b381e73ae51e589ead5d620c88))
* **agent-runtime:** normalize Gemini tool turns and hoist image preprocessing ([fc2c267](https://github.com/nolotus/bun-nolo/commit/fc2c26737e553ca7bb7a4760edea96f245b22461))
* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** replace Buffer.from with atob/btoa for browser compat ([5baef5f](https://github.com/nolotus/bun-nolo/commit/5baef5ff9c29eaf41b574e701ab6f18816fe7c56))
* **agent-runtime:** split base64 constants to avoid GitHub secret scanning ([574b427](https://github.com/nolotus/bun-nolo/commit/574b4279c163d77827b70d031a69f7aac81fada1))
* **agent-runtime:** stream Gemini OAuth responses in TUI without full-batch delay ([21a2657](https://github.com/nolotus/bun-nolo/commit/21a265740570394d7989e72b2f909049535089e2))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** read dialog in-process to bypass LevelDB lock in TUI mode ([a5806b5](https://github.com/nolotus/bun-nolo/commit/a5806b50254c1ef92222a3e959453a9e82d6d77b))
* **agent:** subscription agent create/edit — cliProvider schema rejection + key configured state + ollama key format hint ([3549cbc](https://github.com/nolotus/bun-nolo/commit/3549cbc17495353ad4b107362b2b0fe93c03a6ef))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **agent:** 自建 agent 在 CLI --safe 输出中丢失 agentKey ([99eba46](https://github.com/nolotus/bun-nolo/commit/99eba461867486a1d8fe895ddeabda58ce7deb85))
* **ai:** unify provider lookup map and support opencode catalog models ([b20dea8](https://github.com/nolotus/bun-nolo/commit/b20dea81bdbbf96042b30f977499ed18c2b20fba))
* **ai:** unify provider lookup map and support opencode catalog models ([0335a90](https://github.com/nolotus/bun-nolo/commit/0335a90fc359a363e3f8ecb1ddc50ff735d055d2))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([5867f46](https://github.com/nolotus/bun-nolo/commit/5867f46184de71ab98758f74590f4770b4d7ab52))
* **ai:** 修复 listAgents 大量 agent 缺失 agentKey 导致无法派发 ([aa32f1e](https://github.com/nolotus/bun-nolo/commit/aa32f1e7a35fce851ba0a3fb12501e4734c71716))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** make ledger hash canonicalization deterministic across hosts ([1d94211](https://github.com/nolotus/bun-nolo/commit/1d94211044618bf24b8ccc22cf994f2f76c398d9))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** resolve [Failed to save message] on quick-chat by falling back agentId to dbKey ([ee51916](https://github.com/nolotus/bun-nolo/commit/ee51916d9dc0eb0da1ead05cb47a68929dc8e0ac))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** accept either wire format on the chat.completions proxy path ([94d3fd3](https://github.com/nolotus/bun-nolo/commit/94d3fd31276613cfa480619540bcc7d4dc8923ee))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([2b407b7](https://github.com/nolotus/bun-nolo/commit/2b407b7bafed16ecc90e48f6720b3466dfa4bddb))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **chat:** wire history sanitizer into responsesAdapter for /switch replay ([4c26ea7](https://github.com/nolotus/bun-nolo/commit/4c26ea70eec2f95cfb04cf1a2a5d0168b3f383c8))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([a366e41](https://github.com/nolotus/bun-nolo/commit/a366e41aa2b9b4d5e2d7bb56bc8f5e6b18deff03))
* **cli:** classify provider HTTP failures by status instead of generic credential hint ([8b31067](https://github.com/nolotus/bun-nolo/commit/8b31067504e4b08272d9d61a6231c0d6e2a2c002))
* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **cli:** migrate compactDialog to shared compaction module (P0.5 cleanup) ([50f2929](https://github.com/nolotus/bun-nolo/commit/50f2929bfe6bf56cd1207ed58db877b76216a27b))
* **cli:** pass through usage for claude/antigravity OAuth branches ([6c4dc7a](https://github.com/nolotus/bun-nolo/commit/6c4dc7a5f94c2716991535b4a8586229af80607d))
* **cli:** remove incorrect PKCE from antigravity OAuth flow ([9e273ed](https://github.com/nolotus/bun-nolo/commit/9e273ed77e13e076ce9b1ca5182763e102fea29a))
* **cli:** terminate agent-run process group and confirm exit before marking killed ([eb0c93f](https://github.com/nolotus/bun-nolo/commit/eb0c93f012526aa13218336a21ac85d70ba5f85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **cloud:** resolve cloudLazy bare specifiers via static import map ([723a24e](https://github.com/nolotus/bun-nolo/commit/723a24ed7dab79b0a3e044402c9a36f2815d1022))
* **context:** add lastCompactedTokenCount guard against compaction death spiral (P0-1) ([d5f8718](https://github.com/nolotus/bun-nolo/commit/d5f8718b14fb7cda8a55e8d5a79980625309e6e5))
* **context:** add staleReplayGuard to server-side summary injection + inherit compression state in web fork ([7740840](https://github.com/nolotus/bun-nolo/commit/7740840f859e6654768eca28eb8943f601b53122))
* **context:** estimate message tokens from content + tool_calls, not completion_tokens ([625c583](https://github.com/nolotus/bun-nolo/commit/625c5838977174448203d858e9c4e6e4fbff5580))
* **context:** fix TypeScript type error from C2+D1 interaction (review BLOCK fix) ([8aef384](https://github.com/nolotus/bun-nolo/commit/8aef384c7d561505e40fb2b02e2ea1f65cc46e14))
* **core:** Qwen 预处理器归为 internal，修复 catalog↔seed 一致性红测试 ([4964f9b](https://github.com/nolotus/bun-nolo/commit/4964f9b46f41cf8dbe9afc1758edb5b58fc37356))
* **database:** fail fast when the LevelDB lock is still held ([70e12dc](https://github.com/nolotus/bun-nolo/commit/70e12dc5ca299201fdcbe7328e652cbc2eaf910f))
* **db:** add DataType.AGENT and AUTOMATION to write VALID_TYPES ([08d6c4e](https://github.com/nolotus/bun-nolo/commit/08d6c4e74e9637f3f308b9717122b135b457ffbf))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** add sharedCors to package exports ([0a773f9](https://github.com/nolotus/bun-nolo/commit/0a773f9d06d28c06c16ca869fbeb7eef0d317749))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))
* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))
* **form:** react-aria TextField controlled value/onChange + Playwright e2e matrix ([55fd747](https://github.com/nolotus/bun-nolo/commit/55fd7474fdc378935d5389079473e105a2fb5b14))
* **identity:** authReducer local returns {} not null — fixes SSR hydration ([e8804e8](https://github.com/nolotus/bun-nolo/commit/e8804e8e902b34df290d92b5080fa1d13cfb1e87))
* **identity:** preserve latest identity seam during integration ([8d05990](https://github.com/nolotus/bun-nolo/commit/8d05990047a303a3a4130e6fb90cfbbe480a0203))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **memory:** CLI local/auto mode now queries remote memory first ([36dbd9d](https://github.com/nolotus/bun-nolo/commit/36dbd9d3372c8ca0129fc831470581abeb9db316))
* **memory:** inject memory overlay into TUI dialog ([355a22b](https://github.com/nolotus/bun-nolo/commit/355a22b6ef397b1a0bd1dc02b3a86f1eade50cb4))
* **memory:** stale comments + migration script uses contentKeyInput helper ([0dd4ae1](https://github.com/nolotus/bun-nolo/commit/0dd4ae1763b227fb1c7e5315986d5ea05bb84e48))
* **memory:** stale comments + migration script uses contentKeyInput helper ([90da1b8](https://github.com/nolotus/bun-nolo/commit/90da1b806d3e427bae2c114db5f28e435ada94b9))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **orchestration:** lease-based subagent run claim to eliminate duplicate terminal wake ([04d5d7c](https://github.com/nolotus/bun-nolo/commit/04d5d7c5f0e0a295925ee90b81b382277c6a0444))
* **orchestration:** strict lock mode for claimRunRecord to prevent concurrent token race ([010f4ad](https://github.com/nolotus/bun-nolo/commit/010f4adcd110498bd27027c967eee33e0fe8261b))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** resolve remaining mirror TS2307 missing module errors ([741a1d1](https://github.com/nolotus/bun-nolo/commit/741a1d1ff330a3d6d2b02569f08962c7b0b31b26))
* **release:** restore InviteModal + SpaceInvite (auth/routes → core/authRoutes) ([5c26779](https://github.com/nolotus/bun-nolo/commit/5c267795d045e1280a6a620b1c7d2a9d8ecf7a00))
* **release:** restore remaining decoupled pages for desktop build ([2f8a497](https://github.com/nolotus/bun-nolo/commit/2f8a4979337d31749d849cd9a48d29f2b1b0a2ec))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([0825a1c](https://github.com/nolotus/bun-nolo/commit/0825a1cd361668a9fa7eb4088c82b4221a442c83))
* resolve contract-test batch (provider presets, icon dep, stub, assertions) ([bfe8d59](https://github.com/nolotus/bun-nolo/commit/bfe8d59e01a0a78eff05e4413d24c3d35d116c43))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **server:** pass --conditions=nolo-cloud to server and probe launches ([ada0ba3](https://github.com/nolotus/bun-nolo/commit/ada0ba383277306bed4516ee02e341e10b7caa73))
* **server:** update all server imports to use desktop-runtime package ([02dd909](https://github.com/nolotus/bun-nolo/commit/02dd9098b2665dd0ef2e3b6b74870a5619517ce5))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([98d4a78](https://github.com/nolotus/bun-nolo/commit/98d4a78d41c7370b36f14abb60288c7f6cac3912))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([af17fe7](https://github.com/nolotus/bun-nolo/commit/af17fe7ddcd0d4d95d79afc52ab60e78ebe5f5d0))
* **space:** isolate membershipFetchCache across tests to restore fail-closed behavior ([64cff90](https://github.com/nolotus/bun-nolo/commit/64cff90d09072204fa934292f7e288a203d82422))
* **ssr:** bypass identity/authReducer condition split to prevent auth:null ([fb2376e](https://github.com/nolotus/bun-nolo/commit/fb2376eac07ed30d03182092d9e02c97c95b6ca3))
* **ssr:** enforce edition contract between SSR and client bundle ([3d38d5f](https://github.com/nolotus/bun-nolo/commit/3d38d5f0f7263eb653775755553924a5e1fc1b9e))
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** render subagent completion wakes as compact assistant turns ([4c6e79f](https://github.com/nolotus/bun-nolo/commit/4c6e79f6ede41b240c73956d2d1600b40f5e46ee))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))
* **ui:** add missing form.prompt i18n key and clear login error on input change ([409046f](https://github.com/nolotus/bun-nolo/commit/409046f64209c8cb74ac23f64a20bdcf8900629a))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([f1bc7b4](https://github.com/nolotus/bun-nolo/commit/f1bc7b4a156148b38148a5ad6ee1beead1925978))
* **vision:** apply review fixes — use shared extractor, derive model from catalog, remove unused import ([7842eb0](https://github.com/nolotus/bun-nolo/commit/7842eb01798f81b7b6ae7368021dcd28d4d8ad78))
* **vision:** keep nolo catalog model id for billing, remap only in body ([16a141a](https://github.com/nolotus/bun-nolo/commit/16a141ab6420eff86cf6c6d51e903e16d39d782c))
* **vision:** remove placeholder url that sent user images to wrong host ([c350fb9](https://github.com/nolotus/bun-nolo/commit/c350fb9065672c470b4ea016e3689368a4310b9b))
* 修复安全门 Fail-Open、除零风险、悬挂 import 等问题 ([403b1d9](https://github.com/nolotus/bun-nolo/commit/403b1d9ac0c913d442be29919fda0fc69fbe6198))

### Performance Improvements

* **cli:** broker fast-path + local-only dialog read, first-turn 1s→15ms ([3dc2f97](https://github.com/nolotus/bun-nolo/commit/3dc2f97816d2a93f45d225cf1867027acd286953))
* **cli:** dialog read 本地兜底改用短锁预算，90s 空转降到 5s ([b2d1ccd](https://github.com/nolotus/bun-nolo/commit/b2d1ccd884f409cde7b87c45ca40d4b935a9e869))
* **cli:** fire-and-forget concurrency limiter for bulk turns ([1e9cdd4](https://github.com/nolotus/bun-nolo/commit/1e9cdd4ee3c3a71a27a4e909d6bf443c8d297302))
* **cli:** writeDialog title+remote-sync fire-and-forget, turn-end 5.4s→1s ([8fd2e5d](https://github.com/nolotus/bun-nolo/commit/8fd2e5d6abbc41434b2ff6350b27a482d6a7ef22))
* **deploy:** minimize blue-green 503 window with two-phase drain and request parking ([faf5816](https://github.com/nolotus/bun-nolo/commit/faf58168400b68f5f98800e560c5362f428daa14))
* **memory:** increase recall to 10 items, compress overlay tokens ([ca002cd](https://github.com/nolotus/bun-nolo/commit/ca002cd424c17806ea7e4c44b8387b73d9102828))
* **memory:** session-scope overlay, load once per dialog ([951cc79](https://github.com/nolotus/bun-nolo/commit/951cc791e32514a7677b3d439238718024287107))
* **memory:** skip LLM extraction for short user inputs ([e5552c8](https://github.com/nolotus/bun-nolo/commit/e5552c8f7b47e14996a6ccb81f706d515d9d59d9))

## [0.32.0-alpha.38](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.37...desktop-v0.32.0-alpha.38) (2026-08-22)

### Bug Fixes

* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))

## [0.32.0-alpha.37](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.36...desktop-v0.32.0-alpha.37) (2026-08-22)

### Features

* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))

## [0.32.0-alpha.36](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.35...desktop-v0.32.0-alpha.36) (2026-08-22)

### Bug Fixes

* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))

## [0.32.0-alpha.35](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.34...desktop-v0.32.0-alpha.35) (2026-08-22)

### Bug Fixes

* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))

## [0.32.0-alpha.34](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.33...desktop-v0.32.0-alpha.34) (2026-08-22)

### Bug Fixes

* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))

## [0.32.0-alpha.33](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.32...desktop-v0.32.0-alpha.33) (2026-08-22)

### Bug Fixes

* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **release:** tolerate npm package processing delay ([43df49e](https://github.com/nolotus/bun-nolo/commit/43df49e841f5b8f11d84859b507169fed8f42827))

## [0.32.0-alpha.32](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.31...desktop-v0.32.0-alpha.32) (2026-08-22)

### Bug Fixes

* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))

## [0.32.0-alpha.31](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.30...desktop-v0.32.0-alpha.31) (2026-08-22)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent:** public agent catalog consistency audit and verifier ([9229a55](https://github.com/nolotus/bun-nolo/commit/9229a553eff6944ef80e6099d032f33ecafcee95))
* **agent:** unify platform response language context ([ba72c53](https://github.com/nolotus/bun-nolo/commit/ba72c53232d5b8e94e0a897a15e948cfd2e04e38))
* **billing:** 新增 ledger hash-chain 修复端点（服务内执行，绕开 LevelDB 独占锁） ([3bd174e](https://github.com/nolotus/bun-nolo/commit/3bd174e154cb1abecaebb09405ab6c0494c08240))
* **life:** billing detail per record with cache price snapshot (US-3.2) ([6d973b0](https://github.com/nolotus/bun-nolo/commit/6d973b0af36b0380c3639f385cd7f4681e8222ab))
* **life:** export usage records to CSV (US-3.5) ([affb2d2](https://github.com/nolotus/bun-nolo/commit/affb2d218e4442ee3d8082e568b33da595a64bac))
* **life:** mark abnormal usage spikes on the chart (US-3.1) ([4f238f0](https://github.com/nolotus/bun-nolo/commit/4f238f0e0947e89f6bca679c95eede41053e89c7))
* **life:** mark failed calls as not charged with reason (US-3.3) ([cc901d3](https://github.com/nolotus/bun-nolo/commit/cc901d31a7dc49c7221b4751e04a39f4298d0ce0))
* **life:** monthly budget threshold alert (US-4.2) ([102434e](https://github.com/nolotus/bun-nolo/commit/102434ea1aa295f6bb5f4dbd3dd7275bbaf05c17))
* **life:** paginate usage records by cursor instead of pulling everything ([d26efcd](https://github.com/nolotus/bun-nolo/commit/d26efcd0898793c3dc279cc54d8cf836f9d32909))
* **life:** rank dialogs by usage with drill-in (US-2.2) ([55b8cea](https://github.com/nolotus/bun-nolo/commit/55b8cea3acda86337446e4a6cc106e55fee9141c))
* **life:** rebuild usage dashboard with balance, prediction and linked ranges ([669e168](https://github.com/nolotus/bun-nolo/commit/669e168f78fefc95ba5db01ffe7d65cfedf880ab))
* **life:** show cache savings from real billing records (US-3.4) ([7850f75](https://github.com/nolotus/bun-nolo/commit/7850f75ecc728164b149b472adf8fe8b67d00c6b))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))

### Bug Fixes

* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **life:** align month-over-month boundary to host local calendar days ([2dd8058](https://github.com/nolotus/bun-nolo/commit/2dd8058a7225d5c0b6853ed4741904c46ff7246a))
* **life:** cache card table mobile card layout (US-5.4 收尾) ([dd58734](https://github.com/nolotus/bun-nolo/commit/dd58734de7172a94fdbf3c99dc5a3f0a21a85ef5))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))

## [0.32.0-alpha.30](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.29...desktop-v0.32.0-alpha.30) (2026-08-20)

## [0.32.0-alpha.29](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.28...desktop-v0.32.0-alpha.29) (2026-08-20)

## [0.32.0-alpha.28](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.27...desktop-v0.32.0-alpha.28) (2026-08-20)

## [0.32.0-alpha.27](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.26...desktop-v0.32.0-alpha.27) (2026-08-20)

## [0.32.0-alpha.26](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.25...desktop-v0.32.0-alpha.26) (2026-08-20)

## [0.32.0-alpha.25](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.24...desktop-v0.32.0-alpha.25) (2026-08-20)

## [0.32.0-alpha.24](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.23...desktop-v0.32.0-alpha.24) (2026-08-20)

## [0.32.0-alpha.23](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.22...desktop-v0.32.0-alpha.23) (2026-08-20)

## [0.32.0-alpha.22](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.21...desktop-v0.32.0-alpha.22) (2026-08-20)

## [0.32.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.20...desktop-v0.32.0-alpha.21) (2026-08-19)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-19)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-19)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-19)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-19)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-19)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-18)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-18)

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0) (2026-08-18)

## [0.32.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.11...desktop-v0.32.0-alpha.12) (2026-08-18)

## [0.32.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.10...desktop-v0.32.0-alpha.11) (2026-08-18)

## [0.32.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.9...desktop-v0.32.0-alpha.10) (2026-08-18)

## [0.32.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.8...desktop-v0.32.0-alpha.9) (2026-08-18)

## [0.32.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.7...desktop-v0.32.0-alpha.8) (2026-08-18)

## [0.32.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.6...desktop-v0.32.0-alpha.7) (2026-08-17)

## [0.32.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.5...desktop-v0.32.0-alpha.6) (2026-08-17)

## [0.32.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.4...desktop-v0.32.0-alpha.5) (2026-08-17)

## [0.32.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.3...desktop-v0.32.0-alpha.4) (2026-08-17)

## [0.32.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.32.0-alpha.1...desktop-v0.32.0-alpha.2) (2026-08-17)

## [0.32.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0...desktop-v0.32.0-alpha.1) (2026-08-17)

## [0.28.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.27.1...desktop-v0.28.0-alpha.1) (2026-08-17)

## [0.31.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.8...desktop-v0.31.0-alpha.9) (2026-08-17)

## [0.31.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.7...desktop-v0.31.0-alpha.8) (2026-08-17)

## [0.31.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.6...desktop-v0.31.0-alpha.7) (2026-08-17)

## [0.31.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.5...desktop-v0.31.0-alpha.6) (2026-08-16)

## [0.31.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.4...desktop-v0.31.0-alpha.5) (2026-08-16)

## [0.31.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.3...desktop-v0.31.0-alpha.4) (2026-08-16)

## [0.31.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.2...desktop-v0.31.0-alpha.3) (2026-08-16)

## [0.31.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.31.0-alpha.1...desktop-v0.31.0-alpha.2) (2026-08-16)

## [0.31.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0...desktop-v0.31.0-alpha.1) (2026-08-16)

## [0.30.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.20...desktop-v0.30.0-alpha.21) (2026-08-16)

## [0.30.0-alpha.20](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.19...desktop-v0.30.0-alpha.20) (2026-08-16)

## [0.30.0-alpha.19](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.18...desktop-v0.30.0-alpha.19) (2026-08-16)

## [0.30.0-alpha.18](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.17...desktop-v0.30.0-alpha.18) (2026-08-16)

## [0.30.0-alpha.17](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.16...desktop-v0.30.0-alpha.17) (2026-08-16)

## [0.30.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.15...desktop-v0.30.0-alpha.16) (2026-08-16)

## [0.30.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.14...desktop-v0.30.0-alpha.15) (2026-08-16)

## [0.30.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.13...desktop-v0.30.0-alpha.14) (2026-08-16)

## [0.30.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.12...desktop-v0.30.0-alpha.13) (2026-08-16)

## [0.30.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.11...desktop-v0.30.0-alpha.12) (2026-08-16)

## [0.30.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.10...desktop-v0.30.0-alpha.11) (2026-08-16)

## [0.30.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.9...desktop-v0.30.0-alpha.10) (2026-08-16)

## [0.30.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.8...desktop-v0.30.0-alpha.9) (2026-08-16)

## [0.30.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.7...desktop-v0.30.0-alpha.8) (2026-08-16)

## [0.30.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.6...desktop-v0.30.0-alpha.7) (2026-08-15)

## [0.30.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.5...desktop-v0.30.0-alpha.6) (2026-08-15)

## [0.30.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.4...desktop-v0.30.0-alpha.5) (2026-08-15)

## [0.30.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.3...desktop-v0.30.0-alpha.4) (2026-08-15)

## [0.30.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.2...desktop-v0.30.0-alpha.3) (2026-08-15)

## [0.30.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.30.0-alpha.1...desktop-v0.30.0-alpha.2) (2026-08-15)

## [0.30.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.29.2...desktop-v0.30.0-alpha.1) (2026-08-15)

## [0.25.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.25.0-alpha.1...desktop-v0.25.0-alpha.2) (2026-08-15)

## [0.25.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.24.0...desktop-v0.25.0-alpha.1) (2026-08-15)

## [0.29.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.29.0...desktop-v0.29.1) (2026-08-15)

## [0.29.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.28.0...desktop-v0.29.0) (2026-08-15)

## [0.28.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.27.1...desktop-v0.28.0) (2026-08-15)

## [0.27.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.27.0...desktop-v0.27.1) (2026-08-15)

## [0.27.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.26.1...desktop-v0.27.0) (2026-08-14)

## [0.26.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.26.0...desktop-v0.26.1) (2026-08-14)

## [0.26.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.25.3...desktop-v0.26.0) (2026-08-14)

## [0.25.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.25.2...desktop-v0.25.3) (2026-08-13)

## [0.25.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.25.1...desktop-v0.25.2) (2026-08-13)

## [0.25.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.25.0...desktop-v0.25.1) (2026-08-13)

## [0.25.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.24.1...desktop-v0.25.0) (2026-08-13)

## [0.24.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.24.0...desktop-v0.24.1) (2026-08-13)

## [0.24.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.23.0...desktop-v0.24.0) (2026-08-13)

## [0.23.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.22.0...desktop-v0.23.0) (2026-08-13)

## [0.22.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.21.0...desktop-v0.22.0) (2026-08-13)

## [0.21.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.20.2...desktop-v0.21.0) (2026-08-12)

## [0.20.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.20.1...desktop-v0.20.2) (2026-08-12)

## [0.20.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.20.0...desktop-v0.20.1) (2026-08-12)

## [0.14.0-alpha.59](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.58...desktop-v0.14.0-alpha.59) (2026-08-12)

## [0.14.0-alpha.58](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.57...desktop-v0.14.0-alpha.58) (2026-08-12)

## [0.14.0-alpha.57](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.56...desktop-v0.14.0-alpha.57) (2026-08-12)

## [0.14.0-alpha.56](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.55...desktop-v0.14.0-alpha.56) (2026-08-12)

## [0.14.0-alpha.55](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.54...desktop-v0.14.0-alpha.55) (2026-08-12)

## [0.14.0-alpha.54](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.53...desktop-v0.14.0-alpha.54) (2026-08-12)

## [0.14.0-alpha.53](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.52...desktop-v0.14.0-alpha.53) (2026-08-12)

## [0.14.0-alpha.52](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.51...desktop-v0.14.0-alpha.52) (2026-08-12)

## [0.14.0-alpha.51](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.50...desktop-v0.14.0-alpha.51) (2026-08-12)

## [0.14.0-alpha.50](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.49...desktop-v0.14.0-alpha.50) (2026-08-12)

## [0.14.0-alpha.49](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.48...desktop-v0.14.0-alpha.49) (2026-08-12)

## [0.14.0-alpha.48](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.47...desktop-v0.14.0-alpha.48) (2026-08-12)

## [0.14.0-alpha.47](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.46...desktop-v0.14.0-alpha.47) (2026-08-12)

## [0.14.0-alpha.46](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.45...desktop-v0.14.0-alpha.46) (2026-08-12)

## [0.14.0-alpha.45](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.44...desktop-v0.14.0-alpha.45) (2026-08-12)

## [0.14.0-alpha.44](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.43...desktop-v0.14.0-alpha.44) (2026-08-11)

## [0.14.0-alpha.43](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.42...desktop-v0.14.0-alpha.43) (2026-08-11)

## [0.14.0-alpha.42](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.41...desktop-v0.14.0-alpha.42) (2026-08-11)

## [0.14.0-alpha.41](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.40...desktop-v0.14.0-alpha.41) (2026-08-11)

## [0.14.0-alpha.40](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.39...desktop-v0.14.0-alpha.40) (2026-08-11)

## [0.14.0-alpha.39](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.38...desktop-v0.14.0-alpha.39) (2026-08-11)

## [0.14.0-alpha.38](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.37...desktop-v0.14.0-alpha.38) (2026-08-11)

## [0.14.0-alpha.37](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.36...desktop-v0.14.0-alpha.37) (2026-08-11)

## [0.14.0-alpha.36](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.35...desktop-v0.14.0-alpha.36) (2026-08-11)

## [0.14.0-alpha.35](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.34...desktop-v0.14.0-alpha.35) (2026-08-11)

## [0.14.0-alpha.34](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.33...desktop-v0.14.0-alpha.34) (2026-08-10)

## [0.14.0-alpha.33](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.32...desktop-v0.14.0-alpha.33) (2026-08-10)

## [0.14.0-alpha.32](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.31...desktop-v0.14.0-alpha.32) (2026-08-10)

## [0.14.0-alpha.31](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.30...desktop-v0.14.0-alpha.31) (2026-08-10)

## [0.14.0-alpha.30](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.29...desktop-v0.14.0-alpha.30) (2026-08-10)

## [0.14.0-alpha.29](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.28...desktop-v0.14.0-alpha.29) (2026-08-10)

## [0.14.0-alpha.28](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.27...desktop-v0.14.0-alpha.28) (2026-08-09)

## [0.14.0-alpha.27](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.26...desktop-v0.14.0-alpha.27) (2026-08-09)

## [0.14.0-alpha.26](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.25...desktop-v0.14.0-alpha.26) (2026-08-09)

## [0.14.0-alpha.25](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.24...desktop-v0.14.0-alpha.25) (2026-08-09)

## [0.14.0-alpha.24](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.23...desktop-v0.14.0-alpha.24) (2026-08-09)

## [0.14.0-alpha.23](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.22...desktop-v0.14.0-alpha.23) (2026-08-09)

## [0.14.0-alpha.22](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.21...desktop-v0.14.0-alpha.22) (2026-08-09)

## [0.14.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.20...desktop-v0.14.0-alpha.21) (2026-08-09)

## [0.14.0-alpha.20](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.19...desktop-v0.14.0-alpha.20) (2026-08-09)

## [0.14.0-alpha.19](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.18...desktop-v0.14.0-alpha.19) (2026-08-09)

## [0.14.0-alpha.18](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.17...desktop-v0.14.0-alpha.18) (2026-08-09)

## [0.14.0-alpha.17](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.16...desktop-v0.14.0-alpha.17) (2026-08-09)

## [0.14.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.15...desktop-v0.14.0-alpha.16) (2026-08-09)

## [0.14.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.14...desktop-v0.14.0-alpha.15) (2026-08-09)

## [0.14.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.13...desktop-v0.14.0-alpha.14) (2026-08-09)

## [0.14.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.12...desktop-v0.14.0-alpha.13) (2026-08-08)

## [0.14.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.11...desktop-v0.14.0-alpha.12) (2026-08-08)

## [0.14.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.10...desktop-v0.14.0-alpha.11) (2026-08-08)

## [0.14.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.9...desktop-v0.14.0-alpha.10) (2026-08-08)

## [0.14.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.8...desktop-v0.14.0-alpha.9) (2026-08-08)

## [0.14.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.7...desktop-v0.14.0-alpha.8) (2026-08-08)

## [0.14.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.6...desktop-v0.14.0-alpha.7) (2026-08-08)

## [0.14.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.5...desktop-v0.14.0-alpha.6) (2026-08-07)

## [0.14.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.4...desktop-v0.14.0-alpha.5) (2026-08-07)

## [0.14.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.3...desktop-v0.14.0-alpha.4) (2026-08-07)

## [0.14.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.2...desktop-v0.14.0-alpha.3) (2026-08-07)

## [0.14.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.14.0-alpha.1...desktop-v0.14.0-alpha.2) (2026-08-07)

## [0.14.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.13.0...desktop-v0.14.0-alpha.1) (2026-08-06)

## [0.13.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.1...desktop-v0.13.0) (2026-08-05)

## [0.12.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.0...desktop-v0.12.1) (2026-08-04)

## [0.12.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.11.0...desktop-v0.12.0) (2026-08-04)

## [0.12.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.0-alpha.5...desktop-v0.12.0-alpha.6) (2026-08-04)

## [0.12.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.0-alpha.4...desktop-v0.12.0-alpha.5) (2026-08-04)

## [0.12.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.0-alpha.3...desktop-v0.12.0-alpha.4) (2026-08-04)

## [0.12.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.0-alpha.2...desktop-v0.12.0-alpha.3) (2026-08-04)

## [0.12.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.12.0-alpha.1...desktop-v0.12.0-alpha.2) (2026-08-04)

## [0.12.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.11.0...desktop-v0.12.0-alpha.1) (2026-08-04)

## [0.9.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.15...desktop-v0.9.0-alpha.16) (2026-08-04)

## [0.9.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.14...desktop-v0.9.0-alpha.15) (2026-08-04)

## [0.9.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.13...desktop-v0.9.0-alpha.14) (2026-08-04)

## [0.9.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.12...desktop-v0.9.0-alpha.13) (2026-08-03)

## [0.9.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.11...desktop-v0.9.0-alpha.12) (2026-08-03)

## [0.9.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.10...desktop-v0.9.0-alpha.11) (2026-08-03)

## [0.9.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.9...desktop-v0.9.0-alpha.10) (2026-08-03)

## [0.9.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.8...desktop-v0.9.0-alpha.9) (2026-08-03)

## [0.9.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.7...desktop-v0.9.0-alpha.8) (2026-08-03)

## [0.9.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.6...desktop-v0.9.0-alpha.7) (2026-08-03)

## [0.9.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.5...desktop-v0.9.0-alpha.6) (2026-08-03)

## [0.9.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.4...desktop-v0.9.0-alpha.5) (2026-08-03)

## [0.9.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.3...desktop-v0.9.0-alpha.4) (2026-08-03)

## [0.9.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.2...desktop-v0.9.0-alpha.3) (2026-08-03)

## [0.9.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.9.0-alpha.1...desktop-v0.9.0-alpha.2) (2026-08-03)

## [0.9.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.8.1...desktop-v0.9.0-alpha.1) (2026-08-03)

## [0.5.0-alpha.31](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.30...desktop-v0.5.0-alpha.31) (2026-08-02)

## [0.5.0-alpha.30](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.29...desktop-v0.5.0-alpha.30) (2026-08-02)

## [0.5.0-alpha.29](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.28...desktop-v0.5.0-alpha.29) (2026-08-02)

## [0.5.0-alpha.28](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.27...desktop-v0.5.0-alpha.28) (2026-08-02)

## [0.5.0-alpha.27](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.26...desktop-v0.5.0-alpha.27) (2026-08-02)

## [0.5.0-alpha.26](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.25...desktop-v0.5.0-alpha.26) (2026-08-02)

## [0.5.0-alpha.25](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.24...desktop-v0.5.0-alpha.25) (2026-08-01)

## [0.5.0-alpha.24](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.23...desktop-v0.5.0-alpha.24) (2026-08-01)

## [0.5.0-alpha.23](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.22...desktop-v0.5.0-alpha.23) (2026-08-01)

## [0.5.0-alpha.22](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.21...desktop-v0.5.0-alpha.22) (2026-08-01)

## [0.5.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.20...desktop-v0.5.0-alpha.21) (2026-08-01)

## [0.5.0-alpha.20](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.19...desktop-v0.5.0-alpha.20) (2026-08-01)

## [0.5.0-alpha.19](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.18...desktop-v0.5.0-alpha.19) (2026-08-01)

## [0.5.0-alpha.18](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.17...desktop-v0.5.0-alpha.18) (2026-07-31)

## [0.5.0-alpha.17](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.16...desktop-v0.5.0-alpha.17) (2026-07-31)

## [0.5.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.15...desktop-v0.5.0-alpha.16) (2026-07-31)

## [0.5.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.14...desktop-v0.5.0-alpha.15) (2026-07-30)

## [0.5.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.13...desktop-v0.5.0-alpha.14) (2026-07-30)

## [0.5.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.12...desktop-v0.5.0-alpha.13) (2026-07-30)

## [0.5.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.11...desktop-v0.5.0-alpha.12) (2026-07-30)

## [0.5.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.10...desktop-v0.5.0-alpha.11) (2026-07-30)

## [0.5.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.9...desktop-v0.5.0-alpha.10) (2026-07-30)

## [0.5.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.8...desktop-v0.5.0-alpha.9) (2026-07-30)

## [0.5.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.7...desktop-v0.5.0-alpha.8) (2026-07-30)

## [0.5.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.6...desktop-v0.5.0-alpha.7) (2026-07-30)

## [0.5.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.5...desktop-v0.5.0-alpha.6) (2026-07-30)

## [0.5.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.4...desktop-v0.5.0-alpha.5) (2026-07-29)

## [0.5.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.3...desktop-v0.5.0-alpha.4) (2026-07-29)

## [0.5.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.2...desktop-v0.5.0-alpha.3) (2026-07-29)

## [0.5.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.5.0-alpha.1...desktop-v0.5.0-alpha.2) (2026-07-29)

## [0.5.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.4.0...desktop-v0.5.0-alpha.1) (2026-07-29)

## [0.4.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/desktop-v0.4.0-alpha.1...desktop-v0.4.0-alpha.2) (2026-07-29)

## [0.4.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.3.1...desktop-v0.4.0-alpha.1) (2026-07-29)

## [0.4.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.3.1...desktop-v0.4.0) (2026-07-29)

## [0.3.1](https://github.com/nolotus/bun-nolo/compare/desktop-v0.3.0...desktop-v0.3.1) (2026-07-29)

## [0.3.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.2.0...desktop-v0.3.0) (2026-07-28)

## [0.2.0](https://github.com/nolotus/bun-nolo/compare/desktop-v0.1.21...desktop-v0.2.0) (2026-07-28)
