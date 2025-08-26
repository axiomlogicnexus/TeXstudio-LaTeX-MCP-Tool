/**
 * Watch mode for LaTeX projects using latexmk -pvc.
 *
 * This module maintains an in-memory registry of running watchers keyed by
 * a watchId. It exposes functions to start, stop, list, and tail logs.
 *
 * Notes:
 * - latexmk handles file dependency tracking and incremental rebuilds.
 * - We capture stdout/stderr and keep a ring buffer for tailing logs.
 * - MCP tools consume these functions for server exposure.
 */
import os from "node:os";
import path from "node:path";
import { spawn, SpawnOptions, ChildProcess } from "node:child_process";
import { which } from "../discovery/which.js";

export interface WatchOptions {
  root: string; // root .tex
  engine?: "pdflatex" | "xelatex" | "lualatex";
  outDir?: string;
  synctex?: boolean;
  shellEscape?: boolean;
  interaction?: "batchmode" | "nonstopmode" | "scrollmode" | "errorstopmode";
  jobname?: string;
}

export interface WatchInfo {
  id: string;
  pid: number | undefined;
  command: string;
  args: string[];
  root: string;
  startedAt: number; // epoch ms
  running: boolean;
}

interface InternalWatch {
  child: ChildProcess;
  info: WatchInfo;
  buffer: string[]; // ring buffer of lines
  maxLines: number;
}

const watchers = new Map<string, InternalWatch>();

function makeId(): string {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pushBuffer(w: InternalWatch, chunk: string) {
  const lines = chunk.split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    w.buffer.push(line);
    if (w.buffer.length > w.maxLines) w.buffer.shift();
  }
}

export function listWatches(): WatchInfo[] {
  return Array.from(watchers.values()).map(w => ({ ...w.info }));
}

export function tailWatchLog(id: string, maxLines = 200): string {
  const w = watchers.get(id);
  if (!w) throw new Error(`No watch with id ${id}`);
  const start = Math.max(0, w.buffer.length - maxLines);
  return w.buffer.slice(start).join("\n");
}

export function stopLatexWatch(id: string): { stopped: boolean } {
  const w = watchers.get(id);
  if (!w) return { stopped: false };
  try { w.child.kill(); } catch {}
  w.info.running = false;
  watchers.delete(id);
  return { stopped: true };
}

export function startLatexWatch(opts: WatchOptions): WatchInfo {
  const latexmk = which(os.platform() === "win32" ? "latexmk.exe" : "latexmk") || "latexmk";
  const args: string[] = [];
  const outDir = opts.outDir ? path.resolve(opts.outDir) : undefined;
  if (outDir) { args.push("-outdir=" + outDir); }
  if (opts.synctex !== false) { args.push("-synctex=1"); }
  if (opts.shellEscape) { args.push("-shell-escape"); }
  if (opts.jobname) { args.push("-jobname=" + opts.jobname); }
  const engine = opts.engine || "pdflatex";
  args.push("-pdf");
  args.push("-interaction=" + (opts.interaction || "nonstopmode"));
  // latexmk -pvc to watch and rebuild on changes
  args.push("-pvc");
  args.push("-e", `$pdflatex='${engine}'`);
  const root = path.resolve(opts.root);
  args.push(root);

  const spawnOpts: SpawnOptions = {
    cwd: path.dirname(root),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: false,
  };

  const child = spawn(latexmk, args, spawnOpts);
  const id = makeId();
  const info: WatchInfo = {
    id,
    pid: child.pid,
    command: latexmk,
    args,
    root,
    startedAt: Date.now(),
    running: true,
  };
  const internal: InternalWatch = {
    child,
    info,
    buffer: [],
    maxLines: 2000,
  };
  child.stdout?.on("data", (d) => pushBuffer(internal, d.toString()));
  child.stderr?.on("data", (d) => pushBuffer(internal, d.toString()));
  child.on("close", () => {
    internal.info.running = false;
  });

  watchers.set(id, internal);
  return { ...info };
}
