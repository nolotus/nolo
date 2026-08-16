import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "bun:test";

const root = join(import.meta.dir, "../..");

// 身份「读取」符号。业务代码一律经 app/identity 或 identity 读，不得直接从 authSlice 取。
const IDENTITY_READ_SYMBOLS = [
  "selectUserId",
  "selectCurrentToken",
  "selectCurrentUser",
  "selectIsLoggedIn",
];

// 允许直接从 authSlice 取身份 selector 的地方：
// - auth 包自身：它就是云端身份模块，开源单机版会整块替换，绕经 identity
//   只会形成 auth → identity → auth 的回指
// - identity/selectors.ts：契约本身，edition 注入点
// - 本测试文件
const ALLOWED_DIRECT_AUTH_SLICE = [
  "packages/auth/",
  "packages/identity/selectors.cloud.ts",
  "packages/identity/identityBoundary.source.test.ts",
];

// slice / action 属于 reducer 依赖图，必须走 identity/selectors；
// 从 barrel 导入会带出 useIdentity → app/store → reducer 的加载链，
// 与自身形成环，导致 authReducer 循环初始化（TDZ）。
// 注意排除 useXxxActions.ts 这类 hook —— 它们名字里也有 Actions，但属 React 面，
// 用 barrel 是正确的。
const REDUCER_GRAPH_FILE = /(Slice|Action|Actions|Thunks)\.ts$|\/actions\/[^/]+\.ts$/;
const IS_HOOK_FILE = /\/use[A-Z][^/]*\.tsx?$/;

// 测试文件不受此约束：它们常用 mock.module("auth/authSlice") 注入身份，
// 直接 import authSlice 是正当用法。
const IS_TEST_FILE = /\.(test|spec)\.tsx?$/;

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "build")
        return [];
      return collectFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

const files = collectFiles(join(root, "packages")).map((file) => ({
  rel: file.slice(root.length + 1),
  source: readFileSync(file, "utf8"),
}));

// 抓出 `import { ... } from "auth/authSlice"` 里被导入的符号名（含多行写法）。
function importedAuthSliceSymbols(source: string): string[] {
  const names: string[] = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*["']auth\/authSlice["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  return names;
}

describe("identity 读取边界", () => {
  it("业务代码不直接从 auth/authSlice 取身份 selector", () => {
    const offenders = files
      .filter(({ rel }) => !IS_TEST_FILE.test(rel))
      .filter(
        ({ rel }) =>
          !ALLOWED_DIRECT_AUTH_SLICE.some((prefix) => rel.startsWith(prefix))
      )
      .map(({ rel, source }) => ({
        rel,
        leaked: importedAuthSliceSymbols(source).filter((name) =>
          IDENTITY_READ_SYMBOLS.includes(name)
        ),
      }))
      .filter(({ leaked }) => leaked.length > 0)
      .map(({ rel, leaked }) => `${rel}: ${leaked.join(", ")}`);

    // 计费（selectCurrentUserBalance / deductBalance）、账号操作
    // （fetchUserProfile / selectUsers / signOut / changeUser）、写操作
    // （replaceCurrentToken / initializeAuth）与 reducer 注册不在此约束内，
    // 它们是独立的解耦轴，仍可直接从 authSlice 导入。
    expect(offenders).toEqual([]);
  });

  it("reducer 依赖图内的 slice/action 从 identity/selectors 导入，而非 barrel", () => {
    const offenders = files
      .filter(({ rel }) => REDUCER_GRAPH_FILE.test(rel))
      .filter(({ rel }) => !IS_HOOK_FILE.test(rel))
      .filter(({ rel }) => !IS_TEST_FILE.test(rel))
      .filter(({ rel }) => !rel.startsWith("packages/app/identity/") && !rel.startsWith("packages/identity/"))
      .filter(
        ({ source }) =>
          (/from\s*["']identity["']/.test(source) || /from\s*["']app\/identity["']/.test(source)) &&
          !/from\s*["']identity\/selectors["']/.test(source) &&
          !/from\s*["']app\/identity\/selectors["']/.test(source)
      )
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it("render 包纯 UI 渲染层不得从 auth/hooks/useAuth 导入身份 hook", () => {
    const offenders = files
      .filter(({ rel }) => rel.startsWith("packages/render/"))
      .filter(({ rel }) => !IS_TEST_FILE.test(rel))
      .filter(({ source }) => /from\s*["']auth\/hooks\/useAuth["']/.test(source))
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });

  it("app 中纯身份读取的组件 (UserProfile, SecuritySettings, App.tsx) 不再从 auth/hooks/useAuth 导入", () => {
    const pureIdentityFiles = [
      "packages/app/settings/web/UserProfile.tsx",
      "packages/app/settings/web/SecuritySettings.tsx",
      "packages/app/web/App.tsx",
    ];

    const offenders = files
      .filter(({ rel }) => pureIdentityFiles.includes(rel))
      .filter(({ source }) => /from\s*["']auth\/hooks\/useAuth["']/.test(source))
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
  });
});
