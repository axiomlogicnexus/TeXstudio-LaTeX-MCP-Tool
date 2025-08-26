# Architecture

Components:

- Server Entry (src/index.ts): starts the MCP server (to be wired) and exposes tools.
- Discovery (src/discovery): resolves paths to texstudio, latexmk, engines, biber, chktex, latexindent; gathers versions.
- Process Runner (src/utils/process.ts): spawns commands with args; captures stdout/stderr; timeouts and cancellation.
- Tools (src/tools):
  - texstudio.ts: open file with line/column/master, availability check.
  - latex.ts: compile (latexmk), clean aux, engine selection, synctex, shell-escape.
  - bib.ts: biber/bibtex.
  - chktex.ts: lint.
  - latexindent.ts: formatting.
  - detect.ts: aggregate detection of toolchain and versions.
  - scaffold.ts: project scaffolding.
- Parsers (src/parsers):
  - latexLog.ts: parse logs to structured diagnostics (errors, warnings, over/underfull boxes, missing packages/files, kpathsea).
- Config (src/config):
  - schema and resolution with precedence: env > user config > project config > defaults.
