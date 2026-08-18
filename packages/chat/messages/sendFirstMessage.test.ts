import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

let moduleVersion = 0;
const SEND_FIRST_MESSAGE_PATH = fileURLToPath(
  new URL("./sendFirstMessage.ts", import.meta.url),
);

const uploadMock = mock((payload: any) => ({
  kind: "upload",
  payload,
}));
const handleSendMessageMock = mock((payload: any) => ({
  kind: "handleSendMessage",
  payload,
}));
const getRuntimeServerContextMock = mock(() => ({
  currentServer: "https://nolo.chat",
}));
const readFileAsDataURLMock = mock(async () => "data:image/png;base64,ORIGINAL");
const dataURLtoFileMock = mock(
  (_dataUrl: string, filename: string) =>
    new File(["image-bytes"], filename, { type: "image/png" }),
);
const compressImageFileMock = mock(
  async (file: File) => new File([file], "compressed.png", { type: "image/png" }),
);
const waitForFileReadyMock = mock(async () => true);

const loadSendFirstMessageModule = async () => {
  const actualDbSlice = await import("database/dbSlice");
  const actualRuntimeServerContext = await import("database/runtimeServerContext");
  const actualDialogSlice = await import("chat/dialog/dialogSlice");

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    upload: uploadMock,
  }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    handleSendMessage: handleSendMessageMock,
  }));
  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: getRuntimeServerContextMock,
  }));
  mock.module("app/utils/fileReaders", () => ({
    readFileAsDataURL: readFileAsDataURLMock,
  }));
  mock.module("app/utils/imageUtils", () => ({
    compressImageFile: compressImageFileMock,
    dataURLtoFile: dataURLtoFileMock,
    waitForFileReady: waitForFileReadyMock,
  }));

  const module = await import(`${SEND_FIRST_MESSAGE_PATH}`);
  mock.restore();
  mock.module("chat/dialog/dialogSlice", () => actualDialogSlice);
  return module;
};

describe("sendFirstMessage", () => {
  beforeEach(() => {
    uploadMock.mockClear();
    handleSendMessageMock.mockClear();
    getRuntimeServerContextMock.mockClear();
    readFileAsDataURLMock.mockClear();
    dataURLtoFileMock.mockClear();
    compressImageFileMock.mockClear();
    waitForFileReadyMock.mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("does not eagerly read large images as data URLs when upload and remote URL readiness succeed", async () => {
    const { sendFirstMessage } = await loadSendFirstMessageModule();
    const dispatched: unknown[] = [];
    const dispatch = (action: any) => {
      dispatched.push(action);
      if (action?.kind === "upload") {
        return {
          unwrap: async () => ({
            id: "file-user-demo-image-1",
          }),
        };
      }
      if (action?.kind === "handleSendMessage") {
        return {
          unwrap: async () => undefined,
        };
      }
      return action;
    };

    await sendFirstMessage({
      dialogKey: "dialog-user-demo-1",
      imageFiles: [new File(["image-bytes"], "photo.png", { type: "image/png" })],
    })(dispatch, () => ({}) as any);

    expect(readFileAsDataURLMock).not.toHaveBeenCalled();
    expect(handleSendMessageMock).toHaveBeenCalledWith({
      userInput: [
        {
          type: "image_url",
          image_url: {
            url: "https://nolo.chat/api/v1/db/file/content/file-user-demo-image-1",
          },
        },
      ],
      dialogKey: "dialog-user-demo-1",
      runtimeOptions: undefined,
      targetAgentKey: undefined,
      quickChatPerfStartedAt: undefined,
    });
    expect(dispatched.some((action: any) => action?.kind === "upload")).toBe(true);
  });

  it("falls back to an inline data URL for small images when upload fails", async () => {
    const { sendFirstMessage } = await loadSendFirstMessageModule();
    const dispatch = (action: any) => {
      if (action?.kind === "upload") {
        return {
          unwrap: async () => {
            throw new Error("upload failed");
          },
        };
      }
      if (action?.kind === "handleSendMessage") {
        return {
          unwrap: async () => undefined,
        };
      }
      return action;
    };

    await sendFirstMessage({
      dialogKey: "dialog-user-demo-1",
      imageFiles: [new File(["small-image"], "small.png", { type: "image/png" })],
    })(dispatch, () => ({}) as any);

    expect(readFileAsDataURLMock).toHaveBeenCalled();
    expect(handleSendMessageMock).toHaveBeenCalledWith({
      userInput: [
        {
          type: "image_url",
          image_url: {
            url: "data:image/png;base64,ORIGINAL",
          },
        },
      ],
      dialogKey: "dialog-user-demo-1",
      runtimeOptions: undefined,
      targetAgentKey: undefined,
      quickChatPerfStartedAt: undefined,
    });
  });

  it("rejects images larger than 5MB fallback limit when upload fails", async () => {
    const { sendFirstMessage } = await loadSendFirstMessageModule();
    // 6MB — above the 5MB MAX_INLINE_IMAGE_FALLBACK_BYTES
    const largeImage = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      "large.png",
      { type: "image/png" },
    );
    const dispatch = (action: any) => {
      if (action?.kind === "upload") {
        return {
          unwrap: async () => {
            throw new Error("upload failed");
          },
        };
      }
      if (action?.kind === "handleSendMessage") {
        return {
          unwrap: async () => undefined,
        };
      }
      return action;
    };

    await expect(
      sendFirstMessage({
        dialogKey: "dialog-user-demo-1",
        imageFiles: [largeImage],
      })(dispatch, () => ({}) as any),
    ).rejects.toThrow(/图片上传失败，文件过大/);

    expect(readFileAsDataURLMock).not.toHaveBeenCalled();
    expect(handleSendMessageMock).not.toHaveBeenCalled();
  });

  it("inlines images up to 5MB as data URL when upload fails on localhost", async () => {
    const { sendFirstMessage, MAX_INLINE_IMAGE_FALLBACK_BYTES } = await loadSendFirstMessageModule();
    // File just under 5MB
    const mediumImage = new File(
      [new Uint8Array(MAX_INLINE_IMAGE_FALLBACK_BYTES)],
      "medium.png",
      { type: "image/png" },
    );
    const dispatch = (action: any) => {
      if (action?.kind === "upload") {
        return {
          unwrap: async () => {
            throw new Error("upload failed");
          },
        };
      }
      if (action?.kind === "handleSendMessage") {
        return {
          unwrap: async () => undefined,
        };
      }
      return action;
    };

    await sendFirstMessage({
      dialogKey: "dialog-user-demo-1",
      imageFiles: [mediumImage],
    })(dispatch, () => ({}) as any);

    expect(readFileAsDataURLMock).toHaveBeenCalled();
    expect(handleSendMessageMock).toHaveBeenCalled();
  });
});
