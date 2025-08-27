# ROADMAP

Legend:
- [x] Completed
- [ ] Not started yet

Milestones (ordered: most relevant/easiest first → least relevant/hardest)

- [x] M0 — Project bootstrap
  - TypeScript/Node project
  - NodeNext ESM, strict mode
  - Folder structure (src/utils, discovery, tools, parsers, config)
  - Initial documentation (global_rules.md, ARCHITECTURE.md, API.md, PRD.md, DEVELOPMENT.md, CHANGELOG.md)
  - Comprehensive .gitignore

- [x] M1 — Toolchain detection + health check (partial)
  - detect_toolchain() implemented (PATH lookup + basic version probing) ✔
  - CLI command "health" that prints detection ✔
  - MCP tool health.check() (planned)

- [x] M2 — TeXstudio editor control (practical endpoints)
  - isTeXstudioAvailable() ✔
  - texstudio.open(file, line?, column?, master?, noSession?, newInstance?) ✔

- [x] M3 — LaTeX compile orchestration (latexmk-first)
  - latex.compile(root, engine?, outDir?, synctex?, shellEscape?, interaction?, haltOnError?, jobname?) ✔
  - latex.clean(root, deep?, outDir?) ✔
  - Multi-engine support (pdflatex/xelatex/lualatex) via option ✔

- [x] M4 — Log parsing (baseline)
  - Parse LaTeX logs into structured diagnostics: errors, warnings, kpathsea lines, over/underfull hboxes ✔

- [x] M5 — Project scaffolding
  - project.scaffold(template, name?, author?, withBib?, withLatexmkrc?) ✔

- [x] M6 — Linting
  - lint.chktex(files[], config?, minSeverity?) ✔

- [x] M7 — Formatting
  - format.latexindent(fileOrText, config?, inPlace?, preserveEOL?) ✔

- [x] M8 — Bibliography build
  - bib.build(tool: biber|bibtex, rootOrAux) ✔

- [x] M9 — Forward search hints
  - forward_search_hint(texFile, line, column, pdfPath, os?) ✔

- [x] M10 — Watch mode (real-time compilation)
  - Debounced file watching; incremental recompile ✔
  - Cancellation support; stream/chunk logs ✔

- [x] M11 — Project intelligence
  - Root detection: explicit > magic comment > latexmkrc > heuristics ✔
  - Dependency graph: include/input/subfile/includegraphics parsing and caching ✔
  - Out-of-date detection ✔

- [x] M12 — Advanced diagnostics
  - Categorize missing packages/files with actionable hints (install via tlmgr/miktex, fix paths, add \usepackage) ✔
  - Better kpathsea decoding and over/underfull location mapping ✔

- [x] M13 — Security & safety
  - Path normalization and workspace containment ✔ (applied to compile/clean, chktex, latexindent, bib.build, project.*)
  - Shell-escape whitelist; disabled by default ✔ (policy via TEX_MCP_ALLOW_SHELL_ESCAPE)
  - Timeouts and resource limits; kill process tree on cancel (timeouts in place; process-tree kill planned)
  - Redact sensitive env in logs (planned)

- [ ] M14 — OS-specific discovery robustness
  - Windows: registry fallback for TeXstudio/TeX distros; UNC/long path handling
  - macOS: app bundle resolution
  - Linux: which/distro quirks

- [ ] M15 — Package management helpers
  - kpsewhich integration
  - texdoc integration
  - tlmgr/MiKTeX (mpm) helpers

- [ ] M16 — PDF post-processing (optional)
  - qpdf/gs hooks (off by default)

- [ ] M17 — Performance & process handling
  - Persistent process pool (optional)
  - Parallelization where safe
  - Caching of dependencies/results

- [ ] M18 — Container/Docker support
  - Optional execution inside containers; configurable mounts/tool paths

- [ ] M19 — Portable/Network setups
  - Portable TeXstudio detection; network drive/UNC robustness; retries

- [ ] M20 — TeXstudio session handling (low priority)
  - Optional save/restore sessions if stable cross-version

- [ ] M21 — Testing suite
  - Unit tests for process runner, command builders, discovery
  - Golden-file tests for log parser (errors, warnings, hboxes, kpathsea)
  - Integration tests (feature-flagged)

- [x] M22 — MCP server wiring
  - Add MCP server SDK; expose tools with JSON schemas ✔
  - Streaming outputs/events if supported by client (pending; not required for MVP)

- [ ] M23 — Configuration & precedence
  - Config schema; precedence: env > user config > project config > defaults
  - Validation at startup; diagnostics tool for misconfig

- [ ] M24 — Documentation & examples
  - Client configuration, usage examples, troubleshooting
  - Version/compat matrix for TeXstudio flags and TeX distributions

- [ ] M25 — IDE-level features (future)
  - Reference resolution, document outline extraction, symbol completion

## Notes
- Temporary CLI provides: health, open, compile, clean
- MCP tool wiring is scheduled for M22
- Windows-first support; cross-platform as feasible
