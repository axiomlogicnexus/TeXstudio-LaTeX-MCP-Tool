# TeXstudio LaTeX MCP Tool

A cross‑platform Model Context Protocol (MCP) server that integrates TeXstudio editor entry points with the LaTeX toolchain for robust authoring, compilation, diagnostics, linting, formatting, bibliography management, project intelligence, PDF post‑processing, and optional containerized workflows.

This server communicates over stdio and is designed to be launched by MCP‑capable clients (e.g., MCP Inspector). It is Windows‑first but supports macOS and Linux. Windows long/UNC paths are supported.


## Table of contents
- Overview
- Features (Tools) summary
- Requirements
- Installation and build
- Configuration (M23) and precedence
- Using with MCP Inspector (stdio)
- Tools (detailed)
  - detect_toolchain, health.check, tex.dist_info
  - texstudio.open, session.save/.restore
  - latex.compile/.clean
  - lint.chktex
  - format.latexindent
  - bib.build
  - project.scaffold
  - forward_search.hint
  - watch.start/.stop/.list/.tail
  - project.detect_root/.graph/.out_of_date
  - tex.kpsewhich, tex.texdoc, tex.pkg_info, tex.pkg_install
  - pdf.optimize, pdf.info
  - container.info, latex.compile_container, latex.clean_container
  - config.show, config.validate, config.reload
- Security (M13)
- OS discovery and long‑path handling (M14)
- Performance and reliability (M17)
- Troubleshooting
- Roadmap snapshot and milestone status
- License and attribution


## Overview
This MCP server exposes TeXstudio‑related editor controls (open at file/line/column with master/session flags) and a broad LaTeX toolchain: compilation (latexmk or engine fallback), linting (chktex), formatting (latexindent), bibliography builders (biber/bibtex), project scaffolding, project intelligence (root detection, dependency graph, out‑of‑date analysis), forward search hints, PDF post‑processing (qpdf/gs), package management helpers (kpsewhich, texdoc, tlmgr/MiKTeX mpm), environment health checks, and optional containerized workflows via Docker.

It implements strict path containment and security defaults, robust OS discovery (Windows registry and App Paths fallbacks, TeX Live/MiKTeX detection), and Windows long/UNC path handling.


## Features (Tools) summary
- Discovery and environment
  - detect_toolchain, health.check, tex.dist_info
- Editor integration
  - texstudio.open, session.save, session.restore
- Compilation
  - latex.compile (latexmk‑first; engine fallback; missing‑Perl diagnosis), latex.clean
- Linting and formatting
  - lint.chktex (raw or structured diagnostics)
  - format.latexindent (in‑place or text output)
- Bibliography
  - bib.build (biber/bibtex)
- Project management
  - project.scaffold
  - project.detect_root, project.graph, project.out_of_date
  - watch.start/.stop/.list/.tail (latexmk ‑pvc)
- Documentation and packages
  - tex.kpsewhich, tex.texdoc, tex.pkg_info, tex.pkg_install
- PDF post‑processing
  - pdf.optimize (qpdf/gs), pdf.info (qpdf)
- Container workflows
  - container.info, latex.compile_container, latex.clean_container
- Configuration tools
  - config.show, config.validate, config.reload


## Requirements
- Node.js 18 or newer
- A TeX distribution (MiKTeX on Windows; TeX Live on macOS/Linux)
- Recommended on Windows: Strawberry Perl (latexmk, latexindent depend on Perl)
- Optional: TeXstudio (for editor integration)
- Optional: Docker (for containerized workflows)


## Installation and build
- npm install
- npm run build

Start MCP server (stdio):
- npm run mcp

This process is intended to be launched by an MCP client (e.g., MCP Inspector), which communicates via stdio.


## Configuration (M23) and precedence
Merged in this order (last wins):
1) Environment variables
2) WORKSPACE_ROOT/.texstudio-mcp.json (if present)
3) Internal defaults

Supported keys
- workspaceRoot: string (path) – when set, all tool paths must be inside this directory
- allowShellEscape: boolean (default false) – gate shell‑escape at compile time
- defaultEngine: "pdflatex" | "xelatex" | "lualatex" (default pdflatex)
- dockerImage: string (default "texlive/texlive") – default image for container tools
- texstudioExe: string (absolute path) – override TeXstudio detection

