import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Auth migration-boundary guard (Phase 5).
 *
 * The Redux auth slice was deleted; identity state lives in the
 * AccountSessionCore. This guard keeps production sources free of any
 * resurgence of the deleted slice / projection layer:
 *
 * - `auth/authSlice` imports (`from`, `require()`, dynamic `import()`) or
 *   `authSlice` identifiers,
 * - the Redux projection seams (`sessionProjected`,
 *   `accountSessionReduxProjection`),
 * - session mirrors on a Redux `auth` key in the shapes that matter without a
 *   full JS parser: direct member access (`state.auth.currentUser`,
 *   `state.auth?.currentToken`, `state["auth"]["users"]`), string-keyed
 *   bracket access (`state.auth["isLoggedIn"]`), destructuring aliases
 *   (`const { currentUser } = state.auth`), and `Object.assign` /
 *   string- / computed-key literal forms that materialize a business field
 *   onto the auth key,
 * - `identity/authReducer` imports outside the whitelisted root reducers.
 *
 * Whitelisted migration boundary (root reducers keeping the persisted /
 * SSR-injected `"auth":{}` shape stable) may register the empty `auth` key
 * but must not store any business session field in ANY literal shape
 * (`key:`, `"key":`, `["key"]:`, shorthand `{ key }`, assignment).
 *
 * Tests and documentation are out of scope for the production scan.
 */

/**
 * Root reducers allowed to import `identity/authReducer` and register the
 * empty `auth` key (the empty `{}` shape only — never business session
 * fields). The RN root store is `packages/rn/redux/store.ts`; the old dead
 * `packages/rn/store.ts` (mobileStore) was deleted and is NOT whitelisted —
 * recreating it, or adding any other file to this list, is a conscious
 * whitelist change that must be justified against the boundary contract in
 * review.
 */
export const MIGRATION_BOUNDARY_FILES = [
  "packages/identity/authReducer.cloud.ts",
  "packages/identity/authReducer.local.ts",
  "packages/app/reducer.ts",
  "packages/rn/redux/store.ts",
] as const;

/** The guard's own sources mention the banned identifiers by necessity. */
const GUARD_OWN_FILES = [
  "packages/identity/authMigrationBoundaryGuard.ts",
  "packages/identity/authMigrationBoundary.source.test.ts",
] as const;

/** Legacy auth-slice state fields that must never be mirrored on `auth`. */
export const AUTH_BUSINESS_FIELDS = [
  "currentUser",
  "currentToken",
  "users",
  "isLoggedIn",
  "isInitialized",
] as const;

const SLICE_FILE_CANDIDATES = [
  "packages/auth/authSlice.ts",
  "packages/auth/authSlice.cloud.ts",
  "packages/auth/authSlice.local.ts",
] as const;

export type BoundaryViolation = { file: string; reason: string };

/** Best-effort comment stripping so historical notes don't trip the scan. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Drop `// …` line comments unless the slash pair is part of a URL
    // (`protocol://`) or string content.
    .replace(/(^|[^:"'])\/\/.*$/gm, "$1");
}

/**
 * Regex shapes by which a legacy auth-slice business field can leak into a
 * boundary file (any object-literal or assignment form). Exported so the
 * source test pins the exact same contract the guard enforces.
 */
export function authFieldBoundaryForms(field: string): RegExp[] {
  return [
    // Plain key or assignment: `currentUser: x` / `currentUser = x`.
    new RegExp(`\\b${field}\\s*[:=]`),
    // String-literal key: `"currentUser": x`.
    new RegExp(`["']${field}["']\\s*:`),
    // Computed key: `["currentUser"]: x`.
    new RegExp(`\\[\\s*["']${field}["']\\s*\\]\\s*:`),
    // Computed-key assignment: `state["currentUser"] = x`.
    new RegExp(`\\[\\s*["']${field}["']\\s*\\]\\s*=`),
    // Shorthand / bare mention inside an object literal: `{ currentUser }`.
    new RegExp(`\\{[^{}]*\\b${field}\\b\\s*[,}]`),
  ];
}

/**
 * Regex shapes by which a production file can read or write a legacy auth
 * session field on a Redux `auth` key, covering the common bypass forms a
 * non-parsing scanner can catch.
 */
