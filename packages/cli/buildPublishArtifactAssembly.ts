import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  collectTypeScriptSourceFiles,
  extractLocalRelativeImports,
  findTypeScriptFiles,
} from "./buildPublishImportAnalysis";

type WarnFn = (message: string, error?: unknown) => void;

type ReachableWorkspaceFilesByPackage = Record<string, string[]>;

type WorkspaceFileTarget = {
  packageName: string;
  relativeFilePath: string;
};

type WorkspaceGraph = {
  packageOrder: string[];
  filesByPackage: ReachableWorkspaceFilesByPackage;
};

export type InlineWorkspaceDependenciesOptions = {
  sourceDir: string;
  distDir: string;
  workspaceDeps: string[];
  reachableFilesByPackage?: ReachableWorkspaceFilesByPackage;
  extractExternalImports: (content: string) => string[];
  rewriteCrossPackageImports: (
    content: string,
    workspaceDeps: string[],
    relativeFilePath: string
  ) => string;
  warn: WarnFn;
};

export type BuildPublishArtifactAssemblyOptions = {
  sourceDir: string;
  distDir: string;
  filesToCopy: string[];
  extractExternalImports: (content: string) => string[];
  rewriteCrossPackageImports: (
    content: string,
    workspaceDeps: string[],
    relativeFilePath: string
  ) => string;
  collectWorkspaceDependencies?: (
    sourceDir: string,
    filesToCopy: string[]
  ) => string[];
  inlineWorkspaceDependencies: (
    options: InlineWorkspaceDependenciesOptions
  ) => Promise<{
    inlinedDeps: string[];
    inlinedFiles?: string[];
    externalDeps: Record<string, string>;
  }>;
  warn: WarnFn;
};

export async function buildPublishArtifactAssembly(
  options: BuildPublishArtifactAssemblyOptions
): Promise<{
  resolvedFilesToCopy: string[];
  workspaceDeps: string[];
  inlinedDeps: string[];
  inlinedFiles: string[];
  externalDeps: Record<string, string>;
}> {
  const {
    sourceDir,
    distDir,
    filesToCopy,
    extractExternalImports,
    rewriteCrossPackageImports,
    inlineWorkspaceDependencies,
    warn,
  } = options;

  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });

  const resolvedFilesToCopy = expandLocalFileDependencies(
    sourceDir,
    resolveFilesToCopy(sourceDir, filesToCopy)
  );
  const reachableWorkspaceGraph = collectReachableWorkspaceFiles(
    sourceDir,
    resolvedFilesToCopy
  );
  const workspaceDeps = reachableWorkspaceGraph.packageOrder;

  for (const file of resolvedFilesToCopy) {
    const sourcePath = join(sourceDir, file);
    const destPath = join(distDir, file);

    if (!existsSync(sourcePath)) {
      warn(`Warning: file not found: ${sourcePath}`);
      continue;
    }

    const destDir = dirname(destPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      const content = readFileSync(sourcePath, "utf8");
      const rewritten = rewriteCrossPackageImports(content, workspaceDeps, file);
      writeFileSync(destPath, rewritten);
    } else {
      copyFileSync(sourcePath, destPath);
    }
  }

  const {
    inlinedDeps,
    inlinedFiles = [],
    externalDeps,
  } = await inlineWorkspaceDependencies({
    sourceDir,
    distDir,
    workspaceDeps,
    reachableFilesByPackage: reachableWorkspaceGraph.filesByPackage,
    extractExternalImports,
    rewriteCrossPackageImports,
    warn,
  });

  return {
    resolvedFilesToCopy,
    workspaceDeps,
    inlinedDeps,
    inlinedFiles,
    externalDeps,
  };
}

