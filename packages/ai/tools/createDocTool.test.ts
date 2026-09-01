import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

const createDocMock = mock((args: any) => "page-demo");
const selectCurrentSpaceIdMock = mock(
  (state: any) => state?.space?.currentSpaceId ?? null,
);

let moduleVersion = 0;

const realSpaceModule = {
  ...(await import("create/space/spaceCurrentSelectors")),
};

afterAll(() => {
  mock.module("create/space/spaceCurrentSelectors", () => realSpaceModule);
});

async function loadCreateDocTool() {
  const actualDocStore = await import("render/page/docStore");

  mock.module("render/page/docStore", () => ({
    ...actualDocStore,
    createDocState: createDocMock,
  }));
  mock.module("create/space/spaceCurrentSelectors", () => ({
    ...realSpaceModule,
    selectCurrentSpaceId: selectCurrentSpaceIdMock,
  }));

  const mod = await import(`./createDocTool`);
  mock.restore();
  return mod;
}

describe("createDocTool", () => {
  afterEach(() => {
    createDocMock.mockClear();
    selectCurrentSpaceIdMock.mockClear();
  });

  it("falls back to the current selected space when no explicit spaceId is provided", async () => {
    const { createDocFunc } = await loadCreateDocTool();
    const dispatch = mock(() => ({
      unwrap: async () => "page-demo",
    }));

    const result = await createDocFunc(
      {
        title: "Roadmap",
        categoryId: "",
        content: "hello",
      },
      {
        dispatch,
        getState: () => ({
          space: {
            currentSpaceId: "space-current",
          },
        }),
      },
    );

    const callArgs = createDocMock.mock.calls[0]?.[0];
    expect(callArgs).toEqual({
      title: "Roadmap",
      spaceId: "space-current",
      categoryId: undefined,
      content: "hello",
    });
    // createDocState is mocked directly; dispatch is only forwarded as
    // thunkApi and used by the real createPageAction (not reached here).
    expect(result).toMatchObject({
      rawData: {
        success: true,
        id: "page-demo",
        dbKey: "page-demo",
        title: "Roadmap",
        spaceId: "space-current",
        categoryId: null,
      },
    });
  });

  it("prefers explicit spaceId over the current selected space", async () => {
    const { createDocFunc } = await loadCreateDocTool();
    const dispatch = mock(() => ({
      unwrap: async () => "page-explicit",
    }));

    await createDocFunc(
      {
        title: "Spec",
        spaceId: "space-explicit",
        categoryId: "",
        content: "",
      },
      {
        dispatch,
        getState: () => ({
          space: {
            currentSpaceId: "space-current",
          },
        }),
      },
    );

    const callArgs2 = createDocMock.mock.calls[0]?.[0];
    expect(callArgs2).toEqual({
      title: "Spec",
      spaceId: "space-explicit",
      categoryId: undefined,
      content: undefined,
    });
  });

  it("still allows creating a doc without any space when neither explicit nor current space exists", async () => {
    const { createDocFunc } = await loadCreateDocTool();
    const dispatch = mock(() => ({
      unwrap: async () => "page-no-space",
    }));

    await createDocFunc(
      {
        title: "Inbox",
        categoryId: "",
        content: "draft",
      },
      {
        dispatch,
        getState: () => ({
          space: {
            currentSpaceId: null,
          },
        }),
      },
    );

    const callArgs3 = createDocMock.mock.calls[0]?.[0];
    expect(callArgs3).toEqual({
      title: "Inbox",
      spaceId: undefined,
      categoryId: undefined,
      content: "draft",
    });
  });
});
