/**
 * MCP Server entry point (stdio transport)
 *
 * This file wires the implemented tool functions into an MCP server using the
 * official @modelcontextprotocol/sdk. The server communicates over stdio
 * (stdin/stdout) so that MCP clients can spawn it as a process and interact
 * using the MCP JSON-RPC protocol.
 *
 * Exposed tools:
 *  - detect_toolchain
 *  - texstudio.open
 *  - latex.compile
 *  - latex.clean
 *  - project.scaffold
 *
 * Notes:
 *  - We keep CLI (src/index.ts) for manual local testing. The MCP server is
 *    a separate entry point (this file) for clients.
 *  - All tool handlers are thin adapters over the internal modules located in
 *    src/tools and src/discovery, returning MCP-compatible results.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "node:path";

// Internal tool implementations
import { detect_toolchain } from "../tools/detect.js";
import { openInTeXstudio } from "../tools/texstudio.js";
import { compileLatex, cleanAux } from "../tools/latex.js";
import { project_scaffold } from "../tools/scaffold.js";
import { which } from "../discovery/which.js";
import { runCommand } from "../utils/process.js";
import { forwardSearchHint } from "../tools/forwardSearch.js";
import { startLatexWatch, stopLatexWatch, listWatches, tailWatchLog } from "../tools/watch.js";
import { detectRoot, buildDependencyGraph, computeOutOfDate } from "../tools/projectIntelligence.js";
import { getWorkspaceRoot, ensureInsideWorkspace } from "../utils/security.js";
import { detectTexDist } from "../discovery/texDist.js";

// ---------------------------------------------------------------------------
// Zod Schemas for tool inputs
// ---------------------------------------------------------------------------

// No input for detect_toolchain; SDK allows tools without inputSchema

/**
 * Open a file in TeXstudio at an optional line/column with optional master and
 * session flags. Mirrors OpenOptions in texstudio.ts.
 */
// registerTool expects a raw Zod shape for inputSchema, not a ZodObject
const TeXstudioOpenInput = {
  file: z.string().describe("Absolute or relative path to the TeX file to open"),
  line: z.number().int().optional().describe("Optional 1-based line number"),
  column: z.number().int().optional().describe("Optional 1-based column number"),
  master: z.string().optional().describe("Optional master file path"),
  noSession: z.boolean().optional().describe("If true, start without restoring previous session"),
  newInstance: z.boolean().optional().describe("If true, force a new TeXstudio instance (when supported)"),
} as const;

/**
 * Compile options for latex.compile
 */
const LatexCompileInput = {
  root: z.string().describe("Root .tex file to compile (absolute or relative)"),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional().describe("TeX engine"),
  outDir: z.string().optional().describe("Output directory (will be created if missing)"),
  synctex: z.boolean().optional().describe("Enable SyncTeX (default true)"),
  shellEscape: z.boolean().optional().describe("Enable shell escape (default false)"),
  interaction: z.enum(["batchmode", "nonstopmode", "scrollmode", "errorstopmode"]).optional(),
  haltOnError: z.boolean().optional().describe("Stop on first error"),
  jobname: z.string().optional().describe("Jobname override for outputs")
} as const;

/**
 * Clean options for latex.clean
 */
const LatexCleanInput = {
  root: z.string().describe("Root .tex file used during compilation"),
  deep: z.boolean().optional().describe("Use latexmk -C to deep clean"),
  outDir: z.string().optional().describe("Output directory to clean")
} as const;

/**
 * Scaffold options for project.scaffold
 */
const ScaffoldInput = {
  template: z.enum(["article", "report", "book", "beamer"]).describe("Document class"),
  name: z.string().optional().describe("Document title"),
  author: z.string().optional().describe("Author name"),
  withBib: z.boolean().optional().describe("Create refs.bib"),
  withLatexmkrc: z.boolean().optional().describe("Create .latexmkrc"),
  outDir: z.string().optional().describe("Target directory; default 'tex_project'")
} as const;

// M9 — forward_search.hint
const ForwardSearchInput = {
  texFile: z.string().describe("Path to the source .tex file"),
  line: z.number().int().min(1).describe("1-based line number"),
  column: z.number().int().optional().describe("Optional column number"),
  pdfPath: z.string().describe("Path to the compiled PDF"),
  os: z.enum(["win32", "darwin", "linux"]).optional().describe("Override OS detection")
} as const;

