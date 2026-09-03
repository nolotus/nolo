// packages/ai/tools/agent/agentRunToolSchemaVariants.test.ts
//
// 工具表按宿主能力裁剪后的 schema 断言。
//
// 这两个裁剪修的是同一类毛病：schema 承诺了执行器/环境兑现不了的东西。
// startAgentRun 的 wait 在 cli-local 是空头承诺（执行器根本不读）；
// controlAgentRun 的 wait 在有终态唤醒的宿主是纯冗余，而它的超时返回值
// 与 run 进程超时共用 `status` 字段，留着就得反复解释「等超时 ≠ 它失败」。
import { describe, expect, it } from "bun:test";

import {
  CONTROL_AGENT_RUN_ACTIONS,
  buildControlAgentRunFunctionSchema,
  controlAgentRunFunctionSchema,
} from "./controlAgentRunTool";
import {
  buildStartAgentRunFunctionSchema,
  startAgentRunFunctionSchema,
} from "./startAgentRunTool";

const actionsOf = (schema: any): string[] => schema.parameters.properties.action.enum;
const propsOf = (schema: any): string[] => Object.keys(schema.parameters.properties);

describe("controlAgentRun schema 变体", () => {
  it("缺省给全集——服务端与无唤醒宿主原样保留 wait", () => {
    expect(actionsOf(controlAgentRunFunctionSchema)).toEqual([...CONTROL_AGENT_RUN_ACTIONS]);
    expect(propsOf(controlAgentRunFunctionSchema)).toContain("timeoutMs");
    expect(controlAgentRunFunctionSchema.description).toContain("阻塞等待（wait action）");
  });

  it("裁掉 wait 时：动作、参数、描述三处一起消失", () => {
    const schema = buildControlAgentRunFunctionSchema({
      actions: CONTROL_AGENT_RUN_ACTIONS.filter((a) => a !== "wait"),
    });
    expect(actionsOf(schema)).not.toContain("wait");
    // timeoutMs 是 wait 专属参数，留着就是给一个不存在的动作配旋钮。
    expect(propsOf(schema)).not.toContain("timeoutMs");
    expect(schema.parameters.properties.action.description).not.toContain("wait=");
    expect(schema.description).not.toContain("阻塞等待（wait action）");
    expect(schema.description).toContain("没有阻塞等待动作");
  });

  it("裁剪只动 wait，其余动作与参数原样保留", () => {
    const schema = buildControlAgentRunFunctionSchema({
      actions: CONTROL_AGENT_RUN_ACTIONS.filter((a) => a !== "wait"),
    });
    for (const action of ["list", "status", "stop", "todo", "append"]) {
      expect(actionsOf(schema)).toContain(action);
    }
    for (const prop of ["runId", "dialogKey", "userInput", "mode", "tailLines", "batchId", "limit", "offset"]) {
      expect(propsOf(schema)).toContain(prop);
    }
    expect(schema.parameters.required).toEqual(["action"]);
  });
});

describe("startAgentRun schema 变体", () => {
  it("缺省保留同步派发（服务端执行器实现了它）", () => {
    expect(propsOf(startAgentRunFunctionSchema)).toContain("wait");
    expect(propsOf(startAgentRunFunctionSchema)).toContain("resultMode");
  });

  it("supportsWait:false 去掉 wait/resultMode 与顶层同步承诺", () => {
    const schema = buildStartAgentRunFunctionSchema({ supportsWait: false });
    expect(propsOf(schema)).not.toContain("wait");
    expect(propsOf(schema)).not.toContain("resultMode");
    expect(schema.description).not.toContain("wait:true");
    // 派发本身不受影响。
    expect(schema.parameters.required).toEqual(["agentKey", "task"]);
    expect(propsOf(schema)).toContain("agentKey");
    expect(propsOf(schema)).toContain("batchId");
    expect(propsOf(schema)).toContain("ephemeral");
  });
});
