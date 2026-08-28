import { isLocalFileContentUrl } from "./fileUrl";

type BrowserImageUrlDependencies = {
  fetch?: typeof fetch;
  blobToDataUrl?: (blob: Blob) => Promise<string | null>;
};

const blobToDataUrl = (blob: Blob): Promise<string | null> => {
  if (typeof FileReader === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

const buildAuthHeaders = (authToken: string | null | undefined): HeadersInit | undefined =>
  authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

export const resolveBrowserModelImageUrl = async (
  imageUrl: string,
  args: {
    authToken?: string | null;
    deps?: BrowserImageUrlDependencies;
  } = {}
): Promise<string> => {
  if (!isLocalFileContentUrl(imageUrl)) return imageUrl;

  const fetchImpl = args.deps?.fetch ?? globalThis.fetch;
  const blobToDataUrlImpl = args.deps?.blobToDataUrl ?? blobToDataUrl;
  if (!fetchImpl) return imageUrl;

  try {
    const response = await fetchImpl(imageUrl, {
      headers: buildAuthHeaders(args.authToken),
    });
    if (!response.ok) return imageUrl;

    const dataUrl = await blobToDataUrlImpl(await response.blob());
    return dataUrl || imageUrl;
  } catch {
    return imageUrl;
  }
};
