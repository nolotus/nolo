import {
  fetchAgentContexts
} from "/public/assets/chunks/chunk-BMK35M7O.js";
import {
  filterAndCleanMessages,
  sendOpenAICompletionsRequest
} from "/public/assets/chunks/chunk-CWCPEIOA.js";
import "/public/assets/chunks/chunk-FPYFWXR7.js";
import "/public/assets/chunks/chunk-M5DXP5RW.js";
import {
  generateRequestBody,
  performFetchRequest
} from "/public/assets/chunks/chunk-KF3GADC7.js";
import {
  mergeReferences
} from "/public/assets/chunks/chunk-IDOLQ4EL.js";
import "/public/assets/chunks/chunk-CD3MPOQP.js";
import "/public/assets/chunks/chunk-CJFHNPRU.js";
import "/public/assets/chunks/chunk-52ICTTPO.js";
import "/public/assets/chunks/chunk-Y3JDDU5C.js";
import "/public/assets/chunks/chunk-DMDFFSG6.js";
import "/public/assets/chunks/chunk-2XKWBRFO.js";
import "/public/assets/chunks/chunk-G4VE62AJ.js";
import "/public/assets/chunks/chunk-7PX5UKK4.js";
import "/public/assets/chunks/chunk-LWXWW4DE.js";
import "/public/assets/chunks/chunk-RI4COCAN.js";
import "/public/assets/chunks/chunk-NJHFOS5M.js";
import "/public/assets/chunks/chunk-FCIRSLPG.js";
import "/public/assets/chunks/chunk-SSBU25HK.js";
import "/public/assets/chunks/chunk-VCSNZD3S.js";
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
  selectAllMsgs,
  selectCurrentDialogConfig,
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
import "/public/assets/chunks/chunk-SM3EH4JD.js";
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
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/integrations/openai/chatCompletionStreamMode.ts
var applyChatCompletionsStreamMode = (body, stream) => {
  const nextBody = { ...body, stream };
  if (!stream) {
    delete nextBody.stream_options;
  }
  return nextBody;
};

// packages/ai/agent/_executeModel.ts
var _executeModel = async (options, args, thunkApi) => {
  const { isStreaming, withAgentContext, withChatHistory, agentConfigOverrides } = options;
  const { getState, dispatch, rejectWithValue } = thunkApi;
  const { content } = args;
  const state = getState();
  let agentConfig;
  if (args.llmConfig) {
    agentConfig = args.llmConfig;
  } else if (args.agentConfig) {
    agentConfig = args.agentConfig;
  } else {
    const agentKey = args.agentKey || selectCurrentDialogConfig(state)?.cybots?.[0];
    if (!agentKey) {
      const msg = "Model execution failed: No llmConfig, agentConfig, or agentKey provided.";
      console.error(msg);
      return rejectWithValue(msg);
    }
    try {
      agentConfig = await dispatch(read({ dbKey: agentKey })).unwrap();
    } catch (error) {
      console.error(`_executeModel failed to load agent [${agentKey}]`, error);
      return rejectWithValue(error.message);
    }
  }
  try {
    const resolvedConfig = agentConfigOverrides ? { ...agentConfig, ...agentConfigOverrides } : agentConfig;
    const resolvedAgentConfig = resolvedConfig;
    const agentContexts = withAgentContext ? await fetchAgentContexts(mergeReferences(resolvedAgentConfig.references, selectCurrentDialogConfig(state)?.extraReferences), dispatch) : {};
    let messages;
    if (withChatHistory) {
      messages = filterAndCleanMessages(selectAllMsgs(state));
      messages.push({ role: "user", content: args.content });
    } else {
      messages = [{ role: "user", content: args.content }];
    }
    const requestBody = generateRequestBody({
      agentConfig: resolvedAgentConfig,
      messages,
      userInput: content,
      contexts: agentContexts
    });
    const bodyData = applyChatCompletionsStreamMode(requestBody, isStreaming);
    const currentDialogKey = selectCurrentDialogConfig(state)?.dbKey ?? "";
    if (isStreaming) {
      await sendOpenAICompletionsRequest({
        bodyData,
        agentConfig: resolvedAgentConfig,
        thunkApi,
        dialogKey: currentDialogKey,
        parentMessageId: args.parentMessageId
      });
    } else {
      const response = await performFetchRequest({
        agentConfig: resolvedAgentConfig,
        api: getApiEndpoint(resolvedAgentConfig),
        bodyData,
        currentServer: selectCurrentServer(state),
        token: selectIdentityToken(state) ?? "",
        dialogId: extractCustomId(args.billingDialogKey ?? currentDialogKey) || void 0
      });
      if (!response.ok) {
        let message = `Model request failed with HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          const upstreamMessage = typeof errorBody?.error?.message === "string" ? errorBody.error.message : typeof errorBody?.message === "string" ? errorBody.message : "";
          if (upstreamMessage.trim()) message = upstreamMessage.trim();
        } catch {
        }
        throw new Error(message);
      }
      const result = await response.json();
      const content2 = result?.choices?.[0]?.message?.content;
      if (typeof content2 !== "string") {
        const upstreamMessage = typeof result?.error?.message === "string" ? result.error.message : "";
        throw new Error(
          upstreamMessage.trim() || "Model response missing choices[0].message.content"
        );
      }
      if (args.billingDialogKey && result?.usage) {
        await updateTokensAction(
          {
            dialogId: extractCustomId(args.billingDialogKey),
            dialogKey: args.billingDialogKey,
            usage: result.usage,
            agentConfig: resolvedAgentConfig
          },
          thunkApi
        );
      }
      return content2;
    }
  } catch (error) {
    console.error(`_executeModel failed`, error);
    return rejectWithValue(error.message);
  }
};
export {
  _executeModel
};
