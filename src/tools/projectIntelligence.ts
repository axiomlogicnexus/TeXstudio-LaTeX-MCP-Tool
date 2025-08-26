/**
 * Project intelligence utilities (M11)
 *
 * - Root detection heuristics: explicit file, magic comment, .latexmkrc presence, common names
 * - Dependency graph builder: parse \include/\input/\subfile/\includegraphics and resolve files
 * - Out-of-date check: compare PDF mtime vs source mtimes; list newer sources and missing
 */
import fs from "node:fs";
import path from "node:path";

export interface DetectRootOptions {
  // Optional starting path (file or directory). If a file is provided, its folder is used.
  startPath?: string;
  // If provided, treat this as explicit root (wins).
  file?: string;
}

export interface DetectRootResult {
  root: string | null;
  method: "explicit" | "magic" | "latexmkrc" | "heuristic" | "none";
  candidates: string[]; // possible roots discovered during scanning
}

const COMMON_ROOTS = [
  "main.tex",
  "thesis.tex",
  "report.tex",
  "paper.tex",
  "dissertation.tex",
  "book.tex",
  "article.tex",
];

function safeReadFirstLines(file: string, maxBytes = 64 * 1024): string | null {
  try {
    const fd = fs.openSync(file, "r");
    const buf = Buffer.allocUnsafe(Math.min(maxBytes, fs.statSync(file).size));
    const read = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    return buf.slice(0, read).toString("utf8");
  } catch {
    return null;
  }
}

function findMagicRootComment(text: string): string | null {
  // Patterns like: %! TeX root = path/to/main.tex  OR  % TeX root = ...
  const re = /^%\s*!?\s*TeX\s+root\s*=\s*(.+)$/im;
  const m = text.match(re);
  if (m) {
    // Trim surrounding quotes and whitespace
    return m[1].trim().replace(/^"|"$/g, "");
  }
  return null;
}

export function detectRoot(opts: DetectRootOptions = {}): DetectRootResult {
  // 1) Explicit file wins
  if (opts.file) {
    const root = path.resolve(opts.file);
    if (fs.existsSync(root)) {
      return { root, method: "explicit", candidates: [root] };
    }
  }

  const start = opts.startPath ? path.resolve(opts.startPath) : process.cwd();
  const startDir = fs.existsSync(start) && fs.statSync(start).isDirectory()
    ? start
    : path.dirname(start);

  const candidates: string[] = [];

  // 2) Look for .latexmkrc as a hint (not authoritative but suggests a project root)
  const rc = path.join(startDir, ".latexmkrc");
  if (fs.existsSync(rc)) {
    // If there is a main.tex alongside, prefer it; otherwise return heuristic later
    const alongside = path.join(startDir, "main.tex");
    if (fs.existsSync(alongside)) {
      return { root: alongside, method: "latexmkrc", candidates: [alongside, rc] };
    }
  }

  // 3) Magic root in nearby files: scan common roots and any .tex in dir for magic comment
  const entries = safeListDir(startDir).filter((e) => e.toLowerCase().endsWith(".tex"));
  // Common roots first
  for (const base of COMMON_ROOTS) {
    const p = path.join(startDir, base);
    if (fs.existsSync(p)) {
      const content = safeReadFirstLines(p) || "";
      candidates.push(p);
      const magic = findMagicRootComment(content);
      if (magic) {
        const resolved = path.resolve(startDir, magic);
        if (fs.existsSync(resolved)) {
          return { root: resolved, method: "magic", candidates };
        }
      }
      // documentclass presence
      if (/\\documentclass\s*\{[^}]+\}/.test(content)) {
        return { root: p, method: "heuristic", candidates };
      }
    }
  }

  // Try all tex files for documentclass / magic comment
  for (const f of entries) {
    const p = path.join(startDir, f);
    const content = safeReadFirstLines(p) || "";
    candidates.push(p);
    const magic = findMagicRootComment(content);
    if (magic) {
      const resolved = path.resolve(startDir, magic);
      if (fs.existsSync(resolved)) {
        return { root: resolved, method: "magic", candidates };
      }
    }
    if (/\\documentclass\s*\{[^}]+\}/.test(content)) {
      return { root: p, method: "heuristic", candidates };
    }
  }

  // 4) As a last resort, pick main.tex if present
  const main = path.join(startDir, "main.tex");
  if (fs.existsSync(main)) {
    candidates.push(main);
    return { root: main, method: "heuristic", candidates };
  }

  return { root: null, method: "none", candidates };
}

function safeListDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export type EdgeKind = "include" | "input" | "subfile" | "graphics" | "bib";

