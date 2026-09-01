import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import { fileURLToPath } from "node:url";

let moduleVersion = 0;
const MESSAGE_CONTENT_PATH = fileURLToPath(
  new URL("./messageContent.ts", import.meta.url),
);

const uploadMock = mock((payload: any) => ({
  kind: "upload",
  payload,
}));
const getRuntimeServerContextMock = mock(() => ({
  currentServer: "http://127.0.0.1:38123",
}));
const addContentActionMock = mock(async () => undefined);

const realAddContentAction = {
  ...(await import("create/space/content/addContentAction")),
};

afterAll(() => {
  mock.module(
    "create/space/content/addContentAction",
    () => realAddContentAction,
  );
});

const loadMessageContentModule = async () => {
  const actualDbSlice = await import("database/dbSlice");
  const actualRuntimeServerContext =
    await import("database/runtimeServerContext");

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    upload: uploadMock,
  }));
  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: getRuntimeServerContextMock,
  }));
  mock.module("create/space/content/addContentAction", () => ({
    addContentAction: addContentActionMock,
  }));

  const module = await import(`${MESSAGE_CONTENT_PATH}`);
  return module;
};

describe("normalizeAssistantContentBuffer", () => {
  beforeEach(() => {
    uploadMock.mockClear();
    getRuntimeServerContextMock.mockClear();
    addContentActionMock.mockClear();
    (globalThis as any).Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    };
  });

  afterEach(() => {
    mock.restore();
    delete (globalThis as any).Image;
  });

  it("strips Gemini native metadata when replacing generated image URLs", async () => {
    const { normalizeAssistantContentBuffer } =
      await loadMessageContentModule();
    const dispatch = mock((action: any) => {
      if (action.kind !== "upload") {
        throw new Error(`unexpected action: ${JSON.stringify(action)}`);
      }
      return {
        unwrap: async () => ({
          dbKey: "file-user-demo-generated-image",
        }),
      };
    });

    const result = await normalizeAssistantContentBuffer(
      [
        {
          type: "image_url",
          image_url: { url: "data:image/jpeg;base64,ABC" },
          google_native: {
            inlineData: {
              mimeType: "image/jpeg",
              data: "ABC",
            },
            thoughtSignature: "sig-demo",
          },
        },
      ],
      "dialog-demo",
      "msg-demo",
      dispatch,
      () => ({}) as any,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: "image_url",
      image_url: {
        url: "http://127.0.0.1:38123/api/v1/db/file/content/file-user-demo-generated-image",
      },
    });
    expect(JSON.stringify(result)).not.toContain("ABC");
    expect(JSON.stringify(result)).not.toContain("inlineData");
    expect(JSON.stringify(result)).not.toContain("thoughtSignature");
  });

  it("does not keep generated image data URLs when upload fails", async () => {
    const { normalizeAssistantContentBuffer } =
      await loadMessageContentModule();
    const dispatch = mock((action: any) => {
      if (action.kind !== "upload") {
        throw new Error(`unexpected action: ${JSON.stringify(action)}`);
      }
      return {
        unwrap: async () => {
          throw new Error("upload failed");
        },
      };
    });

    const result = await normalizeAssistantContentBuffer(
      [
        {
          type: "image_url",
          image_url: { url: "data:image/png;base64,ABC" },
          google_native: {
            inlineData: {
              mimeType: "image/png",
              data: "ABC",
            },
            thoughtSignature: "sig-demo",
          },
        },
      ],
      "dialog-demo",
      "msg-demo",
      dispatch,
      () => ({}) as any,
    );

    expect(result).toEqual([
      {
        type: "text",
        text: "[图片保存失败，请重试生成图片]",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("data:image");
    expect(JSON.stringify(result)).not.toContain("ABC");
    expect(JSON.stringify(result)).not.toContain("inlineData");
    expect(JSON.stringify(result)).not.toContain("thoughtSignature");
  });
});
