export interface Diagnostic {
  type: "error" | "warning" | "info";
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  hint?: string;
}

const FILE_LINE_RE = /(.*):(\d+):/;

export function parseLatexLog(text: string): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("! ")) {
      // Error reported by TeX engine
      const message = line.substring(2).trim();
      // Try to find file:line in preceding or following lines
      let file: string | undefined;
      let ln: number | undefined;
      const look = [lines[i - 1], lines[i + 1]];
      for (const l of look) {
        if (!l) continue;
        const m = l.match(FILE_LINE_RE);
        if (m) {
          file = m[1];
          ln = parseInt(m[2], 10);
          break;
        }
      }
      diags.push({ type: "error", message, file, line: ln });
    } else if (/^(LaTeX\s+Warning:|Package\s+.*\s+Warning:)/.test(line)) {
      const message = line.replace(/^.*Warning:\s*/, "").trim();
      diags.push({ type: "warning", message });
    } else if (/^(Overfull|Underfull) \\hbox/.test(line)) {
      diags.push({ type: "warning", message: line.trim(), code: "HBOX" });
    } else if (/^Package .* Error:/.test(line)) {
      diags.push({ type: "error", message: line.replace(/^Package\s+.*\s+Error:\s*/, "").trim() });
    } else if (/^kpathsea:/.test(line)) {
      diags.push({ type: "error", message: line.trim(), code: "KPATHSEA" });
    }
  }
  return diags;
}