export async function inlineWorkspaceDependencies(
  options: InlineWorkspaceDependenciesOptions
): Promise<{
  inlinedDeps: string[];
  inlinedFiles: string[];
  externalDeps: Record<string, string>;
}> {
  const {
    sourceDir,
    distDir,
    workspaceDeps,
    reachableFilesByPackage,
    extractExternalImports,
    rewriteCrossPackageImports,
    warn,
  } = options;
  if (workspaceDeps.length === 0) {
    return { inlinedDeps: [], inlinedFiles: [], externalDeps: {} };
  }

  const packagesDir = join(sourceDir, "..");
  const repoRoot = join(packagesDir, "..");
  const workspaceGraph = reachableFilesByPackage
    ? {
        packageOrder: buildWorkspacePackageOrder(
          workspaceDeps,
          reachableFilesByPackage
        ),
        filesByPackage: reachableFilesByPackage,
      }
    : collectWholePackageWorkspaceFiles(sourceDir, workspaceDeps);
  const inlinedDeps: string[] = [];
  const inlinedFiles: string[] = [];

  for (const depName of workspaceGraph.packageOrder) {
    const depSourceDir = join(packagesDir, depName);
    if (!existsSync(depSourceDir)) {
      warn(`Warning: workspace dependency not found: ${depSourceDir}`);
      continue;
    }

    for (const relativeFilePath of workspaceGraph.filesByPackage[depName] || []) {
      if (!shouldInlineWorkspaceFile(relativeFilePath)) {
        continue;
      }

      const sourcePath = join(depSourceDir, relativeFilePath);
      if (!existsSync(sourcePath)) {
        warn(`Warning: workspace file not found: ${sourcePath}`);
        continue;
      }

      const distRelativePath = join(depName, relativeFilePath).replace(/\\/g, "/");
      const destPath = join(distDir, distRelativePath);
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      if (relativeFilePath.endsWith(".ts") || relativeFilePath.endsWith(".tsx")) {
        const content = readFileSync(sourcePath, "utf8");
        const rewritten = rewriteCrossPackageImports(
          content,
          workspaceGraph.packageOrder,
          distRelativePath
        );
        writeFileSync(destPath, rewritten);
      } else {
        copyFileSync(sourcePath, destPath);
      }

      inlinedFiles.push(distRelativePath);
    }

    inlinedDeps.push(depName);
  }

  const externalDeps = discoverExternalImportsFromWorkspaceFiles({
    packagesDir,
    repoRoot,
    extractExternalImports,
    filesByPackage: workspaceGraph.filesByPackage,
    workspacePackageDirs: new Set(workspaceGraph.packageOrder),
    warn,
  });

  return { inlinedDeps, inlinedFiles, externalDeps };
}

export { collectTypeScriptSourceFiles, findTypeScriptFiles };

export function expandLocalFileDependencies(sourceDir: string, filesToCopy: string[]): string[] {
  const resolved = new Set(filesToCopy);
  const pending = filesToCopy.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

  while (pending.length > 0) {
    const relativeFilePath = pending.pop()!;
    const absoluteFilePath = join(sourceDir, relativeFilePath);
    if (!existsSync(absoluteFilePath)) {
      continue;
    }

    const content = readFileSync(absoluteFilePath, "utf8");
    for (const importPath of extractLocalRelativeImports(content)) {
      const discoveredPath = resolveLocalImportPath(sourceDir, relativeFilePath, importPath);
      if (!discoveredPath || resolved.has(discoveredPath)) {
        continue;
      }
      resolved.add(discoveredPath);
        if (discoveredPath.endsWith(".ts") || discoveredPath.endsWith(".tsx")) {
        pending.push(discoveredPath);
      }
    }
  }

  return Array.from(resolved);
}

function resolveLocalImportPath(
  sourceDir: string,
  relativeFilePath: string,
  importPath: string
): string | null {
  const fileDir = dirname(join(sourceDir, relativeFilePath));
  const importBase = join(fileDir, importPath);
  const candidate = resolveImportAbsolutePath(importBase);
  if (!candidate) {
    return null;
  }

  const resolvedRelativePath = relative(sourceDir, candidate).replace(/\\/g, "/");
  if (resolvedRelativePath.startsWith("..")) {
    return null;
  }

  return resolvedRelativePath;
}

