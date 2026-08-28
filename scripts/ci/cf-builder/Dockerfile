# CF 容器 builder 镜像：在 Cloudflare Containers 内完成
#   clone（只读 deploy key）→ bun install → bun run build → 打包 web 产物
#
# 参考 /tmp/cf-bun-smoke 原型实测修正：
#   - 基础镜像 docker.io/oven/bun:1（实测可用；自带 bun）
#   - apt 安装 git / openssh-client / ca-certificates，clone 走 SSH 需要它们
#   - PEM deploy key 不能进 HTTP header（过长 + 换行问题），必须走 /build 的 body 传入
#   - 实例规格用 standard-4（实测 standard-4 全流程 ~50s）
#   - 容器镜像变更/代码变更后要强制换新实例（改名或删除旧实例），否则 Wrangler 复用旧镜像

FROM docker.io/oven/bun:1
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY builder-server.ts paths.ts ./
EXPOSE 8080
CMD ["bun", "builder-server.ts"]