export interface GraphEdge { from: string; to: string; kind: EdgeKind; }
export interface GraphResult { nodes: string[]; edges: GraphEdge[]; missing: string[]; }

const TEX_EXTS = [".tex"]; // for include-like commands
const GFX_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".eps"]; // for includegraphics

function resolveCandidate(fromDir: string, target: string, exts: string[]): string | null {
  // Absolute
  if (path.isAbsolute(target)) {
    if (fs.existsSync(target)) return target;
    for (const ext of exts) {
      const p = target.endsWith(ext) ? target : target + ext;
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
  // Relative to fromDir
  const raw = path.resolve(fromDir, target);
  if (fs.existsSync(raw)) return raw;
  for (const ext of exts) {
    const p = raw.endsWith(ext) ? raw : raw + ext;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function buildDependencyGraph(root: string): GraphResult {
  const start = path.resolve(root);
  const nodes = new Set<string>();
  const edges: GraphEdge[] = [];
  const missing = new Set<string>();

  const queue: string[] = [];
  if (fs.existsSync(start)) {
    queue.push(start);
  } else {
    return { nodes: [], edges: [], missing: [start] };
  }

  while (queue.length) {
    const cur = queue.shift()!;
    if (nodes.has(cur)) continue;
    nodes.add(cur);
    const dir = path.dirname(cur);
    const text = safeReadFirstLines(cur, 512 * 1024) || "";

    // Patterns
    const incRe = /\\(include|input|subfile)\{([^}]+)\}/g;
    const gfxRe = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
    const bibRe = /\\bibliography\{([^}]+)\}/g;

    // includes/input/subfile
    let m: RegExpExecArray | null;
    while ((m = incRe.exec(text))) {
      const kind = m[1] as EdgeKind;
      const target = m[2];
      const resolved = resolveCandidate(dir, target, TEX_EXTS);
      if (resolved) {
        edges.push({ from: cur, to: resolved, kind });
        queue.push(resolved);
      } else {
        missing.add(path.resolve(dir, target));
      }
    }

    // includegraphics
    while ((m = gfxRe.exec(text))) {
      const target = m[1];
      const resolved = resolveCandidate(dir, target, GFX_EXTS);
      if (resolved) {
        edges.push({ from: cur, to: resolved, kind: "graphics" });
      } else {
        missing.add(path.resolve(dir, target));
      }
    }

    // bibliography
    while ((m = bibRe.exec(text))) {
      const target = m[1];
      // Bib commands can be comma-separated list
      const parts = target.split(",").map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const resolved = resolveCandidate(dir, p, [".bib"]);
        if (resolved) {
          edges.push({ from: cur, to: resolved, kind: "bib" });
        } else {
          missing.add(path.resolve(dir, p));
        }
      }
    }
  }

  return { nodes: Array.from(nodes), edges, missing: Array.from(missing) };
}

export interface OutOfDateOptions {
  root: string;
  outDir?: string;
  jobname?: string;
  pdfPath?: string; // override
}

export interface OutOfDateResult {
  pdfPath: string;
  pdfMTime?: number;
  newerSources: string[]; // sources newer than pdf
  missing: string[];      // missing dependencies
  upToDate: boolean;      // true if no source newer than pdf and no missing deps
}

export function expectedPdfPath(opts: { root: string; outDir?: string; jobname?: string }): string {
  const r = path.resolve(opts.root);
  const out = opts.outDir ? path.resolve(opts.outDir) : path.dirname(r);
  const base = opts.jobname || path.parse(r).name;
  return path.join(out, base + ".pdf");
}

export function computeOutOfDate(opts: OutOfDateOptions): OutOfDateResult {
  const pdf = opts.pdfPath || expectedPdfPath(opts);
  let pdfMTime: number | undefined;
  try {
    pdfMTime = fs.statSync(pdf).mtimeMs;
  } catch {
    pdfMTime = undefined;
  }

  const graph = buildDependencyGraph(opts.root);
  const newerSources: string[] = [];

  if (pdfMTime !== undefined) {
    for (const file of graph.nodes) {
      try {
        const mt = fs.statSync(file).mtimeMs;
        if (mt > pdfMTime!) newerSources.push(file);
      } catch {
        // If stat fails, let missing list capture it
      }
    }
  } else {
    // If PDF missing, consider all sources as newer
    newerSources.push(...graph.nodes);
  }

  const missing = graph.missing;
  const upToDate = newerSources.length === 0 && missing.length === 0;

  return { pdfPath: pdf, pdfMTime, newerSources, missing, upToDate };
}
