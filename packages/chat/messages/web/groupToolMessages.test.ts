import { groupConsecutiveToolMessages } from "./groupToolMessages";

describe("groupConsecutiveToolMessages", () => {
  it("returns single messages when tools are not consecutive", () => {
    const messages = [
      { id: "1", role: "user" },
      { id: "2", role: "tool", toolName: "exa_search" },
      { id: "3", role: "assistant" },
    ];
    const result = groupConsecutiveToolMessages(messages);
    expect(result).toEqual([
      { type: "message", message: messages[0] },
      { type: "message", message: messages[1] },
      { type: "message", message: messages[2] },
    ]);
  });

  it("groups consecutive same-name tools into a single entry", () => {
    const messages = [
      { id: "1", role: "user" },
      { id: "2", role: "tool", toolName: "exa_search" },
      { id: "3", role: "tool", toolName: "exa_search" },
      { id: "4", role: "assistant" },
    ];
    const result = groupConsecutiveToolMessages(messages);
    expect(result).toEqual([
      { type: "message", message: messages[0] },
      { type: "tool-group", messages: [messages[1], messages[2]], key: expect.any(String) },
      { type: "message", message: messages[3] },
    ]);
  });

  it("groups consecutive different-name tools into one entry", () => {
    const messages = [
      { id: "1", role: "tool", toolName: "exa_search" },
      { id: "2", role: "tool", toolName: "read_file" },
      { id: "3", role: "tool", toolName: "exa_search" },
    ];
    const result = groupConsecutiveToolMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "tool-group",
      messages: [messages[0], messages[1], messages[2]],
      key: expect.any(String),
    });
  });

  it("splits groups when non-tool message appears in between", () => {
    const messages = [
      { id: "1", role: "tool", toolName: "exa_search" },
      { id: "2", role: "assistant" },
      { id: "3", role: "tool", toolName: "exa_search" },
    ];
    const result = groupConsecutiveToolMessages(messages);
    expect(result).toEqual([
      { type: "message", message: messages[0] },
      { type: "message", message: messages[1] },
      { type: "message", message: messages[2] },
    ]);
  });

  it("handles empty array", () => {
    expect(groupConsecutiveToolMessages([])).toEqual([]);
  });
});
