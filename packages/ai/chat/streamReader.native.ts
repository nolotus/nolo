// 文件路径: ai/chat/streamReader.native.ts
// React Native 版流式读取器 - 使用 react-native-sse

import EventSource from 'react-native-sse';

export interface StreamReaderOptions {
    response: Response;
    signal?: AbortSignal;
    onChunk: (chunk: string) => void;
    onError: (error: Error) => void;
    onComplete: () => void;
}

/**
 * React Native 版流式读取器
 * 注意：在 RN 中，我们实际上不使用 Response，而是直接走 SSE
 * 这个文件只是为了类型兼容，实际的 SSE 逻辑在 performFetchRequestNative 中
 */
export async function readStream(options: StreamReaderOptions): Promise<void> {
    // 在 React Native 中，这个函数不会被调用
    // SSE 处理在 performFetchRequestNative 中完成
    options.onError(new Error('readStream should not be called in React Native'));
}

/**
 * 检查当前环境是否支持 ReadableStream
 * React Native 返回 false，需要使用 SSE 方式
 */
export function supportsReadableStream(): boolean {
    return false;
}
