// Synthetic child-process fixture: no provider, broker or user history.
import { runAgentRunCommand } from "../agentRunCommand";
import { writeDialog } from "./localRuntimeDialog";
import { runCliCommandWithSyncDrain } from "./cliExitSync";
const mode = process.argv[2];
const data = new Map(); let httpOkMessages = 0; let stopped = false;
const store = {read: async (k: string) => data.get(k), write: async (k: string,v: any) => data.set(k,v), batch: async (ops: any[]) => {for (const op of ops) data.set(op.key,op.value);}} as any;
const fetchImpl = async (_url: any, init: any) => {
  const key = JSON.parse(init.body).customKey;
  if (mode === "sync-timeout") await new Promise((_r, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), {once:true}));
  if (key.endsWith("-005")) await new Promise(r => setTimeout(r, 40));
  if (key.includes("-msg-")) httpOkMessages++;
  return new Response("{}", {status:200});
};
process.on("exit", code => console.log(JSON.stringify({code,httpOkMessages,stopped,localMessages:[...data.keys()].filter(k => k.includes("-msg-")).length})));
try {
await runCliCommandWithSyncDrain(() => runAgentRunCommand(["synthetic", "--msg", "synthetic", "--local", ...(mode === "stall" ? [] : ["--timeout-ms", "160"])], {
  // The watchdog must exercise the synthetic runner, not external memory recall.
  memoryRecallDisabled: true,
  env: mode === "stall" ? {NOLO_LOCAL_RUN_STALL_TIMEOUT_MS:"160"} : {}, scriptDir: "/synthetic", output: {write() {}},
  runner: async (options: any) => {
    await writeDialog({store,input:{agentKey:"synthetic",messages:Array.from({length:9},()=>({role:"user",content:"synthetic"})),result:{content:"done",model:"synthetic",provider:"synthetic"}} as any,userId:"synthetic",now:()=>1000,createId:()=>"synthetic",env:{NOLO_SERVER:"https://sync.test",AUTH_TOKEN:"synthetic"},fetchImpl,titleGenerator:null});
    if (mode === "runner-hung") return await new Promise(() => {});
    await new Promise<void>(resolve => {
      if (options.abortSignal?.aborted) return resolve();
      options.abortSignal?.addEventListener("abort",()=>resolve(),{once:true});
    });
    stopped = true; return {exitCode:1};
  },
}), {exit: code => process.exit(code), output:process.stderr, timeoutMs:mode === "success" || mode === "stall" ? 3000 : 80});
} catch { process.exit(70); }
