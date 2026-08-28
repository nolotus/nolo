import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

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

export function extractExternalImports(content: string): string[] {
  const imports = new Set<string>();
  for (const importPath of extractModuleSpecifiers(content)) {
    if (
      importPath.startsWith(".") ||
      importPath.startsWith("node:") ||
      importPath.startsWith("/")
    ) {
      continue;
    }
    imports.add(extractPackageNameFromImportPath(importPath));
  }
  return Array.from(imports);
}

export function extractLocalRelativeImports(content: string): string[] {
  return extractModuleSpecifiers(content).filter(
    (importPath) => importPath.startsWith(".") && !importPath.startsWith("/")
  );
}

export function extractWorkspaceDependencies(
  manifest: Record<string, any>
): string[] {
  const deps: string[] = [];
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (!manifest[field]) {
      continue;
    }
    for (const [name, version] of Object.entries(manifest[field])) {
      if (typeof version === "string" && version.startsWith("workspace:")) {
        deps.push(name);
      }
    }
  }
  return deps;
}

export function findSiblingWorkspacePackageNames(sourceDir: string): string[] {
  const packagesDir = join(sourceDir, "..");
  const names: string[] = [];

  for (const entry of readdirSync(packagesDir)) {
    const pkgPath = join(packagesDir, entry, "package.json");
    if (!existsSync(pkgPath)) {
      continue;
    }
    try {
      const manifest = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (typeof manifest.name === "string" && manifest.name.length > 0) {
        names.push(manifest.name);
      }
    } catch {
      // Ignore malformed sibling manifests while scanning workspace package names.
    }
  }

  return names;
}

export function extractWorkspaceImports(
  content: string,
  workspacePackageNames: Set<string>
): string[] {
  const imports = new Set<string>();

  for (const packageName of extractExternalImports(content)) {
    if (workspacePackageNames.has(packageName)) {
      imports.add(packageName);
    }
  }

  const relativeWorkspaceImportRegex =
    /(?:from\s+['"]\.\.\/([^./'"][^/'"]*)(?:\/[^'"]*)?['"]|import\(\s*['"]\.\.\/([^./'"][^/'"]*)(?:\/[^'"]*)?['"]\s*\))/g;

  let match: RegExpExecArray | null;
  while ((match = relativeWorkspaceImportRegex.exec(content)) !== null) {
    const packageName = match[1] || match[2];
    if (packageName && workspacePackageNames.has(packageName)) {
      imports.add(packageName);
    }
  }

  return Array.from(imports);
}

export function collectWorkspaceDependencies(
  sourceDir: string,
  manifest: Record<string, any>,
  filesToCopy: string[]
): string[] {
  const workspaceDeps = new Set(extractWorkspaceDependencies(manifest));
  const workspacePackageNames = new Set(findSiblingWorkspacePackageNames(sourceDir));

  for (const filePath of collectTypeScriptSourceFiles(sourceDir, filesToCopy)) {
    const content = readFileSync(filePath, "utf8");
    for (const dep of extractWorkspaceImports(content, workspacePackageNames)) {
      workspaceDeps.add(dep);
    }
  }

  return Array.from(workspaceDeps);
}

export function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findTypeScriptFiles(fullPath));
      continue;
    }
    if (stat.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
      files.push(fullPath);
    }
  }

  return files;
}

export function collectTypeScriptSourceFiles(
  sourceDir: string,
  filesToCopy: string[]
): string[] {
  const files: string[] = [];

  for (const entry of filesToCopy) {
    const sourcePath = join(sourceDir, entry);
    if (!existsSync(sourcePath)) {
      continue;
    }
    const stat = statSync(sourcePath);
    if (stat.isDirectory()) {
      files.push(...findTypeScriptFiles(sourcePath));
      continue;
    }
    if (stat.isFile() && (sourcePath.endsWith(".ts") || sourcePath.endsWith(".tsx"))) {
      files.push(sourcePath);
    }
  }

  return files;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createWorkspaceSpecifier(relativeFilePath: string, packageName: string, path = ""): string {
  const fileDir = dirname(relativeFilePath);
  const relativePackagePath = relative(fileDir === "." ? "" : fileDir, packageName).replace(
    /\\/g,
    "/"
  );
  const prefix = relativePackagePath.startsWith(".")
    ? relativePackagePath
    : `./${relativePackagePath}`;
  return `${prefix}${path}`;
}

export function rewriteCrossPackageImports(
  content: string,
  workspaceDeps: string[],
  relativeFilePath = ""
): string {
  if (workspaceDeps.length === 0) {
    return content;
  }

  const patterns = workspaceDeps.map(escapeRegex);
  const relativeDepth =
    dirname(relativeFilePath) === "."
      ? 1
      : dirname(relativeFilePath).split(/[\\/]/).filter(Boolean).length + 1;
  const crossPackagePrefixPattern = `(?:\\.\\./){${relativeDepth}}`;

  const relativeImportRegex = new RegExp(
    `(from\\s+['"])${crossPackagePrefixPattern}((?!\\.)${patterns.join("|")})(/[^'"]*)?(['"])`,
    "g"
  );
  const bareImportRegex = new RegExp(
    `(from\\s+['"])(${patterns.join("|")})(/[^'"]*)?(['"])`,
    "g"
  );
  const dynamicRelativeImportRegex = new RegExp(
    `(import\\(\\s*['"])${crossPackagePrefixPattern}((?!\\.)${patterns.join("|")})(/[^'"]*)?(['"]\\s*\\))`,
    "g"
  );
  const dynamicBareImportRegex = new RegExp(
    `(import\\(\\s*['"])(${patterns.join("|")})(/[^'"]*)?(['"]\\s*\\))`,
    "g"
  );

  let result = content;
  result = result.replace(relativeImportRegex, (_, prefix, packageName, path, suffix) => {
    return `${prefix}${createWorkspaceSpecifier(relativeFilePath, packageName, path)}${suffix}`;
  });
  result = result.replace(bareImportRegex, (_, prefix, packageName, path, suffix) => {
    return `${prefix}${createWorkspaceSpecifier(relativeFilePath, packageName, path)}${suffix}`;
  });
  result = result.replace(dynamicRelativeImportRegex, (_, prefix, packageName, path, suffix) => {
    return `${prefix}${createWorkspaceSpecifier(relativeFilePath, packageName, path)}${suffix}`;
  });
  result = result.replace(dynamicBareImportRegex, (_, prefix, packageName, path, suffix) => {
    return `${prefix}${createWorkspaceSpecifier(relativeFilePath, packageName, path)}${suffix}`;
  });

  return result;
}