Environment variables
- WORKSPACE_ROOT – workspace containment root
- TEX_MCP_ALLOW_SHELL_ESCAPE – 1|true|on|yes to allow shell‑escape
- TEXSTUDIO_EXE – explicit path to TeXstudio executable

Project config file (optional)
- Path: WORKSPACE_ROOT/.texstudio-mcp.json
- Example:
  {
    "workspaceRoot": "C:\\Users\\YourUser\\Documents\\latex",
    "allowShellEscape": false,
    "defaultEngine": "pdflatex",
    "dockerImage": "texlive/texlive",
    "texstudioExe": "C:\\Program Files\\TeXstudio\\texstudio.exe"
  }

Config tools
- config.show – returns merged configuration
- config.validate – returns diagnostics for workspaceRoot, texstudioExe, dockerImage, defaultEngine
- config.reload – clears memoized config and reloads from env + file + defaults


## Using with MCP Inspector (stdio)
- Command: node
- Arguments: dist/mcp/server.js
- Slug: texstudio-latex-mcp-tool
- After connecting, open Tools panel and call tools by name; forms are generated from schemas.


## Tools (detailed)
Below is a concise list; see API.md for shapes and extended notes.

Discovery and health
- detect_toolchain: enumerate major tools and versions
- health.check: quick availability/version of perl, latexmk, latexindent, chktex, biber, bibtex
- tex.dist_info: detect MiKTeX vs TeX Live; version information for key tools

Editor and sessions
- texstudio.open(file, line?, column?, master?, noSession?, newInstance?)
- session.save(name, entries[]), session.restore(name)

Compilation
- latex.compile({ root, engine?, outDir?, synctex?, shellEscape?, interaction?, haltOnError?, jobname? })
  - latexmk‑first with structured diagnostics
  - Missing Perl diagnostic (code: missing‑perl) with actionable hint on MiKTeX
  - Fallback to engine (2 passes + biber/bibtex) if latexmk unavailable
  - Security: WORKSPACE_ROOT containment; shell‑escape gated by policy
- latex.clean({ root, deep?, outDir? })

Linting and formatting
- lint.chktex({ files[], config?, minSeverity?, structured? })
  - structured=true returns parsed diagnostics (file, line, column, message)
- format.latexindent({ file, inPlace?, config?, preserveEOL? })

Bibliography
- bib.build({ tool: "biber" | "bibtex", rootOrAux })

Project
- project.scaffold({ template, name?, author?, withBib?, withLatexmkrc?, outDir? })
- project.detect_root({ startPath?, file? })
- project.graph({ root })
- project.out_of_date({ root, outDir?, jobname?, pdfPath? })

Forward search
- forward_search.hint({ texFile, line, column?, pdfPath, os? })

Watch
- watch.start, watch.stop, watch.list, watch.tail

Documentation and packages
- tex.kpsewhich({ file, format? })
- tex.texdoc({ package, listOnly? })
- tex.pkg_info({ name })
- tex.pkg_install({ name, manager?, dryRun? })

PDF post‑processing
- pdf.optimize({ input, output?, method?, linearize?, gsQuality? })
- pdf.info({ input })

Container workflows (Docker)
- container.info – docker availability, version, images
- latex.compile_container({ image?, root, engine?, outDir?, shellEscape?, interaction?, jobname? })
  - Mounts WORKSPACE_ROOT at /work and runs latexmk
  - Policy: if shellEscape requested but disallowed, it is dropped and a warning is prefixed to stdout
- latex.clean_container({ image?, root, deep?, outDir? })


## Security (M13)
- Path containment: if WORKSPACE_ROOT is set, tool file paths must reside within it
- Shell‑escape policy: off by default; enable only with TEX_MCP_ALLOW_SHELL_ESCAPE=1|true|on|yes
- Timeouts on external processes; safe argv (no shell)
- Windows long/UNC paths are normalized to extended length when needed


