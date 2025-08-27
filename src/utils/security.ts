/**
 * Security helpers for workspace path containment and policy toggles.
 */
import path from "node:path";

export function getWorkspaceRoot(): string | null {
  const r = process.env.WORKSPACE_ROOT;
  return r ? path.resolve(r) : null;
}

export function ensureInsideWorkspace(p: string, root: string | null): string {
  const abs = path.resolve(p);
  if (!root) return abs;
  const normAbs = path.normalize(abs);
  const normRoot = path.normalize(root);
  const a = normAbs.toLowerCase();
  const b = normRoot.toLowerCase();
  if (a === b || a.startsWith(b + path.sep)) return abs;
  throw new Error(`Path escapes workspace root: ${abs} (root=${root})`);
}

export function isInsideWorkspace(p: string, root: string | null): boolean {
  try {
    ensureInsideWorkspace(p, root);
    return true;
  } catch {
    return false;
  }
}

// Convert Windows paths to extended-length syntax when needed.
// For simplicity and robustness with long/UNC paths, we convert unconditionally on Windows.
export function toExtendedIfNeeded(p: string): string {
  if (process.platform !== "win32") return p;
  let abs = path.resolve(p);
  if (abs.startsWith("\\\\?\\")) return abs; // already extended
  if (abs.startsWith("\\\\")) {
    // UNC path \\server\share -> \\?\UNC\server\share
    return "\\\\?\\UNC\\" + abs.slice(2);
  }
  return "\\\\?\\" + abs;
}
