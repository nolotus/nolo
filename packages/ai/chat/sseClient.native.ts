// 文件路径: ai/chat/sseClient.native.ts
// React Native 版 SSE 客户端实现 - 使用 react-native-sse

import EventSource from 'react-native-sse';

export interface SSEClientOptions {
    url: string;
    method: 'POST';
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
    onMessage: (data: string) => void;
    onError: (error: Error) => void;
    onComplete: () => void;
}

/**
 * React Native 版 SSE 客户端
 * 使用 react-native-sse 库实现
 */
export async function createSSEClient(options: SSEClientOptions): Promise<void> {
    const { url, method, headers, body, signal, onMessage, onError, onComplete } = options;

    return new Promise<void>((resolve) => {
        const es = new EventSource(url, {
            method,
            headers: {
                ...headers,
                'Accept': 'text/event-stream',
            },
            body,
            pollingInterval: 0, // 禁用轮询，使用真正的 SSE
        });

        let isCompleted = false;

        const cleanup = () => {
            if (!isCompleted) {
                isCompleted = true;
                es.close();
                resolve();
            }
        };

        // 处理原始消息事件
        es.addEventListener('message', (event: any) => {
            if (event.data) {
                // react-native-sse 返回的是已解析的单行数据
                // 需要包装成 SSE 格式以便 parseMultilineSSE 处理
                onMessage(`data: ${event.data}\n\n`);
            }
        });

        // 处理打开事件
        es.addEventListener('open', () => {
            console.log('[SSE Native] Connection opened');
        });

        // 处理错误
        es.addEventListener('error', (event: any) => {
            console.error('[SSE Native] Error:', event);
            if (!isCompleted) {
                // 检查是否是正常结束
                if (event.message?.includes('DONE') || event.type === 'close') {
                    onComplete();
                } else {
                    onError(new Error(event.message || 'SSE connection error'));
                }
                cleanup();
            }
        });

        // 处理关闭事件
        es.addEventListener('close', () => {
            console.log('[SSE Native] Connection closed');
            if (!isCompleted) {
                onComplete();
                cleanup();
            }
        });

        // 处理 abort signal
        if (signal) {
            signal.addEventListener('abort', () => {
                console.log('[SSE Native] Aborted by signal');
                cleanup();
                onComplete();
            });
        }
    });
}