function authFieldMirrorPatterns(field: string): Array<[RegExp, string]> {
  // The auth key on the (root) state: `state.auth` or `state["auth"]`.
  const authKey = `(?:\\.\\s*auth\\b|\\[\\s*["']auth["']\\s*\\])`;
  // Optional member separator: `.`, `?.`, or none (bracket chains).
  const sep = `\\s*(?:\\?\\.)?\\s*`;
  return [
    [
      new RegExp(`${authKey}${sep}\\.?\\s*${field}\\b`),
      `direct member access of the legacy auth session field on the auth key: ${field}`,
    ],
    [
      new RegExp(`${authKey}${sep}\\[\\s*["']${field}["']\\s*\\]`),
      `string-keyed member access of the legacy auth session field on the auth key: ${field}`,
    ],
    [
      new RegExp(
        `\\{[^{}]*\\b${field}\\b[^{}]*\\}\\s*=\\s*[^=;\\n]*(?:${authKey})`
      ),
      `destructuring alias of the legacy auth session field from the auth key: ${field}`,
    ],
    [
      new RegExp(
        `Object\\.assign\\s*\\([^;\\n]{0,200}(?:${authKey})[^;\\n]{0,200}\\b${field}\\b`
      ),
      `Object.assign materializes the legacy auth session field onto the auth key: ${field}`,
    ],
    [
      new RegExp(
        `(?:${authKey})[^;\\n]{0,120}(?:\\[\\s*["']${field}["']\\s*\\]|["']${field}["']\\s*[:,\\]])`
      ),
      `string/computed-key form of the legacy auth session field next to the auth key: ${field}`,
    ],
  ];
}

/** Pure per-file scan — also exercised against synthetic fixtures in tests. */
export function scanSource(rel: string, source: string): BoundaryViolation[] {
  if ((GUARD_OWN_FILES as readonly string[]).includes(rel)) return [];

  const code = stripComments(source);
  const violations: BoundaryViolation[] = [];
  const add = (reason: string) => violations.push({ file: rel, reason });

  if (/from\s*["'][^"']*auth\/authSlice[^"']*["']/.test(code)) {
    add("imports the deleted auth/authSlice module");
  }
  if (/\brequire\s*\(\s*["'][^"']*auth\/authSlice[^"']*["']\s*\)/.test(code)) {
    add("require()s the deleted auth/authSlice module");
  }
  if (/\bimport\s*\(\s*["'][^"']*auth\/authSlice[^"']*["']\s*\)/.test(code)) {
    add("dynamically import()s the deleted auth/authSlice module");
  }
  if (/\bauthSlice\b/.test(code)) {
    add("references the deleted authSlice identifier");
  }
  if (/\bsessionProjected\b/.test(code)) {
    add("references the deleted sessionProjected Redux projection");
  }
  if (/\baccountSessionReduxProjection\b/.test(code)) {
    add("references the deleted accountSessionReduxProjection");
  }
  for (const field of AUTH_BUSINESS_FIELDS) {
    for (const [mirror, reason] of authFieldMirrorPatterns(field)) {
      if (mirror.test(code)) {
        add(reason);
      }
    }
  }

  const isBoundaryFile = (MIGRATION_BOUNDARY_FILES as readonly string[]).includes(rel);
  if (!isBoundaryFile && /from\s*["']identity\/authReducer["']/.test(code)) {
    add("imports identity/authReducer outside the migration-boundary whitelist");
  }
  if (isBoundaryFile) {
    for (const field of AUTH_BUSINESS_FIELDS) {
      for (const form of authFieldBoundaryForms(field)) {
        if (form.test(code)) {
          add(
            `boundary file must not hold auth business fields in the auth key: ${field}`
          );
          break;
        }
      }
    }
  }

  return violations;
}

export function collectProductionFiles(
  root: string,
  dir: string = join(root, "packages")
): Array<{ rel: string; source: string }> {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "build") {
        return [];
      }
      return collectProductionFiles(root, full);
    }
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    const rel = full.slice(root.length + 1);
    // Production scan: tests and docs are out of scope.
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) return [];
    return [{ rel, source: readFileSync(full, "utf8") }];
  });
}

export function scanRepository(root: string): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  for (const candidate of SLICE_FILE_CANDIDATES) {
    if (existsSync(join(root, candidate))) {
      violations.push({ file: candidate, reason: "deleted authSlice file re-created" });
    }
  }

  for (const { rel, source } of collectProductionFiles(root)) {
    violations.push(...scanSource(rel, source));
  }
  return violations;
}
