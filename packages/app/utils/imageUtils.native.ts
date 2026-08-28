// packages/app/utils/imageUtils.native.ts

export interface ImageCompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
}

// React Native 不支持 Web 的 File API
// 返回 any 以兼容类型系统
export function dataURLtoFile(
    dataUrl: string,
    filename: string
): any | null {
    console.warn("[imageUtils.native] dataURLtoFile is not fully supported in React Native.");
    // 尝试解析 dataUrl 以获取 mime type
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    const mime = match[1];

    // 返回一个符合 RN FormData 要求的基本对象
    return {
        uri: dataUrl, // RN 有时可以直接用 data uri
        name: filename,
        type: mime,
        size: Math.ceil((match[2].length * 3) / 4), // 估算 base64 大小
    };
}

export async function compressImage(
    imageDataUrl: string,
    options?: ImageCompressionOptions
): Promise<string> {
    // 暂时在 RN 端跳过压缩，直接返回原图
    // 未来可以集成 expo-image-manipulator 或 react-native-image-editor
    console.log("[imageUtils.native] compressImage: skipping compression in RN");
    return imageDataUrl;
}

export interface WaitForFileReadyOptions {
    maxWaitMs?: number;
    intervalMs?: number;
}

const appendNoCacheQuery = (url: string): string => {
    const stamp = `_t=${Date.now()}`;
    return url.includes("?") ? `${url}&${stamp}` : `${url}?${stamp}`;
};

const requestWithFallback = async (url: string): Promise<Response> => {
    const headResponse = await fetch(url, { method: "HEAD" });
    // Only fall back when the origin explicitly does not support HEAD.
    // For 404/500/etc. we want to preserve the real status instead of
    // downloading the full body again with GET.
    if (headResponse.status !== 405 && headResponse.status !== 501) {
        return headResponse;
    }

    return fetch(url, { method: "GET" });
};

export const waitForFileReady = async (
    url: string,
    {
        maxWaitMs = 10000,
        intervalMs = 500,
    }: WaitForFileReadyOptions = {}
): Promise<boolean> => {
    const start = Date.now();
    let attempt = 0;

    console.log(`[imageUtils.native] waitForFileReady: checking ${url} (timeout=${maxWaitMs}ms)`);

    while (Date.now() - start < maxWaitMs) {
        attempt++;
        const tryUrl = appendNoCacheQuery(url);
        try {
            const response = await requestWithFallback(tryUrl);
            if (response.ok) {
                console.log(`[imageUtils.native] waitForFileReady: OK after ${attempt} attempts (${Date.now() - start}ms)`);
                return true;
            }
            console.log(`[imageUtils.native] waitForFileReady: attempt ${attempt} got status ${response.status}`);
        } catch (e: any) {
            console.log(`[imageUtils.native] waitForFileReady: attempt ${attempt} failed: ${e?.message || e}`);
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    console.warn(`[imageUtils.native] waitForFileReady: timeout after ${attempt} attempts for ${url}`);
    return false;
};
