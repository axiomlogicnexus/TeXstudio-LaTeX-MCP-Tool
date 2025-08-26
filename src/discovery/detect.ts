import os from "node:os";
import { which } from "./which.js";
import { runCommand } from "../utils/process.js";

export interface ToolInfo { name: string; path: string | null; version?: string | null; }

// Try a version flag with a short timeout to avoid hanging requests
async function tryVersion(cmd: string, flag: string): Promise<string | null> {
  try {
    const r = await runCommand(cmd, [flag], { timeoutMs: 1200 });
    const first = (r.stdout || r.stderr).split(/\r?\n/)[0]?.trim();
    return first || null;
  } catch {
    return null;
  }
}

// Preferred version flags by tool name to minimize probing
const versionFlagMap: Record<string, string> = {
  texstudio: "--version",
  latexmk: "-v",
  pdflatex: "--version",
  xelatex: "--version",
  lualatex: "--version",
  bibtex: "--version",
  biber: "--version",
  chktex: "--version",
  latexindent: "--version",
  kpsewhich: "--version",
  texdoc: "--version",
  tlmgr: "--version",
  mpm: "--version",
};

async function probeVersion(toolName: string, exePath: string): Promise<string | null> {
  const primary = versionFlagMap[toolName] || "--version";
  // Only one quick attempt by default to avoid accumulating timeouts
  const v = await tryVersion(exePath, primary);
  if (v) return v;
  // Fallback to a single alternative for a few known tools
  if (toolName === "latexmk") {
    return await tryVersion(exePath, "--version");
  }
  return null;
}

export async function detectToolchain(): Promise<ToolInfo[]> {
  const candidates = [
    "texstudio",
    "latexmk",
    "pdflatex",
    "xelatex",
    "lualatex",
    "bibtex",
    "biber",
    "chktex",
    "latexindent",
    "kpsewhich",
    "texdoc",
    "tlmgr",
    "mpm"
  ];

  // Resolve and probe in parallel to reduce wall-clock time
  const results = await Promise.all(candidates.map(async (raw) => {
    const name = os.platform() === "win32" && !raw.endsWith(".exe") ? raw + ".exe" : raw;
    const p = which(name) || which(raw);
    let version: string | null = null;
    if (p) {
      version = await probeVersion(raw, p);
    }
    const info: ToolInfo = { name: raw, path: p, version };
    return info;
  }));

  return results;
}
