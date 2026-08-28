import { describe, expect, test } from "bun:test";

import {
  buildVersionDeleteRequest,
  buildVersionLabelRequest,
  buildVersionListRequest,
  buildVersionPinRequest,
  buildVersionRestoreRequest,
} from "./versionApi";

describe("versionApi", () => {
  test("builds the version list request with GET query params", () => {
    const request = buildVersionListRequest(
      "https://nolo.chat",
      "token-1",
      "app",
      "app-1"
    );

    expect(request.url).toBe(
      "https://nolo.chat/api/version/list?type=app&entityId=app-1"
    );
    expect(request.init.method).toBe("GET");
    expect(request.init.headers).toEqual({
      Authorization: "Bearer token-1",
    });
  });

  test("builds pin, restore, delete, and label requests with aligned payloads", () => {
    const pinRequest = buildVersionPinRequest(
      "https://nolo.chat",
      "token-1",
      "doc",
      "page-1",
      "v-1",
      true
    );
    expect(pinRequest.init.method).toBe("POST");
    expect(JSON.parse(String(pinRequest.init.body))).toEqual({
      type: "doc",
      entityId: "page-1",
      versionId: "v-1",
      pinned: true,
    });

    const restoreRequest = buildVersionRestoreRequest(
      "https://nolo.chat",
      "token-1",
      "agent",
      "agent-1",
      "v-2"
    );
    expect(restoreRequest.init.method).toBe("POST");
    expect(JSON.parse(String(restoreRequest.init.body))).toEqual({
      type: "agent",
      entityId: "agent-1",
      versionId: "v-2",
    });

    const sourceOnlyRestoreRequest = buildVersionRestoreRequest(
      "https://nolo.chat",
      "token-1",
      "app",
      "app-1",
      "v-2",
      { restoreMode: "source_only" }
    );
    expect(JSON.parse(String(sourceOnlyRestoreRequest.init.body))).toEqual({
      type: "app",
      entityId: "app-1",
      versionId: "v-2",
      restoreMode: "source_only",
    });

    const deleteRequest = buildVersionDeleteRequest(
      "https://nolo.chat",
      "token-1",
      "app",
      "app-9",
      "v-3"
    );
    expect(deleteRequest.init.method).toBe("DELETE");
    expect(JSON.parse(String(deleteRequest.init.body))).toEqual({
      type: "app",
      entityId: "app-9",
      versionId: "v-3",
    });

    const labelRequest = buildVersionLabelRequest(
      "https://nolo.chat",
      "token-1",
      "doc",
      "page-2",
      "v-4",
      "Pinned for launch"
    );
    expect(labelRequest.init.method).toBe("PATCH");
    expect(JSON.parse(String(labelRequest.init.body))).toEqual({
      type: "doc",
      entityId: "page-2",
      versionId: "v-4",
      label: "Pinned for launch",
    });
  });
});
