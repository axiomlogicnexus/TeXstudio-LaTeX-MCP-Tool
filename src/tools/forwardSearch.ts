/**
 * Forward search hint helper
 *
 * Given a TeX source file, target line/column, and the compiled PDF path,
 * return suggested command-lines for common PDF viewers to perform forward search.
 *
 * This does not execute any viewer. It provides ready-to-use command + args
 * suggestions you can adopt in your workflow or client configuration.
 */
import os from "node:os";
import path from "node:path";

export type OSName = "win32" | "darwin" | "linux";

export interface ForwardSearchOptions {
  texFile: string;     // .tex source file path
  line: number;        // 1-based line number
  column?: number;     // optional column (not used by most viewers)
  pdfPath: string;     // compiled PDF path
  os?: OSName;         // override detected OS
}

export interface ViewerSuggestion {
  viewer: string;           // Viewer name
  command: string;          // Executable or helper command
  args: string[];           // Argument array
  notes?: string;           // Extra notes about configuration/limitations
}

export interface ForwardSearchResult {
  os: OSName;
  suggestions: ViewerSuggestion[];
}

function normalize(p: string): string {
  return path.resolve(p);
}

/**
 * Build forward-search suggestions based on OS and well-known viewers.
 */
export function forwardSearchHint(opts: ForwardSearchOptions): ForwardSearchResult {
  const platform = (opts.os || (os.platform() as OSName));
  const tex = normalize(opts.texFile);
  const pdf = normalize(opts.pdfPath);
  const line = Math.max(1, Math.floor(opts.line || 1));

  const suggestions: ViewerSuggestion[] = [];

  if (platform === "win32") {
    // SumatraPDF (recommended on Windows):
    // SumatraPDF.exe -reuse-instance -forward-search <tex> <line> <pdf>
    suggestions.push({
      viewer: "SumatraPDF",
      command: "SumatraPDF.exe",
      args: ["-reuse-instance", "-forward-search", tex, String(line), pdf],
      notes: "If not in PATH, typical location: C\\\\Program Files\\\\SumatraPDF\\\\SumatraPDF.exe. Ensure SyncTeX is enabled during compile."
    });
  } else if (platform === "darwin") {
    // Skim on macOS:
    // displayline <line> <pdf> <source>
    suggestions.push({
      viewer: "Skim",
      command: "/Applications/Skim.app/Contents/SharedSupport/displayline",
      args: [String(line), pdf, tex],
      notes: "Skim recommended for SyncTeX. Ensure PDF updated on save/compile."
    });
  } else if (platform === "linux") {
    // Okular:
    // okular --unique "<pdf>#src:<line> <tex>"
    suggestions.push({
      viewer: "Okular",
      command: "okular",
      args: ["--unique", `${pdf}#src:${line} ${tex}`],
      notes: "Okular supports SyncTeX forward search via --unique with src anchor."
    });
    // Zathura:
    // zathura --synctex-forward <line>:<col>:<tex> <pdf>
    suggestions.push({
      viewer: "Zathura",
      command: "zathura",
      args: ["--synctex-forward", `${line}:${opts.column ?? 1}:${tex}`, pdf],
      notes: "Requires zathura-pdf-poppler and synctex enabled during compile."
    });
  }

  // Fallback note if nothing added (unlikely)
  if (suggestions.length === 0) {
    suggestions.push({
      viewer: "Generic",
      command: "<viewer>",
      args: ["<args using synctex forward search>"],
      notes: "Unsupported OS detected. Configure a viewer that supports SyncTeX forward search."
    });
  }

  return { os: platform, suggestions };
}
