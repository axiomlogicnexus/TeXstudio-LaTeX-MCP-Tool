# Changelog

## 0.23.1
- M23 additions: configuration memoization + config.validate/config.reload tools
- Container compile: enforce shell-escape policy (drop flag and warn when disallowed)
- Comprehensive README and documentation refresh (API, ARCHITECTURE, ROADMAP)

## 0.23.0
- M23 complete: configuration layer with precedence (env > WORKSPACE_ROOT/.texstudio-mcp.json > defaults)
- config.show tool; wired policies and defaults into server/tools

## 0.22.0
- MCP server wiring: all tools exposed with schemas via stdio transport

## 0.21.0
- Testing suite foundation (Vitest); initial tests for log parsing, security, async pool

## 0.20.0
- Sessions: session.save/session.restore (M20)

## 0.19.0
- Portable/network robustness (M19): toExtendedIfNeeded, retry helper

## 0.18.0
- Container support (M18): container.info, latex.compile_container, latex.clean_container

## 0.17.0
- Performance (M17): TTL caches for detect_toolchain/tex.dist_info; concurrent chktex pool

## 0.16.0
- PDF post-processing (M16): pdf.optimize (qpdf/gs) and pdf.info (qpdf)

## 0.15.0
- Package helpers (M15): tex.kpsewhich, tex.texdoc, tex.pkg_info, tex.pkg_install

## 0.14.0
- OS discovery (M14): tex.dist_info, cross-OS which fallbacks, Windows App Paths, long-path handling

## 0.1.0
- Initial scaffold of TypeScript project, core modules, docs, and CLI stub
