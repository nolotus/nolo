/**
 * Platform-owned `android-adb` built-in skill.
 *
 * Android ADB 设备调试与测试通用指导规范。
 * 内容全部来自代码，经 builtinSkillRegistry 暴露给 Web、Desktop、CLI、TUI 等端。
 *
 * 来源标注与参考声明：
 * - 官方文档：https://developer.android.com/tools/adb
 * - 测试流程与最佳实践借鉴：https://github.com/skydoves/android-testing-skills
 *   （只借鉴测试与排错流程，原创独立表述，不复制整文）
 * - 可选参考：https://github.com/dayanruben/android-use
 *   （仅作为自动化工具思路参考，严禁自动下载或安装其 CLI）
 */

import {
  buildSkillDocMarkdown,
  type SkillDocConfig,
} from "./skillDocProtocol";

export const ANDROID_ADB_SKILL_SLUGS = ["android-adb"] as const;

export type AndroidAdbSkillSlug = (typeof ANDROID_ADB_SKILL_SLUGS)[number];

function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}

function normalizeSkillSeed(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildAndroidAdbSkillId(slug: AndroidAdbSkillSlug): string {
  return deterministicId("01SK", normalizeSkillSeed(slug) || slug);
}

export function buildAndroidAdbSkillPageKey(
  userId: string,
  slug: AndroidAdbSkillSlug,
): string {
  return `page-${userId}-${buildAndroidAdbSkillId(slug)}`;
}

export function buildAndroidAdbSkillConfig(
  slug: AndroidAdbSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildAndroidAdbSkillId(slug),
    name: "Android ADB 设备调试与测试（android-adb）",
    triggerMode: "explicit",
    description:
      "Android ADB 设备连接、界面调试与自动化测试通用规范。触发词：adb、android-adb、安卓调试、安卓测试、uiautomator、logcat、真机调试。注意：必须具备宿主执行器+ADB CLI+授权设备，网页端启用此技能不等于可控制手机。",
  };
}

