# CF Builder（Step 3a 产品化）

在 Cloudflare Containers 内完成的 nolo 前端生产构建器。容器内执行
`clone（只读 deploy key）→ bun install（node_modules ~2.9GB）→ bun run build → 打包产物`，
实测 standard-4 实例全流程约 **50 秒**。

## 目录

| 文件 | 作用 |
| --- | --- |
| `Dockerfile` | 容器镜像（oven/bun:1 + git/openssh-client/ca-certificates） |
| `builder-server.ts` | 容器内应用：build 逻辑 + 产物打包 + `/artifact` 流式下载 |
| `worker.ts` | Worker 转发层（公网入口），`X-Builder-Token` 鉴权 |
| `wrangler.jsonc.template` | 部署配置模板（containers/durable_objects/migrations/instance_type） |
| `cf-builder.source.test.ts` | 源码契约测试（BUILDER_TOKEN 校验、build 同参、配置三段） |

## 部署清单

1. **登录 wrangler**
   ```bash
   wrangler login
   ```

2. **生成只读 deploy key 并加到 GitHub**
   ```bash
   ssh-keygen -t ed25519 -f /tmp/cf-builder-deploy-key -N "" -C "cf-builder"
   # 把 /tmp/cf-builder-deploy-key.pub 作为只读 deploy key 加到 nolotus/bun-nolo
   # （GitHub → Settings → Deploy keys，勾选 Read-only；不要勾 Write access）
   gh api -X POST repos/nolotus/bun-nolo/keys \
     -f title="cf-builder-deploy" \
     -f key="$(cat /tmp/cf-builder-deploy-key.pub)" \
     -F read_only=true
   ```

3. **按模板生成真实配置**
   复制 `wrangler.jsonc.template` → `wrangler.jsonc`，替换全部 `<...>` 占位符
   （worker 名 / 容器名 / 类名 / DO 绑定名，类名与绑定名必须与 `worker.ts` 顶部常量一致）。

4. **写入两个 secret（wrangler secret，勿进代码库）**
   ```bash
   # PEM 私钥内容（多行，用 heredoc / 文件管道注入）
   cat /tmp/cf-builder-deploy-key | wrangler secret put GITHUB_DEPLOY_KEY
   # 自定义强随机令牌，/build 与 /artifact 都用它鉴权
   openssl rand -hex 32 | wrangler secret put BUILDER_TOKEN
   ```

5. **部署**
   ```bash
   wrangler deploy
   ```

6. **冒烟命令**（用与第 4 步相同的 BUILDER_TOKEN 值）
   ```bash
   TOKEN="<你在第 4 步设置的 BUILDER_TOKEN>"
   WORKER="https://<YOUR_WORKER_NAME>.<你的子域>.workers.dev"

   # 健康/就绪（无需鉴权）
   curl -s "$WORKER/" 

   # 触发生产构建（POST /build 必须带 X-Builder-Token，否则 403）
   curl -s -X POST "$WORKER/build" \
     -H "X-Builder-Token: $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"branch":"alpha"}' | jq .

   # 流式下载产物 tar.gz（同样需鉴权）
   curl -s -o nolo-web-build.tar.gz -H "X-Builder-Token: $TOKEN" "$WORKER/artifact"
   tar -tzf nolo-web-build.tar.gz

   # 未带 token 必须 403（安全验证）
   curl -s -o /dev/null -w "%{http_code}\n" -X POST "$WORKER/build"   # 期望 403
   ```

7. **旧 worker 清理**（本步仅冒烟/验收用的原型 worker）
   ```bash
   wrangler delete --name cf-bun-builder-smoke2
   ```

## 安全要点

- `/build` 与 `/artifact` 均要求 `X-Builder-Token === env.BUILDER_TOKEN`，否则 403，
  且不向容器转发任何请求——workers.dev URL 是公网的，裸奔等于开放生产构建入口。
- PEM deploy key 只经 `/build` JSON body（`initKey`）注入容器，从不进 HTTP header
  （PEM 多行且超长，进 header 会失败）；`GITHUB_DEPLOY_KEY` 仅存在于 wrangler secret。

## 产物路径核查结论

原型用 4 个猜测路径找产物（`packages/web/dist`、`apps/web/dist`、`dist`、`build`），**错误**。
真实构建产物由 `scripts/dev/esBuild.js` 写在仓库根 `public/` 下，CI `package_web_artifact`
打包的真实清单为：

```
public/latest-assets.json
public/meta.json
public/assets        （由 latest-assets.json 的 basePath 决定，当前恒为 assets）
public/locales
public/route-styles
```

`builder-server.ts` 的 `/build` 已改为按此真实清单返回 `artifactPaths` 与体积，并打包成
与 CI `package_web_artifact`（`tar -czf`，仓库根相对路径）同构的 `nolo-web-build.tar.gz`，
通过 `GET /artifact` 流式下载——与 CI 打包物对齐，为 Step 3b 回传铺路。

## 后续

- nolo-ci 接线是 **Step 3b**，不在本步范围内。
- 原型 worker `cf-bun-builder-smoke2` 用完即删（见第 7 步）。

## 部署前
bun install   # 安装 @cloudflare/containers（worker.ts 依赖）