## OS discovery and long‑path handling (M14)
- Windows: App Paths registry fallback for executables; common MiKTeX/TeX Live directories
- macOS/Linux: which() fallbacks (/Library/TeX/texbin, /usr/texbin, /opt/texbin, /usr/local/texlive/bin + arch dirs)
- Distro detection: tex.dist_info runs quick, parallel probes with short timeouts
- Long/UNC paths: toExtendedIfNeeded wraps file args on Windows to avoid MAX_PATH issues


## Performance and reliability (M17)
- Caches (TTL ~60s) for detect_toolchain and tex.dist_info
- Concurrency: chktex runs multiple files with a small pool (default 3) to reduce wall‑clock
- Minimal overhead; no persistent process pool by default


## Troubleshooting
- MiKTeX and Perl
  - Install Strawberry Perl if latexmk or latexindent fail due to missing Perl
  - Verify perl -v; ensure PATH updated
- TeXstudio not found
  - Set TEXSTUDIO_EXE to the absolute path of texstudio.exe (Windows) or ensure PATH
- Docker on Windows
  - Enable drive sharing in Docker Desktop for the drive containing WORKSPACE_ROOT
  - Restart MCP server after changing WORKSPACE_ROOT via setx
- Paths with spaces
  - Quote arguments in CLI; MCP Inspector forms accept unescaped Windows paths


## License and attribution
Recommended license: MIT (permissive, common in Node ecosystems). Add a LICENSE file with MIT if you want to publish publicly.

Attributions: TeXstudio, MiKTeX, TeX Live, qpdf, Ghostscript, chktex, latexindent, biber, bibtex are third‑party tools subject to their respective licenses.

## Endpoint naming policy and deprecations

- Stability and versioning
  - Pre-1.0: endpoint names may evolve to reach a stable surface. We follow semantic versioning: breaking changes can occur on minor bumps before v1.0. After v1.0, breaking endpoint renames only occur on major versions.
  - As of v0.23.x, no endpoints have been renamed; all additions were backward-compatible. Any future renames will follow the deprecation process below.

- Namespacing conventions (current)
  - latex.* (compile, clean, …)
  - texstudio.* (open, …)
  - lint.* (chktex)
  - format.* (latexindent)
  - bib.* (build)
  - project.* (scaffold, detect_root, graph, out_of_date)
  - forward_search.* (hint)
  - watch.* (start, stop, list, tail)
  - tex.* (kpsewhich, texdoc, pkg_info, pkg_install, dist_info)
  - pdf.* (optimize, info)
  - container.* (info, compile_container, clean_container)
  - config.* (show, validate, reload)

- Deprecation policy
  - Additive aliases: when renaming, we introduce a new preferred name and keep the old name as an alias for at least two minor versions (pre-1.0) or until the next major (post-1.0).
  - Notices: deprecation is announced in CHANGELOG and README, and the server may include a deprecationWarning field in the tool result payload.
  - Removal: old aliases are removed after the deprecation window (two minor versions pre-1.0, or the next major after 1.0).
  - Inputs: schema changes are backward compatible during the deprecation window (new optional fields, widened enums). Breaking input changes follow the same removal schedule as names.

- Migration guarantees and examples
  - Example rename pattern: texstudio.open -> editor.open_tex with texstudio.open retained as alias during the window.
  - Example input evolution: latex.compile gains engineOpts while keeping existing engine; callers using only engine continue to work.
  - We avoid churn in top-level namespaces. Prefer adding new tools over renaming, unless clarity or safety demands a rename.

- Compatibility matrix
  - The README “Versioning and tags” section enumerates milestone tags. If a rename occurs, tags and CHANGELOG will highlight the version where the alias was introduced and when removal is scheduled.


## Quick MCP Inspector setup
- Command: node
- Arguments: dist/mcp/server.js
- Slug: texstudio-latex-mcp-tool
- Connect → Tools → select and run any tool


## CLI (temporary, optional)
- node dist/index.js health
- node dist/index.js open C:\path\to\file.tex 123
- node dist/index.js compile --root "C:\path\to\main.tex"
- node dist/index.js clean "C:\path\to\main.tex"



!!!NOT YET IMPLEMENTED!!!

