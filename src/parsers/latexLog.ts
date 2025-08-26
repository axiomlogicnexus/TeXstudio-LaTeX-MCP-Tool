/**
 * Advanced LaTeX log parser (M12)
 *
 * Extracts structured diagnostics from LaTeX/latexmk logs with helpful hints.
 * Heuristics include:
 * - Error blocks beginning with '! ...' and associated l.<line> markers
 * - Missing file/package detection (kpathsea and LaTeX Error: File `...'
 * - Undefined control sequence and common LaTeX errors
 * - Overfull/Underfull \hbox with line range extraction
 * - Citation/label warnings and rerun suggestions
 *
 * Note: TeX logs vary widely. This is heuristic and can be extended.
 */

export interface Diagnostic {
  type: "error" | "warning" | "info";
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  hint?: string;
}

// Matches "path:123:" patterns sometimes found near errors
const FILE_LINE_RE = /(.*):(\d+):/;

// Matches l.<num> indicator lines produced near errors (Undefined control sequence, etc.)
const L_DOT_RE = /^l\.(\d+)\b/;

// Track likely file pushes from tokens like (./path/file.tex and pop on ')' on its own
const PUSH_FILE_RE = /\(([^()\s][^()]*\.(tex|sty|cls|bib))\b/;
const POP_FILE_RE = /^\s*\)\s*$/;

function push<T>(arr: T[], v: T) { arr.push(v); }
function pop<T>(arr: T[]): T | undefined { return arr.pop(); }

function asPkgName(maybeFile: string): string | undefined {
  // If foo.sty → foo
  const m = /(.*)\.sty$/i.exec(maybeFile.trim().replace(/^`|`$/g, ""));
  return m ? m[1] : undefined;
}

function add(diags: Diagnostic[], d: Diagnostic) {
  // Normalize whitespace in message
  d.message = d.message.replace(/\s+/g, " ").trim();
  diags.push(d);
}

export function parseLatexLog(text: string): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const lines = text.split(/\r?\n/);

  const fileStack: string[] = [];
  let lastLineNum: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Maintain a rough file stack based on parentheses includes
    // Push: tokens "(path/file.tex". Multiple pushes can occur on one line.
    let m: RegExpExecArray | null;
    let pushRe = new RegExp(PUSH_FILE_RE.source, "g");
    while ((m = pushRe.exec(line))) {
      const f = m[1];
      push(fileStack, f);
    }
    // Pop when a line is a bare ')'
    if (POP_FILE_RE.test(line)) {
      pop(fileStack);
    }

    // Capture l.<num> markers to associate with preceding error/warning
    const ld = line.match(L_DOT_RE);
    if (ld) {
      lastLineNum = parseInt(ld[1], 10);
    }

    // Core error indicator
    if (line.startsWith("! ")) {
      const message = line.substring(2).trim();
      // Try to attach file/line context from surrounding lines
      let file: string | undefined;
      let ln: number | undefined = lastLineNum;

      // Look around for file:line pattern if l.<num> wasn't set
      if (!ln) {
        const prev = lines[i - 1] || "";
        const next = lines[i + 1] || "";
        const flPrev = prev.match(FILE_LINE_RE);
        const flNext = next.match(FILE_LINE_RE);
        if (flPrev) { file = flPrev[1]; ln = parseInt(flPrev[2], 10); }
        else if (flNext) { file = flNext[1]; ln = parseInt(flNext[2], 10); }
      }
      if (!file && fileStack.length) file = fileStack[fileStack.length - 1];

      // Special case: Undefined control sequence
      if (/^Undefined control sequence\.?/.test(message)) {
        add(diags, { type: "error", message, file, line: ln, code: "undefined-control-sequence", hint: "Check for typos or missing packages providing this command" });
        continue;
      }

      add(diags, { type: "error", message, file, line: ln });
      continue;
    }

    // Missing file/package patterns
    // LaTeX Error: File `foo.sty' not found.
    let miss = /LaTeX Error:\s*File\s*`([^']+)'\s*not found\./.exec(line);
    if (miss) {
      const missingFile = miss[1];
      const pkg = asPkgName(missingFile);
      const hint = pkg
        ? `Package missing: try tlmgr install ${pkg} (TeX Live) or install via MiKTeX Package Manager`
        : `File missing: check the path is correct and included (e.g., via \\graphicspath)`;
      add(diags, { type: "error", message: `Missing file: ${missingFile}`, file: fileStack[fileStack.length - 1], code: pkg ? "missing-package" : "missing-file", hint });
      continue;
    }

    // kpathsea: \*\*\* file `foo' not found
    miss = /kpathsea:.*?:\s*file\s*`([^']+)'\s*not found/.exec(line);
    if (miss) {
      const missing = miss[1];
      const pkg = asPkgName(missing);
      const hint = pkg
        ? `Package missing: try tlmgr install ${pkg} (TeX Live) or install via MiKTeX Package Manager`
        : `File missing: verify relative paths and working directory; consider \\graphicspath for images.`;
      add(diags, { type: "error", message: `Missing: ${missing}`, file: fileStack[fileStack.length - 1], code: pkg ? "missing-package" : "missing-file", hint });
      continue;
    }

    // Warnings
    if (/^(LaTeX\s+Warning:|Package\s+.*\s+Warning:)/.test(line)) {
      const msg = line.replace(/^.*Warning:\s*/, "").trim();
      // Citation undefined
      let code: string | undefined;
      let hint: string | undefined;
      if (/Citation\s+'.*'\s+.*undefined/.test(line) || /There were undefined references/.test(line)) {
        code = "citation-undefined";
        hint = "Run bibliography tool (biber/bibtex) and rerun LaTeX (latexmk handles this automatically).";
      }
      if (/Label\(s\) may have changed|Rerun to get cross-references right/.test(line)) {
        code = code || "rerun";
        hint = hint || "Rerun LaTeX so cross-references update (latexmk does this automatically).";
      }
      add(diags, { type: "warning", message: msg, file: fileStack[fileStack.length - 1], code, hint });
      continue;
    }

    // Over/Underfull \hbox lines with line ranges
    const hbox = /^(Overfull|Underfull) \\hbox\s*\([^)]*\)\s+in paragraph at lines\s+(\d+)(?:--(\d+))?/.exec(line);
    if (hbox) {
      const start = parseInt(hbox[2], 10);
      const end = hbox[3] ? parseInt(hbox[3], 10) : start;
      add(diags, { type: "warning", message: line.trim(), file: fileStack[fileStack.length - 1], line: start, code: hbox[1].toLowerCase() + "-hbox", hint: end !== start ? `Paragraph spans lines ${start}–${end}` : undefined });
      continue;
    }

    // Generic kpathsea mention
    if (/^kpathsea:/.test(line)) {
      add(diags, { type: "error", message: line.trim(), file: fileStack[fileStack.length - 1], code: "kpathsea" });
      continue;
    }
  }

  return diags;
}
