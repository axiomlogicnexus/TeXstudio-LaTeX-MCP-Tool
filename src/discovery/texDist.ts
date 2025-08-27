/**
 * TeX distribution detection (MiKTeX vs TeX Live) and basic info.
 */
import os from "node:os";
import { which } from "./which.js";
import { runCommand } from "../utils/process.js";

export interface TexDistInfo {
  name: "MiKTeX" | "TeX Live" | "Unknown";
  details?: string;
  tools: { name: string; path: string | null; version?: string | null }[];
}

async function getVersion(exe: string, flag: string): Promise<string | null> {
  try {
    const r = await runCommand(exe, [flag], { timeoutMs: 1200 });
    const first = (r.stdout || r.stderr).split(/\r?\n/)[0]?.trim();
    return first || null;
  } catch { return null; }
}

export async function detectTexDist(): Promise<TexDistInfo> {
  const isWin = os.platform() === "win32";
  const candidates = [
    "kpsewhich",
    "pdflatex",
    "xelatex",
    "lualatex",
    "latexmk",
    "biber",
    "bibtex"
  ];
  const tools: { name: string; path: string | null; version?: string | null }[] = [];
  for (const n of candidates) {
    const exe = which(isWin ? `${n}.exe` : n) || which(n);
    const version = exe ? (await getVersion(exe, "--version") || await getVersion(exe, "-v")) : null;
    tools.push({ name: n, path: exe || null, version });
  }

  // Decide distribution by kpsewhich output or version banners
  let name: TexDistInfo["name"] = "Unknown";
  let details: string | undefined;
  const kp = tools.find(t => t.name === "kpsewhich")?.version || "";
  if (/MiKTeX/i.test(kp)) { name = "MiKTeX"; details = kp; }
  const any = tools.map(t => t.version || "").join("\n");
  if (/TeX Live/i.test(any)) { name = "TeX Live"; details = details || any.split("\n").find(l => /TeX Live/i.test(l)); }

  return { name, details, tools };
}