format.latexindent with inPlace=true rewrites the target .tex file using latexindent (idempotent formatting).
project.scaffold creates new files/directories (a minimal LaTeX project).
latex.clean removes aux files (non-source outputs).
session.save writes a JSON session file under WORKSPACE_ROOT/.mcp_sessions.
Container and compile tools do not edit sources; they only produce outputs.
What it cannot do today

Arbitrary text edits (insert/replace/delete) in source files
Bulk refactors or multi-file “find and replace”
Importing external text into a project (beyond creating a new scaffold)
If you want these, I can add safe, workspace-contained tools, for example:

text.replace
Inputs: file, find (string or regex), replace (string), flags (e.g., global, multiline)
Safety: validate file is inside WORKSPACE_ROOT; optional backup=.bak; preserve EOLs
text.apply_patch
Inputs: file, unified diff or a list of { range or needle, replacement }
Applies targeted edits; rejects patches that don’t match current file
files.copy_into_workspace
Inputs: srcPath, destRelativePath
Copies external text/bib/cls files into the project (inside WORKSPACE_ROOT)
snippet.insert
Inputs: file, position (line/column), snippet (text)
Inserts curated latex snippets (e.g., \usepackage lines, environment templates)
These would be non-breaking additions, consistent with existing security:

Enforce WORKSPACE_ROOT containment
Windows long/UNC path handling (toExtendedIfNeeded)
No shell usage; direct fs read/write
Optional backups and dry-run preview
If you want me to proceed, specify which of the above you’d like first (replace, apply_patch, copy_into_workspace, snippet.insert), and I’ll implement and expose them as MCP tools.

Inputs: file, find (string or regex), replace (string), flags (e.g., global, multiline)
Safety: validate file is inside WORKSPACE_ROOT; optional backup=.bak; preserve EOLs
text.apply_patch
Inputs: file, unified diff or a list of { range or needle, replacement }
Applies targeted edits; rejects patches that don’t match current file
files.copy_into_workspace
Inputs: srcPath, destRelativePath
Copies external text/bib/cls files into the project (inside WORKSPACE_ROOT)
snippet.insert
Inputs: file, position (line/column), snippet (text)
Inserts curated latex snippets (e.g., \usepackage lines, environment templates)" and how I can import and edit text by bypassing the missing APIs.

Below is a precise, implementation-oriented spec for the four proposed tools, plus practical ways to import and edit text today without those tools.

Detailed behavior and edge cases

