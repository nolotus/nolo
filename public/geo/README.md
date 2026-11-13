# DB-IP Lite Country 数据目录

| 文件 | 说明 |
|---|---|
| `dbip-country.mmdb` | DB-IP Lite Country 月度库（CC BY 4.0） |
| `dbip-country.meta.json` | 来源、版本、sha256、许可（由更新命令写入） |
| `LICENSE.dbip.md` | 许可与署名要求 |

## 更新（手动、窄命令）

```bash
bun run ops:update-dbip-country                 # 取当前月份
bun run ops:update-dbip-country -- --month=2026-11
```

- 固定 HTTPS 上游 `download.db-ip.com`；重定向必须留在同一 host（离开即 fail-closed）。
- 下载与解压都有流式体积上限；校验 MMDB 元数据与真实 fixture 后才原子替换。
- 运行期服务只读本地文件，**无外网**。

## 生效与缓存（运维须知）

`packages/auth/server/countryLookup.ts` 在进程内**懒加载一次**并缓存 reader：

- 更新库文件后，**必须重启服务进程**才能生效。本仓库不造热更新服务，也不接入 CI 定时任务。
- 服务运行期间不会重新读盘；首次查询在请求路径内同步读盘（约 8.5MB，量级 ms）。
