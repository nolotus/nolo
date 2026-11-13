# DB-IP Lite Country — 数据许可

本目录的 `dbip-country.mmdb` 是 **DB-IP Lite Country** 数据库（月度更新）。

- 上游来源：<https://download.db-ip.com/free/dbip-country-lite-YYYY-MM.mmdb.gz>
- 许可：**Creative Commons Attribution 4.0 International（CC BY 4.0）**
- 许可全文：<https://creativecommons.org/licenses/by/4.0/legalcode>
- DB-IP 许可说明：<https://db-ip.com/db/lite.php>

## 许可要求（摘要）

DB-IP Lite 数据库以 Creative Commons Attribution License 分发。你可以在应用中使用本数据库，
但**必须对 DB-IP.com 的数据给出署名**。对 Web 应用而言，**必须在展示或使用该数据库结果的页面上
包含一个指回 DB-IP.com 的链接**，例如：

```html
<a href="https://db-ip.com">IP Geolocation by DB-IP</a>
```

本增长统计页已按此要求展示该署名。完整义务以 CC BY 4.0 法律文本为准
（<https://creativecommons.org/licenses/by/4.0/legalcode>）。

## 元数据与校验

来源、版本、SHA-256 与许可信息见同目录 `dbip-country.meta.json`。该文件由
`bun run ops:update-dbip-country` 在下载并校验 MMDB 后写入；数据库文件在构建产物中随
`public/` 一并携带，运行期不访问外网。

> 国家/地区是基于注册时网络所在地的估计，并非国籍；VPN 或网络代理可能影响结果。