text.replace
Purpose
Perform literal or regex-based find/replace within a single file. Supports one-shot or global replacement. Safe by construction within the workspace boundary.
Inputs
file: Path relative to WORKSPACE_ROOT. Must resolve to a real file inside the workspace after normalization.
find: String or regex pattern.
replace: Replacement string. In regex mode, supports backreferences like $1, $2.
flags: Optional. Typical flags:
regex: boolean (true = treat “find” as a regex; false = literal match).
global: boolean (true = replace all; false = first match only).
multiline: boolean (affects ^ and $ in regex; maps to m).
dotAll: boolean (dot matches newlines; maps to s).
caseInsensitive: boolean (maps to i).
unicode: boolean (maps to u) if supported by the regex engine.
dryRun: boolean (return preview with diff and counts; do not write).
backup: string or boolean (e.g., ".bak" or true to create file.bak; false = none).
encoding: “auto” (default), or explicit encoding like “utf8”, “utf8-bom”, “latin1”.
eol: “preserve” (default), “lf”, or “crlf”.
Safety and correctness
Workspace containment: Normalize and resolve the final path; ensure it starts with WORKSPACE_ROOT (handles .., symlinks).
Windows paths: Convert to extended form (\?) when needed for long paths.
Encoding: Detect BOM to preserve it; default to UTF-8 if none. Optionally honor an explicit encoding input.
EOL preservation: Detect CRLF vs LF; preserve unless overridden.
Atomic writes: Write to a temp file in the same directory, fsync, then rename to avoid partial writes.
Backup (optional): If enabled, write a copy alongside the original (e.g., file.tex.bak) before replacing.
Behavior
Literal mode: Escape “find” and search as-is.
Regex mode: Compile with requested flags. Use non-catastrophic patterns (apply timeouts if you support them).
Replace scope: If global, replace all matches; otherwise first match only.
Result: Return counts (matches found, replacements made), sample of first N matches (if dryRun), and a summary (bytes changed, encoding, EOL).
Errors: File not found; outside workspace; regex compile error; write failure; no matches (return success=false with reason “no matches”).
Typical use cases
Replace a package option across a document.
Normalize TeX macro names or environments.
Strip trailing whitespace or enforce spacing rules (with regex).
text.apply_patch
Purpose
Apply targeted, verifiable edits. Accepts either a unified diff or a structured change list. Rejects if the file has drifted.
Inputs
file: Relative path inside WORKSPACE_ROOT.
patch: One of:
unifiedDiff: The standard diff format with context lines (diff …, --- …, +++ …, @@ hunk headers, lines prepended with +/−/space).
changes: Array of change objects, each one being either:
{ range: { startLine, startCol, endLine, endCol }, replacement: string }
{ needle: string or regex, replacement: string, occurrence?: number, flags?: same as text.replace }
options:
dryRun, backup, encoding, eol: same semantics as text.replace.
strict: boolean (default true). If true, all hunks/needles must match exactly; otherwise use limited fuzzy matching (tolerate whitespace/EOL-only drift).
Safety and correctness
Workspace containment, encoding/EOL detection, atomic writes, and backups as above.
Patch verification:
Unified diff: Each hunk is matched using the context lines; if any hunk fails, the operation is rejected in strict mode.
Structured needle: If the needle occurs multiple times and occurrence isn’t specified, reject to avoid ambiguity (unless strict=false with global=false fallback).
Range-based changes: Validate ranges exist and are consistent.
Behavior
Apply hunks in order. If strict=false, allow minimal fuzz (e.g., ignore CRLF vs LF, trailing spaces) but never silently skip a hunk.
Return a per-hunk report: matched, applied, lines added/removed, and a cumulative summary.
Errors: Hunk mismatch; ambiguous needle; out-of-range positions; drift detected; write failure.
Typical use cases
Safe insertion of a \usepackage line under a known preamble region with context.
Bulk but surgical refactors where exact locations must be preserved.
Replaying a reviewed patch from code review or version control.
files.copy_into_workspace
Purpose
Safely bring an external file (e.g., .tex, .bib, .cls, .sty, images) into the workspace.
Inputs
srcPath: Absolute or UNC path to the source file.
destRelativePath: Path relative to WORKSPACE_ROOT (directories created as needed).
options:
overwrite: boolean (default false).
backup: boolean or extension (like “.bak”) for protecting existing target.
preserveTimestamps: boolean (default true).
normalizeEOL: “preserve” (default), “lf”, “crlf”.
verifyHash: optional hash to verify integrity (e.g., sha256).
Safety and correctness
Destination containment: Ensure the destination resolves within WORKSPACE_ROOT.
Windows long path/UNC handling.
Create parent directories as needed.
Collision handling: If overwrite=false and destination exists, fail with an explicit error.
Binary vs text: Don’t alter binary files. For known text types, optionally normalize EOLs if requested.
Behavior
Streamed copy (large files safe).
Optionally generate a report: size, timestamps, hash, final location.
Errors: Missing src; destination outside workspace; collision without overwrite; permission denied.
Typical use cases
Importing a bibliography or class file from another project.
Bringing in images or figures for the document.
snippet.insert
Purpose
Insert curated LaTeX snippets at precise positions or anchored locations with indentation, duplication checks, and idempotency.
Inputs
file: Relative path inside WORKSPACE_ROOT.
position:
{ line, column } 1-based, exact insertion point; or
{ afterNeedle: string or regex, occurrence?: number } inserts after the match; or
{ beforeNeedle: string or regex, occurrence?: number } inserts before the match; or
{ atLine: number } inserts at the start or end of a line (with column=1 or end).
snippet: Text to insert.
options:
ensureUnique: boolean (default true) prevents duplicate snippet insertion (detects existing identical or normalized equivalent).
indentMatch: boolean (default true) matches indentation from the anchor line.
surroundingNewlines: { before: 0|1, after: 0|1 } to keep formatting tidy.
dryRun, backup, encoding, eol: as above.
Safety and correctness
Workspace containment, encoding/EOL detection, atomic write, backups.
Idempotency:
If ensureUnique=true and a normalized version of the snippet already exists (e.g., \usepackage{...} ignoring extra spaces), do nothing and report “already present.”
Anchoring:
If multiple matches and occurrence not specified, reject or default to first with explicit warning.
Behavior
Compute final insertion point, adjust indentation/newlines, and write.
Return a summary: exact insertion location, deduplication decision, bytes added.
Errors: Anchor not found; ambiguous anchor; write failure.
Typical use cases
Insert \usepackage lines in the preamble.
Add environment templates at a marked location.
Add a \bibliography{...} line near the end of the document.
How to import and edit text today without these APIs