// M10 — watch.compile tools
const WatchStartInput = {
  root: z.string().describe("Root .tex file to watch"),
  engine: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
  outDir: z.string().optional(),
  synctex: z.boolean().optional(),
  shellEscape: z.boolean().optional(),
  interaction: z.enum(["batchmode", "nonstopmode", "scrollmode", "errorstopmode"]).optional(),
  jobname: z.string().optional()
} as const;

const WatchStopInput = { id: z.string().describe("watch id") } as const;
const WatchTailInput = { id: z.string().describe("watch id"), lines: z.number().int().optional() } as const;

// M11 — project intelligence
const DetectRootInput = {
  startPath: z.string().optional().describe("Start directory or file"),
  file: z.string().optional().describe("Explicit root .tex (wins)"),
} as const;

const GraphInput = {
  root: z.string().describe("Root .tex to analyze"),
} as const;

const OutOfDateInput = {
  root: z.string().describe("Root .tex used to compute PDF path and dependencies"),
  outDir: z.string().optional(),
  jobname: z.string().optional(),
  pdfPath: z.string().optional(),
} as const;

// Additional schemas for M6–M8 tools

// lint.chktex
const ChktexInput = {
  files: z.array(z.string()).nonempty().describe("List of .tex files to lint"),
  config: z.string().optional().describe("Path to chktexrc or config file"),
  minSeverity: z.number().int().min(0).max(3).optional().describe("Minimum severity to report (0..3). Not all outputs include severities; tool will still run regardless"),
  structured: z.boolean().optional().describe("If true, return structured diagnostics parsed from chktex output")
} as const;

// format.latexindent
const LatexindentInput = {
  file: z.string().describe("Path to a .tex file to format"),
  inPlace: z.boolean().optional().describe("Write changes in-place (-w). If false, returns formatted text"),
  config: z.string().optional().describe("Path to latexindent YAML config (localSettings.yaml)"),
  preserveEOL: z.boolean().optional().describe("Attempt to preserve line endings (best-effort)")
} as const;

// bib.build
const BibBuildInput = {
  tool: z.enum(["biber", "bibtex"]).describe("Bibliography tool to run"),
  rootOrAux: z.string().describe("Path to the project root .tex or .aux file")
} as const;

// ---------------------------------------------------------------------------
// Server initialization
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "texstudio-latex-mcp-tool",
  version: "0.1.0"
});

// ---------------------------------------------------------------------------
// Tool registrations
// ---------------------------------------------------------------------------

server.registerTool(
  "detect_toolchain",
  {
    title: "Detect LaTeX/TeXstudio Toolchain",
    description: "Enumerate available tools and their versions (texstudio, latexmk, engines, biber, chktex, latexindent, etc.)"
  },
  async () => {
    const res = await detect_toolchain();
    return {
      content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
    };
  }
);

