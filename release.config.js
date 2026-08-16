// semantic-release 配置切换器。
// 默认导出 desktop 发布配置；CLI 发布流水线用 NOLO_RELEASE_CONFIG=cli 选择 CLI 配置。
// 注意：semantic-release 的 CLI `--extends` 只解析配置文件内的 extends，
// 命令行传入会被静默忽略，所以不要靠 --extends 选配置（2026-07-29 踩坑实录）。
const config =
  process.env.NOLO_RELEASE_CONFIG === "cli"
    ? require("./.releaserc.cli.json")
    : require("./.releaserc.desktop.json");

module.exports = config;
