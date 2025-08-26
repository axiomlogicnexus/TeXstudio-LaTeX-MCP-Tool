import path from "node:path";
import os from "node:os";
import { runCommand } from "../utils/process.js";
import { which } from "../discovery/which.js";
import { parseLatexLog, Diagnostic } from "../parsers/latexLog.js";

export interface CompileOptions {
  root: string;
  engine?: "pdflatex" | "xelatex" | "lualatex";
  outDir?: string;
  synctex?: boolean;
  shellEscape?: boolean;
  interaction?: "batchmode" | "nonstopmode" | "scrollmode" | "errorstopmode";
  haltOnError?: boolean;
  jobname?: string;
}

export interface CompileResult {
  success: boolean;
  pdfPath?: string;
  logPath?: string;
  diagnostics: Diagnostic[];
  rawLog?: string;
  command: string;
  args: string[];
  code: number | null;
}

export async function compileLatex(opts: CompileOptions): Promise<CompileResult> {
  const latexmk = which(os.platform() === "win32" ? "latexmk.exe" : "latexmk") || "latexmk";
  const args: string[] = [];
  const outDir = opts.outDir ? path.resolve(opts.outDir) : undefined;
  if (outDir) { args.push("-outdir=" + outDir); }
  if (opts.synctex !== false) { args.push("-synctex=1"); }
  if (opts.shellEscape) { args.push("-shell-escape"); }
  if (opts.haltOnError) { args.push("-halt-on-error"); }
  if (opts.jobname) { args.push("-jobname=" + opts.jobname); }
  const engine = opts.engine || "pdflatex";
  args.push("-pdf");
  args.push("-interaction=" + (opts.interaction || "nonstopmode"));
  // Set engine in latexmk perl expression
  args.push("-e", `$pdflatex='${engine}'`);
  const root = path.resolve(opts.root);
  args.push(root);

  const res = await runCommand(latexmk, args, { timeoutMs: 60_000 });
  const logText = (res.stdout || "") + "\n" + (res.stderr || "");
  const diagnostics = parseLatexLog(logText);
  const pdfPath = outDir ? path.join(outDir, (opts.jobname || path.parse(root).name) + ".pdf") : path.join(path.dirname(root), (opts.jobname || path.parse(root).name) + ".pdf");
  const success = (res.code === 0) && diagnostics.filter(d => d.type === "error").length === 0;
  return { success, pdfPath, diagnostics, rawLog: logText, command: res.command, args: res.args, code: res.code };
}

export async function cleanAux(opts: { root: string; deep?: boolean; outDir?: string; }): Promise<{ cleaned: boolean; command: string; args: string[]; code: number | null; }> {
  const latexmk = which(os.platform() === "win32" ? "latexmk.exe" : "latexmk") || "latexmk";
  const args: string[] = [];
  if (opts.outDir) { args.push("-outdir=" + path.resolve(opts.outDir)); }
  args.push(opts.deep ? "-C" : "-c");
  args.push(path.resolve(opts.root));
  const res = await runCommand(latexmk, args, { timeoutMs: 30_000 });
  return { cleaned: res.code === 0, command: res.command, args: res.args, code: res.code };
}