export function resolveFilesToCopy(sourceDir: string, filesToCopy: string[]): string[] {
  const resolved = new Set<string>();

  for (const entry of filesToCopy) {
    if (entry.endsWith("/**/*.ts")) {
      const baseDir = entry.slice(0, -"/**/*.ts".length);
      const absoluteBaseDir = join(sourceDir, baseDir);
      if (!existsSync(absoluteBaseDir)) {
        continue;
      }
      for (const filePath of findTypeScriptFiles(absoluteBaseDir)) {
        resolved.add(relative(sourceDir, filePath));
      }
      continue;
    }

    resolved.add(entry);
  }

  return Array.from(resolved);
}

export function copyDirectory(
  src: string,
  dest: string,
  filter?: (file: string) => boolean,
  transform?: (file: string, content: string) => string
): void {
  if (!existsSync(src)) {
    return;
  }

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath, filter, transform);
    } else if (stat.isFile() && (!filter || filter(srcPath))) {
      const parentDir = dirname(destPath);
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      if (transform && (srcPath.endsWith(".ts") || srcPath.endsWith(".tsx"))) {
        writeFileSync(destPath, transform(srcPath, readFileSync(srcPath, "utf8")));
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
}

function collectReachableWorkspaceFiles(
  sourceDir: string,
  entryFiles: string[]
): WorkspaceGraph {
  const packagesDir = join(sourceDir, "..");
  const workspacePackageDirs = listWorkspacePackageDirs(sourceDir);
  const packageOrder: string[] = [];
  const filesByPackage = new Map<string, Set<string>>();
  const pending: WorkspaceFileTarget[] = [];

  const enqueue = (target: WorkspaceFileTarget | null) => {
    if (!target || !shouldInlineWorkspaceFile(target.relativeFilePath)) {
      return;
    }

    let files = filesByPackage.get(target.packageName);
    if (!files) {
      files = new Set<string>();
      filesByPackage.set(target.packageName, files);
      packageOrder.push(target.packageName);
    }
    if (files.has(target.relativeFilePath)) {
      return;
    }
    files.add(target.relativeFilePath);
    if (target.relativeFilePath.endsWith(".ts") || target.relativeFilePath.endsWith(".tsx")) {
      pending.push(target);
    }
  };

  for (const relativeFilePath of entryFiles) {
    if (!relativeFilePath.endsWith(".ts") && !relativeFilePath.endsWith(".tsx")) {
      continue;
    }
    const sourcePath = join(sourceDir, relativeFilePath);
    if (!existsSync(sourcePath)) {
      continue;
    }
    const content = readFileSync(sourcePath, "utf8");
    for (const importPath of extractModuleSpecifiers(content)) {
      enqueue(
        resolveWorkspaceImport({
          packagesDir,
          workspacePackageDirs,
          importerPackageDir: sourceDir,
          importerRelativeFilePath: relativeFilePath,
          importPath,
        })
      );
    }
  }

  while (pending.length > 0) {
    const target = pending.pop()!;
    const packageDir = join(packagesDir, target.packageName);
    const sourcePath = join(packageDir, target.relativeFilePath);
    if (!existsSync(sourcePath)) {
      continue;
    }

    const content = readFileSync(sourcePath, "utf8");
    for (const importPath of extractModuleSpecifiers(content)) {
      enqueue(
        resolveWorkspaceImport({
          packagesDir,
          workspacePackageDirs,
          importerPackageDir: packageDir,
          importerRelativeFilePath: target.relativeFilePath,
          importPath,
        })
      );
    }
  }

  return {
    packageOrder,
    filesByPackage: Object.fromEntries(
      packageOrder.map((packageName) => [
        packageName,
        Array.from(filesByPackage.get(packageName) ?? []),
      ])
    ),
  };
}

function collectWholePackageWorkspaceFiles(
  sourceDir: string,
  workspaceDeps: string[]
): WorkspaceGraph {
  const packagesDir = join(sourceDir, "..");
  const workspacePackageDirs = listWorkspacePackageDirs(sourceDir);
  const packageOrder: string[] = [];
  const filesByPackage = new Map<string, Set<string>>();
  const pendingPackages = [...workspaceDeps];

  const addWholePackage = (packageName: string) => {
    if (filesByPackage.has(packageName)) {
      return;
    }

    const depDir = join(packagesDir, packageName);
    if (!existsSync(depDir)) {
      return;
    }

    const packageFiles = new Set(
      findTypeScriptFiles(depDir)
        .map((filePath) => relative(depDir, filePath).replace(/\\/g, "/"))
        .filter((relativeFilePath) => shouldInlineWorkspaceFile(relativeFilePath))
    );
    filesByPackage.set(packageName, packageFiles);
    packageOrder.push(packageName);

    for (const relativeFilePath of packageFiles) {
      const content = readFileSync(join(depDir, relativeFilePath), "utf8");
      for (const importPath of extractModuleSpecifiers(content)) {
        const resolved = resolveWorkspaceImport({
          packagesDir,
          workspacePackageDirs,
          importerPackageDir: depDir,
          importerRelativeFilePath: relativeFilePath,
          importPath,
        });
        if (!resolved || filesByPackage.has(resolved.packageName)) {
          continue;
        }
        pendingPackages.push(resolved.packageName);
      }
    }
  };

  while (pendingPackages.length > 0) {
    addWholePackage(pendingPackages.shift()!);
  }

  return {
    packageOrder,
    filesByPackage: Object.fromEntries(
      packageOrder.map((packageName) => [
        packageName,
        Array.from(filesByPackage.get(packageName) ?? []),
      ])
    ),
  };
}

function buildWorkspacePackageOrder(
  workspaceDeps: string[],
  filesByPackage: ReachableWorkspaceFilesByPackage
): string[] {
  const ordered = new Set(workspaceDeps);
  for (const packageName of Object.keys(filesByPackage)) {
    ordered.add(packageName);
  }
  return Array.from(ordered);
}

function discoverExternalImportsFromWorkspaceFiles(args: {
  packagesDir: string;
  repoRoot: string;
  extractExternalImports: (content: string) => string[];
  filesByPackage: ReachableWorkspaceFilesByPackage;
  workspacePackageDirs: Set<string>;
  warn: WarnFn;
}): Record<string, string> {
  const {
    packagesDir,
    repoRoot,
    extractExternalImports,
    filesByPackage,
    workspacePackageDirs,
    warn,
  } = args;
  const externalDeps: Record<string, string> = {};
  const rootDeps = readManifestDependencies(join(repoRoot, "package.json"), warn);

  for (const [packageName, files] of Object.entries(filesByPackage)) {
    const packageDeps = readManifestDependencies(
      join(packagesDir, packageName, "package.json"),
      warn
    );
    for (const relativeFilePath of files) {
      if (!relativeFilePath.endsWith(".ts") && !relativeFilePath.endsWith(".tsx")) {
        continue;
      }

      const sourcePath = join(packagesDir, packageName, relativeFilePath);
      if (!existsSync(sourcePath)) {
        continue;
      }

      try {
        const content = readFileSync(sourcePath, "utf8");
        for (const importName of extractExternalImports(content)) {
          if (workspacePackageDirs.has(importName)) {
            continue;
          }
          const resolvedVersion = packageDeps[importName] ?? rootDeps[importName];
          if (resolvedVersion && !externalDeps[importName]) {
            externalDeps[importName] = resolvedVersion;
          }
        }
      } catch (error) {
        warn(`Warning: could not scan ${sourcePath}:`, error);
      }
    }
  }

  return externalDeps;
}

function readManifestDependencies(
  manifestPath: string,
  warn: WarnFn
): Record<string, string> {
  if (!existsSync(manifestPath)) {
    return {};
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const deps: Record<string, string> = {};
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      const entries = manifest[field];
      if (!entries || typeof entries !== "object") {
        continue;
      }
      for (const [name, version] of Object.entries(entries)) {
        if (typeof version === "string" && !version.startsWith("workspace:") && !deps[name]) {
          deps[name] = version;
        }
      }
    }
    return deps;
  } catch (error) {
    warn(`Warning: could not read package.json at ${manifestPath}:`, error);
    return {};
  }
}

