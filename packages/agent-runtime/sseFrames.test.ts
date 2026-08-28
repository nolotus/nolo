import { describe, expect, it } from "bun:test";
import { readSseFrames } from "./sseFrames";

function makeResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

async function collect(chunks: string[]): Promise<string[]> {
  const out: string[] = [];
  for await (const frame of readSseFrames(makeResponse(chunks))) {
    out.push(frame);
  }
  return out;
}

describe("readSseFrames", () => {
  it("splits LF-terminated frames", async () => {
    const frames = await collect([
      'data: {"a":1}\n\ndata: {"b":2}\n\ndata: [DONE]\n\n',
    ]);
    expect(frames).toEqual([
      'data: {"a":1}',
      'data: {"b":2}',
      'data: [DONE]',
    ]);
  });

  it("splits CRLF-terminated frames", async () => {
    const frames = await collect([
      'data: {"a":1}\r\n\r\ndata: {"b":2}\r\n\r\ndata: [DONE]\r\n\r\n',
    ]);
    expect(frames).toEqual([
      'data: {"a":1}',
      'data: {"b":2}',
      'data: [DONE]',
    ]);
  });

  it("buffers a partial frame across chunks", async () => {
    const frames = await collect([
      'data: {"a":1}\n',
      '\ndata: {"b":2}\n',
      '\n',
    ]);
    expect(frames).toEqual([
      'data: {"a":1}',
      'data: {"b":2}',
    ]);
  });
});
