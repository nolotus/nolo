import {
  fetchAgentContexts
} from "/public/assets/chunks/chunk-BMK35M7O.js";
import {
  generateRequestBody,
  performFetchRequest
} from "/public/assets/chunks/chunk-KF3GADC7.js";
import {
  mergeReferences
} from "/public/assets/chunks/chunk-IDOLQ4EL.js";
import "/public/assets/chunks/chunk-CD3MPOQP.js";
import {
  findToolExecutor,
  getToolResultErrorData
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import "/public/assets/chunks/chunk-52ICTTPO.js";
import "/public/assets/chunks/chunk-Y3JDDU5C.js";
import "/public/assets/chunks/chunk-DMDFFSG6.js";
import "/public/assets/chunks/chunk-2XKWBRFO.js";
import "/public/assets/chunks/chunk-G4VE62AJ.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import {
  canonicalizeToolName
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import "/public/assets/chunks/chunk-RI4COCAN.js";
import "/public/assets/chunks/chunk-NJHFOS5M.js";
import "/public/assets/chunks/chunk-FCIRSLPG.js";
import "/public/assets/chunks/chunk-SSBU25HK.js";
import "/public/assets/chunks/chunk-AWGGOX2H.js";
import "/public/assets/chunks/chunk-DFTLAEUX.js";
import "/public/assets/chunks/chunk-ZV2RZQG3.js";
import "/public/assets/chunks/chunk-GIMH23VB.js";
import "/public/assets/chunks/chunk-PTH5G2FS.js";
import "/public/assets/chunks/chunk-FXT35AYA.js";
import "/public/assets/chunks/chunk-VPSYWRNH.js";
import "/public/assets/chunks/chunk-5E4522JS.js";
import "/public/assets/chunks/chunk-V2ALUAJU.js";
import {
  read,
  selectCurrentServer,
  selectIdentityToken,
  updateTokensAction
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  extractCustomId
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  getApiEndpoint
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/executeToolCall.ts
async function executeToolCall(tc, thunkApi, context) {
  const toolName = tc.function?.name ?? "";
  const toolArgs = (() => {
    try {
      return JSON.parse(tc.function?.arguments ?? "{}");
    } catch {
      return {};
    }
  })();
  try {
    const toolDefinition = findToolExecutor(toolName);
    if (!toolDefinition) {
      return `[\u5DE5\u5177 "${toolName}" \u672A\u627E\u5230]`;
    }
    const result = await toolDefinition.executor(toolArgs, thunkApi, {
      parentMessageId: context?.parentMessageId ?? ""
    });
    const raw = result?.rawData ?? result;
    return typeof raw === "string" ? raw : JSON.stringify(raw);
  } catch (err) {
    console.error(`[executeToolCall] tool "${toolName}" \u6267\u884C\u5931\u8D25:`, err);
    const structured = getToolResultErrorData(err);
    if (structured?.rawData !== void 0) {
      const raw = structured.rawData;
      return typeof raw === "string" ? raw : JSON.stringify(raw);
    }
    return `[\u5DE5\u5177 "${toolName}" \u6267\u884C\u5931\u8D25: ${err?.message ?? err}]`;
  }
}

// packages/ai/agent/toolFailureGuard.ts
function parseToolResult(content) {
  if (typeof content !== "string" || !content.trim()) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function pickString(value) {
  return asOptionalTrimmedString(value) ?? null;
}
function getToolError(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const error = pickString(parsed.error);
  if (error) return error;
  const message = pickString(parsed.message);
  if (message && (parsed.ok === false || parsed.success === false || parsed.status === "error")) {
    return message;
  }
  if (parsed.ok === false) return "tool returned ok=false";
  if (parsed.success === false) return "tool returned success=false";
  return null;
}
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function normalizeToolArgumentsForFailureSignature(rawArguments) {
  if (typeof rawArguments !== "string") return stableStringify(rawArguments ?? null);
  const trimmed = rawArguments.trim();
  if (!trimmed) return "";
  try {
    return stableStringify(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}
function recordConsecutiveToolFailure(guard, toolCall, toolResult, maxConsecutiveFailures = 3) {
  const parsed = parseToolResult(toolResult);
  const error = getToolError(parsed);
  if (!error) {
    guard.signature = null;
    guard.count = 0;
    return null;
  }
  const toolName = canonicalizeToolName(toolCall.function.name);
  const signature = stableStringify({
    toolName,
    arguments: normalizeToolArgumentsForFailureSignature(toolCall.function.arguments),
    error
  });
  if (signature === guard.signature) {
    guard.count += 1;
  } else {
    guard.signature = signature;
    guard.count = 1;
  }
  if (guard.count < maxConsecutiveFailures) return null;
  return [
    `\u5DF2\u505C\u6B62\u5DE5\u5177\u5FAA\u73AF\uFF1A${toolName} \u4F7F\u7528\u540C\u4E00\u7EC4\u53C2\u6570\u8FDE\u7EED ${guard.count} \u6B21\u8FD4\u56DE\u540C\u4E00\u4E2A\u9519\u8BEF\u3002`,
    `\u9519\u8BEF\uFF1A${error}`,
    "\u8BF7\u5148\u8C03\u6574\u53C2\u6570\u3001\u6362\u4E00\u79CD\u64CD\u4F5C\u8DEF\u5F84\uFF0C\u6216\u5411\u7528\u6237\u786E\u8BA4\u540E\u518D\u7EE7\u7EED\uFF1B\u4E0D\u8981\u7EE7\u7EED\u91CD\u590D\u540C\u4E00\u4E2A\u5931\u8D25\u8C03\u7528\u3002"
  ].join("\n");
}

// packages/ai/agent/runAgentClientLoop.ts
async function runAgentClientLoop(args, thunkApi) {
  const { agentKey, content, parentMessageId, billingDialogKey } = args;
  const { getState, dispatch } = thunkApi;
  const state = getState();
  const agentConfig = await dispatch(read({ dbKey: agentKey })).unwrap();
  const agentContexts = await fetchAgentContexts(
    mergeReferences(agentConfig.references, args.extraReferences),
    dispatch
  );
  const initialMessages = [{ role: "user", content }];
  const body = generateRequestBody({
    agentConfig,
    messages: initialMessages,
    userInput: typeof content === "string" ? content : JSON.stringify(content),
    contexts: agentContexts
  });
  body.stream = false;
  const messages = body.messages;
  const api = getApiEndpoint(agentConfig);
  const currentServer = selectCurrentServer(state);
  const token = selectIdentityToken(state) ?? "";
  let finalContent = "";
  let toolCallCount = 0;
  const toolFailureGuard = {
    signature: null,
    count: 0
  };
  loop:
    for (; ; ) {
      body.messages = messages;
      const response = await performFetchRequest({
        agentConfig,
        api,
        bodyData: body,
        currentServer,
        token,
        dialogId: billingDialogKey ? extractCustomId(billingDialogKey) || void 0 : void 0
      });
      const data = await response.json();
      const choice = data.choices?.[0];
      if (billingDialogKey && data?.usage) {
        await updateTokensAction(
          {
            dialogId: extractCustomId(billingDialogKey),
            dialogKey: billingDialogKey,
            usage: data.usage,
            agentConfig
          },
          thunkApi
        );
      }
      if (!choice) {
        console.warn("[runAgentClientLoop] \u54CD\u5E94\u4E2D\u627E\u4E0D\u5230 choices[0]\uFF0C\u505C\u6B62");
        break;
      }
      const assistantMsg = choice.message;
      const finishReason = choice.finish_reason ?? "";
      messages.push(assistantMsg);
      if (typeof assistantMsg.content === "string" && assistantMsg.content) {
        finalContent = assistantMsg.content;
      }
      if (!assistantMsg.tool_calls?.length || finishReason === "stop") {
        break;
      }
      for (const tc of assistantMsg.tool_calls) {
        toolCallCount++;
        const toolResultContent = await executeToolCall(tc, thunkApi, {
          parentMessageId,
          agentKey
        });
        const stopReason = recordConsecutiveToolFailure(
          toolFailureGuard,
          tc,
          toolResultContent
        );
        if (stopReason) {
          finalContent = stopReason;
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResultContent
          });
          break loop;
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: toolResultContent
        });
      }
    }
  return { content: finalContent, toolCallCount };
}
export {
  runAgentClientLoop
};
