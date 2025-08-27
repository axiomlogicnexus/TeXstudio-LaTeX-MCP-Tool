/**
 * Package and documentation helpers (M15)
 * - kpsewhich: locate files in TeX tree
 * - texdoc: list documentation candidates for a package
 * - tlmgr/mpm: package info and install (dry-run by default)
 */
import os from "node:os";
import path from "node:path";
import { runCommand } from "../utils/process.js";
import { resolveExec } from "../discovery/resolveExec.js";
import { toExtendedIfNeeded } from "../utils/security.js";

export interface KpsewhichArgs {
  file: string;
  format?: string; // e.g., "tex", "bib", "map", etc.
}

export async function tex_kpsewhich(args: KpsewhichArgs): Promise<{ path: string | null; stdout: string; stderr: string; command: string; argv: string[] }>
{
  const exe = (await resolveExec(os.platform() === "win32" ? "kpsewhich.exe" : "kpsewhich")) || "kpsewhich";
  const argv: string[] = [];
  if (args.format) argv.push("--format=" + args.format);
  // kpsewhich expects a filename key, not necessarily a path
  argv.push(args.file);
  const res = await runCommand(exe, argv, { timeoutMs: 4000 });
  const out = (res.stdout || "").split(/\r?\n/)[0]?.trim() || null;
  return { path: out, stdout: res.stdout, stderr: res.stderr, command: exe, argv };
}

export interface TexdocArgs {
  package: string;
  listOnly?: boolean; // default true; do not open viewer
}

export async function tex_texdoc(args: TexdocArgs): Promise<{ docs: { path: string; uri: string }[]; stdout: string; stderr: string; command: string; argv: string[] }>
{
  const exe = (await resolveExec(os.platform() === "win32" ? "texdoc.exe" : "texdoc")) || "texdoc";
  const argv: string[] = ["-l", args.package];
  const res = await runCommand(exe, argv, { timeoutMs: 5000 });
  const lines = (res.stdout || "").split(/\r?\n/);
  const docs: { path: string; uri: string }[] = [];
  for (const ln of lines) {
    // Try to extract file paths ending with .pdf/.txt/.dvi etc.
    const m = ln.match(/(\S+\.(pdf|txt|dvi|ps))/i);
    if (m) {
      const p = path.resolve(m[1]);
      const ext = toExtendedIfNeeded(p);
      const uri = "file:///" + ext.replace(/^\\\\\?\\/, "").replace(/\\/g, "/");
      docs.push({ path: ext, uri });
    }
  }
  return { docs, stdout: res.stdout, stderr: res.stderr, command: exe, argv };
}

export interface PkgInfoArgs { name: string; }
export interface PkgInstallArgs { name: string; manager?: "tlmgr" | "mpm"; dryRun?: boolean }

async function resolveManager(prefer?: "tlmgr" | "mpm"): Promise<"tlmgr" | "mpm" | null> {
  if (prefer) return prefer;
  const tl = await resolveExec(os.platform() === "win32" ? "tlmgr.exe" : "tlmgr");
  if (tl) return "tlmgr";
  const mpm = await resolveExec("mpm.exe");
  if (mpm) return "mpm";
  return null;
}

export async function tex_pkg_info(args: PkgInfoArgs): Promise<{ manager: string | null; stdout: string; stderr: string; command: string | null; argv: string[] }>
{
  const mgr = await resolveManager();
  if (!mgr) {
    return { manager: null, stdout: "", stderr: "No package manager (tlmgr/mpm) available", command: null, argv: [] };
  }
  if (mgr === "tlmgr") {
    const exe = (await resolveExec(os.platform() === "win32" ? "tlmgr.exe" : "tlmgr"))!;
    const argv = ["info", args.name];
    const res = await runCommand(exe, argv, { timeoutMs: 8000 });
    return { manager: mgr, stdout: res.stdout, stderr: res.stderr, command: exe, argv };
  } else {
    const exe = (await resolveExec("mpm.exe"))!;
    const argv = ["--list", args.name];
    const res = await runCommand(exe, argv, { timeoutMs: 8000 });
    return { manager: mgr, stdout: res.stdout, stderr: res.stderr, command: exe, argv };
  }
}

export async function tex_pkg_install(args: PkgInstallArgs): Promise<{ manager: string | null; stdout: string; stderr: string; command: string | null; argv: string[] }>
{
  const mgr = await resolveManager(args.manager);
  if (!mgr) {
    return { manager: null, stdout: "", stderr: "No package manager (tlmgr/mpm) available", command: null, argv: [] };
  }
  if (mgr === "tlmgr") {
    const exe = (await resolveExec(os.platform() === "win32" ? "tlmgr.exe" : "tlmgr"))!;
    const argv = ["install"]; if (args.dryRun) argv.push("--dry-run"); argv.push(args.name);
    const res = await runCommand(exe, argv, { timeoutMs: 20000 });
    return { manager: mgr, stdout: res.stdout, stderr: res.stderr, command: exe, argv };
  } else {
    const exe = (await resolveExec("mpm.exe"))!;
    if (args.dryRun) {
      const argv = ["--list", args.name];
      const res = await runCommand(exe, argv, { timeoutMs: 8000 });
      return { manager: mgr, stdout: res.stdout, stderr: "[dry-run] mpm has no dry-run install; showing package list instead", command: exe, argv };
    }
    const argv = ["--install", args.name];
    const res = await runCommand(exe, argv, { timeoutMs: 30000 });
    return { manager: mgr, stdout: res.stdout, stderr: res.stderr, command: exe, argv };
  }
}
