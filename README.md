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


## Roadmap snapshot
- Completed through M23 (configuration tools and validation) with additional polish
  - M14 OS discovery: complete
  - M15 package helpers: complete
  - M16 PDF post‑processing: complete
  - M17 performance: caches and concurrency: complete
  - M18 container support: complete
  - M19 portable/network: complete
  - M20 sessions: complete
  - M21 test base: started
  - M22 MCP wiring: complete
  - M23 configuration & precedence: complete (config.show/validate/reload)


## License and attribution
Recommended license: MIT (permissive, common in Node ecosystems). Add a LICENSE file with MIT if you want to publish publicly.

Attributions: TeXstudio, MiKTeX, TeX Live, qpdf, Ghostscript, chktex, latexindent, biber, bibtex are third‑party tools subject to their respective licenses.


## Versioning and tags
Suggested tags:
- v0.14.0 — M14 (OS discovery, distro info, long path support)
- v0.15.0 — M15 (kpsewhich, texdoc, pkg tools)
- v0.16.0 — M16 (pdf.optimize/info)
- v0.17.0 — M17 (caches + concurrent chktex)
- v0.18.0 — M18 (container)
- v0.19.0 — M19 (portable/network)
- v0.20.0 — M20 (sessions)
- v0.21.0 — M21 (tests base)
- v0.22.0 — M22 (MCP wiring)
- v0.23.0 — M23 (config)
- v0.23.1 — M23 additions (config.validate/reload), container shell‑escape policy, README/docs refresh


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