const BODY = `# Android ADB 设备调试与测试规范 (android-adb)

通用 Android 设备控制、交互调试与自动化测试指导规范。

---

## 1. 运行前提与能力边界

- **执行环境要求**：本规范必须在具有**宿主执行器（Local Runtime）**、**ADB CLI 工具**以及**物理/网络连接且已授权的 Android 设备**下才能生效。
- **环境明确性**：在纯 Web 端或无宿主执行器的会话中开启本 Skill 仅加载操作指引与安全规范，**网页启用不等于可以控制手机**。若当前执行环境缺少宿主执行器或 ADB，应直接如实提示环境缺失，不得假装已连接设备。
- **不授予新工具**：本技能本身不附加专用控制工具，纯粹依托工作区已授权的受限命令执行环境；严禁突破系统沙盒权限。

---

## 2. 来源标注与第三方参考

- **官方真值**：[Android Debug Bridge (adb)](https://developer.android.com/tools/adb) 官方文档。
- **流程借鉴**：[android-testing-skills (skydoves)](https://github.com/skydoves/android-testing-skills) —— 本规范仅借鉴其测试与故障诊断工作流，内容为独立原创表述，不复制整文。
- **可选参考**：[android-use (dayanruben)](https://github.com/dayanruben/android-use) —— 仅作为自动化交互思路的可选参考，**严禁自行或自动下载、安装任何第三方 CLI 或脚本**。

---

## 3. 设备连接、探针与稳定性验证

1. **先验版本与可用性**：在执行任何设备动作前，先运行 \`adb version\` 或 \`adb help\` 确认命令可用。
2. **多设备显式指定 Serial**：存在设备或多实例环境时，所有 adb 命令必须显式带上 \`-s <serial>\`，严禁发起无目标的广播式或歧义命令。
3. **连通性超时验真**：当 \`adb devices\` 显示设备处于 \`device\` 状态后，必须使用带硬超时的命令进行实际交互验真（例如 \`timeout 5 adb -s <serial> shell echo __ready__\`），命令返回且包含标记才证明 shell 通信正常。
4. **离线处理原则**：遇到 \`offline\` 或 \`unauthorized\` 状态时，应当引导检查物理 USB 连接线、集线器/接口接触、开发者选项以及设备端授权弹窗，**严禁反复刷授权请求或盲目升级/降级 ADB 版本**。
5. **服务稳定性与密钥保护**：
   - **严禁删除 ADB 密钥**：禁止删除或修改宿主上的 \`~/.android/adbkey\` 与 \`~/.android/adbkey.pub\`。
   - **严禁擅自 kill-server**：禁止自行执行 \`adb kill-server\`，避免暴力打断宿主机上其它正在进行的调试、编译或自动化进程。

---

## 4. UI 树检索、元素定位与渲染降级

1. **UI 树拉取与有效性验证**：
   - 提取界面层级必须先取回宿主机本机解析：使用 \`adb -s <serial> exec-out uiautomator dump /dev/tty\` 或拉取到临时文件。
   - **严守输出有效性**：若输出内容为空、无有效 XML 结构或返回错误，绝不能当成 dump 成功。必须检查当前应用是否允许 dump 或回退重试。
2. **定位基准与坐标新鲜性**：
   - 优先依据 \`resource-id\`、\`text\`、\`content-desc\` 等语义属性定位控件。
   - 计算得到的绝对坐标仅在**当前这一帧且界面未滚动/未变化**时有效（坐标具有瞬态新鲜性）。严禁跨屏、跨动作复用历史坐标。
3. **Flutter / 跨平台自定义绘制降级**：
   - 当遇到 Flutter、Compose 或自绘引擎导致无语义 Accessibility 节点、无法读取有效 UI 树时，**诚实使用截图（\`screencap\`）fallback 降级**，辅助视觉判断。
   - **严禁虚构控件元素**，不得在没有元素支持的情况下捏造交互能力。

---

## 5. 操作回读与自动化节制

1. **一次操作后必须状态回读**：下发点击、输入、按键或滑动手势后，ADB shell 命令返回成功仅仅代表内核接收了事件，**不等于 UI 已完成过渡或达到稳定状态**。必须等待并回读界面状态（如检查焦点 Activity、重新 dump 界面关键文本或控件）。
2. **禁止盲打叠命令**：同屏具有先后依赖的操作，严禁未经验证就连续发送一长串命令。
3. **只读操作合并**：对多个无依赖的只读查询（如查询分辨率、电池、系统属性、前台 Activity），应当合并单次调用以降低往返开销。

---

## 6. 安全红线、数据隐私与权限保护

1. **命令限时有界**：所有 ADB shell 命令必须设定超时上限（如 \`timeout <seconds>\`），避免阻塞挂死。
2. **日志脱敏与定向过滤**：抓取 \`logcat\` 时必须按目标应用包名（package name）或子进程 PID 定向过滤（如 \`logcat -d\` 配合包名 TAG），主动过滤并屏蔽手机号、验证码、Token、密码及隐私凭据。
3. **屏幕与数据最小化**：仅截取与导出问题诊断所必需的屏幕局部或日志片段，不进行无意义的全盘导出。
4. **高危动作人工确认门**：凡涉及应用卸载、数据清空（\`pm clear\`）、文件删除（\`rm\`）、系统设置修改、转账支付、短信发送等敏感操作，必须严格遵循上层确认门，向用户展示完整清单并获得明确同意后方可进行。
5. **权限与凭据底线**：
   - 严禁尝试读取应用私有私钥、KeyStore 或敏感凭据。
   - 不利用 ADB 漏洞突破系统权限边界。
   - 禁止在命令行参数中明文拼接动态私密凭据。
   - **严禁自动下载并执行任何远程外部脚本**。
`;

export function buildAndroidAdbSkillContentBySlug(
  slug: AndroidAdbSkillSlug,
): string {
  return buildSkillDocMarkdown({
    body: BODY,
    skillConfig: buildAndroidAdbSkillConfig(slug),
  });
}
