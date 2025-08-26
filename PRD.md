# Product Requirements Document

## Goal
Reliable MCP server integrating TeXstudio entry points and LaTeX toolchain with Windows-first robustness and cross-platform support.

## Users
- LaTeX authors using TeXstudio + automation via MCP clients.
- Assistants needing structured diagnostics and compile orchestration.

## MVP Scope
- Toolchain detection, open TeXstudio at file/line, compile via latexmk with synctex, clean aux, parse logs to diagnostics.

## Future Scope
- Watch mode with live diagnostics, advanced root detection, dependency graph, chktex/latexindent/biber integration, forward-search hints, health checks, package management helpers, caching, parallelism, Docker support.

## Non-Functional
- Secure defaults, robust path handling, timeouts, structured errors, thorough docs.
