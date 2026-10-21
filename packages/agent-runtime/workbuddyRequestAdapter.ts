const DEFAULT_SYSTEM = "You are a helpful assistant.";
const SAFE_NAME = /^[A-Za-z0-9_-]{1,64}$/;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeName(name: string, reserved: Set<string>): string {
  const stem = name.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || "tool";
  let candidate = stem;
  if (reserved.has(candidate)) {
    let suffix = 1;
    do candidate = `${stem.slice(0, 64 - String(suffix).length - 1)}_${suffix++}`;
    while (reserved.has(candidate));
  }
  reserved.add(candidate);
  return candidate;
}

function adaptSchema(schema: unknown, path: string): void {
  if (!record(schema)) throw new TypeError(`${path} must be a JSON Schema object`);
  if (schema.type !== "object" && schema.type !== "array" && schema.type !== "string" && schema.type !== "number" && schema.type !== "integer" && schema.type !== "boolean" && schema.type !== "null" && schema.type !== undefined) throw new TypeError(`${path}.type is unsupported`);
  if (schema.properties !== undefined) {
    if (!record(schema.properties)) throw new TypeError(`${path}.properties must be an object`);
    for (const [key, value] of Object.entries(schema.properties)) adaptSchema(value, `${path}.properties.${key}`);
  }
  for (const key of ["items", "additionalProperties", "not", "if", "then", "else"]) {
    const value = schema[key];
    if (value === false || value === true) continue;
    if (record(value)) adaptSchema(value, `${path}.${key}`);
    else if (Array.isArray(value)) value.forEach((item, i) => adaptSchema(item, `${path}.${key}[${i}]`));
  }
  for (const key of ["oneOf", "anyOf", "allOf", "prefixItems"]) {
    if (schema[key] !== undefined) {
      if (!Array.isArray(schema[key])) throw new TypeError(`${path}.${key} must be an array`);
      (schema[key] as unknown[]).forEach((item, i) => adaptSchema(item, `${path}.${key}[${i}]`));
    }
  }
}

export function adaptWorkBuddyRequest(body: Record<string, unknown>): { body: Record<string, unknown>; originalNames: Record<string, string> } {
  const adapted = structuredClone(body);
  const originalNames = Object.create(null) as Record<string, string>;
  const safeToOriginal = new Map<string, string>();
  const tools = adapted.tools;
  if (tools !== undefined && !Array.isArray(tools)) throw new TypeError("tools must be an array");
  const reserved = new Set<string>();
  for (const tool of (tools ?? []) as unknown[]) {
    if (!record(tool) || !record(tool.function) || typeof tool.function.name !== "string") throw new TypeError("Each tool must have a named function");
    if (SAFE_NAME.test(tool.function.name)) reserved.add(tool.function.name);
  }
  for (const tool of (tools ?? []) as unknown[]) {
    const fn = (tool as Record<string, any>).function;
    const original = fn.name as string;
    if (!SAFE_NAME.test(original)) {
      const safe = safeName(original, reserved);
      Object.defineProperty(originalNames, safe, { value: original, enumerable: true, configurable: true, writable: true });
      safeToOriginal.set(safe, original);
      fn.name = safe;
    }
    if (fn.parameters !== undefined) {
      if (!record(fn.parameters)) throw new TypeError(`Tool ${original} parameters must be a JSON Schema object`);
      adaptSchema(fn.parameters, `Tool ${original} parameters`);
      if (fn.parameters.type !== "object") throw new TypeError(`Tool ${original} parameters root must be type object`);
    }
  }
  const safeFor = (name: unknown) => typeof name === "string" ? [...safeToOriginal].find(([, original]) => original === name)?.[0] : undefined;
  if (Array.isArray(adapted.messages)) {
    for (const message of adapted.messages) {
      if (!record(message)) continue;
      if (message.role === "developer") message.role = "system";
      if (Array.isArray(message.tool_calls)) for (const call of message.tool_calls) {
        if (record(call) && record(call.function)) call.function.name = safeFor(call.function.name) ?? call.function.name;
      }
      if (message.role === "tool") message.name = safeFor(message.name) ?? message.name;
    }
    if (!adapted.messages.some((message) => record(message) && message.role === "system")) adapted.messages.unshift({ role: "system", content: DEFAULT_SYSTEM });
  } else adapted.messages = [{ role: "system", content: DEFAULT_SYSTEM }];

  const choice = adapted.tool_choice;
  if (choice === "none") delete adapted.tools;
  else if (record(choice) && record(choice.function)) choice.function.name = safeFor(choice.function.name) ?? choice.function.name;
  else if (typeof choice === "string" && !["auto", "required", "none"].includes(choice)) adapted.tool_choice = { type: "function", function: { name: safeFor(choice) ?? choice } };
  if (adapted.max_completion_tokens !== undefined) {
    if (adapted.max_tokens === undefined) adapted.max_tokens = adapted.max_completion_tokens;
    delete adapted.max_completion_tokens;
  }
  adapted.stream = true;
  return { body: adapted, originalNames };
}

export function restoreWorkBuddyToolNames(payload: unknown, originalNames: Record<string, string>): unknown {
  const copy = structuredClone(payload);
  if (!record(copy) || !Array.isArray(copy.choices)) return copy;
  for (const choice of copy.choices) for (const part of [choice?.delta, choice?.message]) {
    if (!record(part) || !Array.isArray(part.tool_calls)) continue;
    for (const call of part.tool_calls) {
      if (!record(call) || !record(call.function) || typeof call.function.name !== "string") continue;
      if (Object.prototype.hasOwnProperty.call(originalNames, call.function.name)) call.function.name = originalNames[call.function.name];
    }
  }
  return copy;
}
