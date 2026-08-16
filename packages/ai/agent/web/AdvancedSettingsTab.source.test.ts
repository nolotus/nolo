import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "AdvancedSettingsTab.tsx"), "utf8");

describe("AdvancedSettingsTab source contract", () => {
  it("preserves a machine preselection from create-agent query params while machines load", () => {
    expect(source).toContain("selectedMachineOption");
    expect(source).toContain("machineOptionsWithSelection");
    expect(source).toContain("selectedMachineId");
    expect(source).toContain("machineOptionsWithSelection.map");
    expect(source).toContain("预选电脑");
  });

  it("clears machine binding only when the CLI provider changes", () => {
    expect(source).toContain('setValue("machineId", "")');
    expect(source).toContain('setValue("model", "")');
  });

  it("auto-selects the only compatible connected machine for CLI agents", () => {
    expect(source).toContain("machineOptions.length !== 1");
    expect(source).toContain('setValue("machineId", machineOptions[0].machineId');
  });

  it("maps qoder, opencode, grok, and kimi CLI providers to their machine capabilities", () => {
    // CLI_CAPABILITY_BY_PROVIDER is extracted to the shared cliProviders.ts
    // single authority; AdvancedSettingsTab imports it rather than redefining.
    expect(source).toContain('from "ai/agent/cliProviders"');
    expect(source).toContain("CLI_CAPABILITY_BY_PROVIDER");
    expect(source).toContain("type CliProvider");
    const cliProvidersSource = readFileSync(
      join(import.meta.dir, "../cliProviders.ts"),
      "utf8",
    );
    expect(cliProvidersSource).toContain('qoder: "qoder-cli"');
    expect(cliProvidersSource).toContain('opencode: "opencode-cli"');
    expect(cliProvidersSource).toContain('grok: "grok-cli"');
    expect(cliProvidersSource).toContain('kimi: "kimi-cli"');
    expect(source).toContain('value: "kimi"');
    expect(source).toContain("Kimi Code CLI（kimi）");
  });

  it("treats custom localhost providers as machine-bindable runtime candidates", () => {
    expect(source).toContain("isMachineBoundLocalCustomProvider");
    expect(source).toContain("当前设备本地直连");
    expect(source).toContain(
      "远程 web / 手机端会通过这个 Agent 使用目标机器自己的 127.0.0.1"
    );
  });

  it("exposes hosted exec as an advanced explicit runtime policy toggle", () => {
    expect(source).toContain("allowHostedExec");
    expect(source).toContain("showHostedExecRuntimeControl");
    expect(source).toContain("runtimeToolPolicy");
    expect(source).toContain("Alpha 托管执行授权");
    expect(source).toContain("!isCliApi && !isMachineBoundLocalCustomProvider");
    expect(source).toContain("execShell");
    expect(source).toContain("workspace: { mode: \"lease\" }");
    expect(source).toContain("Alpha");
    expect(source).not.toContain("Agent Spec");
    expect(source).not.toContain("specPageKey");
  });

  it("explains hosted exec authorization in user-facing alpha evidence language", () => {
    expect(source).toContain("托管临时工作区");
    expect(source).toContain("脚本/命令");
    expect(source).toContain("普通用户保持关闭也不影响聊天");
    expect(source).toContain("当你想把重复任务固化成脚本/命令能力时再开启");
    expect(source).toContain("唯一授权来源是 runtimeToolPolicy");
    expect(source).toContain("不是完整生产沙箱");
    expect(source).toContain("执行证据会写入对话");
    expect(source).toContain("AgentPage 高级证据");
    expect(source).not.toContain("Agent Spec");
  });

  it("derives defaultInteractionMode from the selected model instead of a manual picker", () => {
    expect(source).toContain('from "ai/agent/isVoiceModel"');
    expect(source).toContain("isVoiceModel(");
    // 语音模型 → live_audio，其余 → text，在模型选择 onChange 里派生
    expect(source).toContain('"defaultInteractionMode"');
    expect(source).toContain('"live_audio"');
    expect(source).toContain('"text"');
  });

  it("renders max_tokens as a follow-model-default placeholder when unset, not a 4096 slider", () => {
    // 未设置态：显示"跟随模型默认"占位文案，不把 DEFAULT_MAX_TOKENS 当生效值显示
    expect(source).toContain("isUnset");
    // 文案走 i18n key，不内联中文兜底（漏译会把中文回显给非中文用户）
    expect(source).toContain("maxTokensFollowModelDefault");
    expect(source).not.toContain('"跟随模型默认');
    expect(source).not.toContain('"自定义"');
    // 必须引用共享上限常量，不能硬编码 128000
    expect(source).toContain("MAX_TOKENS_LIMIT");
    expect(source).not.toMatch(/max:\s*128000\b/);
  });

  it("pairs a numeric input with the slider, both bound to the same field and shared MAX_TOKENS_LIMIT", () => {
    // 精确输入框：量程 50 万配 step 1 时滑块拖不准常用值（如 8000），
    // 给一个可手动输入的数字输入框与滑块并存。
    // 输入框与滑块共享同一表单字段（field.value / field.onChange），双向同步。
    expect(source).toContain("Input");
    expect(source).toContain('type="number"');
    // 输入框 value 绑同一 field：未设置显示空、已设置显示表单值
    expect(source).toMatch(/isUnset\s*\?\s*""/);
    expect(source).toContain("String(field.value");
    // 输入框 min/max 沿用 PARAM_CONFIGS 的 c.min/c.max（即 MAX_TOKENS_LIMIT），
    // 不再硬编码任何数字上限
    expect(source).toContain("min={c.min}");
    expect(source).toContain("max={c.max}");
    // 越界用 helperText 给明确反馈，引用同一常量做兜底，不静默截断
    expect(source).toContain("maxTokensRange");
    expect(source).toContain("MAX_TOKENS_LIMIT");
    // 不允许出现新的硬编码上限数字（500000 字面量出现在常量定义处即可，
    // 组件渲染处不得再有裸 500000）
    expect(source).not.toMatch(/max:\s*500000\b/);
    expect(source).not.toMatch(/min:\s*500000\b/);
  });

  it("clears max_tokens with null, not undefined, so edit mode actually deletes the field", () => {
    // buildSubmitPayload（agentFormActions.ts）在编辑模式下把 undefined 整个删出 payload，
    // 后端于是保持旧值：界面显示「跟随模型默认」而库里旧的 max_tokens 纹丝不动。
    // 只有 null 会被保留并发给后端，patch 才能真正删掉字段；新建模式下 null 同样被剔除。
    // 这条断言在组件这一层锁住传的是 null——agentFormActions.test.ts 只覆盖了 payload
    // builder 自身的语义，改坏组件这一侧不会让它变红。
    expect(source).toContain("field.onChange(null as never)");
    expect(source).not.toContain("field.onChange(undefined as never)");
    // 空输入同样走 null（精确输入框清空时），保持与「跟随模型默认」按钮语义一致
    expect(source).toMatch(/raw === ""[\s\S]*?field\.onChange\(null as never\)/);
  });

  it("does not write a hardcoded value when the user clicks the custom button for max_tokens", () => {
    // 点「自定义」只切本地展开态，不写表单值，不标脏；
    // 滑块显示值沿用既有 ?? c.default 惯例，只有拖动 onChange 才写表单。
    expect(source).toContain("maxTokensExpanded");
    expect(source).toContain("setMaxTokensExpanded");
    expect(source).toContain("isExpanded");
    expect(source).toContain("(field.value ?? c.default)");
    // 「自定义」回调不得写默认数值进表单
    expect(source).not.toContain("field.onChange(c.default as number)");
  });
});
