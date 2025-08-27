/**
 * TeXstudio session helpers (M20)
 *
 * We implement MCP-managed sessions (JSON) rather than relying on TeXstudio
 * internal session machinery for portability and control.
 *
 * session.save: write a JSON file containing files, optional line/column, and master
 * session.restore: read the JSON file and open each entry via TeXstudio
 */
import fs from "node:fs";
import path from "node:path";
import { getWorkspaceRoot, ensureInsideWorkspace } from "../utils/security.js";
import { openInTeXstudio } from "./texstudio.js";

export interface SessionEntry {
  file: string;
  line?: number;
  column?: number;
  master?: string;
  noSession?: boolean;
  newInstance?: boolean;
}

export interface SaveSessionArgs {
  name: string;
  entries: SessionEntry[];
}

export interface RestoreSessionArgs {
  name: string;
}

function sessionDir(): string {
  const ws = getWorkspaceRoot();
  // Store sessions under WORKSPACE_ROOT/.mcp_sessions
  const base = ws || process.cwd();
  const d = path.join(base, ".mcp_sessions");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export async function saveSession(args: SaveSessionArgs): Promise<{ path: string; entries: number }>
{
  const ws = getWorkspaceRoot();
  const safeEntries = args.entries.map(e => {
    const safe: SessionEntry = { ...e };
    safe.file = ensureInsideWorkspace(e.file, ws);
    if (e.master) safe.master = ensureInsideWorkspace(e.master, ws);
    return safe;
  });
  const dest = path.join(sessionDir(), `${args.name}.json`);
  fs.writeFileSync(dest, JSON.stringify({ name: args.name, entries: safeEntries }, null, 2), "utf8");
  return { path: dest, entries: safeEntries.length };
}

export async function restoreSession(args: RestoreSessionArgs): Promise<{ opened: number; sessionPath: string }>
{
  const file = path.join(sessionDir(), `${args.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`Session not found: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { name: string; entries: SessionEntry[] };
  let opened = 0;
  for (const e of data.entries) {
    // Entries in file were saved with workspace containment; open as-is
    await openInTeXstudio(e);
    opened++;
  }
  return { opened, sessionPath: file };
}
