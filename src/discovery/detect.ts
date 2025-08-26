import os from "node:os";
import { which } from "./which.js";
import { runCommand } from "../utils/process.js";

export interface ToolInfo { name: string; path: string | null; version?: string | null; }

async function tryVersion(cmd: string, flag: string): Promise<string | null> {
  try {
    const r = await runCommand(cmd, [flag], { timeoutMs: 5000 });
    const first = (r.stdout || r.stderr).split(/\r?\n/)[0]?.trim();
    return first || null;
  } catch {
    return null;
  }
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

  const tools: ToolInfo[] = [];
  for (const raw of candidates) {
    const name = os.platform() === "win32" && !raw.endsWith(".exe") ? raw + ".exe" : raw;
    const p = which(name) || which(raw);
    let version: string | null = null;
    if (p) {
      version = await tryVersion(p, "--version")
        || await tryVersion(p, "-version")
        || await tryVersion(p, "-v");
    }
    tools.push({ name: raw, path: p, version });
  }
  return tools;
}
