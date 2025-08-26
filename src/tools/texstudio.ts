import os from "node:os";
import path from "node:path";
import { which } from "../discovery/which.js";
import { runCommand } from "../utils/process.js";
import { resolveTeXstudioPath } from "../discovery/texstudioPath.js";

export interface OpenOptions {
  file: string;
  line?: number;
  column?: number;
  master?: string;
  noSession?: boolean;
  newInstance?: boolean;
}

export async function isTeXstudioAvailable(): Promise<{ path: string | null; }> {
  const p = await resolveTeXstudioPath();
  return { path: p };
}

export async function openInTeXstudio(opts: OpenOptions): Promise<{ opened: boolean; command: string; args: string[]; code: number | null; }> {
  const exe = (await resolveTeXstudioPath()) || (os.platform() === "win32" ? "texstudio.exe" : "texstudio");
  const args: string[] = [];
  if (typeof opts.line === "number") args.push("--line", String(opts.line));
  if (typeof opts.column === "number") args.push("--column", String(opts.column));
  if (opts.master) args.push("--master", path.resolve(opts.master));
  if (opts.noSession) args.push("--no-session");
  if (opts.newInstance) args.push("--start-always");
  args.push(path.resolve(opts.file));
  const res = await runCommand(exe, args, { timeoutMs: 10_000 });
  return { opened: res.code === 0, command: res.command, args: res.args, code: res.code };
}