function listWorkspacePackageDirs(sourceDir: string): Set<string> {
  const packagesDir = join(sourceDir, "..");
  const workspaceDirs = new Set<string>();

  for (const entry of readdirSync(packagesDir)) {
    if (existsSync(join(packagesDir, entry, "package.json"))) {
      workspaceDirs.add(entry);
    }
  }

  return workspaceDirs;
}

function shouldInlineWorkspaceFile(relativeFilePath: string): boolean {
  // .css must travel with its .tsx importer: reachable UI modules (e.g.
  // render/web/ui/Toast.tsx) import sibling stylesheets, and dropping them
  // leaves the assembled dist with unresolvable "./X.css" imports.
  return (
    (relativeFilePath.endsWith(".ts") ||
      relativeFilePath.endsWith(".tsx") ||
      relativeFilePath.endsWith(".css")) &&
    !relativeFilePath.includes("node_modules/") &&
    !relativeFilePath.endsWith(".test.ts") &&
    !relativeFilePath.endsWith(".spec.ts") &&
    !relativeFilePath.includes("package.json")
  );
}

function resolveWorkspaceImport(args: {
  packagesDir: string;
  workspacePackageDirs: Set<string>;
  importerPackageDir: string;
  importerRelativeFilePath: string;
  importPath: string;
}): WorkspaceFileTarget | null {
  const {
    packagesDir,
    workspacePackageDirs,
    importerPackageDir,
    importerRelativeFilePath,
    importPath,
  } = args;

  if (importPath.startsWith("node:") || importPath.startsWith("/")) {
    return null;
  }

  if (importPath.startsWith(".")) {
    const importBase = join(
      dirname(join(importerPackageDir, importerRelativeFilePath)),
      importPath
    );
    return toWorkspaceFileTarget(
      packagesDir,
      workspacePackageDirs,
      resolveImportAbsolutePath(importBase),
      true
    );
  }

  const packageName = extractPackageNameFromImportPath(importPath);
  if (!workspacePackageDirs.has(packageName)) {
    return null;
  }

  const subPath =
    importPath === packageName ? "index" : importPath.slice(packageName.length + 1);
  return toWorkspaceFileTarget(
    packagesDir,
    workspacePackageDirs,
    resolveImportAbsolutePath(join(packagesDir, packageName, subPath))
  );
}

