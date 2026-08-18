import * as esbuild from "esbuild";
import { config } from "./esbuild.config.js";
import { publishDevWebBuildSignal } from "./devAssetManifest.js";
import { copyRouteStyles } from "./routeStyles.js";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resources as i18nResources } from "../../packages/app/i18n/i18n.config.js";
import {
  collectRepoEsbuildProcessMemory,
  shouldRecycleEsbuildService,
} from "../helpers/esbuildMemoryWatchdog";

const CLIENT_LOCALE_OUTPUT_DIR = "public/locales";
const ASSET_OUTPUT_DIR = "public/assets";
const PDF_WORKER_SOURCE = "node_modules/pdfjs-dist/build/pdf.worker.mjs";
const PDF_WORKER_OUTPUT = `${ASSET_OUTPUT_DIR}/pdf.worker.mjs`;
const ESBUILD_MAX_WORKING_SET_MB = Math.max(
  512,
  Number(process.env.NOLO_DEV_ESBUILD_MAX_MB ?? "2048") || 2048
);
const ESBUILD_MEMORY_CHECK_INTERVAL_MS = Math.max(
  5000,
  Number(process.env.NOLO_DEV_ESBUILD_MEMORY_CHECK_MS ?? "30000") || 30000
);
const ESBUILD_RECYCLE_COOLDOWN_MS = Math.max(
  30000,
  Number(process.env.NOLO_DEV_ESBUILD_RECYCLE_COOLDOWN_MS ?? "300000") || 300000
);

const writeClientLocaleFiles = async () => {
  await mkdir(CLIENT_LOCALE_OUTPUT_DIR, { recursive: true });
  await Promise.all(
    Object.entries(i18nResources).map(([language, namespaces]) =>
      writeFile(
        `${CLIENT_LOCALE_OUTPUT_DIR}/${encodeURIComponent(language)}.json`,
        JSON.stringify(namespaces)
      )
    )
  );
};

const copyPdfWorker = async () => {
  await mkdir(ASSET_OUTPUT_DIR, { recursive: true });
  await copyFile(PDF_WORKER_SOURCE, PDF_WORKER_OUTPUT);
};

console.log("启动 esbuild watch（dev 模式）...");

let activeContext = null;
let restartInProgress = false;
let lastRecycleAt = 0;

const devBuildSignalPlugin = {
  name: "dev-build-signal",
  setup(build) {
    let lastBuildStart = 0;

    build.onStart(() => {
      lastBuildStart = Date.now();
      console.log("⏱️ esbuild 重建开始...");
    });

    build.onEnd(async (result) => {
      const buildMs = Date.now() - lastBuildStart;

      if (result.errors?.length) {
        console.error(
          `❌ esbuild 构建失败（耗时 ${buildMs}ms），错误数量:`,
          result.errors.length
        );
        return;
      }

      console.log(`✅ esbuild 构建完成，用时 ${buildMs}ms`);

      await writeClientLocaleFiles().catch((err) =>
        console.warn("⚠️ 语言包生成失败:", err)
      );
      await copyPdfWorker().catch((err) =>
        console.warn("⚠️ PDF worker copy failed:", err)
      );

      // 路由级样式必须在发布 manifest 之前同步完成；
      // 失败时不能静默发布一个声称已完全刷新的构建。
      try {
        await copyRouteStyles({ skipUnchanged: true });
      } catch (err) {
        console.error("❌ 路由级样式同步失败，跳过本次 dev 构建信号发布:", err);
        return;
      }

      const { manifest } = await publishDevWebBuildSignal({ buildMs });
      console.log("♻️ dev web build published (latest-assets):", manifest);
    });
  },
};

const devConfig = {
  ...config,
  metafile: false,
  plugins: [...(config.plugins || []), devBuildSignalPlugin],
};

const startWatchContext = async (reason = "start") => {
  activeContext = await esbuild.context(devConfig);
  await activeContext.watch();
  console.log(
    `👀 esbuild 正在监听源码变化（输出到 public/assets/，reason=${reason}）`
  );
};

const recycleWatchContext = async (reason) => {
  if (restartInProgress) return;
  restartInProgress = true;
  lastRecycleAt = Date.now();
  try {
    console.warn(`♻️ recycling esbuild watch context: ${reason}`);
    if (activeContext) {
      await activeContext.dispose().catch(() => undefined);
      activeContext = null;
    }
    esbuild.stop();
    await startWatchContext("memory-recycle");
  } finally {
    restartInProgress = false;
  }
};

const checkEsbuildMemory = async () => {
  if (restartInProgress) return;
  const processes = await collectRepoEsbuildProcessMemory(process.cwd()).catch(
    (err) => {
      console.warn("⚠️ esbuild memory check failed:", err);
      return [];
    }
  );
  const decision = shouldRecycleEsbuildService({
    repoRoot: process.cwd(),
    processes,
    maxWorkingSetMb: ESBUILD_MAX_WORKING_SET_MB,
    nowMs: Date.now(),
    lastRecycleAtMs: lastRecycleAt,
    cooldownMs: ESBUILD_RECYCLE_COOLDOWN_MS,
  });
  if (!decision) return;
  await recycleWatchContext(
    `pid=${decision.pid} workingSet=${decision.workingSetMb}MB threshold=${decision.maxWorkingSetMb}MB`
  );
};

try {
  await startWatchContext();
  setInterval(() => {
    void checkEsbuildMemory();
  }, ESBUILD_MEMORY_CHECK_INTERVAL_MS).unref();
  void checkEsbuildMemory();
} catch (err) {
  console.error("❌ esbuild 初始化失败:", err);
  process.exit(1);
}