server.registerTool(
  "texstudio.open",
  {
    title: "Open in TeXstudio",
    description: "Open a TeX file in TeXstudio at an optional line/column, with optional master/session flags",
    inputSchema: TeXstudioOpenInput
  },
  async (args) => {
    try {
      const result = await openInTeXstudio(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err: unknown) {
      const e = err as Error;
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "latex.compile",
  {
    title: "Compile LaTeX (latexmk)",
    description: "Compile a LaTeX project via latexmk with structured diagnostics",
    inputSchema: LatexCompileInput
  },
  async (args) => {
    try {
      const result = await compileLatex(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err: unknown) {
      const e = err as Error;
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "latex.clean",
  {
    title: "Clean LaTeX aux files",
    description: "Clean auxiliary files using latexmk (-c or -C)",
    inputSchema: LatexCleanInput
  },
  async (args) => {
    try {
      const result = await cleanAux(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err: unknown) {
      const e = err as Error;
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "project.scaffold",
  {
    title: "Scaffold LaTeX project",
    description: "Create a minimal LaTeX project with optional bib and .latexmkrc",
    inputSchema: ScaffoldInput
  },
  async (args) => {
    try {
      const result = project_scaffold(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err: unknown) {
      const e = err as Error;
      return {
        content: [{ type: "text", text: `Error: ${e.message}` }],
        isError: true
      };
    }
  }
);

// M6 — lint.chktex
server.registerTool(
  "lint.chktex",
  {
    title: "Lint with ChkTeX",
    description: "Run chktex on one or more files and return raw output or structured diagnostics",
    inputSchema: ChktexInput
  },
  async (args) => {
    try {
      const exe = which(process.platform === "win32" ? "chktex.exe" : "chktex") || (process.platform === "win32" ? "chktex.exe" : "chktex");
      const ws = getWorkspaceRoot();

      if (args.structured) {
        const results: any[] = [];
        for (const f of args.files) {
          const fileArg = ensureInsideWorkspace(f, ws);
          const runArgs: string[] = [];
          if (args.config) runArgs.push("-l", ensureInsideWorkspace(args.config, ws));
          // Quiet + custom format: file:line:col:message
          runArgs.push("-q", "-f", "%f:%l:%c:%m\n", fileArg);
          const res = await runCommand(exe, runArgs, { timeoutMs: 30_000 });
          const lines = (res.stdout || "").split(/\r?\n/).filter(Boolean);
          for (const line of lines) {
            const parts = line.split(":");
            const file = parts[0];
            const lineNum = Number(parts[1] || 0) || undefined;
            const colNum = Number(parts[2] || 0) || undefined;
            const message = parts.slice(3).join(":").trim();
            results.push({ file, line: lineNum, column: colNum, message, raw: line });
          }
        }
        return { content: [{ type: "text", text: JSON.stringify({ diagnostics: results }, null, 2) }] };
      }

      // Default: raw output concatenated per file
      const allOutputs: string[] = [];
      for (const f of args.files) {
        const fileArg = ensureInsideWorkspace(f, ws);
        const runArgs: string[] = [];
        if (args.config) runArgs.push("-l", ensureInsideWorkspace(args.config, ws));
        runArgs.push(fileArg);
        const res = await runCommand(exe, runArgs, { timeoutMs: 30_000 });
        allOutputs.push(`>>> ${fileArg}\n` + (res.stdout || "") + (res.stderr ? "\n" + res.stderr : ""));
      }
      return { content: [{ type: "text", text: allOutputs.join("\n\n") }] };
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M7 — format.latexindent
server.registerTool(
  "format.latexindent",
  {
    title: "Format LaTeX with latexindent",
    description: "Format a .tex file using latexindent. If inPlace=false, returns formatted text",
    inputSchema: LatexindentInput
  },
  async (args) => {
    try {
      const exe = which(process.platform === "win32" ? "latexindent.exe" : "latexindent") || (process.platform === "win32" ? "latexindent.exe" : "latexindent");
      const ws = getWorkspaceRoot();
      const runArgs: string[] = [];
      if (args.config) {
        runArgs.push("-l", ensureInsideWorkspace(args.config, ws));
      }
      const filePath = ensureInsideWorkspace(args.file, ws);
      if (args.inPlace) {
        runArgs.push("-w", filePath);
        const res = await runCommand(exe, runArgs, { timeoutMs: 60_000 });
        return { content: [{ type: "text", text: res.stdout || "formatted in-place" }] };
      } else {
        runArgs.push(filePath);
        const res = await runCommand(exe, runArgs, { timeoutMs: 60_000 });
        // Many latexindent builds write to stdout when not using -w
        return { content: [{ type: "text", text: res.stdout || "" }] };
      }
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M8 — bib.build
server.registerTool(
  "bib.build",
  {
    title: "Build bibliography (biber/bibtex)",
    description: "Run biber or bibtex on the project",
    inputSchema: BibBuildInput
  },
  async (args) => {
    try {
      const exeName = args.tool === "biber" ? (process.platform === "win32" ? "biber.exe" : "biber") : (process.platform === "win32" ? "bibtex.exe" : "bibtex");
      const exe = which(exeName) || exeName;
      const ws = getWorkspaceRoot();
      const full = ensureInsideWorkspace(args.rootOrAux, ws);
      const dir = path.dirname(full);
      const base = path.parse(full).name;
      const res = await runCommand(exe, [base], { timeoutMs: 60_000, env: process.env, cwd: dir });
      const out = (res.stdout || "") + (res.stderr ? "\n" + res.stderr : "");
      return { content: [{ type: "text", text: out }] };
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M9 — forward_search.hint
server.registerTool(
  "forward_search.hint",
  {
    title: "Forward search hints",
    description: "Suggest viewer commands for SyncTeX forward search (SumatraPDF, Skim, Okular/Zathura)",
    inputSchema: ForwardSearchInput
  },
  async (args) => {
    try {
      const res = forwardSearchHint(args);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M10 — watch: start
server.registerTool(
  "watch.start",
  {
    title: "Start LaTeX watch (latexmk -pvc)",
    description: "Start watching a LaTeX project for changes and rebuild automatically",
    inputSchema: WatchStartInput
  },
  async (args) => {
    try {
      const info = startLatexWatch(args);
      return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M10 — watch: stop
server.registerTool(
  "watch.stop",
  {
    title: "Stop LaTeX watch",
    description: "Stop a running latexmk -pvc watcher",
    inputSchema: WatchStopInput
  },
  async (args) => {
    try {
      const res = stopLatexWatch(args.id);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M10 — watch: list
server.registerTool(
  "watch.list",
  {
    title: "List LaTeX watchers",
    description: "List running latexmk -pvc watchers"
  },
  async () => {
    const list = listWatches();
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  }
);

// M10 — watch: tail
server.registerTool(
  "watch.tail",
  {
    title: "Tail watcher log",
    description: "Return the last N lines from a watcher's buffered output",
    inputSchema: WatchTailInput
  },
  async (args) => {
    try {
      const text = tailWatchLog(args.id, args.lines || 200);
      return { content: [{ type: "text", text }] };
    } catch (err: unknown) {
      const e = err as Error;
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  }
);

// M11 — project.detect_root
server.registerTool(
  "project.detect_root",
  {
    title: "Detect LaTeX root",
    description: "Heuristically detect the project root .tex",
    inputSchema: DetectRootInput
  },
  async (args) => {
    const ws = getWorkspaceRoot();
    const safe: any = { ...args };
    if (args.startPath) safe.startPath = ensureInsideWorkspace(args.startPath, ws);
    if (args.file) safe.file = ensureInsideWorkspace(args.file, ws);
    const res = detectRoot(safe);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

// M11 — project.graph
server.registerTool(
  "project.graph",
  {
    title: "Build dependency graph",
    description: "Parse includes, inputs, subfiles, graphics and bib deps",
    inputSchema: GraphInput
  },
  async (args) => {
    const ws = getWorkspaceRoot();
    const root = ensureInsideWorkspace(args.root, ws);
    const res = buildDependencyGraph(root);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

// M11 — project.out_of_date
server.registerTool(
  "project.out_of_date",
  {
    title: "Out-of-date report",
    description: "Compare PDF mtime vs sources; list newer sources and missing deps",
    inputSchema: OutOfDateInput
  },
  async (args) => {
    const ws = getWorkspaceRoot();
    const root = ensureInsideWorkspace(args.root, ws);
    const res = computeOutOfDate({ ...args, root });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }
);

// M12 — health.check
server.registerTool(
  "health.check",
  {
    title: "Environment health check",
    description: "Report availability and versions of perl and key LaTeX tools"
  },
  async () => {
    const isWin = process.platform === "win32";
    const names = [
      { key: "perl", win: "perl.exe", posix: "perl", flags: ["-v"] },
      { key: "latexmk", win: "latexmk.exe", posix: "latexmk", flags: ["-v", "--version"] },
      { key: "latexindent", win: "latexindent.exe", posix: "latexindent", flags: ["--version"] },
      { key: "chktex", win: "chktex.exe", posix: "chktex", flags: ["--version"] },
      { key: "biber", win: "biber.exe", posix: "biber", flags: ["--version"] },
      { key: "bibtex", win: "bibtex.exe", posix: "bibtex", flags: ["--version"] },
    ];
    const items = await Promise.all(names.map(async (n) => {
      const exeName = isWin ? n.win : n.posix;
      const p = which(exeName) || which(n.posix);
      let version: string | null = null;
      if (p) {
        for (const f of n.flags) {
          try {
            const r = await runCommand(p, [f], { timeoutMs: 1200 });
            const first = (r.stdout || r.stderr).split(/\r?\n/)[0]?.trim();
            if (first) { version = first; break; }
          } catch {}
        }
      }
      return { name: n.key, available: !!p, path: p || null, version };
    }));
    return { content: [{ type: "text", text: JSON.stringify({ tools: items }, null, 2) }] };
  }
);

// ---------------------------------------------------------------------------
// Connect to stdio transport
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // Log to stderr and exit with non-zero code so supervising client can handle it
  console.error("MCP server failed:", err);
  process.exit(1);
});
