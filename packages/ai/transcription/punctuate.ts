/**
 * 调用 DeepInfra chat completions API 为语音转写文本添加标点符号
 * provider: DeepInfra (endpoint: https://api.deepinfra.com/v1/openai/chat/completions)
 * model: deepseek-ai/DeepSeek-V3.1
 * temperature: 0
 */
export async function punctuateText(
  text: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.DEEPINFRA_API_KEY;
  if (!key) {
    throw new Error("DEEPINFRA_API_KEY is not provided");
  }

  if (!text || text.trim() === "") {
    return "";
  }

  const endpoint = "https://api.deepinfra.com/v1/openai/chat/completions";

  const systemPrompt = `你是一个专业的语音转写后处理标点添加助手。
任务：为输入的中文语音转写文本添加恰当的标点符号（如逗号、句号、问号、感叹号、顿号、冒号等）。
【强制规则】：
1. 绝对不要改变、删减、增加或替换原始文本中的任何字词、字符、数字或字母。
2. 严禁修改任何文字！字符守恒是最高铁律！
3. 只允许插入标点符号。
4. 直接输出加好标点的文本，不要包含 Markdown 格式或任何解释。`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-ai/DeepSeek-V3.1",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepInfra API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

  // 剥离 markdown 代码围栏。围栏字符属于 \p{S} / \s，会被对齐阶段当作标点跳过，
  // 因此 matchRatio 校验发现不了它们，必须在这里清掉，否则反引号会直接进 SRT 正文。
  return raw
    .replace(/^\s*```[a-zA-Z]*\r?\n?/, "")
    .replace(/\r?\n?```\s*$/, "")
    .trim();
}
