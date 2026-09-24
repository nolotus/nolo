
## 0.91.0-alpha.1

## 0.91.0-alpha.1 (2026-09-24)

### Features

* **agent:** converge platform agent lifecycle onto stable ids and the nolo provider ([d1946eb](https://github.com/nolotus/bun-nolo/commit/d1946eba4841ffd27b144ee205d08833dc2b237f))

### Bug Fixes

* **billing:** correct three platform pricing defects found by official-price audit ([b399e93](https://github.com/nolotus/bun-nolo/commit/b399e9390226427699efa48af2883a9423ea2030))


## 0.90.0-alpha.1

## 0.90.0-alpha.1 (2026-09-24)

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


## 0.77.0

## 0.77.0 (2026-09-22)

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


## 0.76.0

## 0.76.0 (2026-09-22)

### Features

* **memory:** add best-effort vNext lazy promotion ([e1671a8](https://github.com/nolotus/bun-nolo/commit/e1671a8d9beec0c0929206a06ec92a5ad3d46550))

### Bug Fixes

* **memory:** harden vNext lazy promotion ([93003f6](https://github.com/nolotus/bun-nolo/commit/93003f6c064eb6a2654c43e53e768519c8392c82))


## 0.75.0

## 0.75.0 (2026-09-21)

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


## 0.74.0

## 0.74.0 (2026-09-20)

### Features

* **agent-runtime:** attach bounded result capsule to promoted execShell terminals ([4d6b00a](https://github.com/nolotus/bun-nolo/commit/4d6b00ada6fd80e3932add701bf11481e27dd14c))
* **agent:** add DeepSeek official API preset and brand logos in provider pickers ([1760676](https://github.com/nolotus/bun-nolo/commit/1760676d2fda8a7387289124de5d409614248fde))
* **ai:** integrate StepFun Step Plan subscription and metered API providers ([f3b31f7](https://github.com/nolotus/bun-nolo/commit/f3b31f714f298a125b740bb8bfa035a6e012309e))
* **app:** surface cost routing on the landing page and localize the OG card ([412a6ca](https://github.com/nolotus/bun-nolo/commit/412a6ca87417f413a05259cd5b0193ca19f36766))
* **auth:** support Devin Pro subscription with native ConnectRPC and SWE-2 ([4236e6f](https://github.com/nolotus/bun-nolo/commit/4236e6f2c9eefc07a3cccce7ceab6e79ec8cdb59))
* **cli:** auto-resume agent when owned background process reaches terminal state ([7804cd6](https://github.com/nolotus/bun-nolo/commit/7804cd6fd41b217571d98341d1141c11e2fcbb32))
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


## 0.73.0

## 0.73.0 (2026-09-18)

### Features

* **render:** rebuild the site footer as a layered riverbank camping scene ([1e4e648](https://github.com/nolotus/bun-nolo/commit/1e4e648300bfaf8a766531ecaa2a56af89b98729)), closes [#8482AD](https://github.com/nolotus/bun-nolo/issues/8482AD) [#d5eed2](https://github.com/nolotus/bun-nolo/issues/d5eed2) [#a5cba5](https://github.com/nolotus/bun-nolo/issues/a5cba5)

### Bug Fixes

* **agent:** classify owner subscription channels ([db7f497](https://github.com/nolotus/bun-nolo/commit/db7f497d5925cd0096615441195099ea8d205572))
* **agent:** preserve shared agent keys ([c36a945](https://github.com/nolotus/bun-nolo/commit/c36a9455b0311794fd56f5dec966fae0b97ce34e))
* **render:** correct footer river geometry ([e4e32fb](https://github.com/nolotus/bun-nolo/commit/e4e32fba76446f5091a6f99c9bcc039683c6d770))


## 0.72.0

## 0.72.0 (2026-09-18)

### Features

* **agent-runtime:** guide agents to render mermaid for structured explanations ([87d0fd4](https://github.com/nolotus/bun-nolo/commit/87d0fd4b676f8358b1a5af697cf1a36f80147281))
* **app:** surface cost routing on the landing page and localize the OG card ([09c0207](https://github.com/nolotus/bun-nolo/commit/09c0207d8d3cf8cfa8fffb2b43888791bd1fa82e))
* **cli:** let the TUI drive the user's Chrome through the Nolo connector ([9ada25d](https://github.com/nolotus/bun-nolo/commit/9ada25dcb536022ae09132e0f295785b95d440b6))
* **cli:** nolo chrome 组补充操作子命令（读页面/点击/输入等 11 个） ([d44444e](https://github.com/nolotus/bun-nolo/commit/d44444e772b95984842d80c18093838b5ed82ac0))
* **cli:** render mermaid diagrams via lovely-mermaid ([249d944](https://github.com/nolotus/bun-nolo/commit/249d9440b0dc8a7ac8be17d572fa05bffd0835b5))
* **desktop:** add Chrome connector tab lifecycle and debugger release ([f601aae](https://github.com/nolotus/bun-nolo/commit/f601aae7a9de84b30225e0716a3002f3a7d4d6e1))
* **desktop:** add compact Chrome observation protocol ([dae7f9d](https://github.com/nolotus/bun-nolo/commit/dae7f9d8b8b5fca28fdecbb845b4f16625ffd9da))
* **desktop:** add the Chrome Web Store publishing kit ([00315ea](https://github.com/nolotus/bun-nolo/commit/00315ea16e33920b463e403a02887e26718b4aa6))
* **desktop:** refuse irreversible Chrome actions before acting ([e12f159](https://github.com/nolotus/bun-nolo/commit/e12f1595be0030fcd8892e8148534706711e5ff3))

### Bug Fixes

* **agent-runtime:** 工具参数尾截断可无损补全时直接执行，不再白跑一轮重试 ([da894d4](https://github.com/nolotus/bun-nolo/commit/da894d4decb97beeaad476f3796faf093637dc4a))
* **ask-user:** reduce choice interaction steps ([1c7b631](https://github.com/nolotus/bun-nolo/commit/1c7b6316ab0f9c955055e599f71610bdae31cddd))
* **cli:** consume git stderr in connector runGit to avoid hang ([f0d1b28](https://github.com/nolotus/bun-nolo/commit/f0d1b2839efe025deb531d0092c033bba39ff6fe))
* **cli:** fuse runGit with a timeout and tidy post-incident leftovers ([4d9e245](https://github.com/nolotus/bun-nolo/commit/4d9e245539c6eb5d11f80c5cee05b1c7e6b49b41))
* **desktop:** Linux 官方安装器发布到 R2 并作为推荐下载 ([f24a7e9](https://github.com/nolotus/bun-nolo/commit/f24a7e9a36fba0431cebdb1a7a36f54a50546c33))
* **desktop:** 更新面板文案人话化（保留原文可查） ([38164e4](https://github.com/nolotus/bun-nolo/commit/38164e4129eae98cb4b44b25d091d81f38a26f5b))
* **desktop:** 非受管理安装不再给必然失败的「下载更新」按钮 ([caceedc](https://github.com/nolotus/bun-nolo/commit/caceedc9020a0523e6c6d33ca738b2ecec8d3a93))
* **table:** 修正重命名列显示名/重命名表的命令参数名 ([9cfc459](https://github.com/nolotus/bun-nolo/commit/9cfc4595cc08eeaffcf36d9840c70ce85e1ecb67))
* **table:** 去掉 setTableFocusContext 的 dispatch 包装，修复表格页渲染崩溃 ([8586fa9](https://github.com/nolotus/bun-nolo/commit/8586fa99a0017f50952c1319fb66cb62fe7347af)), closes [#7](https://github.com/nolotus/bun-nolo/issues/7)
* **table:** 给 listTableRows 的服务器读取加 5s 超时，修复表格加载可卡 60s+ ([66afa8a](https://github.com/nolotus/bun-nolo/commit/66afa8a883833abe1e1e9b547a52455a88b9b659))
* **tui:** reduce wheel scrolling backlog with adaptive catch-up ([bba6016](https://github.com/nolotus/bun-nolo/commit/bba601658622dba14169705901da0d259569532c))
* **tui:** soften user messages on light backgrounds ([50d80c3](https://github.com/nolotus/bun-nolo/commit/50d80c3d0a8f7cc602861b3d0bea8325d806f482))

### Performance Improvements

* **cli:** avoid pathological Bun JSON.stringify on cyclic delegation payloads ([aea5535](https://github.com/nolotus/bun-nolo/commit/aea553559629a2397fb48e6659a48fa2f0d6ad09))


## 0.71.0

## 0.71.0 (2026-09-15)

### Features

* **server:** add watchCompletion — business-task terminal subscription with parent-dialog wake ([321a930](https://github.com/nolotus/bun-nolo/commit/321a93048ecbb6d0c7d6d39cb855f34fa3bbd163))


## 0.70.1

## 0.70.1 (2026-09-15)

### Bug Fixes

* **llm:** replace dead crof upstream with baseten; restore real Claude & add GPT-5.6/6 hosted models ([4e28ad6](https://github.com/nolotus/bun-nolo/commit/4e28ad6ccedb33989f15ebd020c894f5bbc903f6))


## 0.70.0

## 0.70.0 (2026-09-15)

### Features

* **ai:** 会商模式注入提示词补齐实战决策纪律 ([3031da4](https://github.com/nolotus/bun-nolo/commit/3031da4f85d0e27c8f8e6e75b35e22584afdeea4))
* **memory:** 常驻偏好集——跨话题用户偏好无条件进入注入层 ([43ead3a](https://github.com/nolotus/bun-nolo/commit/43ead3ad18c930f3c756f11c796a7dbdb7cb109a))

### Bug Fixes

* **ask-user:** unify explicit multi-question interaction ([3afbef9](https://github.com/nolotus/bun-nolo/commit/3afbef9361b51b705b0f6ddca050ec93ffea9162))
* **tui:** distinguish user messages from AI output ([8dac8fc](https://github.com/nolotus/bun-nolo/commit/8dac8fc8dc774782d20b1e1497ef87deacd56473))


## 0.69.0-alpha.2

## 0.69.0-alpha.2 (2026-09-15)

### Bug Fixes

* **ask-user:** unify explicit multi-question interaction ([3afbef9](https://github.com/nolotus/bun-nolo/commit/3afbef9361b51b705b0f6ddca050ec93ffea9162))
* **tui:** distinguish user messages from AI output ([8dac8fc](https://github.com/nolotus/bun-nolo/commit/8dac8fc8dc774782d20b1e1497ef87deacd56473))


## 0.69.0-alpha.1

## 0.69.0-alpha.1 (2026-09-15)

### Features

* **ai:** 会商模式注入提示词补齐实战决策纪律 ([3031da4](https://github.com/nolotus/bun-nolo/commit/3031da4f85d0e27c8f8e6e75b35e22584afdeea4))
* **memory:** 常驻偏好集——跨话题用户偏好无条件进入注入层 ([43ead3a](https://github.com/nolotus/bun-nolo/commit/43ead3ad18c930f3c756f11c796a7dbdb7cb109a))


## 0.68.0-alpha.2

## 0.68.0-alpha.2 (2026-09-15)

### Bug Fixes

* **desktop:** ship hutch's Setup zip as the stable Windows download ([3342bde](https://github.com/nolotus/bun-nolo/commit/3342bde7f98798b4039267da4f8d31ee305a6be2))


## 0.68.0-alpha.1

## 0.68.0-alpha.1 (2026-09-15)

### Features

* **agent-runtime:** 上下文压缩重构：轮内真实遥测主防线 + 触发收敛 ([4dadecf](https://github.com/nolotus/bun-nolo/commit/4dadecf4eaa9480c2d9df3d3c50f703d0c1d0cca))
* **chat:** 压缩决策接入真实遥测 + 压缩结果 toast 可见性 ([e4fc9d4](https://github.com/nolotus/bun-nolo/commit/e4fc9d4cbbf766897669117925fdee1306f518a1))


## 0.67.0-alpha.1

## 0.67.0-alpha.1 (2026-09-15)

### Features

* **agent:** add tool-use discipline guidance section ([7125503](https://github.com/nolotus/bun-nolo/commit/7125503840709a1ba496d43eafe0fd554d75dba6))

### Bug Fixes

* **agent:** expand a leading ~/ in workspace tool paths ([2f5e0ed](https://github.com/nolotus/bun-nolo/commit/2f5e0ed8c0ebe2f61fc07a590d85e20321bba874))
* **agent:** make thread admission fail closed ([382864f](https://github.com/nolotus/bun-nolo/commit/382864fdccff591c039784195e66fdd92bda521d))


## 0.66.0-alpha.5

## 0.66.0-alpha.5 (2026-09-14)

### Bug Fixes

* **read-dialog:** bound agent readDialog responses with a shared projection seam ([55cfd65](https://github.com/nolotus/bun-nolo/commit/55cfd6544ba10d827e44c52b4c73c34a3659ccb7))


## 0.66.0-alpha.4

## 0.66.0-alpha.4 (2026-09-14)

### Bug Fixes

* **ai:** keep node:crypto out of the browser bundle (credential group hash) ([7f5ef12](https://github.com/nolotus/bun-nolo/commit/7f5ef12ae107da8d844842bae8bfa760f3fc3297))


## 0.66.0-alpha.3

## 0.66.0-alpha.3 (2026-09-14)

### Bug Fixes

* **agent:** keep key decision context with the orchestrator ([ea246ce](https://github.com/nolotus/bun-nolo/commit/ea246cefc31f30d135edddaacd089055ee40e7c7))


## 0.66.0-alpha.2

## 0.66.0-alpha.2 (2026-09-14)

### Bug Fixes

* **cli:** restore agent availability helper export ([0ca1648](https://github.com/nolotus/bun-nolo/commit/0ca1648e69b2ebe09bff98fe603ef9c678df7dfb))
* **tui:** bold user message body so input stands out from AI output ([e65426e](https://github.com/nolotus/bun-nolo/commit/e65426e4d15f948674a66b7491d24ada97275b42))


## 0.66.0-alpha.1

## 0.66.0-alpha.1 (2026-09-14)

### Features

* **ai:** restore deepseek-v4-pro as platform-hosted model ([20351be](https://github.com/nolotus/bun-nolo/commit/20351be1ca6f1d8ea9557f520558ba8e432b5af4))


## 0.65.0-alpha.1

## 0.65.0-alpha.1 (2026-09-14)

### Features

* **agents:** handle credentials as the routing unit and stop teaching ephemeral ([f1cfc83](https://github.com/nolotus/bun-nolo/commit/f1cfc83c9d8376ba8398f3fdcf066b562220a2fa))


## 0.64.0-alpha.1

## 0.64.0-alpha.1 (2026-09-14)

### Features

* **tui:** smooth wheel scrolling via paced scroll animation ([5e2471d](https://github.com/nolotus/bun-nolo/commit/5e2471df9fb7cc0ed8efababcf50baef91c4e3ab))


## 0.63.0-alpha.3

## 0.63.0-alpha.3 (2026-09-14)

### Bug Fixes

* **cli:** put nolo on PATH from the installer for bash and zsh ([e34f3f8](https://github.com/nolotus/bun-nolo/commit/e34f3f812c787be330f1ee85456ed3d4408b1a3d))


## 0.63.0-alpha.2

## 0.63.0-alpha.2 (2026-09-14)

### Bug Fixes

* **agent-runtime:** 自动压缩改用真实上下文占用触发 ([e390c57](https://github.com/nolotus/bun-nolo/commit/e390c579cfea57dada94ced12743e402794bd6f2))
* **cli:** 修复 /compact 全链路并补全进度、本地化与超限友好提示 ([14651c4](https://github.com/nolotus/bun-nolo/commit/14651c45e45aaf06f38d8ef0319b6b4cbb2430e8))


## 0.63.0-alpha.1

## 0.63.0-alpha.1 (2026-09-14)

### Features

* **desktop:** ship a real desktop account edition and a release capability gate ([a1c6e5e](https://github.com/nolotus/bun-nolo/commit/a1c6e5e0acea52ae643301c78859048cc8e29cc0))

### Bug Fixes

* **ledger:** make offline repair survive a still-locked database ([97eefb0](https://github.com/nolotus/bun-nolo/commit/97eefb024559239e4a186b95476589ebf4385ade))


## 0.62.0-alpha.1

## 0.62.0-alpha.1 (2026-09-14)

### Features

* **ledger:** repair tx-consistent entry hashes and add a guarded compensation endpoint ([7670b52](https://github.com/nolotus/bun-nolo/commit/7670b52cfaad4c6ae5eeb59dcea5159d2119710a))

### Bug Fixes

* **billing:** converge ledger idempotency keys without weakening the marker gate ([9b64c9d](https://github.com/nolotus/bun-nolo/commit/9b64c9d93cc341de1ac10348c844fd5b5f36aa88))
* **desktop:** harden updates and release truth ([39b1472](https://github.com/nolotus/bun-nolo/commit/39b147291f3e0735b607130d18b6a5e98aeb8f52))
* **ledger:** adapt the authority store so ledger repair and adjustments can actually write ([1c954dd](https://github.com/nolotus/bun-nolo/commit/1c954ddd901cf5e9b46e94a66ed313478d058a87))


## 0.61.0-alpha.4

## 0.61.0-alpha.4 (2026-09-14)

### Bug Fixes

* **desktop:** handle win32 process termination and optimistic process stop ([f2b8e40](https://github.com/nolotus/bun-nolo/commit/f2b8e404168edaf354b890ddf30503831df24108))


## 0.61.0-alpha.3

## 0.61.0-alpha.3 (2026-09-13)

### Performance Improvements

* **test:** lazy @babel/core in stylexBunPlugin + test:light for pure-logic packages ([bceb211](https://github.com/nolotus/bun-nolo/commit/bceb21143127bbd69b5f9ff6c8f5b00edc37a344))


## 0.61.0-alpha.1

## 0.61.0-alpha.1 (2026-09-13)

### Features

* **agent:** add privilege escalation guidance section ([dd7878c](https://github.com/nolotus/bun-nolo/commit/dd7878c0ea7173ee0a8210d0b7e418612a8f8915))


## 0.60.0-alpha.5

## 0.60.0-alpha.5 (2026-09-13)

### Bug Fixes

* **welcome:** repair mobile horizontal overflow on guest homepage ([ee329f0](https://github.com/nolotus/bun-nolo/commit/ee329f0fbff6679d82423479fe21ee0dfacca235))


## 0.60.0-alpha.4

## 0.60.0-alpha.4 (2026-09-13)

### Bug Fixes

* **i18n:** guard double init so SSR language negotiation survives ([f81825e](https://github.com/nolotus/bun-nolo/commit/f81825efa690f16856d56316d19e811453cd98d6))


## 0.60.0-alpha.3

## 0.60.0-alpha.3 (2026-09-13)

### Bug Fixes

* **agent:** bump Codex client version to 0.154.0 for gpt-6-astra ([5ffd65b](https://github.com/nolotus/bun-nolo/commit/5ffd65b26ca2a687853a99c6c3000e20efdc5ee8))


## 0.60.0-alpha.2

## 0.60.0-alpha.2 (2026-09-13)

### Bug Fixes

* **release:** pass version and projection_sha to cli-publish dispatch ([34847f2](https://github.com/nolotus/bun-nolo/commit/34847f2b62894434b1dffcf58f73ceb782c7f02a))


## 0.60.0-alpha.1

## 0.60.0-alpha.1 (2026-09-13)

### Features

* **agent:** recommend GPT-6 Astra and add OpenAI prompt cache key ([4854f1d](https://github.com/nolotus/bun-nolo/commit/4854f1dfb1cee32684e7d98302e13ce4c34629a3))

### Bug Fixes

* **pricing:** drop zero-markup promise from FAQ copy ([0cda539](https://github.com/nolotus/bun-nolo/commit/0cda539ac113a9c8e4b1b23a5527941a5596c669))


## 0.59.0-alpha.1

## 0.59.0-alpha.1 (2026-09-13)

### Features

* **agent:** add Antigravity semantic and credential seams ([07fe166](https://github.com/nolotus/bun-nolo/commit/07fe166376616ed13f4d1fbbc381ebe646473365))
* **agent:** add CommandCode subscription preset ([e512ab2](https://github.com/nolotus/bun-nolo/commit/e512ab2adb1961e6ba9236a4434f5de6c852bdfe))
* **agent:** add GPT-6 Astra model to OpenAI catalog and agent creation pickers ([5e6ac2e](https://github.com/nolotus/bun-nolo/commit/5e6ac2ebc1488981f96ecd5c0a7a274355a646f4))
* **agent:** add platform-wide response behavior guidelines ([73d02f2](https://github.com/nolotus/bun-nolo/commit/73d02f24b82e83b9a909cd367c9b515326b2f6a2))
* **agent:** consolidate DeepSeek catalog to deepseek-flash with legacy migration ([f0d9a24](https://github.com/nolotus/bun-nolo/commit/f0d9a24ed1ec70f827d0a79ed0e53ed21e956114))
* **agent:** consume Antigravity semantic runtime results ([7950d11](https://github.com/nolotus/bun-nolo/commit/7950d11f361a9d4e1221c71a29bbbb36f83a8801))
* **agent:** record observed provider timing facts ([945735b](https://github.com/nolotus/bun-nolo/commit/945735b73444ce09b7b7ecafed727c2c72b108c2))
* **ai:** add dimension-aware quality evidence and writing.creative domain ([98c451c](https://github.com/nolotus/bun-nolo/commit/98c451cc5a81e3e5e2c2a7a885da4000362e970f))
* **ai:** 编排注入新增「任务分型与收工预算」段，纪律从项目 skill 上移产品级 ([3f82cd4](https://github.com/nolotus/bun-nolo/commit/3f82cd4d5d4bbcf0dab4ea4f13f006c50d6793c0))
* **auth:** complete account session phase 3 ([655ae70](https://github.com/nolotus/bun-nolo/commit/655ae7060d8831115ac97b2834401f343ff474cd))
* **auth:** introduce cross-platform AccountSessionCore for session read truth (Phase 1) ([2bde302](https://github.com/nolotus/bun-nolo/commit/2bde302a2fe50ed1e79a566a1b7f02e91232d1cb))
* **auth:** make account session service the lifecycle owner ([13159cd](https://github.com/nolotus/bun-nolo/commit/13159cd08589891d1dc4da606601041b2180995c))
* **auth:** purify Redux reducer and establish unidirectional AccountSessionReduxBridge (Phase 1.1) ([25213e2](https://github.com/nolotus/bun-nolo/commit/25213e296125f452c19480bd5b956a8842bfcff2))
* **auth:** remove redux account session compatibility ([31c0a00](https://github.com/nolotus/bun-nolo/commit/31c0a00a383369617070c43347007de7b13d698b))
* **browser:** add minimal browser workbench ([8c64326](https://github.com/nolotus/bun-nolo/commit/8c64326d484beb6e8209193ba4b2cabad36710e7))
* **chat:** explain context reprocessing ([a631508](https://github.com/nolotus/bun-nolo/commit/a63150862d5caa83526c190cba4256ddc6ca7234))
* **chat:** fold execShell/readFile tool rows by default with TUI-style summaries ([e982f3f](https://github.com/nolotus/bun-nolo/commit/e982f3f308749f84f23c8969db023957f9f19c4d))
* **chat:** remove quick-chat tiers and switch default nolo agent to deepseek-flash ([e9b21a2](https://github.com/nolotus/bun-nolo/commit/e9b21a22f32797e7f2d014595a58e7ed4c6d677d))
* **chat:** sidebar 虚拟化列表接入 fluid hover 连续高亮 ([7e22c56](https://github.com/nolotus/bun-nolo/commit/7e22c569f0744d7a37f33eebf0c4ffee16f8559d))
* **cli:** box and bold device-code display in nolo auth flows ([a322a14](https://github.com/nolotus/bun-nolo/commit/a322a14354e56876871101eb45da735bfb235a33))
* **cli:** execute machine-routed read-only tool invocations in connector daemon ([4779c28](https://github.com/nolotus/bun-nolo/commit/4779c288299c5f153ed288a357a21806abc5c740))
* **cli:** in-TUI /login device-code auth + accurate not-logged-in 401 hint ([21280ed](https://github.com/nolotus/bun-nolo/commit/21280edf1967bf4e86da958db10a922a31502769))
* **cli:** integrate TUI account sessions ([62a2ffd](https://github.com/nolotus/bun-nolo/commit/62a2ffde42bb363c97c32a80ee0046d07daa2c02))
* **cli:** refresh welcome screen — daily tips, neutral daylight sky, non-blocking sweep animation ([0045c83](https://github.com/nolotus/bun-nolo/commit/0045c8335b6e179cb6439e5c45e6737806e3a122))
* **desktop:** clarify first-run onboarding choices ([f17eb79](https://github.com/nolotus/bun-nolo/commit/f17eb793142c5242e7c5430efb1c01b17b71a761))
* **desktop:** 迁移 electrobun 1.18.4-beta.6 → 2.0.1（Hutch 工具链） ([50f92ee](https://github.com/nolotus/bun-nolo/commit/50f92eec7f77ae905f18049e945e25d3a4522733))
* **desktop:** 重做更新设置页并修正更新状态机语义 ([15bf1cd](https://github.com/nolotus/bun-nolo/commit/15bf1cd59479386682f84f078158875cb62d5168))
* **layout:** add companion placement preference ([3ab7b23](https://github.com/nolotus/bun-nolo/commit/3ab7b2340a7ca660e3a554a10a84d1489db80e19))
* **layout:** add navigation placement preference ([f6d153f](https://github.com/nolotus/bun-nolo/commit/f6d153f2df118ba83da33c2dc58a4ffef73d6665))
* **layout:** add responsive workbench presentation ([54b5628](https://github.com/nolotus/bun-nolo/commit/54b562800bfd937592361be4fb31ce68ccb21c99))
* **layout:** add WorkbenchSplit dual-surface split primitive ([2599726](https://github.com/nolotus/bun-nolo/commit/2599726556f48a0b3dbd5df030e0498435f8def0))
* **layout:** use WorkbenchSplit for AppEditor chat mode ([6d5b8e7](https://github.com/nolotus/bun-nolo/commit/6d5b8e7d6b51ae3ccf7f279dd9572f34928edccc))
* **observability:** 合并 chat-proxy 流生命周期事件与 stale sweep TypeError 修复 ([f5febf9](https://github.com/nolotus/bun-nolo/commit/f5febf99f763883b26efbb38e94dc6fcdb270c9f))
* **observability:** 补齐 chat-proxy 流生命周期事件并修复 stale dialog sweep TypeError ([50b0e29](https://github.com/nolotus/bun-nolo/commit/50b0e291f443220efed179f92f445be29a2aa9ad))
* **onboarding:** add local CLI option to desktop first-run guide ([d6e6856](https://github.com/nolotus/bun-nolo/commit/d6e6856bb60287f69172b737a2c12fd2817480de))
* **payments:** add CNY WeChat channel with per-channel minimums ([e7e3189](https://github.com/nolotus/bun-nolo/commit/e7e31891b9c3fc6f875296a8864cce7476269f8f))
* **payments:** rework Waffo CNY recharge with shared quote module ([8ccc3a4](https://github.com/nolotus/bun-nolo/commit/8ccc3a41892dd915a85d01b4e1be46e78cadb45e))
* **tui:** notify agent when background OS tasks reach terminal state ([3e1254e](https://github.com/nolotus/bun-nolo/commit/3e1254e1e1c35d61190b09af4a14b782476d0d28))
* **tui:** show platform credits live during a turn instead of only at turn end ([5b0daf7](https://github.com/nolotus/bun-nolo/commit/5b0daf779c92848a1bea5b087afea9617d0a054c))
* **web:** drop new-chat from create menu, rename manual agent create ([39cea16](https://github.com/nolotus/bun-nolo/commit/39cea168cfb1ae7dcd83cf27df2487b63f6cd8cc))

### Bug Fixes

* **agent:** align Codex timing with logical invocations ([aad5790](https://github.com/nolotus/bun-nolo/commit/aad5790a311a9b1659f2097a893ba96d8fab0b3c))
* **agent:** default new-agent model to nolo-hosted deepseek-v4-flash ([0854198](https://github.com/nolotus/bun-nolo/commit/08541986db7db24f774d45d4b037aa324a55d816))
* **agent:** finalize Antigravity invocation timeout semantics ([c471c6f](https://github.com/nolotus/bun-nolo/commit/c471c6f994c51e1ea7a7976b394c53848e371aaf))
* **agent:** inherit provider configuration when creating agents ([b99fa0c](https://github.com/nolotus/bun-nolo/commit/b99fa0c2d0ead5d2a277299def2cd12b4fe7e5a6))
* **agent:** keep local Antigravity credential refresh semantic ([e7f3e0b](https://github.com/nolotus/bun-nolo/commit/e7f3e0b41c8b85572ad4bb065d88530f9d77f616))
* **agent:** only prune stale public-agent cache on authoritative results ([c7ff520](https://github.com/nolotus/bun-nolo/commit/c7ff520c03b4264fadad2fee041038576c09c0cb))
* **agent:** pin declared-tool boundary in empty-turn repair prompt ([fa50c85](https://github.com/nolotus/bun-nolo/commit/fa50c8507d7c3abe4dc922f6fbe4324cd568b5fd))
* **agent:** restore Gemini semantic type boundaries ([c1f9589](https://github.com/nolotus/bun-nolo/commit/c1f958924aa3abf27c5f899ed5e036ea16face4b))
* **ai:** judge creative-writing code context structurally ([11db185](https://github.com/nolotus/bun-nolo/commit/11db185a4d34558fed9aa84cb53c9e06aa490acc))
* **ai:** keep code-context tasks out of writing.creative ([18a2b4d](https://github.com/nolotus/bun-nolo/commit/18a2b4dbfe493ca0706c5c5024f9c670296174b1))
* **app:** freeze redux consumer entry points ([737a88b](https://github.com/nolotus/bun-nolo/commit/737a88b365fd7458d432fe753fc86844303abf98))
* **app:** isolate browser probe routes from production ([37061bb](https://github.com/nolotus/bun-nolo/commit/37061bbd517323ca02bdccc1b101900283633c2a)), closes [app/utils/env#isDevelopment](https://github.com/app/utils/env/issues/isDevelopment)
* **app:** narrow redux boundary to canonical app/store entry ([436f68d](https://github.com/nolotus/bun-nolo/commit/436f68dce6be293dfc02264daa8b32ef6835f5d8))
* **auth:** compose legacy credential migration explicitly ([b95f32b](https://github.com/nolotus/bun-nolo/commit/b95f32bbcbbae8ea2f470e08662b1c46fb3cd1fa))
* **auth:** enforce atomic session transition and explicit sign-out state ([e010ce9](https://github.com/nolotus/bun-nolo/commit/e010ce968f6b0634e4b0d1f39f606017687b9c8f))
* **auth:** harden session migration boundary ([f7c2d17](https://github.com/nolotus/bun-nolo/commit/f7c2d17d27a49288cb01214b0b448436d711d5b0))
* **auth:** make credential migration fail-closed ([3b70b6c](https://github.com/nolotus/bun-nolo/commit/3b70b6ca68639f82a763b7664976cbe9b7dfda9e))
* **auth:** migrate credentials into NOLO_HOME ([a50507a](https://github.com/nolotus/bun-nolo/commit/a50507a650819750097932d5b96204cfff94ab50))
* **auth:** restore multi-account session consistency ([7f5474e](https://github.com/nolotus/bun-nolo/commit/7f5474e3c1c69f54b9a99032db6abc734cd0584c))
* **billing:** sync DeepSeek Flash peak/off-peak prices with 2026-09-10 official cut ([b988331](https://github.com/nolotus/bun-nolo/commit/b98833128999c60d7051c93ea82cc561b540ac70))
* **chat:** fluid hover enabled=false 契约与 rowSize 几何推导 ([1fb5382](https://github.com/nolotus/bun-nolo/commit/1fb53824370790ea4c4d5e90c28f54321c1ece4a))
* **chat:** hide mid-turn empty-reply placeholder and settle tool UI after turn ends ([0d6793a](https://github.com/nolotus/bun-nolo/commit/0d6793a1104335b626d36a07d67b79c0fb308f8f))
* **chat:** merge fix/sidebar-scroll-chain → alpha ([75489ba](https://github.com/nolotus/bun-nolo/commit/75489ba5c6a478f58013d724b157bfb0b4f5fef2))
* **chat:** 侧边栏嵌套滚轮被 overscroll contain 吞掉，恢复 scroll chaining ([d6e448d](https://github.com/nolotus/bun-nolo/commit/d6e448d0f413395547e6dae157ad254022cf83ed))
* **chat:** 折叠 exec 工具卡片中的超长 shell 命令 ([87dfffc](https://github.com/nolotus/bun-nolo/commit/87dfffcbd3a164ef08858db20f2492460795afc9))
* **ci:** move cli-binary-publish back to GitHub-hosted ubuntu-latest ([ebce7a0](https://github.com/nolotus/bun-nolo/commit/ebce7a0b4549c5d329e8c864b26dec9eace4b902))
* **cli:** close ANSI formatting after user message gutter to prevent accent color leak ([12013c2](https://github.com/nolotus/bun-nolo/commit/12013c25c3211cac71290572cf142470e84b3ce0))
* **cli:** complete legacy credential migration for auth sync-only ([189cce1](https://github.com/nolotus/bun-nolo/commit/189cce1d2c668f7e6dd3dcbff25855db1bb007cc))
* **cli:** expose process task tools in CODE pack so prompt and gate agree ([cbf25eb](https://github.com/nolotus/bun-nolo/commit/cbf25ebf5530e8a16165462795150ecb3c7da626))
* **cli:** fix TUI Ollama context tracking, stream usage and truncation ([33e4461](https://github.com/nolotus/bun-nolo/commit/33e4461beae687a05188aeeb76e3ff09a0939837))
* **cli:** platform agents with runtimeBinding route to machine connector instead of CLI misdispatch ([ab02c60](https://github.com/nolotus/bun-nolo/commit/ab02c608c10c84946d76eb2f1898cd6e464fdf5b))
* **cli:** preserve image input for Kimi Code models ([02277bb](https://github.com/nolotus/bun-nolo/commit/02277bb6ee7630c9197d305464ef1971977d8094))
* **cli:** upgrade dark mode accent ansi fallback to bright blue and modernize status icon ([4d2c7d9](https://github.com/nolotus/bun-nolo/commit/4d2c7d9c8ae6f5f3b2f8a02d0287ac1c585e08c2))
* **desktop:** show onboarding for local users ([34690c6](https://github.com/nolotus/bun-nolo/commit/34690c66c0fa1d700fc8abc95acbf761a035be67))
* **desktop:** 桌面端交互 agent 默认补齐 exa_search/fetchWebpage ([4163f9f](https://github.com/nolotus/bun-nolo/commit/4163f9fc55eb434c647ccd0eb19e3d2b5e5ae3d1))
* **desktop:** 消除 dev 启动的 web 资源复制竞态（黑屏根因） ([3ecbbe3](https://github.com/nolotus/bun-nolo/commit/3ecbbe3a58de143d6717ace6faab827c38db68cb))
* **layout:** clamp companion below preferred min on narrow stages ([d6edaa5](https://github.com/nolotus/bun-nolo/commit/d6edaa56789b8af0342b9514ddfea25352916cd2))
* **layout:** LocalPreviewSplit must fill MainLayout__main height ([df6a2ad](https://github.com/nolotus/bun-nolo/commit/df6a2ad062c0feab22e79cc1021c37e5ba79cd9d))
* **layout:** normalize workbench active surface control ([39453dc](https://github.com/nolotus/bun-nolo/commit/39453dc4f5e32506c72c09bcac241de6d0805256))
* **layout:** polish WorkbenchSplit interaction and accessibility ([dd4694d](https://github.com/nolotus/bun-nolo/commit/dd4694d8addaad879f73790b29465a5579f28f83))
* **layout:** restore dialog page height chain in LocalPreviewSplit ([27398ea](https://github.com/nolotus/bun-nolo/commit/27398ea7a00a27724fb57f98e26643900868e7e0))
* **layout:** restore dialog page height chain in LocalPreviewSplit ([0bf855c](https://github.com/nolotus/bun-nolo/commit/0bf855cbd6e426cc419ec5e7d2919747e5479d7e))
* **layout:** WorkbenchSplit drag follows pointer in real time ([32e75b8](https://github.com/nolotus/bun-nolo/commit/32e75b879a83ffba186c31d5b1eca8fb50107dbd))
* **open-source:** decouple auth imports from public packages via identity edition injection ([ed46fb8](https://github.com/nolotus/bun-nolo/commit/ed46fb8527099624d4666a657c71d0024bd2c5de))
* **release:** CLI publish 断链修复——tweetnacl manifest 一致性断言 + 投影 intent 诊断 ([8c1e660](https://github.com/nolotus/bun-nolo/commit/8c1e6604ccea4a2bee2aa956fb11f91ef0f57f7b))
* **release:** make tweetnacl assertion truly bidirectional, add curl timeouts ([2ec73e8](https://github.com/nolotus/bun-nolo/commit/2ec73e8d5b641acc658163c9b9c6a64f1bc084b7))
* **search:** finalize workspace search phase 2 ([215e19b](https://github.com/nolotus/bun-nolo/commit/215e19b2db76dbc334b819c17f859cec28a85719))
* **search:** restore fast lexical search fallback ([d486659](https://github.com/nolotus/bun-nolo/commit/d486659534f120860d5716b1fdd1a8913974ada8))
* **search:** separate lexical mechanism from policies ([29b0a80](https://github.com/nolotus/bun-nolo/commit/29b0a805ff7cff138fc0c8c21eebdc9dfe77234a))
* **search:** separate workspace and source search semantics ([21dacef](https://github.com/nolotus/bun-nolo/commit/21dacefabe4730d45f8f9c877f0ff0e85d6e9d6d))
* **tui:** make /cd take effect end-to-end across runtime, git status and notice lifecycle ([d03ae65](https://github.com/nolotus/bun-nolo/commit/d03ae654a785a2377370b92f06c3e5fc5e6aea28))
* **tui:** preserve text paste when clipboard has no image ([58e7e9a](https://github.com/nolotus/bun-nolo/commit/58e7e9a79353f5ec423c849a4b3f1af4a18847ab))
* **tui:** prevent stale mouse selection clipboard writes ([d310532](https://github.com/nolotus/bun-nolo/commit/d310532552e0df99677017a1c7f82707ec6be2d3))
* **webview:** 消除 stable 客户端 bundle 模块顶层裸 process.env 引用 ([6526ba3](https://github.com/nolotus/bun-nolo/commit/6526ba3e61815b93564220d4bbdf837686ae644a)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)

### Performance Improvements

* **tui:** bound cross-server agent catalog fetch with deadline and circuit breaker ([1b6f50c](https://github.com/nolotus/bun-nolo/commit/1b6f50c9926174ce8541d9561a39b3ea003517e6))


## 0.48.0

## 0.48.0 (2026-08-31)

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


## 0.47.0

## 0.47.0 (2026-08-31)

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


## 0.46.0

## 0.46.0 (2026-08-30)

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
* **release:** append-only mirror sync, dual-repo audit reconciliation, publish gate ([4410e8d](https://github.com/nolotus/bun-nolo/commit/4410e8d51b66bf6fd0cd9347823659ae433d12b5))
* **release:** desktop build auto-triggers on push, full GitHub Releases flow ([de6d3f4](https://github.com/nolotus/bun-nolo/commit/de6d3f46a0a09df50376ccdad56be982f88f30dd))
* **release:** desktop build uploads to R2 (CF CDN) + GitHub Releases backup ([0a2401e](https://github.com/nolotus/bun-nolo/commit/0a2401eaa92b1f47c86593bf6d2ff8274d83c30d))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([f10ea01](https://github.com/nolotus/bun-nolo/commit/f10ea011519b16a6c68a023ac0630de4f095bd7c))
* **routing:** add RunInfra fallback channel for hosted glm-5.3 and deepseek-v4-flash ([ce61ba2](https://github.com/nolotus/bun-nolo/commit/ce61ba2db35f7d4203eb4f3afe789b73d1a3027d))
* **routing:** route kimi/glm to openrouter, restore deepseek responses, and update prices ([2bdd6f7](https://github.com/nolotus/bun-nolo/commit/2bdd6f7ef5e0fbad2c86522bb5960f1d3b5181f2))
* **routing:** switch platform DeepSeek V4 Flash/Pro from official Responses API to DeepInfra chat.completions ([3da71b3](https://github.com/nolotus/bun-nolo/commit/3da71b3c3eb7f25c25d877f58229af3e42e81dda))
* **seo:** enhance internationalization, entity knowledge graph, and site focus pages ([c66ec5c](https://github.com/nolotus/bun-nolo/commit/c66ec5ce0fb775b0857fa3cee30b9e67280f2266))
* **server:** add /api/v1/usage/stats and /api/v1/usage/records read endpoints ([0110a0a](https://github.com/nolotus/bun-nolo/commit/0110a0ab79fdaa1f16f06bf7c8b6faaa080a3fbf))
* **server:** add cross-end append instruction endpoint and queue storage ([584be24](https://github.com/nolotus/bun-nolo/commit/584be24b9f85f79c76e8056c2417914ec4971868))
* **server:** add dialogCacheHealth per-dialog cache-hit analysis ([b18d191](https://github.com/nolotus/bun-nolo/commit/b18d1912013589525faa5ccd07919d22da24e6e5))
* **server:** add provider dynamic model discovery v1 ([821b799](https://github.com/nolotus/bun-nolo/commit/821b799108cd5ec386a9bab8b7bcd02895eb9b48))
* **server:** realtime events SSE resume with Last-Event-ID ([7fd3de6](https://github.com/nolotus/bun-nolo/commit/7fd3de64319383ad68c81409eabf2c4f2bb97449))
* **server:** wire queryModelUsage prefixChurn diagnostic ([9201132](https://github.com/nolotus/bun-nolo/commit/9201132970bc8dbd89393960c6641a2f29a721ef))
* **stylex:** add @stylexjs/stylex and @stylexjs/unplugin 0.19.0 deps ([7a16e31](https://github.com/nolotus/bun-nolo/commit/7a16e31c44c0342e93ad6d600c96e13fab16ea1f))
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
* **desktop:** extract empty assistant repair constants to isolate web bundle dependencies ([d3673b9](https://github.com/nolotus/bun-nolo/commit/d3673b9b10fb9a8ce80f855d4a2fd328d3f06a93))
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
* **release:** tolerate npm package processing delay ([43df49e](https://github.com/nolotus/bun-nolo/commit/43df49e841f5b8f11d84859b507169fed8f42827))
* **release:** treat equal CLI version as idempotent no-op ([46eec17](https://github.com/nolotus/bun-nolo/commit/46eec174b7396df710a2fed0ad9bd8cd8e65e438))
* **release:** unblock CLI build — restore db.ts, serverStoreFactory, oauthProviders ([2455406](https://github.com/nolotus/bun-nolo/commit/245540648ea476469a0c15323f4911d93909eb22))
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
* **ssr:** guard App useUserId with useHasMounted to prevent hydrate mismatch ([32e2faf](https://github.com/nolotus/bun-nolo/commit/32e2faf9c0e6cb3ba9bc71f57f5c4fdc4065e3ab)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
* **ssr:** resolve circular import TDZ and login hydrate mismatch ([260eb77](https://github.com/nolotus/bun-nolo/commit/260eb77a61e6f7abf8f4be93b02884d3723dbd39)), closes [#root](https://github.com/nolotus/bun-nolo/issues/root)
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


## 0.45.0-alpha.1

## 0.45.0-alpha.1 (2026-08-30)

### Features

* **cli:** mark startup rate-limit cooldown for agent runs ([8461e17](https://github.com/nolotus/bun-nolo/commit/8461e17a743794a48b7d8e90df2dbcb83e0a385e))


## 0.44.0-alpha.2

## 0.44.0-alpha.2 (2026-08-30)

### Bug Fixes

* **cli:** dialog read falls back to NOLO_HOME data dir, lock errors stay distinct ([793e38d](https://github.com/nolotus/bun-nolo/commit/793e38d5f57a671a0a5f8a2c6f25d51ec7780c71))


## 0.44.0-alpha.1

## 0.44.0-alpha.1 (2026-08-30)

### Features

* **ai:** 通用派发纪律上移注入层（基线钉数字 + 同家族降级 reviewer） ([4da0f39](https://github.com/nolotus/bun-nolo/commit/4da0f39c66c20b6c9f059b910b577a60ac53f38b))

### Bug Fixes

* **stylex:** 显式合并 stylex.props className 与手写 hook 类，修复 composer 裸样式回归 ([cd48dfe](https://github.com/nolotus/bun-nolo/commit/cd48dfe3999ffbfbc250461133550be457671d94))


## 0.43.0-alpha.1

## 0.43.0-alpha.1 (2026-08-30)

### Features

* **auth:** gate Kimi K3 behind GPT Pro 199 recharge tier, add fable to tier ([814d5fa](https://github.com/nolotus/bun-nolo/commit/814d5fadf84f4afebab974382a9d7e6af4076bb8))
* **chat:** switch web TUI default nolo agent to glm-5-3-flash ([b706e41](https://github.com/nolotus/bun-nolo/commit/b706e4170ee2c77249d7b7dcfa6622782e8cc9e9))


## 0.42.0-alpha.1

## 0.42.0-alpha.1 (2026-08-30)

### Features

* **llm:** switch GLM 5.3/5.2 hosted upstream from OpenRouter to crof ([467bde9](https://github.com/nolotus/bun-nolo/commit/467bde9307aed37c36551566248ec0e270605523))


## 0.41.0-alpha.1

## 0.41.0-alpha.1 (2026-08-30)

### Features

* **usage:** split usage stats by billing category (platform vs subscription) ([6a6ed41](https://github.com/nolotus/bun-nolo/commit/6a6ed41ff04d43d17dac9f03d784d46d465d3dcc))


## 0.40.0-alpha.3

## 0.40.0-alpha.3 (2026-08-30)

### Bug Fixes

* **agent:** expose 429-unavailable agents via unavailableAgents in listAgents ([cd74892](https://github.com/nolotus/bun-nolo/commit/cd748920850221603307cc5c3df81d97a1bd1a56))
* **agent:** follow-ups 两卡——loop.test 考古修绿 + 版本闸门三层 detail 贯通 ([57da67d](https://github.com/nolotus/bun-nolo/commit/57da67d7922d9a9b111039fc01cd002e853228e2))


## 0.40.0-alpha.2

## 0.40.0-alpha.2 (2026-08-30)

### Bug Fixes

* **agent:** 客户端版本闸门——旧客户端用不了的新模型明确拒绝并提示升级 ([35b29cb](https://github.com/nolotus/bun-nolo/commit/35b29cbfa10a8fa30035d102ec2fcd661c708a77))
* **chat:** 历史截断轮归一化 trim 加固与半截正文轮边界沉淀 ([651d0f9](https://github.com/nolotus/bun-nolo/commit/651d0f9d156de11d8353bf820148984948247005))
* **stylex:** 关闭 CSS layers 并按对手实际特异性消解 292 条级联冲突 ([d15a59b](https://github.com/nolotus/bun-nolo/commit/d15a59b8e3c5bbc444cc8f8825c6bd0559303c82))


## 0.40.0-alpha.1

## 0.40.0-alpha.1 (2026-08-30)

### Features

* **agent-runtime:** ProcessTask 工具层四件套（异步任务 Phase 1） ([edf5e3d](https://github.com/nolotus/bun-nolo/commit/edf5e3d3cc9ccb6ca01696123117746f8e529a0c))


## 0.39.0-alpha.1

## 0.39.0-alpha.1 (2026-08-30)

### Features

* **agent-runtime:** 事件表保留策略与 killed 归属裁决固化 ([e5553e8](https://github.com/nolotus/bun-nolo/commit/e5553e83ef63a4b8290c0e6e16508c8c839083d6))

### Bug Fixes

* **agent-runtime:** transient 守卫下沉进 processRegistry.kill() ([53556fb](https://github.com/nolotus/bun-nolo/commit/53556fbf44d596c1073fe231c653b4b9a709ae1a))
* **agent:** listAgents 默认精简投影，防止 agentKey 被截断丢失 ([7b40454](https://github.com/nolotus/bun-nolo/commit/7b4045444bc7bdbc4738a2b6a66b93b648e9732f))
* **chat:** 历史截断轮的 reasoning_content 装载期归一化，打通思考折叠展示 ([c4c71a5](https://github.com/nolotus/bun-nolo/commit/c4c71a57dcad9ff23cdea890f22164b947d139ae))
* **cli:** readDialog 本地命中不再因冗余 dbKey 偏差被丢弃 ([339a3b0](https://github.com/nolotus/bun-nolo/commit/339a3b079314b142fd46ea9189446a7eb7bdeff3))
* **tui:** dock 面板发现宿主工具派发的本地 run ([4d03b58](https://github.com/nolotus/bun-nolo/commit/4d03b58184fe5244d87daaaffaa63ab3816df6d9))


## 0.38.0-alpha.5

## 0.38.0-alpha.5 (2026-08-30)

### Bug Fixes

* **agent:** 流截断语义三分——reasoning 落盘、失败轮可观测、半截输出告警 ([f870afb](https://github.com/nolotus/bun-nolo/commit/f870afb3cb82d4f76864e9d7f32992f5ac0e1d7c))


## 0.38.0-alpha.4

## 0.38.0-alpha.4 (2026-08-30)

### Bug Fixes

* **agent-runtime:** 平台 Responses 线误发 stream_options.include_usage 致上游 400 ([86c2d6a](https://github.com/nolotus/bun-nolo/commit/86c2d6abdec191c19521d4a2392f3f6dd90fd459))
* **agent:** 平台托管 K3 本地直连 quirk 缺失与 usage provider 双出口统一 ([853dbdd](https://github.com/nolotus/bun-nolo/commit/853dbdd5ec477c39a39816319c3f2a833181f7e7))


## 0.38.0-alpha.3

## 0.38.0-alpha.3 (2026-08-30)

### Bug Fixes

* **cli:** custom agent 无 credentialRef 时 429 冷却落盘，恢复 cooldown gate ([8b80c64](https://github.com/nolotus/bun-nolo/commit/8b80c64b0cbc48853fe852ec25997dcc69f568a5))


## 0.38.0-alpha.2

## 0.38.0-alpha.2 (2026-08-30)

### Bug Fixes

* **security:** ssr-selfcheck 端点部署级 token 门控 + routing 降级可见性 ([f11200a](https://github.com/nolotus/bun-nolo/commit/f11200ac9e66046784a7a4e8307a0b8dfbc5420e))


## 0.38.0-alpha.1

## 0.38.0-alpha.1 (2026-08-30)

### Features

* **cli:** PLATFORM_LLM_BUSY(服务器紧张) 自动重试与 busy 文案瘦身 ([17055c4](https://github.com/nolotus/bun-nolo/commit/17055c482034c1427f6e050aefef6cc04cb98e9e))


## 0.37.0-alpha.4

## 0.37.0-alpha.4 (2026-08-30)

### Bug Fixes

* **routing:** 路由钩子 SSR-safe 化，修复 /agents SSR 500（StyleX 迁移事故收尾） ([efd5aa7](https://github.com/nolotus/bun-nolo/commit/efd5aa740f17b213522e1bcb4d7656c15048b0ee))


## 0.37.0-alpha.3

## 0.37.0-alpha.3 (2026-08-30)

### Bug Fixes

* **tui:** emit chat image preview in non-interactive (pipe) mode ([e6ef272](https://github.com/nolotus/bun-nolo/commit/e6ef272152a5715460b60d46d311101ce6a17047))


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
