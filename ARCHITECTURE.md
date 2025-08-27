# Architecture

## Components
- MCP Server (src/mcp/server.ts)
  - Stdio transport using @modelcontextprotocol/sdk
  - Registers tools with raw Zod shapes for input schemas
- Process Runner (src/utils/process.ts)
  - Safe spawn with timeouts and optional cancellation; no shell=true
- Discovery (src/discovery)
  - which.ts: PATH lookup with OS fallbacks (M14)
  - texstudioPath.ts: TeXstudio resolution (env, PATH, registry, common dirs, macOS .app)
  - texDist.ts: MiKTeX vs TeX Live detection with fast parallel probes
  - resolveExec.ts + winAppPaths.ts: unified exec resolution with Windows App Paths fallback
- Configuration (src/config)
  - schema.ts: Config keys and defaults (workspaceRoot, allowShellEscape, defaultEngine, dockerImage, texstudioExe)
  - load.ts: M23 precedence (env > WORKSPACE_ROOT/.texstudio-mcp.json > defaults), memoized + reload
- Security utilities (src/utils/security.ts)
  - getWorkspaceRoot, ensureInsideWorkspace, isInsideWorkspace, shellEscapeAllowed, toExtendedIfNeeded (Windows long/UNC)
- Tools (src/tools)
  - texstudio.ts: open file at line/column; uses texstudioPath
  - latex.ts: compile/clean via latexmk (engine fallback, missing‑Perl diagnostics)
  - chktex, latexindent, pkg (kpsewhich/texdoc/pkg info/install), pdf, container
  - forwardSearch.ts: viewer command suggestions
  - projectIntelligence.ts: root detection, dependency graph, out‑of‑date
  - watch.ts: latexmk -pvc orchestration and registry
- Parsers (src/parsers)
  - latexLog.ts: enhanced diagnostics (M12) with codes and hints (missing‑package/file, undefined control sequence, hbox ranges, rerun, kpathsea)

## Policies and behavior
- Security (M13)
  - Workspace containment for file paths when WORKSPACE_ROOT is set
  - Shell‑escape gated by TEX_MCP_ALLOW_SHELL_ESCAPE; compile and container compile warn/disable when blocked
  - Timeouts enforced; safe argv only; no shells
- OS discovery and long paths (M14)
  - Cross‑OS binary fallbacks; Windows App Paths registry fallback
  - Windows long/UNC paths mapped to extended length for external invocations
- Performance (M17)
  - TTL caches for detect_toolchain and tex.dist_info
  - Concurrency pool for lint.chktex on multi‑file inputs

## Transport and invocation
- Stdio MCP model; client spawns node dist/mcp/server.js and communicates via JSON‑RPC
- Temporary CLI (src/index.ts) available for developer smoke tests
