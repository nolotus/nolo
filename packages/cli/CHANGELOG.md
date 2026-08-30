
## 0.37.0-alpha.2

## 0.37.0-alpha.2 (2026-08-30)

### Bug Fixes

* **server:** SSR 渲染 bundle 预编译，修复 StyleX 上线引发的全站 500 ([b2c1dd9](https://github.com/nolotus/bun-nolo/commit/b2c1dd9c23d6b6b1745281725618ed5497f78a54))
* **tui:** consume attachedImages after send to stop cross-turn image accumulation ([40aa0e9](https://github.com/nolotus/bun-nolo/commit/40aa0e9ec5e486502fa99e94dba240b3916ed1ee))


## 0.37.0-alpha.1

## 0.37.0-alpha.1 (2026-08-30)

### Features

* **cli:** add thinking display toggle ([83fac87](https://github.com/nolotus/bun-nolo/commit/83fac873ddc5898cc2b4c3e33b91469c502a95cb))

### Bug Fixes

* **billing:** dedupe dialog usage projection ([e1cd922](https://github.com/nolotus/bun-nolo/commit/e1cd922e3931aebfcd3dec0b140df74722a4d999))
* **chat:** surface real upstream cause in PLATFORM_LLM_BUSY errors ([4a61d73](https://github.com/nolotus/bun-nolo/commit/4a61d7355dca1e53de976e8802eb84813ad022ef))


## 0.36.0-alpha.2

## 0.36.0-alpha.2 (2026-08-29)

### Bug Fixes

* **tui:** ask_user 面板变高时逐增量滚动，避免覆盖上方消息 ([ebb8ec0](https://github.com/nolotus/bun-nolo/commit/ebb8ec0885412982c0bcbc850fcf98a1a8b220e6))


## 0.36.0-alpha.1

## 0.36.0-alpha.1 (2026-08-29)

### Features

* **agent-runtime:** ProcessTask 层 Envelope 预登记与追加式事件表 ([436cecf](https://github.com/nolotus/bun-nolo/commit/436cecf64e9e9af172a8d05e5e05574036ba8c18))

### Bug Fixes

* **agent-runtime:** 收紧 ask_user 触发判据，止住把执行决策推给用户 ([de76b79](https://github.com/nolotus/bun-nolo/commit/de76b79de1c9cc2a9c23effd7190d7c97161b1a0))
* **cli:** make Windows self-update safe ([1694ac2](https://github.com/nolotus/bun-nolo/commit/1694ac29a84593e9b57437a239d6dd343687dcef))


## 0.35.0-alpha.1

## 0.35.0-alpha.1 (2026-08-29)

### Features

* **agent-runtime:** localLoop 无进展熔断，止住模型复读空转 ([0c27832](https://github.com/nolotus/bun-nolo/commit/0c27832d027f9b44b660ec09e8ac7de55b51c753))


## 0.34.0-alpha.3

## 0.34.0-alpha.3 (2026-08-29)

### Bug Fixes

* **cli:** 后台 run 输出被截断时结算为 failed，不再假成功 ([95b33be](https://github.com/nolotus/bun-nolo/commit/95b33bea0fc8950eaf6197c9c5ca0544ea61ab78))


## 0.34.0-alpha.2

## 0.34.0-alpha.2 (2026-08-29)

### Bug Fixes

* **cli:** run 报告默认不写盘，supervise/环境变量按需生成 ([7e4b560](https://github.com/nolotus/bun-nolo/commit/7e4b5609fd0569d0f68f071f7a5365d688abd6c1))
* **cli:** run 验收报告补子 agent 产出与结果指引，门控误导性 git 摘要 ([ccccb0d](https://github.com/nolotus/bun-nolo/commit/ccccb0d4e267dfb61c566c22cef4b189c046b9af))
* **cli:** 后台子进程入口存在性校验，坏入口回退默认解析 ([53b0b11](https://github.com/nolotus/bun-nolo/commit/53b0b11b74b86edc68126798ef8ace0bd6539c5c))
* **runtime:** length 截断时把 reasoning 尾部落盘，不再整轮丢失 ([23909e5](https://github.com/nolotus/bun-nolo/commit/23909e5228c4c7ce24220790b479c8351fa69faf))
* **tui:** 终态唤醒投递时刻复核 ack，杜绝已消费 run 的重复通知 ([c3d8c17](https://github.com/nolotus/bun-nolo/commit/c3d8c17060f7f3e743545056b95a0840e6543e8d))


## 0.34.0-alpha.1

## 0.34.0-alpha.1 (2026-08-28)

### Features

* **context:** add old tool-output stub tier for local auto-compaction ([f939b24](https://github.com/nolotus/bun-nolo/commit/f939b247cadf690ed038ad6b6271091856463895))
* **context:** emit compaction observation event with TUI summary line ([466570e](https://github.com/nolotus/bun-nolo/commit/466570ebadc17ce60a1cfc9354ff7d9a56523e30))
* **context:** validate dialog summary with source hash ([aaaab24](https://github.com/nolotus/bun-nolo/commit/aaaab24c03b60d2a9f5d04524e83a12ad2a8835e))
* **context:** version dialog summary records for invalidation ([2241683](https://github.com/nolotus/bun-nolo/commit/2241683544acd04e057fe6fcf48256bc7194c84f))
* **tui:** add /auto <on|off> session switch to skip permission confirms ([a332e85](https://github.com/nolotus/bun-nolo/commit/a332e8506f9e63a1f2e536e691247e5ac3646d77))

### Bug Fixes

* **context:** honor persisted stub across non-compaction turns and stop double-counting stubbed savings ([98ecf26](https://github.com/nolotus/bun-nolo/commit/98ecf262390ab688ab81f2392814d07ea93c8651))
* **context:** treat malformed schema version as invalid summary ([7f2573d](https://github.com/nolotus/bun-nolo/commit/7f2573d43712330fbb920e8a3385ab2dc4972b29))
* **context:** wire invalid_summary reason and event-only token numbers ([a92840f](https://github.com/nolotus/bun-nolo/commit/a92840f1ed95e4563a26c7c115ecd8d1d6df1c5c))

## [0.33.0-alpha.34](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.33...cli-v0.33.0-alpha.34) (2026-08-28)

### Features

* **release:** append-only mirror sync, dual-repo audit reconciliation, publish gate ([4410e8d](https://github.com/nolotus/bun-nolo/commit/4410e8d51b66bf6fd0cd9347823659ae433d12b5))

## [0.33.0-alpha.33](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.32...cli-v0.33.0-alpha.33) (2026-08-28)

### Bug Fixes

* **ai:** mark GLM 5.3 and GLM 5.3 Flash as vision-capable and normalize aliases ([d27cdb4](https://github.com/nolotus/bun-nolo/commit/d27cdb40aa925937b77fe5614f359ea836776c03))

## [0.33.0-alpha.32](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.31...cli-v0.33.0-alpha.32) (2026-08-28)

### Features

* **agent-runtime:** share execution observation vocabulary between server and local loops ([d2577e2](https://github.com/nolotus/bun-nolo/commit/d2577e24a3939ac8b2880c8850bd4bc707c1d296))
* **agent:** spike live model PTC dispatch ([c1b2971](https://github.com/nolotus/bun-nolo/commit/c1b2971414b6a474f7701805f8c6cf4b9ab842a6))
* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** enhance cross-platform response layout guidelines for TUI/Web/RN ([bfc0fc5](https://github.com/nolotus/bun-nolo/commit/bfc0fc58bb46e042000bd8b8edd0e4c00b659d30))
* **ai:** support viewport and isMobile context passthrough for TUI and narrow-screen guidelines ([589aa57](https://github.com/nolotus/bun-nolo/commit/589aa578509fbb0b0e6544a109490a7dd5265210))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([2750b45](https://github.com/nolotus/bun-nolo/commit/2750b4594ce75874c70c8b298c6f263dafd38c41))
* **app:** 冲浪 widget M1——明日浪况卡（双月湾三时段浪/风/潮） ([26e2eb8](https://github.com/nolotus/bun-nolo/commit/26e2eb8a54438e955b2c4e7c991b804ab8dd566d))
* **app:** 增加明日冲浪决策信息 ([60b1fa6](https://github.com/nolotus/bun-nolo/commit/60b1fa615b4298e777332864f379bc3453aa6cb5))
* **app:** 增加浪点海岸方向与风况关系 ([49e2614](https://github.com/nolotus/bun-nolo/commit/49e261416743ac535401e40a6df7545f3cf8655f))
* **app:** 增加首页 widget 添加目录 ([68f2972](https://github.com/nolotus/bun-nolo/commit/68f29722be67cd8553abc723c461f5e6aee8487a))
* **app:** 支持冲浪 widget 配置个人浪点 ([dd7e2ef](https://github.com/nolotus/bun-nolo/commit/dd7e2ef750212b1c83b471149e726542bf5e1348))
* **app:** 让冲浪 widget 由用户主动添加 ([11dc8e5](https://github.com/nolotus/bun-nolo/commit/11dc8e55e93c7aab2e75d8ab864ce4e8ef9289f7))
* **chat:** add append instruction control UI to child run observer panel ([957fc82](https://github.com/nolotus/bun-nolo/commit/957fc828502dec97130c9f7ffbfe01bd6268270e))
* **cli-tui:** 图片附件超阈值时自动等比压缩 ([3ee1797](https://github.com/nolotus/bun-nolo/commit/3ee179750d90d221bf56380552d12293c3117b9a))
* **cli-tui:** 支持剪贴板截图粘贴与 file://、WSL 路径拖拽 ([696a502](https://github.com/nolotus/bun-nolo/commit/696a502cdc9e3dccb8deecdd5c76906a1bc9e9ea))
* **cli:** controlAgentRun 补上 append action（终态续跑） ([4af854b](https://github.com/nolotus/bun-nolo/commit/4af854bf1216746dcf9451617df243533d05f153))
* **cli:** 工程化 agent supervise 无人值守监督器 ([5502be2](https://github.com/nolotus/bun-nolo/commit/5502be227e2dccd5b17b9a79f4c222ae93f9da7c))
* **cli:** 本地 run 终态自动生成验收报告 ([57b1b01](https://github.com/nolotus/bun-nolo/commit/57b1b0156cb2495b0e00f91c3403416b13ab0ac0))
* **legal:** add content safety, disclaimer and breach sections to terms ([5ff1223](https://github.com/nolotus/bun-nolo/commit/5ff1223318d883832be30efa37f38753da448b30))
* **platform:** launch GLM 5.3 Flash on nolo provider (RunInfra upstream) ([18dbeb2](https://github.com/nolotus/bun-nolo/commit/18dbeb221c119a000540db38521b7dbd4296c9c9))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
* **stylex:** 政策页三页试点迁移至 policyPageStyles ([f0cccfa](https://github.com/nolotus/bun-nolo/commit/f0cccfa9995d4d26b7e711d6d4bd595151e74a38))
* **tui:** add ctrl+c copy/clear/exit safety, /copy command and accelerated scrolling ([330954a](https://github.com/nolotus/bun-nolo/commit/330954aed01544459609598fad720881b2d75a0f))
* **tui:** follow terminal-native colors ([6c0dfa4](https://github.com/nolotus/bun-nolo/commit/6c0dfa4419d23e23d8f34201df4d554322013179))
* **tui:** markdown 表格改为真实终端表格渲染 ([e340736](https://github.com/nolotus/bun-nolo/commit/e3407368cdad592df41d8ec2726f7514f97e7c48))
* **tui:** 增加 Markdown 数学公式终端渲染 ([61762b9](https://github.com/nolotus/bun-nolo/commit/61762b97e07f64949c494a2f6cd24dfbf2e3d221))

### Bug Fixes

* **agent-runtime:** isolate cursor workspace primitives ([ab81bfa](https://github.com/nolotus/bun-nolo/commit/ab81bfa811627d8a4244e401a856fca93d7d1dd6))
* **agent-runtime:** merge cursor workspace boundary ([6fc95be](https://github.com/nolotus/bun-nolo/commit/6fc95be87cef410a3bd6a90db4ce536984331a28))
* **agent-runtime:** restore internal workspace primitives for cursor exec and app search ([5871fd2](https://github.com/nolotus/bun-nolo/commit/5871fd2c9ebfd2a3f4f8351650deb7e81d838c6c))
* **agent-runtime:** surface SKILL.md frontmatter YAML failures and repair nolo-plan indentation ([38e1427](https://github.com/nolotus/bun-nolo/commit/38e1427cd9d29091e45551937615ce42b2ea3b5f))
* **agent:** allow reasoning-only empty turns to repair up to cap ([aab9037](https://github.com/nolotus/bun-nolo/commit/aab9037cb8fc3dba6b74db59f7cae404eaf0a855))
* **agent:** include private agents in expert discovery ([bbfeeec](https://github.com/nolotus/bun-nolo/commit/bbfeeec0649e907dc56d050086c40af8a25ab354))
* **ai:** show provider reasoning effort options ([49ae066](https://github.com/nolotus/bun-nolo/commit/49ae066dfbd2cb508b645b1163c6b01c3e868e89))
* **app:** 修复冲浪 widget 永远加载问题 ([e1ec894](https://github.com/nolotus/bun-nolo/commit/e1ec89438beca06b33d3664afc76005a1434be70))
* **chat:** sanitize outbound text content to prevent UPSTREAM_400 ([82bcb09](https://github.com/nolotus/bun-nolo/commit/82bcb0960b1dae8bc9b5145e324ad64dacc2067f))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **cli:** readDialog 失败输出 attempts 明细与 next-step，读路径候选补本地 origin ([068a328](https://github.com/nolotus/bun-nolo/commit/068a328bbcb79c155bc237689354e5b86dd1daa2))
* **cli:** 修复 429 冷却把可用凭证锁死的三个缺陷 ([2208486](https://github.com/nolotus/bun-nolo/commit/220848659a8061e24f41644873c6e19e1f749ce3))
* **models:** GLM Flash contextWindow 修至官方精确值并钉死缓存命中计费语义 ([336cf37](https://github.com/nolotus/bun-nolo/commit/336cf3753e459ce6c9385a58080a5b9db218ff4e))
* **models:** 修正 GLM Flash 平台托管模型 context 窗口与 TUI credits 单位换算 ([be18e4f](https://github.com/nolotus/bun-nolo/commit/be18e4fa29d0848dfdfd13a5191a60d1e7cb123e))
* **release:** treat equal CLI version as idempotent no-op ([46eec17](https://github.com/nolotus/bun-nolo/commit/46eec174b7396df710a2fed0ad9bd8cd8e65e438))
* **seed:** 修复出图模型定价查询崩溃并将公共档 seed 定义收敛至 core 唯一真值 ([ece9b66](https://github.com/nolotus/bun-nolo/commit/ece9b66e43fc0a9ad5d29ad9df3a8e03e7f50ea6))
* **surf:** 收口潮汐代理与冲浪数据边界 ([4785f14](https://github.com/nolotus/bun-nolo/commit/4785f14731e4f497c0e1d3237716b80795070750))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([c33af41](https://github.com/nolotus/bun-nolo/commit/c33af414bf159fa0393b7160babac05b62d2eabc))
* **tui:** drain composer decoder on ask_user close via workspace hook ([b149133](https://github.com/nolotus/bun-nolo/commit/b149133ee3d78faf2496a8d320d2e24616baf68e))
* **tui:** include ollama-cloud in stream usage whitelist ([bbc3572](https://github.com/nolotus/bun-nolo/commit/bbc3572e5d5d49ab2bd189b8528fe6e8d8f79898))
* **tui:** markdown 表格 inline 标记跨行残留与 ambiguous 字符框线错位 ([a63c1f3](https://github.com/nolotus/bun-nolo/commit/a63c1f38a0a131423963884d76946366d2fb6cb1))
* **tui:** 修复滚轮批量鼠标报告被误判为取消 ([d4f6d9c](https://github.com/nolotus/bun-nolo/commit/d4f6d9c3d022df5104da2f6eb88ec892bb40bed7))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))

### Performance Improvements

* **cli-tui:** 消除 displayWidth 的逐字素簇宽度计算，滚动帧提速约 200 倍 ([2979d90](https://github.com/nolotus/bun-nolo/commit/2979d90f06d8450800f144101faccfb4120ff088))
* **cli:** bound history restore to a limited getConvMsgs fetch ([115f307](https://github.com/nolotus/bun-nolo/commit/115f3072a4f452cf779e307560b28f05b7e3b93c))
* **cli:** skip redundant meta fetch when restoring dialog history ([ce28faa](https://github.com/nolotus/bun-nolo/commit/ce28faa3d4fe1a01eecefa1fb404431921476996))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([5dd2be7](https://github.com/nolotus/bun-nolo/commit/5dd2be72a00b81224d021ca9dd1b6fffe26ae8df))
* **tui:** 给会话历史与渲染缓存加上内存硬上界 ([6bca8c6](https://github.com/nolotus/bun-nolo/commit/6bca8c60da512a98ac1e68d6b46d32a903d03d15))

## [0.33.0-alpha.32](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.31...cli-v0.33.0-alpha.32) (2026-08-25)

### Features

* **ai:** Claude 全系统一 ×9 ([196ca40](https://github.com/nolotus/bun-nolo/commit/196ca409a32fa60766f9b0432181580074c08340))
* **ai:** 计费系数收敛，消除负毛利档位 ([57bc1a8](https://github.com/nolotus/bun-nolo/commit/57bc1a87f56de03cac73730983dfdd109c029f18))
* **app:** 充值页重做并按通道费重算档位 ([1b994ba](https://github.com/nolotus/bun-nolo/commit/1b994ba5b2adce78536b92ec18f155cdb0143d5b))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([2d19bd4](https://github.com/nolotus/bun-nolo/commit/2d19bd4d0e36f72e6dc42834e04a1c8dc88bbc1b))
* **server:** wire queryModelUsage prefixChurn diagnostic ([6ecc886](https://github.com/nolotus/bun-nolo/commit/6ecc886cff4a8f2bd0bdc6c510045f3d9beb7f0b))

### Bug Fixes

* **agent:** allow reasoning-only empty turns to repair up to cap ([b898ebd](https://github.com/nolotus/bun-nolo/commit/b898ebd7cd97836ba08c5f4c5df608d4a9fb1800))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **release:** treat equal CLI version as idempotent no-op ([7a53855](https://github.com/nolotus/bun-nolo/commit/7a538550b0bf847a327b59d51d99af6944834688))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([d7d6932](https://github.com/nolotus/bun-nolo/commit/d7d69323aeba64f3ece3315365924cfcc9bc8266))
* **tui:** drain composer decoder on ask_user close via workspace hook ([db6d072](https://github.com/nolotus/bun-nolo/commit/db6d07222a48bddf3212000fba355702030353ad))
* **tui:** include ollama-cloud in stream usage whitelist ([f5de4eb](https://github.com/nolotus/bun-nolo/commit/f5de4ebed17c05a61a22d67d08817eb9b3c63245))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))

### Performance Improvements

* **cli:** bound history restore to a limited getConvMsgs fetch ([21424c8](https://github.com/nolotus/bun-nolo/commit/21424c847a8c3dd5aa73633e6bcf4f82b3ecf242))
* **cli:** skip redundant meta fetch when restoring dialog history ([f403954](https://github.com/nolotus/bun-nolo/commit/f403954f6980971789c186f935864eb991cc1ee2))

## [0.33.0-alpha.32](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.31...cli-v0.33.0-alpha.32) (2026-08-25)

### Bug Fixes

* **agent:** allow reasoning-only empty turns to repair up to cap ([b898ebd](https://github.com/nolotus/bun-nolo/commit/b898ebd7cd97836ba08c5f4c5df608d4a9fb1800))
* **cli:** oversample picker dialog query before scheduled filter ([7e89e38](https://github.com/nolotus/bun-nolo/commit/7e89e38c7453d2d1a07e2b9592b4506ecf4b79ef))
* **cli:** pass dialogKey to getConvMsgs and cap dialog list query ([01dff1e](https://github.com/nolotus/bun-nolo/commit/01dff1e1ebd2ab51c8290b021a560da41e311e25))
* **tui:** /pick 切换对话时清空对话累计积分，避免残留旧值 ([d7d6932](https://github.com/nolotus/bun-nolo/commit/d7d69323aeba64f3ece3315365924cfcc9bc8266))
* **tui:** drain composer decoder on ask_user close via workspace hook ([db6d072](https://github.com/nolotus/bun-nolo/commit/db6d07222a48bddf3212000fba355702030353ad))
* **tui:** 状态行积分显示整个对话累计而非本轮 ([afbf6c5](https://github.com/nolotus/bun-nolo/commit/afbf6c586a2d7b861d7f2e37d52a96afd4ea85b5))

### Performance Improvements

* **cli:** bound history restore to a limited getConvMsgs fetch ([21424c8](https://github.com/nolotus/bun-nolo/commit/21424c847a8c3dd5aa73633e6bcf4f82b3ecf242))
* **cli:** skip redundant meta fetch when restoring dialog history ([f403954](https://github.com/nolotus/bun-nolo/commit/f403954f6980971789c186f935864eb991cc1ee2))

## [0.33.0-alpha.31](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.30...cli-v0.33.0-alpha.31) (2026-08-25)

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

## [0.33.0-alpha.30](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.29...cli-v0.33.0-alpha.30) (2026-08-24)

### Bug Fixes

* **chat:** stabilize platform proxy critical path ([ac58f2c](https://github.com/nolotus/bun-nolo/commit/ac58f2c798ae130750bebd954e93f648ef309050))

## [0.33.0-alpha.29](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.28...cli-v0.33.0-alpha.29) (2026-08-24)

### Features

* **cli:** faster custom-provider agent creation (models + create --verify + api-key alias) ([d91018d](https://github.com/nolotus/bun-nolo/commit/d91018d5c2dd30a979da22b627da64f307969837))

## [0.33.0-alpha.28](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.27...cli-v0.33.0-alpha.28) (2026-08-24)

### Bug Fixes

* **tui:** 修复流式输出时触控板滚动打断流并泄漏乱码 ([d4b8288](https://github.com/nolotus/bun-nolo/commit/d4b8288a60fa05bee562b3861f22ef208e6475ad))

## [0.33.0-alpha.27](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.26...cli-v0.33.0-alpha.27) (2026-08-24)

### Features

* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([e189424](https://github.com/nolotus/bun-nolo/commit/e1894241ae56eb7b58136d0ee297e959285e1628))

### Bug Fixes

* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([803cb94](https://github.com/nolotus/bun-nolo/commit/803cb94c7bb583e78638957cfef1831c1ee3f6d0))
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))

## [0.33.0-alpha.26](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.25...cli-v0.33.0-alpha.26) (2026-08-24)

### Features

* **ai:** optimize responsive layout prompt guidelines for TUI and narrow viewports ([b0e473e](https://github.com/nolotus/bun-nolo/commit/b0e473e6166a967da490ad2a1dd8f7718efabedb))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))

### Bug Fixes

* **cli:** persist 429 cooldown on the openai-compatible and platform-proxy paths ([5cec9b9](https://github.com/nolotus/bun-nolo/commit/5cec9b99f8c97e5943280b23c4d8f3cdfe9da878))

## [0.33.0-alpha.25](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.24...cli-v0.33.0-alpha.25) (2026-08-24)

### Features

* **ai:** add writingScore ability and Gemini 3.7 Flash routing guide ([4303e2d](https://github.com/nolotus/bun-nolo/commit/4303e2de7e43beb383853ffcef0863160eba92af))

## [0.33.0-alpha.24](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.23...cli-v0.33.0-alpha.24) (2026-08-24)

### Bug Fixes

* **tui:** remove redundant copy view ([56f72bb](https://github.com/nolotus/bun-nolo/commit/56f72bb504349e14ed136dc235e6b622881475f5))

## [0.33.0-alpha.23](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.22...cli-v0.33.0-alpha.23) (2026-08-24)

### Features

* **agent-runtime:** wire real local PTC vertical slice through runLocalAgentTurn ([a3d7ab7](https://github.com/nolotus/bun-nolo/commit/a3d7ab7c1a5c1abff223bab542697458280c1e52))

### Bug Fixes

* **tui:** harden mouse selection edge cases ([047af6d](https://github.com/nolotus/bun-nolo/commit/047af6d546bed57ef3192a94f2e02e49c91818d2))

## [0.33.0-alpha.22](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.21...cli-v0.33.0-alpha.22) (2026-08-24)

### Bug Fixes

* **tui:** align mouse selection highlight and copy ([5eeee03](https://github.com/nolotus/bun-nolo/commit/5eeee03cbaea4cbeb307ac300a433631658da74f))

## [0.33.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.20...cli-v0.33.0-alpha.21) (2026-08-23)

### Bug Fixes

* **agent-runtime:** bridge abort signal and enforce runtime module isolation in quickjs spike ([ef6d17f](https://github.com/nolotus/bun-nolo/commit/ef6d17fde8ee177264c018acc00806b1340a77d9))
* **tui:** adopt standard 2D grid selection model and fix discontinuous highlights ([c869056](https://github.com/nolotus/bun-nolo/commit/c869056f72b0911e896249f1951bd7eb6e64b394))
* **tui:** align assistant plain char index and breathing blank lines in source mapping ([f62450a](https://github.com/nolotus/bun-nolo/commit/f62450adc2286e6996960b68b0bb2e801ef439e5))
* **tui:** fix continuation row prefixWidth in wrapTranscriptLineWithLayout ([2acdf01](https://github.com/nolotus/bun-nolo/commit/2acdf01af2197f3d7ff6e5b4e1500f5a4819b01b))
* **tui:** fix separator hit-test and retain selection highlight on mouse release ([49a49de](https://github.com/nolotus/bun-nolo/commit/49a49de9e0816b3d74e89d2bb0770445bfdbbd0f))
* **tui:** make mouse selection character-precise ([cdbe6a1](https://github.com/nolotus/bun-nolo/commit/cdbe6a100e44fbe0a4a5586304bab20a04614f10))
* **tui:** support mouse drag selection and auto-scroll across live streaming turns ([5ad29cd](https://github.com/nolotus/bun-nolo/commit/5ad29cd576baea1094f485aa306bae38dd618c54))

## [0.33.0-alpha.20](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.19...cli-v0.33.0-alpha.20) (2026-08-23)

### Features

* **agent-runtime:** add PTC fail-closed context and QuickJS feasibility spike ([1b60773](https://github.com/nolotus/bun-nolo/commit/1b60773620c1c7117c6db214fe9c05abb58faa97))
* **tui:** add native-feeling drag selection ([73ccc9c](https://github.com/nolotus/bun-nolo/commit/73ccc9ce6099bf9bc3841238cabcbc30d8dc5fd8))

## [0.33.0-alpha.19](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.18...cli-v0.33.0-alpha.19) (2026-08-23)

### Features

* **agent-runtime:** wire live CapabilitySdk and PTC v0 program validation ([d44c6f7](https://github.com/nolotus/bun-nolo/commit/d44c6f76de911201504835b7f7647f2679688f2a))

## [0.33.0-alpha.18](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.17...cli-v0.33.0-alpha.18) (2026-08-23)

### Bug Fixes

* **cli:** re-resolve antigravity oauth token per request and retry once on 401 ([dbd4b48](https://github.com/nolotus/bun-nolo/commit/dbd4b48164c3e5f5cebabc0b74e7efd3ebc74574))
* **tui:** restore stable fullscreen behavior and text copying ([292351d](https://github.com/nolotus/bun-nolo/commit/292351dab921e59e5ebcdd0dc57381c93d5a7e00))
* **tui:** stop fullscreen history repaint on main screen ([262e382](https://github.com/nolotus/bun-nolo/commit/262e38208bda23ab583e7cb3c78ab0e42b8a920d))

## [0.33.0-alpha.17](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.16...cli-v0.33.0-alpha.17) (2026-08-23)

### Features

* **agent-runtime:** add local PTC capability sdk spike harness ([3faa5ad](https://github.com/nolotus/bun-nolo/commit/3faa5addf7fa0a84ce9c7727ac54dfe50a06abd4))
* **agent-runtime:** construct local capability sdk for host reachability ([6a7e468](https://github.com/nolotus/bun-nolo/commit/6a7e46887487e2768f901acc48b0d569a7556b85))

### Bug Fixes

* **cli:** prevent history line overlap by isolating renderHistory to alternate screen ([0d17677](https://github.com/nolotus/bun-nolo/commit/0d17677b35cfe251c1f31ea8bb3834aeb83e2c87))

## [0.33.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.15...cli-v0.33.0-alpha.16) (2026-08-23)

### Features

* **cli:** support native terminal scrollback and direct turn commit ([8356782](https://github.com/nolotus/bun-nolo/commit/8356782cde1e3d0a0400915c2cd74b3a8ec202f6))

### Bug Fixes

* **cli:** guard TTY-only reset sequence in restoreAltScreen ([b2e58c5](https://github.com/nolotus/bun-nolo/commit/b2e58c565a41acc50a83dd114ed0fcf0832e5f8b))

## [0.33.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.14...cli-v0.33.0-alpha.15) (2026-08-23)

### Bug Fixes

* **cli:** self-heal mid-stream upstream deaths instead of failing the turn ([a1173b7](https://github.com/nolotus/bun-nolo/commit/a1173b73aae2429c588038eda06c3ec1b142a9e9))

## [0.33.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.13...cli-v0.33.0-alpha.14) (2026-08-22)

### Bug Fixes

* **ai:** align DeepSeek peak/off-peak billing with weekend all-day off-peak ([e947ba1](https://github.com/nolotus/bun-nolo/commit/e947ba14dbed4cc4bb206f9c0d84a9ff2fc2d06a))

## [0.33.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.12...cli-v0.33.0-alpha.13) (2026-08-22)

### Bug Fixes

* **chat:** suppress composer enter on active modal and restore focus on turn finish ([e5716aa](https://github.com/nolotus/bun-nolo/commit/e5716aa5116bf4764e10b9180b16704684d53ec7))

## [0.33.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.11...cli-v0.33.0-alpha.12) (2026-08-22)

### Features

* **memory:** support user-scoped memory deletion with two-stage confirmation ([83d59cd](https://github.com/nolotus/bun-nolo/commit/83d59cd7a9cf369a2d1d569937972f560a04e0a6))

## [0.33.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.10...cli-v0.33.0-alpha.11) (2026-08-22)

### Bug Fixes

* **agent-runtime:** evaluate destructive shell guard in executeLocalToolWithPolicy ([8b8bea2](https://github.com/nolotus/bun-nolo/commit/8b8bea2a5d52347c8f7880dc3ff71ab49e050e82))
* **cli:** audit and guard agent-selection writes ([bc74b90](https://github.com/nolotus/bun-nolo/commit/bc74b9018ff86f343db4b37d0d3179f8ade6bbf8))
* **runtime:** keep local state under NOLO_HOME so tests stop writing the real home ([e7d1f88](https://github.com/nolotus/bun-nolo/commit/e7d1f88378857377607d2ec76b8704c6df78a03d))

### Performance Improvements

* **cli:** double buffering diffing for tui render ([58103c7](https://github.com/nolotus/bun-nolo/commit/58103c79d477f0ef8d43b2be35dcc37e7a380ec1))

## [0.33.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.9...cli-v0.33.0-alpha.10) (2026-08-22)

### Bug Fixes

* **cli:** complete resetHistoryFrameDiffCache import in readlineWorkspace ([a46aa15](https://github.com/nolotus/bun-nolo/commit/a46aa15e2d441058630778420c2defda28fc5ca9))

### Performance Improvements

* **cli:** double buffering diffing for tui render ([9d37cb1](https://github.com/nolotus/bun-nolo/commit/9d37cb1b5590b6ca556e7b1d63abccd845592b39))

## [0.33.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.8...cli-v0.33.0-alpha.9) (2026-08-22)

### Features

* **models:** add GLM 5.3 preset, delist Kimi, and deduplicate Gemini ([b8bd7b6](https://github.com/nolotus/bun-nolo/commit/b8bd7b694e3d50b2ff243870435d24264eb7288c))
* **orchestration:** promote multi-agent deliberation to system layer and clean up redundant presets ([3e37d6a](https://github.com/nolotus/bun-nolo/commit/3e37d6a924fa214f2c9e4ed477452b72f8268a3d))

## [0.33.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.7...cli-v0.33.0-alpha.8) (2026-08-22)

### Bug Fixes

* **chat-proxy:** 内置 agent 路由由服务端定夺，删掉 provider=nolo 的兜底 key ([619c390](https://github.com/nolotus/bun-nolo/commit/619c390288a81d57fd2bd3abd0eaeac426763d79))

## [0.33.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.6...cli-v0.33.0-alpha.7) (2026-08-22)

### Features

* **auth:** 鉴权失败分钟级计数，让部署窗口的 401 第一次可见 ([5593d75](https://github.com/nolotus/bun-nolo/commit/5593d754b7b361bbdd9a0e15e8d03c3a59b961ef))

## [0.33.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.5...cli-v0.33.0-alpha.6) (2026-08-22)

### Bug Fixes

* **release:** verify compressed desktop manifests ([8ef7777](https://github.com/nolotus/bun-nolo/commit/8ef77778c78eaabea96f55302b38e44a55ad556f))

## [0.33.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.4...cli-v0.33.0-alpha.5) (2026-08-22)

### Bug Fixes

* **desktop:** align installed smoke with standalone runtime ([8f6257d](https://github.com/nolotus/bun-nolo/commit/8f6257db20be1d8791c8ad262fd29a7d7a6e7f1a))

## [0.33.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.3...cli-v0.33.0-alpha.4) (2026-08-22)

### Bug Fixes

* **desktop:** pass runtime route map directly to Bun serve ([f1f06f1](https://github.com/nolotus/bun-nolo/commit/f1f06f178fcadcbd947326161202ccbf9b5088ca))

## [0.33.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.2...cli-v0.33.0-alpha.3) (2026-08-22)

### Bug Fixes

* **desktop:** accept verified compact alpha installers ([5fe2edf](https://github.com/nolotus/bun-nolo/commit/5fe2edfc4794625149b2c02aec5acab479cc64e4))
* **release:** tolerate npm package processing delay ([43df49e](https://github.com/nolotus/bun-nolo/commit/43df49e841f5b8f11d84859b507169fed8f42827))

## [0.33.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.33.0-alpha.1...cli-v0.33.0-alpha.2) (2026-08-22)

### Bug Fixes

* **cli:** include manifest-less relative sources in publish artifacts ([e5a66be](https://github.com/nolotus/bun-nolo/commit/e5a66be93f155e8b69d99342f6b4cb2c9865e341))
* **desktop:** resolve runtime sibling imports in clean builds ([c84d13e](https://github.com/nolotus/bun-nolo/commit/c84d13ed34f535210bed7fd51c251c553ecf4c09))

## [0.33.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.32.0-alpha.12...cli-v0.33.0-alpha.1) (2026-08-22)

### Features

* **admin:** failure report for usage management (管理后台失败统计) ([0f00ad4](https://github.com/nolotus/bun-nolo/commit/0f00ad41641fab2baade80a780401d8c6669d47d))
* **agent-run:** add Effect execution kernel for background runs ([dff3608](https://github.com/nolotus/bun-nolo/commit/dff360862604dd7a292301e19420a53565c2890e))
* **agent:** public agent catalog consistency audit and verifier ([9229a55](https://github.com/nolotus/bun-nolo/commit/9229a553eff6944ef80e6099d032f33ecafcee95))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([cde351f](https://github.com/nolotus/bun-nolo/commit/cde351ff91751165d0d778ec3f4b8a29e0548a34))
* **agent:** support Z.AI and BigModel GLM coding plan subscriptions in create agent presets ([fa14fda](https://github.com/nolotus/bun-nolo/commit/fa14fdac850302bebafd6b35e295b24a5d7a662a))
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
* **life:** switch usage dashboard and records to server-authoritative API ([a4288e0](https://github.com/nolotus/bun-nolo/commit/a4288e0aec0e4fefad73e038f3500281b5ac3188))
* **life:** switch usage dashboard and records to server-authoritative API ([f7a793f](https://github.com/nolotus/bun-nolo/commit/f7a793f6808db5059bfc726415953a98dee408a9))
* **nolo:** switch defaults to DeepSeek vision model ([700e9b3](https://github.com/nolotus/bun-nolo/commit/700e9b34accd4aa6e64cf7e10c18df5bd757aa1a))
* **nolo:** 内置 agent 运行时字段由代码托管，各端默认档统一指向 nolo ([5e23793](https://github.com/nolotus/bun-nolo/commit/5e2379334a368e5ba4a006b4e0f573765f86426a))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([4f6cc31](https://github.com/nolotus/bun-nolo/commit/4f6cc31f74c2b6432a689564a7ec1d79e059e585))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))

### Bug Fixes

* **agent-runtime:** normalize Responses tool call arguments ([9a1420e](https://github.com/nolotus/bun-nolo/commit/9a1420e6ce767f5469b62d12d151399954b6c859))
* **agent-runtime:** parse platform chat completion body and SSE chunks by payload shape ([d8e52b3](https://github.com/nolotus/bun-nolo/commit/d8e52b3b83541c9bc52a923ba65f8ff773393e09))
* **agent-runtime:** preserve local run results and streaming output ([4165aa2](https://github.com/nolotus/bun-nolo/commit/4165aa205025840fa0dcca681f509e1eabc15184))
* **agent-runtime:** support custom provider OpenAI Responses wire and endpoint resolution ([ac34a10](https://github.com/nolotus/bun-nolo/commit/ac34a109cb6b021298a61c7aea79b90ae76c52d8))
* **agent:** support images for text-only models across web, desktop, rn and tui ([47ce781](https://github.com/nolotus/bun-nolo/commit/47ce781cfaa320a06eb32d40cb08ab0981b0d112))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([1ab7fc7](https://github.com/nolotus/bun-nolo/commit/1ab7fc719e488e8e1324ee67205d8b955e4ea7c6))
* **app:** bypass identity re-export for useDeleteOwnAccountFlow ([80887e6](https://github.com/nolotus/bun-nolo/commit/80887e6f8ff549a272d805e6e33e1cc47fc6651e))
* **app:** guard against circular import TDZ in reducer map ([120342c](https://github.com/nolotus/bun-nolo/commit/120342cd96c9734c31f9631be3cb10dbf5289f8f))
* **app:** guard against circular import TDZ in reducer map ([6cd159d](https://github.com/nolotus/bun-nolo/commit/6cd159d4ed0c71dee2d1112b3bdfb0613fa80547))
* **auth:** reorganize usage management page with tabs and fix table height clipping ([3db6a1e](https://github.com/nolotus/bun-nolo/commit/3db6a1e730acd1e12d43817485ca9b60cb95ec00))
* **auth:** 欠费账号不再被鉴权层拦截，只读查询对欠费用户开放 ([741a8a4](https://github.com/nolotus/bun-nolo/commit/741a8a4fc1255e43f66926e5c549a2c33ee2ae90))
* **billing:** unify multiplier to 8, guard stats idempotency, and filter 429 agents ([5e292ab](https://github.com/nolotus/bun-nolo/commit/5e292abaf31c03e1f06880c272ec3d06b1624438))
* **billing:** unify streaming usage requests across providers ([ab759af](https://github.com/nolotus/bun-nolo/commit/ab759af00af31778e2fae58a5f593d3091920fd3))
* **billing:** 分离 SSE billing 帧与 usage 帧，修复 TUI context chip 不更新 ([93ea92b](https://github.com/nolotus/bun-nolo/commit/93ea92b306893c827c7887ae46e3344b67ccda78))
* **billing:** 分离 usage provider 与计费 provider，修复平台 hosted 计费漏记 ([5705bde](https://github.com/nolotus/bun-nolo/commit/5705bde5fd3484c81f6e0f71061ba2b698d8ab0f))
* **billing:** 平台 chat proxy 下发 usage.cost 供 TUI 显示实时积分 ([c9bb88a](https://github.com/nolotus/bun-nolo/commit/c9bb88aa33aa471055d802e6ceddee2fdbdacc7c))
* **billing:** 账本 append 加 CAS 校验防并发断链 + 断裂修复脚本 ([49e53f5](https://github.com/nolotus/bun-nolo/commit/49e53f515e63bc8a8f82d2dd6bb38284c2583fa8))
* **chat:** accept either wire format on the chat.completions proxy path ([865bc69](https://github.com/nolotus/bun-nolo/commit/865bc697e31213b33f3fba251475426ea7be4417))
* **chat:** normalize wire format in hosted upstream branches too ([15c7543](https://github.com/nolotus/bun-nolo/commit/15c75433daa5e5db067a46b2f3f45a0db1ce8ccf))
* **chat:** renest Responses-wire tools for chat.completions upstreams ([0ee241a](https://github.com/nolotus/bun-nolo/commit/0ee241a886084dc66d3eb5000180bc5ed8fb0d50))
* **chat:** support deepseek legacy provider pricing and inline model switcher on error ([7c5d734](https://github.com/nolotus/bun-nolo/commit/7c5d7346ac37fd92021536aef394bc91042ec27c))
* **ci:** add retroactively approved historical commit sha to exemption list ([5ff922d](https://github.com/nolotus/bun-nolo/commit/5ff922d3ca7b9069d4b20c12c08884510cbc3cd5))
* **ci:** widen release-bot exemption to the CLI downloads constant ([23cd6f3](https://github.com/nolotus/bun-nolo/commit/23cd6f309bf599caa9fedb498ba7805be94ca85b))
* **cli:** 移除 TUI auto→flash 档位显示残留 ([44118e9](https://github.com/nolotus/bun-nolo/commit/44118e99d656d4789468527d145d682c86b37817))
* **cli:** 移除从未生效的 native optionalDependency，修复 alpha 部署阻塞 ([0290dc7](https://github.com/nolotus/bun-nolo/commit/0290dc713c755987c28ad00690e47368a037bffd))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([1fb356d](https://github.com/nolotus/bun-nolo/commit/1fb356dcce4cde65793b125bad55dca53cb6648a))
* **db:** narrow preset-agent ownership exemption to single-field userId patch ([87287b7](https://github.com/nolotus/bun-nolo/commit/87287b7f3892417efb2a4f910e04944c6014f323))
* **deploy:** 部署窗口不再把「存储不可用」判成「账号无效」，并消灭 canary 提前进场 ([e198fa7](https://github.com/nolotus/bun-nolo/commit/e198fa7f1628a676def5f4c069f1f5922ce181eb))
* **desktop-runtime:** correct module import paths for builtinAgents and agentAvailability ([b0bf82d](https://github.com/nolotus/bun-nolo/commit/b0bf82dd357f405d7e153bd0cb59d9d617421345))
* **life:** align month-over-month boundary to host local calendar days ([2dd8058](https://github.com/nolotus/bun-nolo/commit/2dd8058a7225d5c0b6853ed4741904c46ff7246a))
* **life:** cache card table mobile card layout (US-5.4 收尾) ([dd58734](https://github.com/nolotus/bun-nolo/commit/dd58734de7172a94fdbf3c99dc5a3f0a21a85ef5))
* **life:** exclude non-billable usage from cache savings (US-3.4) ([193b1ed](https://github.com/nolotus/bun-nolo/commit/193b1ede9de073eca54b30041e4b65c7a53f4924))
* **nolo:** update builtin agent model ([7429c3f](https://github.com/nolotus/bun-nolo/commit/7429c3fd4d9dc8ae3b1b77ee2f6f8da388b5ca0c))
* **nolo:** web 展示层跟随代码托管的内置 agent 模型 ([18a22c0](https://github.com/nolotus/bun-nolo/commit/18a22c0c1185b8f0eceda01a050c53324639e0a0))
* **openai:** omit chat stream options from Responses requests ([f80af97](https://github.com/nolotus/bun-nolo/commit/f80af97e923318c7fa9866cba5b77052f49dcf7c))
* **openai:** translate legacy reasoning effort for Responses API ([610593c](https://github.com/nolotus/bun-nolo/commit/610593c90956f2b276d9ed16aab04ec2bc2fcf4e))
* **pricing:** align credits with USDx8 rate and promote Gemini 3.7 Flash ([7746361](https://github.com/nolotus/bun-nolo/commit/774636170e991526db76de7fe4b4213452e37ba8))
* **release:** restore semantic-release changelog generation ([5265957](https://github.com/nolotus/bun-nolo/commit/5265957604ad45f10a5612d7dc333115e51f2a44))
* **render:** 声明 sucrase 运行时依赖，修复 lockfile 重建后 build-web 失败 ([e69be03](https://github.com/nolotus/bun-nolo/commit/e69be03db06440d857e44a692096102100850d1b))
* **server:** guard daily token stats keys from client overwrite and maintain server-authoritative projections ([91c2401](https://github.com/nolotus/bun-nolo/commit/91c2401bce336de2c92593f39f3fd4e90b7a7e4f))
* **tui:** auto 模式透传 titlePatchPromise，LLM 总结标题刷新窗口标题 ([a33a479](https://github.com/nolotus/bun-nolo/commit/a33a47900ea04d936993c502a756429de243e2d3))
* **tui:** 透出 LLM 标题后台 patch，turn 后立即刷新窗口标题 ([eb318f9](https://github.com/nolotus/bun-nolo/commit/eb318f9cfc4838a9227d7fbcde4b107d016dfecf))

## [0.32.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0...cli-v0.32.0) (2026-08-18)

## [0.32.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.32.0-alpha.3...cli-v0.32.0-alpha.4) (2026-08-17)

## [0.32.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.32.0-alpha.2...cli-v0.32.0-alpha.3) (2026-08-17)

## [0.32.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.32.0-alpha.1...cli-v0.32.0-alpha.2) (2026-08-17)

## [0.32.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0...cli-v0.32.0-alpha.1) (2026-08-17)

## [0.31.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.8...cli-v0.31.0-alpha.9) (2026-08-17)

## [0.31.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.7...cli-v0.31.0-alpha.8) (2026-08-17)

## [0.31.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.6...cli-v0.31.0-alpha.7) (2026-08-17)

## [0.31.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.5...cli-v0.31.0-alpha.6) (2026-08-16)

## [0.31.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.4...cli-v0.31.0-alpha.5) (2026-08-16)

## [0.31.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.3...cli-v0.31.0-alpha.4) (2026-08-16)

## [0.31.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.2...cli-v0.31.0-alpha.3) (2026-08-16)

## [0.31.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.31.0-alpha.1...cli-v0.31.0-alpha.2) (2026-08-16)

## [0.31.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0...cli-v0.31.0-alpha.1) (2026-08-16)

## [0.30.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.20...cli-v0.30.0-alpha.21) (2026-08-16)

## [0.30.0-alpha.20](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.19...cli-v0.30.0-alpha.20) (2026-08-16)

## [0.30.0-alpha.19](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.18...cli-v0.30.0-alpha.19) (2026-08-16)

## [0.30.0-alpha.18](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.17...cli-v0.30.0-alpha.18) (2026-08-16)

## [0.30.0-alpha.17](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.16...cli-v0.30.0-alpha.17) (2026-08-16)

## [0.30.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.15...cli-v0.30.0-alpha.16) (2026-08-16)

## [0.30.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.14...cli-v0.30.0-alpha.15) (2026-08-16)

## [0.30.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.13...cli-v0.30.0-alpha.14) (2026-08-16)

## [0.30.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.12...cli-v0.30.0-alpha.13) (2026-08-16)

## [0.30.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.11...cli-v0.30.0-alpha.12) (2026-08-16)

## [0.30.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.10...cli-v0.30.0-alpha.11) (2026-08-16)

## [0.30.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.9...cli-v0.30.0-alpha.10) (2026-08-16)

## [0.30.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.8...cli-v0.30.0-alpha.9) (2026-08-16)

## [0.30.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.7...cli-v0.30.0-alpha.8) (2026-08-16)

## [0.30.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.6...cli-v0.30.0-alpha.7) (2026-08-15)

## [0.30.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.5...cli-v0.30.0-alpha.6) (2026-08-15)

## [0.30.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.4...cli-v0.30.0-alpha.5) (2026-08-15)

## [0.30.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.3...cli-v0.30.0-alpha.4) (2026-08-15)

## [0.30.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.2...cli-v0.30.0-alpha.3) (2026-08-15)

## [0.30.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.30.0-alpha.1...cli-v0.30.0-alpha.2) (2026-08-15)

## [0.30.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.29.2...cli-v0.30.0-alpha.1) (2026-08-15)

## [0.29.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.29.0...cli-v0.29.1) (2026-08-15)

## [0.29.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.28.0...cli-v0.29.0) (2026-08-15)

## [0.28.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.27.1...cli-v0.28.0) (2026-08-15)

## [0.27.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.27.0...cli-v0.27.1) (2026-08-15)

## [0.27.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.26.2...cli-v0.27.0) (2026-08-14)

## [0.26.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.26.1...cli-v0.26.2) (2026-08-14)

## [0.26.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.26.0...cli-v0.26.1) (2026-08-14)

## [0.26.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.25.2...cli-v0.26.0) (2026-08-14)

## [0.25.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.25.1...cli-v0.25.2) (2026-08-13)

## [0.25.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.25.0...cli-v0.25.1) (2026-08-13)

## [0.25.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.24.0...cli-v0.25.0) (2026-08-13)

## [0.24.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.23.0...cli-v0.24.0) (2026-08-13)

## [0.24.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.23.0...cli-v0.24.0-alpha.1) (2026-08-13)

## [0.23.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.22.0...cli-v0.23.0) (2026-08-13)

## [0.22.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.21.1...cli-v0.22.0) (2026-08-12)

## [0.22.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.21.0...cli-v0.22.0-alpha.1) (2026-08-12)

## [0.21.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.21.0...cli-v0.21.1) (2026-08-12)

## [0.16.0-alpha.41](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.40...cli-v0.16.0-alpha.41) (2026-08-12)

## [0.16.0-alpha.40](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.39...cli-v0.16.0-alpha.40) (2026-08-12)

## [0.16.0-alpha.39](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.38...cli-v0.16.0-alpha.39) (2026-08-12)

## [0.16.0-alpha.38](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.37...cli-v0.16.0-alpha.38) (2026-08-12)

## [0.16.0-alpha.37](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.36...cli-v0.16.0-alpha.37) (2026-08-12)

## [0.16.0-alpha.36](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.35...cli-v0.16.0-alpha.36) (2026-08-12)

## [0.16.0-alpha.35](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.34...cli-v0.16.0-alpha.35) (2026-08-12)

## [0.16.0-alpha.34](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.33...cli-v0.16.0-alpha.34) (2026-08-12)

## [0.16.0-alpha.33](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.32...cli-v0.16.0-alpha.33) (2026-08-12)

## [0.16.0-alpha.32](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.31...cli-v0.16.0-alpha.32) (2026-08-12)

## [0.16.0-alpha.31](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.30...cli-v0.16.0-alpha.31) (2026-08-12)

## [0.16.0-alpha.30](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.29...cli-v0.16.0-alpha.30) (2026-08-12)

## [0.16.0-alpha.29](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.28...cli-v0.16.0-alpha.29) (2026-08-11)

## [0.16.0-alpha.28](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.27...cli-v0.16.0-alpha.28) (2026-08-11)

## [0.16.0-alpha.27](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.26...cli-v0.16.0-alpha.27) (2026-08-11)

## [0.16.0-alpha.26](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.25...cli-v0.16.0-alpha.26) (2026-08-11)

## [0.16.0-alpha.25](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.24...cli-v0.16.0-alpha.25) (2026-08-11)

## [0.16.0-alpha.24](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.23...cli-v0.16.0-alpha.24) (2026-08-11)

## [0.16.0-alpha.23](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.22...cli-v0.16.0-alpha.23) (2026-08-11)

## [0.16.0-alpha.22](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.21...cli-v0.16.0-alpha.22) (2026-08-10)

## [0.16.0-alpha.21](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.20...cli-v0.16.0-alpha.21) (2026-08-10)

## [0.16.0-alpha.20](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.19...cli-v0.16.0-alpha.20) (2026-08-10)

## [0.16.0-alpha.19](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.18...cli-v0.16.0-alpha.19) (2026-08-09)

## [0.16.0-alpha.18](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.17...cli-v0.16.0-alpha.18) (2026-08-09)

## [0.16.0-alpha.17](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.16...cli-v0.16.0-alpha.17) (2026-08-09)

## [0.16.0-alpha.16](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.15...cli-v0.16.0-alpha.16) (2026-08-09)

## [0.16.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.14...cli-v0.16.0-alpha.15) (2026-08-09)

## [0.16.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.13...cli-v0.16.0-alpha.14) (2026-08-09)

## [0.16.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.12...cli-v0.16.0-alpha.13) (2026-08-09)

## [0.16.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.11...cli-v0.16.0-alpha.12) (2026-08-09)

## [0.16.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.10...cli-v0.16.0-alpha.11) (2026-08-09)

## [0.16.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.9...cli-v0.16.0-alpha.10) (2026-08-09)

## [0.16.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.8...cli-v0.16.0-alpha.9) (2026-08-08)

## [0.16.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.7...cli-v0.16.0-alpha.8) (2026-08-08)

## [0.16.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.6...cli-v0.16.0-alpha.7) (2026-08-08)

## [0.16.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.5...cli-v0.16.0-alpha.6) (2026-08-08)

## [0.16.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.4...cli-v0.16.0-alpha.5) (2026-08-08)

## [0.16.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.3...cli-v0.16.0-alpha.4) (2026-08-08)

## [0.16.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.2...cli-v0.16.0-alpha.3) (2026-08-07)

## [0.16.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.16.0-alpha.1...cli-v0.16.0-alpha.2) (2026-08-07)

## [0.16.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.15.0...cli-v0.16.0-alpha.1) (2026-08-07)

## [0.15.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.14.0...cli-v0.15.0) (2026-08-05)

## [0.14.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.13.0...cli-v0.14.0) (2026-08-04)

## [0.14.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/cli-v0.14.0-alpha.4...cli-v0.14.0-alpha.5) (2026-08-04)

## [0.14.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.14.0-alpha.3...cli-v0.14.0-alpha.4) (2026-08-04)

## [0.14.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.14.0-alpha.2...cli-v0.14.0-alpha.3) (2026-08-04)

## [0.14.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.14.0-alpha.1...cli-v0.14.0-alpha.2) (2026-08-04)

## [0.14.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.13.0...cli-v0.14.0-alpha.1) (2026-08-04)

## [0.13.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.12.0...cli-v0.13.0) (2026-08-04)

## [0.12.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.11.0...cli-v0.12.0) (2026-08-03)

## [0.11.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.10.0...cli-v0.11.0) (2026-08-02)

## [0.10.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.9.1...cli-v0.10.0) (2026-08-01)

## [0.9.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.9.0...cli-v0.9.1) (2026-08-01)

## [0.9.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0...cli-v0.9.0) (2026-07-31)

## [0.8.0-alpha.15](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.14...cli-v0.8.0-alpha.15) (2026-07-30)

## [0.8.0-alpha.14](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.13...cli-v0.8.0-alpha.14) (2026-07-30)

## [0.8.0-alpha.13](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.12...cli-v0.8.0-alpha.13) (2026-07-30)

## [0.8.0-alpha.12](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.11...cli-v0.8.0-alpha.12) (2026-07-30)

## [0.8.0-alpha.11](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.10...cli-v0.8.0-alpha.11) (2026-07-30)

## [0.8.0-alpha.10](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.9...cli-v0.8.0-alpha.10) (2026-07-30)

## [0.8.0-alpha.9](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.8...cli-v0.8.0-alpha.9) (2026-07-29)

## [0.8.0-alpha.8](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.7...cli-v0.8.0-alpha.8) (2026-07-29)

## [0.8.0-alpha.7](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.6...cli-v0.8.0-alpha.7) (2026-07-29)

## [0.8.0-alpha.6](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.5...cli-v0.8.0-alpha.6) (2026-07-29)

## [0.8.0-alpha.5](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.4...cli-v0.8.0-alpha.5) (2026-07-29)

## [0.8.0-alpha.4](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.3...cli-v0.8.0-alpha.4) (2026-07-29)

## [0.8.0-alpha.3](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.2...cli-v0.8.0-alpha.3) (2026-07-29)

## [0.8.0-alpha.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.8.0-alpha.1...cli-v0.8.0-alpha.2) (2026-07-29)

## [0.8.0-alpha.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.7.0...cli-v0.8.0-alpha.1) (2026-07-29)

## [0.7.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.6.1...cli-v0.7.0) (2026-07-29)

## [0.6.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.6.0...cli-v0.6.1) (2026-07-29)

## [0.6.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.5.2...cli-v0.6.0) (2026-07-29)

## [0.5.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.5.1...cli-v0.5.2) (2026-07-29)

## [0.5.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.5.0...cli-v0.5.1) (2026-07-29)

## [0.5.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.4.2...cli-v0.5.0) (2026-07-29)

## [0.4.2](https://github.com/nolotus/bun-nolo/compare/cli-v0.4.1...cli-v0.4.2) (2026-07-29)

## [0.4.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.4.0...cli-v0.4.1) (2026-07-29)

## [0.4.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.3.1...cli-v0.4.0) (2026-07-29)

## [0.3.1](https://github.com/nolotus/bun-nolo/compare/cli-v0.3.0...cli-v0.3.1) (2026-07-29)

## [0.3.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.2.0...cli-v0.3.0) (2026-07-29)

## [0.2.0](https://github.com/nolotus/bun-nolo/compare/cli-v0.1.58...cli-v0.2.0) (2026-07-29)
