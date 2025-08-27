/**
 * TeX distribution detection (MiKTeX vs TeX Live) and basic info.
 *
 * Optimized to avoid client timeouts:
 * - Short per-probe timeouts (≈600ms)
 * - Limited tool set for version probing
 * - Parallel execution with Promise.allSettled
 */
import os from "node:os";
import { which } from "./which.js";
import { runCommand } from "../utils/process.js";

export interface TexDistInfo {
  name: "MiKTeX" | "TeX Live" | "Unknown";
  details?: string;
  tools: { name: string; path: string | null; version?: string | null }[];
}

async function getVersionFast(exe: string, flags: string[]): Promise<string | null> {
  for (const f of flags) {
    try {
      const r = await runCommand(exe, [f], { timeoutMs: 600 });
      const first = (r.stdout || r.stderr).split(/\r?\n/)[0]?.trim();
      if (first) return first;
    } catch {}
  }
  return null;
}

let _distCache: { at: number; info: TexDistInfo } | null = null;
const DIST_TTL = 60_000;

export async function detectTexDist(): Promise<TexDistInfo> {
  const now = Date.now();
  if (_distCache && (now - _distCache.at) < DIST_TTL) {
    return _distCache.info;
  }
  const isWin = os.platform() === "win32";
  // Restrict probing to key tools to minimize overhead
  const candidates = ["kpsewhich", "pdflatex", "latexmk", "biber", "bibtex"];

  const probes = candidates.map(async (n) => {
    const exe = which(isWin ? `${n}.exe` : n) || which(n);
    const version = exe ? await getVersionFast(exe, ["--version", "-v"]) : null;
    return { name: n, path: exe || null, version };
  });

  const settled = await Promise.allSettled(probes);
  const tools = settled.map(s => s.status === "fulfilled" ? s.value : { name: "unknown", path: null, version: null });

  // Decide distribution by kpsewhich output or version banners
  let name: TexDistInfo["name"] = "Unknown";
  let details: string | undefined;
  const kp = tools.find(t => t.name === "kpsewhich")?.version || "";
  if (/MiKTeX/i.test(kp)) { name = "MiKTeX"; details = kp; }
  const any = tools.map(t => t.version || "").join("\n");
  if (/TeX Live/i.test(any)) { name = "TeX Live"; details = details || any.split("\n").find(l => /TeX Live/i.test(l)); }

  const info = { name, details, tools } as TexDistInfo;
  _distCache = { at: now, info };
  return info;
}
