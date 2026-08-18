// packages/ai/tools/agent/agentTestMocks.ts
//
// agent 工具套件（controlAgentRunTool / startAgentRunTool / agentOrchestrationScenario）
// 的共享测试 mock。
//
// 背景：三个测试文件在同一个 bun test 进程里合并执行（不带 --isolate）时，
// mock.module 对同一模块的替换是「先注册者生效」——后注册的工厂不会覆盖已
// 生效的替换。若每个文件各自 mock 且导出集合不同，合并执行会报
// `SyntaxError: Export named 'xxx' not found`（例如 startAgentRunTool.test.ts
// 的 mock 只导出 runAgentBackground，导致 controlAgentRunTool.ts 静态导入
// listenToDialogEvents 失败；反之亦然）。
//
// 因此把被 mock 的两个模块（../toolApiClient、ai/agent/runAgentBackground）的
// mock 收敛到这里：三个测试文件注册完全相同的工厂、引用同一组函数与记录数组，
// 无论哪份注册生效，导入与行为都一致。每个文件在 beforeEach 里通过
// setXxxImpl / setApiHandler / setToolRequestContextConfig 配置自己需要的实现。
//
// 本文件不是 *.test.ts，不会被 bun test 当作测试文件执行。

export interface ToolApiCallRecord {
    path: string;
    body: any;
    options?: any;
}

// ── callToolApi / getToolRequestContext（../toolApiClient）──────────────────

export const lastApiCalls: ToolApiCallRecord[] = [];

let apiHandler: ((body: any) => any) | null = null;
export function setApiHandler(fn: ((body: any) => any) | null): void {
    apiHandler = fn;
}

/** callToolApi 的共享 mock：记录调用，并把响应委托给当前 apiHandler。 */
export async function callToolApiMock(_thunkApi: any, path: string, body: any, options?: any): Promise<any> {
    lastApiCalls.push({ path, body, options });
    if (apiHandler) return apiHandler(body);
    return { ok: true, data: {} };
}

export interface ToolRequestContextShape {
    currentServer: string;
    token: string | null;
    baseUrl: string;
}

// 不同测试文件需要不同的 server/token（control 用 test.example/test-token，
// scenario 用 scenario.test/null）。mock 函数读共享可变配置，beforeEach 里用
// setToolRequestContextConfig 覆盖。
export const toolRequestContextConfig: ToolRequestContextShape = {
    currentServer: "https://test.example",
    token: "test-token",
    baseUrl: "https://test.example",
};

export function setToolRequestContextConfig(cfg: Partial<ToolRequestContextShape>): void {
    Object.assign(toolRequestContextConfig, cfg);
}

export function getToolRequestContextMock(): ToolRequestContextShape {
    return { ...toolRequestContextConfig };
}

// ── runAgentBackground（ai/agent/runAgentBackground）────────────────────────

export const lastRunAgentBackgroundCalls: any[] = [];

let runAgentBackgroundImpl: ((args: any) => any) | null = null;
export function setRunAgentBackgroundImpl(fn: ((args: any) => any) | null): void {
    runAgentBackgroundImpl = fn;
}

export function runAgentBackgroundMock(args: any): any {
    lastRunAgentBackgroundCalls.push(args);
    if (runAgentBackgroundImpl) return runAgentBackgroundImpl(args);
    return {
        type: "agent/runBackground/pending",
        meta: { arg: args },
        unwrap: () => Promise.resolve({ dialogId: "dialog-test-1", status: "pending" }),
    };
}

export type ListenToDialogEventsArgs = [
    dialogId: string,
    currentServer: string,
    authHeader: string,
    signal: AbortSignal,
    onStatusChange?: (status: string) => void,
    onDone?: (result: { dialogId: string; content?: string; usage?: unknown }) => void,
    onFailed?: (error: string) => void,
];

export const lastListenToDialogEventsCalls: ListenToDialogEventsArgs[] = [];

let listenToDialogEventsImpl: ((...args: any[]) => Promise<any>) | null = null;
export function setListenToDialogEventsImpl(fn: ((...args: any[]) => Promise<any>) | null): void {
    listenToDialogEventsImpl = fn;
}

/**
 * listenToDialogEvents 的共享 mock。默认模拟真实实现：收到即触发 onDone 并
 * resolve（与真实实现的 done 事件行为一致）。需要超时挂起 / failed 事件 /
 * abort 中断的测试通过 setListenToDialogEventsImpl 覆盖。
 */
export async function listenToDialogEventsMock(...args: ListenToDialogEventsArgs): Promise<any> {
    lastListenToDialogEventsCalls.push(args);
    if (listenToDialogEventsImpl) return listenToDialogEventsImpl(...args);
    const [dialogId, , , , , onDone] = args;
    const result = { dialogId, content: "子任务完成结果", usage: {} };
    onDone?.(result);
    return result;
}

export function resetAgentTestMocks(): void {
    lastApiCalls.length = 0;
    lastRunAgentBackgroundCalls.length = 0;
    lastListenToDialogEventsCalls.length = 0;
    apiHandler = null;
    runAgentBackgroundImpl = null;
    listenToDialogEventsImpl = null;
    toolRequestContextConfig.currentServer = "https://test.example";
    toolRequestContextConfig.token = "test-token";
    toolRequestContextConfig.baseUrl = "https://test.example";
}
