import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// AdvancedSettingsTab 拆成三个组件后，source contract 分文件检查。
const modelSource = readFileSync(join(import.meta.dir, "ModelSourceSection.tsx"), "utf8");
const runtime = readFileSync(join(import.meta.dir, "AdvancedRuntimeSection.tsx"), "utf8");
const params = readFileSync(join(import.meta.dir, "ModelParamsSection.tsx"), "utf8");

describe("AdvancedSettingsTab 拆分后的 source contract", () => {
  describe("ModelSourceSection（模型来源 + 机器绑定）", () => {
    it("preserves a machine preselection from create-agent query params while machines load", () => {
      expect(modelSource).toContain("selectedMachineOption");
      expect(modelSource).toContain("machineOptionsWithSelection");
      expect(modelSource).toContain("selectedMachineId");
      expect(modelSource).toContain("machineOptionsWithSelection.map");
      expect(modelSource).toContain("预选电脑");
    });

    it("clears machine binding only when the CLI provider changes", () => {
      expect(modelSource).toContain('set("machineId", "")');
      expect(modelSource).toContain('set("model", "")');
    });

    it("auto-selects the only compatible connected machine for CLI agents", () => {
      expect(modelSource).toContain("machineOptions.length !== 1");
      expect(modelSource).toContain('set("machineId", machineOptions[0].machineId');
    });

    it("maps qoder, opencode, grok, and kimi CLI providers to their machine capabilities", () => {
      expect(modelSource).toContain('from "ai/agent/cliProviders"');
      expect(modelSource).toContain("CLI_CAPABILITY_BY_PROVIDER");
      const cliProvidersSource = readFileSync(
        join(import.meta.dir, "../cliProviders.ts"),
        "utf8",
      );
      expect(cliProvidersSource).toContain('qoder: "qoder-cli"');
      expect(cliProvidersSource).toContain('opencode: "opencode-cli"');
      expect(cliProvidersSource).toContain('grok: "grok-cli"');
      expect(cliProvidersSource).toContain('kimi: "kimi-cli"');
      expect(modelSource).toContain('value: "kimi"');
      expect(modelSource).toContain("Kimi Code CLI（kimi）");
    });

    it("treats custom localhost providers as machine-bindable runtime candidates", () => {
      expect(modelSource).toContain("isMachineBoundLocalCustomProvider");
      expect(modelSource).toContain("当前设备本地直连");
      expect(modelSource).toContain(
        "远程 web / 手机端会通过这个 Agent 使用目标机器自己的 127.0.0.1"
      );
    });

    it("derives defaultInteractionMode from the selected model instead of a manual picker", () => {
      expect(modelSource).toContain('from "ai/agent/isVoiceModel"');
      expect(modelSource).toContain("isVoiceModel(");
      expect(modelSource).toContain('"defaultInteractionMode"');
      expect(modelSource).toContain('"live_audio"');
      expect(modelSource).toContain('"text"');
    });
  });

  describe("AdvancedRuntimeSection（托管执行授权）", () => {
    it("exposes hosted exec as an advanced explicit runtime policy toggle", () => {
      expect(runtime).toContain("allowHostedExec");
      expect(runtime).toContain("showHostedExecRuntimeControl");
      expect(runtime).toContain("runtimeToolPolicy");
      expect(runtime).toContain("Alpha 托管执行授权");
      expect(runtime).toContain("!isCliApi && !isMachineBoundLocalCustomProvider");
      expect(runtime).toContain("execShell");
      expect(runtime).toContain('workspace: { mode: "lease" }');
      expect(runtime).toContain("Alpha");
      expect(runtime).not.toContain("Agent Spec");
      expect(runtime).not.toContain("specPageKey");
    });

    it("explains hosted exec authorization in user-facing alpha evidence language", () => {
      expect(runtime).toContain("托管临时工作区");
      expect(runtime).toContain("脚本/命令");
      expect(runtime).toContain("普通用户保持关闭也不影响聊天");
      expect(runtime).toContain("当你想把重复任务固化成脚本/命令能力时再开启");
      expect(runtime).toContain("唯一授权来源是 runtimeToolPolicy");
      expect(runtime).toContain("不是完整生产沙箱");
      expect(runtime).toContain("执行证据会写入对话");
      expect(runtime).toContain("AgentPage 高级证据");
      expect(runtime).not.toContain("Agent Spec");
    });
  });

  describe("ModelParamsSection（max_tokens 参数）", () => {
    it("renders max_tokens as a follow-model-default placeholder when unset, not a 4096 slider", () => {
      expect(params).toContain("isUnset");
      expect(params).toContain("maxTokensFollowModelDefault");
      expect(params).not.toContain('"跟随模型默认');
      expect(params).not.toContain('"自定义"');
      expect(params).toContain("MAX_TOKENS_LIMIT");
      expect(params).not.toMatch(/max:\s*128000\b/);
    });

    it("pairs a numeric input with the slider, both bound to the same field and shared MAX_TOKENS_LIMIT", () => {
      expect(params).toContain("Input");
      expect(params).toContain('type="number"');
      expect(params).toContain("min={c.min}");
      expect(params).toContain("max={c.max}");
      expect(params).toContain("maxTokensRange");
      expect(params).toContain("MAX_TOKENS_LIMIT");
      expect(params).not.toMatch(/max:\s*500000\b/);
      expect(params).not.toMatch(/min:\s*500000\b/);
    });

    it("clears max_tokens with null, not undefined, so edit mode actually deletes the field", () => {
      // RHF 退役后 field.onChange(null) → setField(null)，setField = (v) => set(fieldName, v)
      expect(params).toContain("setField(null)");
      expect(params).not.toContain("setField(undefined)");
    });

    it("does not write a hardcoded value when the user clicks the custom button for max_tokens", () => {
      expect(params).toContain("maxTokensExpanded");
      expect(params).toContain("setMaxTokensExpanded");
      expect(params).toContain("isExpanded");
      expect(params).toContain("(fieldValue ?? c.default)");
      expect(params).not.toContain("field.onChange(c.default as number)");
    });
  });
});
