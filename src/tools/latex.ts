/**
 * LaTeX tool wrappers using latexmk with intelligent fallbacks.
 *
 * Enhancements:
 * - Detect missing Perl when latexmk fails and emit a clear diagnostic (code: "missing-perl").
 * - If latexmk is not available, fall back to running the engine directly (2 passes),
 *   with optional bibliography step (biber or bibtex) when detected.
 */
import fs from "node:fs";
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

function detectMissingPerl(logText: string): boolean {
  return /script engine 'perl'.*required/i.test(logText) || /perl\b.*not found/i.test(logText);
}

function engineExecutable(engine: string): string {
  const name = os.platform() === "win32" ? `${engine}.exe` : engine;
  return which(name) || engine;
}

async function runEngineOnce(engine: string, texPath: string, opts: CompileOptions): Promise<{ code: number | null; stdout: string; stderr: string; command: string; args: string[]; }> {
  const exe = engineExecutable(engine);
  const args: string[] = [];
  if (opts.synctex !== false) args.push("-synctex=1");
  args.push("-interaction=" + (opts.interaction || "nonstopmode"));
  if (opts.shellEscape) args.push("-shell-escape");
  if (opts.jobname) args.push("-jobname=" + opts.jobname);
  if (opts.outDir) args.push("-output-directory=" + path.resolve(opts.outDir));
  args.push(path.resolve(texPath));
  const res = await runCommand(exe, args, { timeoutMs: 90_000 });
  return { code: res.code, stdout: res.stdout, stderr: res.stderr, command: res.command, args: res.args };
}

async function runBiberIfNeeded(rootTex: string, outDir?: string): Promise<string> {
  const base = path.parse(rootTex).name;
  const dir = outDir ? path.resolve(outDir) : path.dirname(path.resolve(rootTex));
  const bcf = path.join(dir, base + ".bcf");
  if (!fs.existsSync(bcf)) return "";
  const exe = which(os.platform() === "win32" ? "biber.exe" : "biber") || (os.platform() === "win32" ? "biber.exe" : "biber");
  const res = await runCommand(exe, [base], { cwd: dir, timeoutMs: 90_000 });
  return (res.stdout || "") + (res.stderr ? "\n" + res.stderr : "");
}

async function runBibtexIfNeeded(rootTex: string, outDir?: string): Promise<string> {
  const base = path.parse(rootTex).name;
  const dir = outDir ? path.resolve(outDir) : path.dirname(path.resolve(rootTex));
  const aux = path.join(dir, base + ".aux");
  if (!fs.existsSync(aux)) return "";
  const content = fs.readFileSync(aux, "utf8");
  if (!/\\citation|\\bibdata/.test(content)) return "";
  const exe = which(os.platform() === "win32" ? "bibtex.exe" : "bibtex") || (os.platform() === "win32" ? "bibtex.exe" : "bibtex");
  const res = await runCommand(exe, [base], { cwd: dir, timeoutMs: 90_000 });
  return (res.stdout || "") + (res.stderr ? "\n" + res.stderr : "");
}

async function compileWithEngineFallback(opts: CompileOptions): Promise<CompileResult> {
  const engine = opts.engine || "pdflatex";
  const root = path.resolve(opts.root);
  let combined = "";

  // First pass
  const pass1 = await runEngineOnce(engine, root, opts);
  combined += pass1.stdout + (pass1.stderr ? "\n" + pass1.stderr : "");

  // Bibliography step (prefer biber if .bcf exists, else bibtex if .aux indicates citations)
  const bibLog = (await runBiberIfNeeded(root, opts.outDir)) || (await runBibtexIfNeeded(root, opts.outDir));
  if (bibLog) combined += "\n" + bibLog;

  // Second pass
  const pass2 = await runEngineOnce(engine, root, opts);
  combined += "\n" + pass2.stdout + (pass2.stderr ? "\n" + pass2.stderr : "");

  const diagnostics = parseLatexLog(combined);
  const outDir = opts.outDir ? path.resolve(opts.outDir) : path.dirname(root);
  const pdfPath = path.join(outDir, (opts.jobname || path.parse(root).name) + ".pdf");
  const success = (pass2.code === 0) && diagnostics.filter(d => d.type === "error").length === 0;
  return {
    success,
    pdfPath,
    diagnostics,
    rawLog: combined,
    command: pass2.command,
    args: pass2.args,
    code: pass2.code
  };
}

export async function compileLatex(opts: CompileOptions): Promise<CompileResult> {
  const latexmk = which(os.platform() === "win32" ? "latexmk.exe" : "latexmk");

  // If latexmk is not available, use engine fallback
  if (!latexmk) {
    return await compileWithEngineFallback(opts);
  }

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
  // Set engine selection for latexmk
  args.push("-e", `$pdflatex='${engine}'`);
  const root = path.resolve(opts.root);
  args.push(root);

  const res = await runCommand(latexmk, args, { timeoutMs: 120_000 });
  const logText = (res.stdout || "") + "\n" + (res.stderr || "");
  const diagnostics = parseLatexLog(logText);

  // Inject missing-perl diagnostic if detected
  if (detectMissingPerl(logText)) {
    diagnostics.push({
      type: "error",
      message: "MiKTeX could not find the script engine 'perl' required by latexmk.",
      code: "missing-perl",
      hint: "Install Strawberry Perl (https://strawberryperl.com/) and ensure perl is on PATH, or follow MiKTeX KB: https://miktex.org/kb/fix-script-engine-not-found"
    });
  }

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
