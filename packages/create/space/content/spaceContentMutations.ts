// create/space/content/spaceContentMutations.ts
// Space 内容「上传 / 删除」的编排逻辑（纯逻辑层，可运行时测试）。
//
// 修复目标：view-transition 的 update 回调是异步执行的（旧快照捕获后才跑），
// 绝不能把异步工作的 promise 创建塞进回调里——回调外代码立刻 await 会拿到
// undefined，失败路径永远走不到 catch（上传每个文件被误标 rejected，重试
// 产生重复文件；单删 toast 先于删除出现、catch 抓不到失败）。正确时序：
//   1. 异步工作在转场外先启动，拿到真实 promise；
//   2. view-transition 只负责包裹同步状态提交；
//   3. await / toast / 进度 / 取消逻辑在回调外拿到真实 promise。
//
// 批量删除合并成一次状态提交 + 一次转场（每项各起一个转场会互相取消、
// 进度造假、取消失效）。

export type SpaceMutationToast = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info?: (msg: string) => void;
};

export interface RunSpaceUploadsInput<TFile> {
  files: TFile[];
  /** 同步启动一个上传，返回其后端 promise（thunk/网络调用）。 */
  startUpload: (file: TFile) => Promise<unknown>;
  /**
   * 可选：把「这批上传已发起」的同步状态提交包进一次 view-transition。
   * 只接受同步回调；缺省时直接调用。
   */
  runTransition?: (update: () => void) => void;
  /**
   * 可选：所有上传 promise 已创建（但未 settle）后同步执行的提交点——
   * 用于在转场 update 里捕获/清理 view-transition-name。
   */
  commitStarted?: () => void;
}

export interface RunSpaceUploadsResult<TFile> {
  succeeded: number;
  failed: TFile[];
}

/**
 * 上传所有文件：每个上传 promise 在转场回调外创建，失败可被真实捕获
 * （不会误标 rejected），整批 settle 后返回分类结果交给调用方发 toast。
 */
export function runSpaceUploads<TFile>(
  input: RunSpaceUploadsInput<TFile>
): Promise<RunSpaceUploadsResult<TFile>> {
  const { files, startUpload, runTransition, commitStarted } = input;
  // 异步工作先启动，promise 在转场外拿到。
  const uploadPromises = files.map((file) => Promise.resolve(startUpload(file)));
  // 转场只包裹同步状态提交。
  if (typeof runTransition === "function") {
    runTransition(() => {
      commitStarted?.();
    });
  } else {
    commitStarted?.();
  }
  return Promise.allSettled(uploadPromises).then((results) => {
    const failed = files.filter((_, i) => results[i].status === "rejected");
    return { succeeded: files.length - failed.length, failed };
  });
}

export interface RunSpaceDeleteInput {
  spaceId: string;
  /** 执行删除，返回真实后端 promise。 */
  deleteKey: (key: string) => Promise<unknown>;
  runTransition?: (update: () => void) => void;
  /** 转场 update 内的同步提交点（可选）。 */
  commitStarted?: () => void;
  toast: SpaceMutationToast;
  /** 单删成功 toast 文案（已带标题）。 */
  singleSuccessMessage: (title: string) => string;
  /** 失败 toast 文案。 */
  failureMessage: (err: unknown) => string;
  /** 已知标题（用于单删 toast）；查不到时调用方给 fallback。 */
  resolveTitle?: () => string;
}

/** 单条删除：先发起删除 promise，再在转场里提交同步状态，最后 await 出 toast。 */
export async function runSpaceDelete(
  input: RunSpaceDeleteInput & { key: string }
): Promise<void> {
  const {
    key,
    deleteKey,
    runTransition,
    commitStarted,
    toast,
    singleSuccessMessage,
    failureMessage,
    resolveTitle,
  } = input;
  const title = resolveTitle?.() ?? key;
  try {
    // 异步删除先在转场外发起，拿到真实 promise。
    const deletePromise = Promise.resolve(deleteKey(key));
    // 转场只包裹同步状态提交。
    if (typeof runTransition === "function") {
      runTransition(() => {
        commitStarted?.();
      });
    } else {
      commitStarted?.();
    }
    // 回调外拿到真实 promise：失败会真正走到 catch，toast 在删除提交后。
    await deletePromise;
    toast.success(singleSuccessMessage(title));
  } catch (err) {
    toast.error(failureMessage(err));
  }
}

export interface RunSpaceBatchDeleteInput
  extends Omit<RunSpaceDeleteInput, "resolveTitle" | "singleSuccessMessage"> {
  keys: string[];
  concurrency?: number;
  /** 检查是否已取消（每次取新任务前调用）。 */
  isCancelled?: () => boolean;
  /** 每完成一项回调（真实进度）。 */
  onProgress?: (done: number, total: number) => void;
  batchSuccessMessage: (count: number) => string;
  cancelledMessage: () => string;
}

/**
 * 批量删除：worker 并发消费同一队列，整批合并为一次状态提交 + 一次转场。
 * - 每项不再各起一个转场（不会互相取消）；
 * - 进度只在真实 await 之后推进；
 * - 取消检查在每次取任务前进行，剩余项不再发起。
 */
export async function runSpaceBatchDelete(
  input: RunSpaceBatchDeleteInput
): Promise<void> {
  const {
    keys,
    deleteKey,
    runTransition,
    commitStarted,
    toast,
    failureMessage,
    isCancelled,
    onProgress,
    batchSuccessMessage,
    cancelledMessage,
    concurrency = 4,
  } = input;
  if (keys.length === 0) return;
  const queue = [...keys];
  let done = 0;
  const total = keys.length;
  let firstError: unknown = null;

  const worker = async () => {
    while (queue.length > 0) {
      if (isCancelled?.()) return;
      const nextKey = queue.shift();
      if (!nextKey) continue;
      try {
        // 真实删除 promise，await 后才推进进度。
        await deleteKey(nextKey);
      } catch (err) {
        if (firstError === null) firstError = err;
      }
      done += 1;
      onProgress?.(done, total);
    }
  };

  // 转场包裹整批同步状态提交（一次，而非每项一次）。
  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => worker()
  );
  if (typeof runTransition === "function") {
    runTransition(() => {
      commitStarted?.();
    });
  } else {
    commitStarted?.();
  }
  await Promise.all(workers);

  if (isCancelled?.()) {
    toast.info?.(cancelledMessage());
    return;
  }
  if (firstError !== null) {
    toast.error(failureMessage(firstError));
    return;
  }
  toast.success(batchSuccessMessage(total));
}
