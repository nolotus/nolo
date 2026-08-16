import { registerRNUploadAdapter } from "./requests";
import { API_ENDPOINTS } from "./config";

export const initRNUploadAdapter = () => {
  registerRNUploadAdapter(async (server, uploadConfig, state) => {
    const { file, metadata, customKey, userId } = uploadConfig;
    const normalizeBlobUtilPath = (uri: string): string =>
      uri.startsWith("file://") ? uri.slice("file://".length) : uri;

    const ReactNativeBlobUtil = (await import("react-native-blob-util")).default;
    const wrappedPath = ReactNativeBlobUtil.wrap(normalizeBlobUtilPath((file as any).uri));
    const token = state?.auth?.currentToken;
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
      ]
    );
    const status = response.info().status;
    const ok = status >= 200 && status < 300;

    if (!ok) {
      console.error(
        `Upload request failed for ${customKey} on ${server}: HTTP ${status}`
      );
    }
    return ok;
  });
};
