import { buildSkillDocMarkdown, type SkillDocConfig } from "./skillDocProtocol";

export const MIHOME_ASSISTANT_SKILL_SLUGS = ["mihome-assistant"] as const;
type MihomeAssistantSkillSlug = (typeof MIHOME_ASSISTANT_SKILL_SLUGS)[number];

// Fixed platform identity; no database materialization or external service required.
export function buildMihomeAssistantSkillId(_slug: MihomeAssistantSkillSlug): string {
  return "builtin-mihome-assistant-v1";
}

export function buildMihomeAssistantSkillPageKey(
  userId: string,
  slug: MihomeAssistantSkillSlug,
): string {
  return `page-${userId}-${buildMihomeAssistantSkillId(slug)}`;
}

export function buildMihomeAssistantSkillConfig(
  slug: MihomeAssistantSkillSlug,
): SkillDocConfig {
  return {
    version: "0.1",
    kind: "skill",
    id: buildMihomeAssistantSkillId(slug),
    name: "米家与 Home Assistant 配置助手（mihome-assistant）",
    triggerMode: "explicit",
    description:
      "米家 App 自动化配置检查、Home Assistant（HA）兼容设备控制与状态核对。触发词：米家、智能场景、感应灯、Home Assistant、mihome。仅提供指导，不授予工具、联网或设备控制权限；需已有授权连接，不保证离线或绕过网关。",
  };
}

const BODY = `# 米家与 Home Assistant 配置助手

## 适用边界与路径选择

- 只在用户明确授权的设备与操作范围内使用。加载本技能不授予命令执行、联网、凭据访问、设备控制或自动化保存权限，不自动启用其他技能、安装插件或创建后台服务。
- **HA 兼容控制**：已有 Home Assistant 集成和授权 REST 访问时，先核对目标实体的状态、属性和支持的服务，再执行授权动作并回读。只适用于实际已暴露的能力，不等于原生米家直连。
- **米家 App 配置检查**：需要原生感应条件、灯光模式或智能场景时，使用已有且稳定的授权 Android 连接；手机连接、截图定位与操作回读遵循内置 android-adb 指引。没有宿主执行器 / ADB / 授权手机，就只能解释步骤，不能声称已操作。
- 不默认导出家庭或设备清单；只查询用户指定目标的最小必要数据。不触碰门锁、摄像头、账号凭据或其他家庭。不得把真实 serial、IP、家庭实体、配对码、截图或鉴权内容写进仓库、技能正文或公开日志。

## HA：先读能力，再控制，再验结果

1. 先核实当前 HA REST 文档与可用接口（官方参考：https://developers.home-assistant.io/docs/api/rest/），仅使用用户指定的实例和目标，不扫描网络或枚举全屋。
2. 凭据先用 nolo secret list --json 查看已有条目名称与形态，再由 nolo secret run --with <name> -- <cmd> 注入进程环境；只在进程内组装鉴权头，不把值拼进命令行或明文文件，不打印环境变量或鉴权头。已有凭据就复用，不重新登录米家或索取重复凭据。
3. 对指定 light 实体读取当前状态及 effect_list 等属性；属性存在不代表所有设备支持全部模式。阅读 / 明亮 / 夜灯等米家模式与 HA effect 不能仅凭名字认定等价，应依据实际支持列表与执行后状态核对。
4. 操作前核实该服务是否会开灯、是否改变亮度或模式；**普通设置亮度**与**设置亮度并开灯**不是同一动作。禁止把用户只调参数的请求默认为开灯。
5. 若需检查自动化，只读取指定规则。控制、保存或启用规则须在当次授权范围内；发送成功不是生效证据，回读状态 / 规则并检查用户关心的实际结果。失败须保留原错误与范围，不吞错或盲重试。

## 米家 App：观察 → 一步操作 → 回读

- 目标包名为 com.xiaomi.smarthome。导航路径可参考：目标灯 → 更多设置 → 智能场景 → 新建自动化；界面会随设备、固件和 App 版本变化，每步都要根据当前页面确认，不硬编码历史坐标。
- 先读 UI 树；有效树仍可能漏掉右上角确认按钮等控件。预期控件缺失时查看当前截图，确认按钮及屏幕状态后再点击，立即回读，不以 shell 退出 0 当作保存成功。
- 按设备当前可见选项逐项核对：感应有人 / 无人、光照条件、条件的且 / 或关系、生效时间段、无人延时与可选动作。**设备原生感应不等于日夜定时**；光照条件也不等于时钟时间。不要替设备虚构不可见的能力。
- 开灯并设置为指定模式（例如阅读 / 明亮 / 夜灯）与仅设置亮度不同；核对是否显式包含开灯动作。区分仅准备配置、保存创建、启用、手动运行及实际触发，后续动作不能由前一步成功推定。
- 保存前汇总目标、条件、时间段、延时和动作，并核实授权覆盖保存 / 启用；有歧义先停在未保存页面。扫码、人脸、验证码或风控出现时停手交用户处理，不绕过验证。

## 替代 HA 规则与离线验收

- **保留原 HA 规则，直到替代方案验收通过**。新规则可能与旧规则重复触发，任何临时停用或切换先明确影响并取得授权；不自动删旧规则、不静默更改现有行为。
- 核对场景实际执行位置：设备本地、网关本地还是云端，及对应设备 / 固件的限制。App 里能配置或执行不证明本地执行；本地执行也不证明无需网关。
- 验收应分别覆盖：规则已保存且启用、真实有人 / 无人触发、光照与时间边界、灯光动作和模式、重复 / 延迟行为。断网、网关断连等测试会影响家庭设备，需另获明确许可并制定恢复办法；没有实测就标注离线与网关依赖未验证。

## 已观察范围与未验证项

以下仅是本技能整理所依据的既有观察，不是当前会话或任意设备的运行保证：

- 既有 HA REST 鉴权通过受控 secret 注入后，读取指定 light 实体、effect_list 与自动化成功；不据此声称米家原生控制或任意 effect 已执行。
- 同一已授权手机的 USB 原生 / 旧版 / libusb 路径不稳定；切无线调试后连续多命令及米家导航成功，不把 libusb 一次成功写成修复。
- 米家灯设置中已看到有人 / 无人、光照、生效时间段、开灯并设置为指定模式（阅读 / 明亮 / 夜灯）选项。仅看到配置入口，**尚未创建、运行或完成离线验收**，不能宣称已替代 HA、已验证离线或不经网关。

## 候选资料与不采用项

- 手机交互参考：https://github.com/robbin/android-adb-control （MIT）；只原创提炼观察、单步操作与回读，不复制全文，不运行其脚本。
- https://github.com/OHPBP/Link2MiHome.skill 仅见 README 与许可证，没有可直接采用的技能实现；不声称已实测。
- https://github.com/puke3615/jarvis-skill-mihome 需要新扫码、认证缓存与第三方依赖。本路径不采用、不安装、不执行，不声称实测；不跟随其清理认证缓存等建议删除任何既有数据。
`;

export function buildMihomeAssistantSkillContentBySlug(
  slug: MihomeAssistantSkillSlug,
): string {
  return buildSkillDocMarkdown({ body: BODY, skillConfig: buildMihomeAssistantSkillConfig(slug) });
}
