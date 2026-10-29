// create/space/withTimeout.ts
//
// 本地库（Level/IndexedDB）没有超时语义：一次卡住的 open/read 会让 promise
// 永不 settle。空间相关的读路径把本地读当「可选加速」用，所以必须给每次本地
// 读一个上限：超时一律按「本地没有」处理（null），由调用方继续走远端。
//
// 注意语义是**超时即当作 miss**，不是失败：这些路径的正确答案永远在远端，
// 把超时当失败只会把用户挡在错误态里。

export const SPACE_LOCAL_READ_TIMEOUT_MS = 1500;

/** 在 ms 内没有 settle 就返回 null。原 promise 的 rejection 也按 null 处理。 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number = SPACE_LOCAL_READ_TIMEOUT_MS
): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T | null>([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};
