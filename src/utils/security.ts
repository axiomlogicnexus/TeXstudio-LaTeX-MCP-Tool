/**
 * Security helpers for workspace path containment and policy toggles.
 */
import path from "node:path";
import { loadConfig } from "../config/load.js";

export function getWorkspaceRoot(): string | null {
  const cfg = loadConfig();
  return cfg.workspaceRoot ? path.resolve(cfg.workspaceRoot) : null;
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

export function isLikelyNetworkPath(p: string | null): boolean {
  if (!p) return false;
  const abs = path.resolve(p);
  return abs.startsWith("\\\\") || abs.startsWith("\\\\?\\UNC\\");
}

export function shellEscapeAllowed(): boolean {
  const cfg = loadConfig();
  return !!cfg.allowShellEscape;
}