function toWorkspaceFileTarget(
  packagesDir: string,
  workspacePackageDirs: Set<string>,
  absoluteFilePath: string | null,
  allowPackageWithoutManifest = false
): WorkspaceFileTarget | null {
  if (!absoluteFilePath) {
    return null;
  }

  const relativeToPackages = relative(packagesDir, absoluteFilePath).replace(/\\/g, "/");
  if (
    relativeToPackages.startsWith("..") ||
    relativeToPackages.length === 0
  ) {
    return null;
  }

  const [packageName, ...pathParts] = relativeToPackages.split("/");
  const isReachablePackageDirectory =
    workspacePackageDirs.has(packageName) ||
    (allowPackageWithoutManifest && existsSync(join(packagesDir, packageName)));
  if (!isReachablePackageDirectory || pathParts.length === 0) {
    return null;
  }

  return {
    packageName,
    relativeFilePath: pathParts.join("/"),
  };
}

function resolveImportAbsolutePath(importBase: string): string | null {
  const candidates = [
    importBase,
    `${importBase}.ts`,
    `${importBase}.tsx`,
    join(importBase, "index.ts"),
    join(importBase, "index.tsx"),
    `${importBase}.json`,
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }
    const stat = statSync(candidate);
    if (stat.isFile()) {
      return candidate;
    }
  }

  return null;
}

function extractPackageNameFromImportPath(importPath: string): string {
  if (importPath.startsWith("@")) {
    const parts = importPath.split("/");
    return parts.slice(0, 2).join("/");
  }

  const firstSlash = importPath.indexOf("/");
  return firstSlash === -1 ? importPath : importPath.slice(0, firstSlash);
}

function extractModuleSpecifiers(content: string): string[] {
  const specifiers = new Set<string>();
  const importOrExportRegex =
    /(?:import|export)\s+(?:(?:type\s+)?(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*\{[^}]*\})?(?:\s*,\s*\*\s+as\s+\w+)?)\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null;
  while ((match = importOrExportRegex.exec(content)) !== null) {
    specifiers.add(match[1]);
  }

  while ((match = dynamicImportRegex.exec(content)) !== null) {
    specifiers.add(match[1]);
  }

  return Array.from(specifiers);
}
