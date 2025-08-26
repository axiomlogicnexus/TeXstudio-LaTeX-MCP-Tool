# Global Rules

These rules apply across the project and must be followed strictly.

## Language and Tooling
- Language: TypeScript targeting Node 18+ with Module/Resolution: NodeNext. Strict mode enabled.
- Prefer Node standard libraries for process and path work. Add third-party deps only with clear justification.
- Use double quotes in TypeScript.

## Security and Safety
- Shell escape disabled by default for LaTeX runs; enable only when explicitly requested. Emit warnings when enabled.
- Normalize and validate paths. If a workspace root is provided, reject paths that resolve outside it. Use path.resolve and containment checks.
- Never pass user strings to a shell. Use spawn with args arrays; avoid shell: true.
- Enforce timeouts and allow cancellation; kill entire child process trees.

## OS and Compatibility
- Primary platform: Windows; also support macOS and Linux.
- Discovery order for binaries: explicit config > PATH lookup > OS fallbacks (Windows registry for TeXstudio/MiKTeX/TeX Live; standard app paths on macOS; which on Linux).
- Maintain a version/compat matrix for TeXstudio CLI flags and TeX tool behaviors.

## Logging and Diagnostics
- Structured diagnostics for LaTeX errors/warnings: include file, line, column, category, code, message, and hints.
- Redact sensitive environment variables in logs and error reports.

## Code Quality
- Small, pure utility functions; covered by unit tests as added.
- Do not throw raw errors across module boundaries; wrap with typed error objects and context.
- Public MCP tools validate inputs and return typed results with success flag and details.

## Git and Commits
- Conventional Commits (feat, fix, docs, chore, refactor, test, build, ci).
- Keep CHANGELOG.md updated per milestone.

## Documentation
- Keep API.md aligned with implemented MCP tools and schemas.
- Update DEVELOPMENT.md when scripts or workflows change.