There’s no in-tool arbitrary editing, so edits must be done out-of-band. Practical workflows:
Import files into the workspace (Windows PowerShell)
Copy a file into your project:
Copy-Item -LiteralPath 'C:\path\to\source\refs.bib' -Destination 'c:\Users\Anthracite Ace\Desktop\Software_Development\VSCodeSolutions\TeXstudio LaTeX MCP Tool\bibliography\refs.bib' -Force
Copy a whole directory:
robocopy 'C:\path\to\assets' 'c:\Users\Anthracite Ace\Desktop\Software_Development\VSCodeSolutions\TeXstudio LaTeX MCP Tool\assets' /E
Notes:
Prefer robocopy for large trees; it preserves timestamps and retries on errors.
If you need CRLF normalization for text, open the file in your editor and convert EOLs after copying.
Edit files manually in your editor
Open the workspace folder:
c:\Users\Anthracite Ace\Desktop\Software_Development\VSCodeSolutions\TeXstudio LaTeX MCP Tool
Make your text edits directly in your editor (VS Code, TeXstudio, etc.).
Optionally run latexindent with inPlace=true to autoformat after your edits. This does not change content, only formatting.
Apply reviewed patches with Git (outside the tool)
If you have a unified diff:
Save the patch as, for example, C:\temp\edit.patch
In a terminal at the workspace root:
git apply --reject --whitespace=nowarn C:\temp\edit.patch
Inspect any .rej files for conflicts and resolve in your editor.
This gives you text.apply_patch semantics via Git until the API exists.
Include external content via TeX without editing multiple files
Create a new file containing the content you want to bring in, for example:
c:\Users\Anthracite Ace\Desktop\Software_Development\VSCodeSolutions\TeXstudio LaTeX MCP Tool\content\chapter1.tex
In your main .tex file, add:
\input{content/chapter1}
From then on, you can replace the contents of chapter1.tex without touching the main file.
Use a “watcher” script (optional)
If you routinely need “replace/patch,” you can run a local script that:
Watches a requests.json file inside the workspace (you can write it by hand).
Applies requested replacements or patches using your editor/CLI.
This is an external helper; it simulates text.replace/apply_patch until the APIs are implemented.
Design notes to keep these tools robust when you add them

Always verify the path is inside WORKSPACE_ROOT after resolving symlinks and .. segments.
Use atomic writes with a temporary file + rename to avoid file corruption.
Detect and preserve encoding and EOLs unless explicitly overridden.
Offer dryRun and backup across all tools; return a detailed report for auditability.
Avoid ambiguous operations: if a needle matches multiple places, fail unless user specifies occurrence or sets strict=false.
Keep operations idempotent: snippet.insert should detect duplicates; apply_patch should reject when drift is detected rather than guessing.
Consider a max file size and a regex evaluation timeout to prevent DoS via pathological inputs.
Log each operation with timestamp, tool name, parameters (sanitized), and summary of changes.
Summary

text.replace: Safe single-file find/replace with literal or regex modes, preserving encoding/EOLs, with dry-run and backup.
text.apply_patch: Verified, context-aware edits via unified diffs or structured changes, rejecting on drift or ambiguity.
files.copy_into_workspace: Safe import of external files into the workspace with overwrite/backup/EOL options.
snippet.insert: Idempotent insertion of LaTeX snippets at positions or anchors, with deduplication and indentation handling.
Until these APIs exist, import files using OS copy commands in your workspace path and edit content directly in your editor, or apply diffs using Git. This preserves safety and gives you the same outcomes without relying on unimplemented tool endpoints.
