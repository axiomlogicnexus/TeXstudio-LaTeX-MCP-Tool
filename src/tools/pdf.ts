/**
 * PDF post-processing helpers (M16)
 * - pdf_optimize: optimize/linearize PDF using qpdf if available, otherwise Ghostscript
 * - pdf_info: basic info using qpdf (pages) if available; fallback returns raw command output
 */
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { runCommand } from "../utils/process.js";
import { resolveExec } from "../discovery/resolveExec.js";
import { toExtendedIfNeeded } from "../utils/security.js";

export interface OptimizeArgs {
  input: string;
  output?: string;
  method?: "auto" | "qpdf" | "ghostscript";
  linearize?: boolean; // fast web view
  gsQuality?: "default" | "screen" | "ebook" | "printer" | "prepress"; // Ghostscript quality profile
}

export interface OptimizeResult {
  method: "qpdf" | "ghostscript" | "none";
  output: string | null;
  stdout: string;
  stderr: string;
  command: string | null;
  argv: string[];
}

export async function pdf_optimize(args: OptimizeArgs): Promise<OptimizeResult> {
  const inPath = toExtendedIfNeeded(path.resolve(args.input));
  const outPath = toExtendedIfNeeded(path.resolve(args.output || path.join(path.dirname(inPath), path.parse(inPath).name + ".opt.pdf")));

  // Prefer qpdf if available or requested
  const qpdfExe = await resolveExec(os.platform() === "win32" ? "qpdf.exe" : "qpdf");
  const gsExe = await resolveExec(os.platform() === "win32" ? "gswin64c.exe" : "gs");

  const wantQpdf = args.method === "qpdf" || (args.method !== "ghostscript" && !!qpdfExe);
  if (wantQpdf && qpdfExe) {
    const argv: string[] = [];
    // Compression flags
    argv.push("--stream-data=compress", "--object-streams=generate");
    if (args.linearize) argv.push("--linearize");
    argv.push(inPath, outPath);
    const res = await runCommand(qpdfExe, argv, { timeoutMs: 20000 });
    return { method: "qpdf", output: fs.existsSync(outPath) ? outPath : null, stdout: res.stdout, stderr: res.stderr, command: qpdfExe, argv };
  }

  // Ghostscript fallback
  if (args.method !== "qpdf" && gsExe) {
    const quality = (args.gsQuality || "default").toLowerCase();
    const qualityMap: Record<string, string> = {
      default: "/default",
      screen: "/screen",
      ebook: "/ebook",
      printer: "/printer",
      prepress: "/prepress",
    };
    const q = qualityMap[quality] || "/default";
    const argv: string[] = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.7",
      `-dPDFSETTINGS=${q}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-o",
      outPath,
      inPath
    ];
    const res = await runCommand(gsExe, argv, { timeoutMs: 30000 });
    return { method: "ghostscript", output: fs.existsSync(outPath) ? outPath : null, stdout: res.stdout, stderr: res.stderr, command: gsExe, argv };
  }

  return { method: "none", output: null, stdout: "", stderr: "No qpdf or ghostscript available", command: null, argv: [] };
}

export async function pdf_info(args: { input: string }): Promise<{ pages?: number; stdout: string; stderr: string; command: string | null; argv: string[] }>
{
  const inPath = toExtendedIfNeeded(path.resolve(args.input));
  const qpdfExe = await resolveExec(os.platform() === "win32" ? "qpdf.exe" : "qpdf");
  if (qpdfExe) {
    const argv = ["--show-npages", inPath];
    const res = await runCommand(qpdfExe, argv, { timeoutMs: 4000 });
    const pages = parseInt((res.stdout || "").trim(), 10);
    return { pages: isNaN(pages) ? undefined : pages, stdout: res.stdout, stderr: res.stderr, command: qpdfExe, argv };
  }
  return { pages: undefined, stdout: "", stderr: "qpdf not available", command: null, argv: [] };
}
