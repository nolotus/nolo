import { registerRNUploadAdapter } from "./requests";
import { selectIdentityToken } from "identity/selectors";
import { API_ENDPOINTS } from "./config";

export const initRNUploadAdapter = () => {
  registerRNUploadAdapter(async (server, uploadConfig, state) => {
    const { file, metadata, customKey, userId, ownerType, spaceId } = uploadConfig;
    const normalizeBlobUtilPath = (uri: string): string =>
      uri.startsWith("file://") ? uri.slice("file://".length) : uri;

    const ReactNativeBlobUtil = (await import("react-native-blob-util")).default;
    const wrappedPath = ReactNativeBlobUtil.wrap(normalizeBlobUtilPath((file as any).uri));
    const token = selectIdentityToken(state) ?? null;
    const headers: Record<string, string> = {
      "Content-Type": "multipart/form-data",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await ReactNativeBlobUtil.fetch(
      "POST",
      server + `${API_ENDPOINTS.DATABASE}/upload`,
      headers,
      [
        {
          name: "file",
          filename: (file as any).name,
          type: (file as any).type,
          data: wrappedPath,
        },
        { name: "metadata", data: JSON.stringify(metadata) },
        { name: "customKey", data: customKey },
        ...(userId ? [{ name: "userId", data: userId }] : []),
        // 归属声明：字段名与服务端 uploadOwnership.ts 一致。声明不构成授权，
        // 但**漏传**会让服务端按缺省 user 归属落库（Space 成员随后读不到原件），
        // 所以 RN 与 Web 两条 upload 通道必须同样携带。存在才拼，不产生空字段。
        ...(ownerType ? [{ name: "ownerType", data: ownerType }] : []),
        ...(spaceId ? [{ name: "spaceId", data: spaceId }] : []),
      ]
    );
    const status = response.info().status;
    const ok = status >= 200 && status < 300;

    if (!ok) {
      console.error(
        `Upload request failed for ${customKey} on ${server}: HTTP ${status}` +
          (ownerType === "space"
            ? " (space ownership claim rejected: the Space may not be synced to this server, or you are not a member there)"
            : "")
      );
    }
    return ok;
  });
};
