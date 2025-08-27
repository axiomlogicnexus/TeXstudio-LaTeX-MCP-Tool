/**
 * Container/Docker support (M18)
 *
 * Tools:
 * - container_info: detect Docker and list local images (short listing)
 * - compileLatexInContainer: run latexmk inside a container with workspace mounted
 * - cleanAuxInContainer: run latexmk -c/-C inside a container
 */
import os from "node:os";
import path from "node:path";
import { runCommand } from "../utils/process.js";
import { resolveExec } from "../discovery/resolveExec.js";
import { getWorkspaceRoot, ensureInsideWorkspace, shellEscapeAllowed } from "../utils/security.js";
import { loadConfig } from "../config/load.js";

export async function container_info(): Promise<{ dockerAvailable: boolean; dockerPath: string | null; version?: string | null; images?: string[] }>
{
  const docker = await resolveExec(os.platform() === "win32" ? "docker.exe" : "docker");
  if (!docker) return { dockerAvailable: false, dockerPath: null };
  const v = await runCommand(docker, ["--version"], { timeoutMs: 1500 }).catch(() => null);
  const ver = v ? ((v.stdout || v.stderr).split(/\r?\n/)[0]?.trim() || null) : null;
  // list a few images (not strictly required)
  const imgs = await runCommand(docker, ["images", "--format", "{{.Repository}}:{{.Tag}}"], { timeoutMs: 2000 }).catch(() => null);
  const images = imgs ? (imgs.stdout || "").split(/\r?\n/).filter(Boolean).slice(0, 20) : [];
  return { dockerAvailable: true, dockerPath: docker, version: ver, images };
}

export interface CompileContainerArgs {
  image?: string; // default: texlive/texlive
  root: string;   // absolute or relative path to root tex
  engine?: "pdflatex" | "xelatex" | "lualatex";
  outDir?: string;
  shellEscape?: boolean;
  interaction?: "batchmode" | "nonstopmode" | "scrollmode" | "errorstopmode";
  jobname?: string;
}

export async function compileLatexInContainer(args: CompileContainerArgs): Promise<{ success: boolean; stdout: string; stderr: string; command: string; argv: string[] }>
{
  const ws = getWorkspaceRoot();
  if (!ws) throw new Error("WORKSPACE_ROOT must be set to use container tools.");
  const docker = await resolveExec(os.platform() === "win32" ? "docker.exe" : "docker");
  if (!docker) throw new Error("Docker not available on PATH.");

  const cfg = loadConfig();
  const image = args.image || cfg.dockerImage || "texlive/texlive";
  const rootAbs = ensureInsideWorkspace(args.root, ws);
  const relRoot = path.relative(ws, rootAbs).split("\\").join("/");
  const outRel = args.outDir ? path.relative(ws, ensureInsideWorkspace(args.outDir, ws)).split("\\").join("/") : undefined;

  // Build latexmk args
  const mk: string[] = [];
  if (outRel) mk.push("-outdir=" + outRel);
  mk.push("-pdf");
  if (args.interaction) mk.push("-interaction=" + args.interaction); else mk.push("-interaction=nonstopmode");
  const requestedShell = !!args.shellEscape;
  const allowShell = requestedShell && shellEscapeAllowed();
  if (allowShell) mk.push("-shell-escape");
  if (args.jobname) mk.push("-jobname=" + args.jobname);
  const engine = args.engine || "pdflatex";
  mk.push("-e", `$pdflatex='${engine}'`);
  mk.push(relRoot);

  // docker run --rm -v WS:/work -w /work IMAGE latexmk ...
  const argv = [
    "run", "--rm",
    "-v", `${ws}:/work`,
    "-w", "/work",
    image,
    "latexmk",
    ...mk
  ];
  const res = await runCommand(docker, argv, { timeoutMs: 180_000 });
  const success = res.code === 0;
  const warning = (requestedShell && !allowShell)
    ? "[warning] shell-escape requested but blocked by policy (set TEX_MCP_ALLOW_SHELL_ESCAPE=1 to allow)\n"
    : "";
  return { success, stdout: warning + (res.stdout || ""), stderr: res.stderr, command: docker, argv };
}

export async function cleanAuxInContainer(args: { image?: string; root: string; deep?: boolean; outDir?: string; }): Promise<{ success: boolean; stdout: string; stderr: string; command: string; argv: string[] }>
{
  const ws = getWorkspaceRoot();
  if (!ws) throw new Error("WORKSPACE_ROOT must be set to use container tools.");
  const docker = await resolveExec(os.platform() === "win32" ? "docker.exe" : "docker");
  if (!docker) throw new Error("Docker not available on PATH.");
  const cfg = loadConfig();
  const image = args.image || cfg.dockerImage || "texlive/texlive";
  const rootAbs = ensureInsideWorkspace(args.root, ws);
  const relRoot = path.relative(ws, rootAbs).split("\\").join("/");
  const outRel = args.outDir ? path.relative(ws, ensureInsideWorkspace(args.outDir, ws)).split("\\").join("/") : undefined;

  const mk: string[] = [];
  if (outRel) mk.push("-outdir=" + outRel);
  mk.push(args.deep ? "-C" : "-c");
  mk.push(relRoot);

  const argv = [
    "run", "--rm",
    "-v", `${ws}:/work`,
    "-w", "/work",
    image,
    "latexmk",
    ...mk
  ];
  const res = await runCommand(docker, argv, { timeoutMs: 60_000 });
  const success = res.code === 0;
  return { success, stdout: res.stdout, stderr: res.stderr, command: docker, argv };
}
