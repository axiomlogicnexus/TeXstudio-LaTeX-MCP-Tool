# API Surface (Implemented)

Discovery and health
- detect_toolchain() -> { tools: { name, path, version }[] }
- health.check() -> { tools: { name, available, path, version }[] }
- tex.dist_info() -> { name: "MiKTeX"|"TeX Live"|"Unknown", details?, tools: { name, path, version? }[] }

Editor and sessions
- texstudio.open({ file, line?, column?, master?, noSession?, newInstance? }) -> { opened, command, args, code }
- session.save({ name, entries: { file, line?, column?, master?, noSession?, newInstance? }[] }) -> { path, entries }
- session.restore({ name }) -> { opened, sessionPath }

Compilation
- latex.compile({ root, engine?, outDir?, synctex?, shellEscape?, interaction?, haltOnError?, jobname? }) -> { success, pdfPath?, diagnostics[], rawLog?, command, args, code }
  - missing-perl diagnostic when MiKTeX/latexmk lacks Perl; fallback to engine when latexmk missing
- latex.clean({ root, deep?, outDir? }) -> { cleaned, command, args, code }

Linting and formatting
- lint.chktex({ files: string[], config?: string, minSeverity?: number, structured?: boolean }) -> raw output or { diagnostics }
- format.latexindent({ file: string, inPlace?: boolean, config?: string, preserveEOL?: boolean }) -> string | { stdout }

Bibliography
- bib.build({ tool: "biber"|"bibtex", rootOrAux: string }) -> raw combined output

Project
- project.scaffold({ template, name?, author?, withBib?, withLatexmkrc?, outDir? }) -> { createdPaths: string[] }
- project.detect_root({ startPath?: string, file?: string }) -> { root?: string, reason?: string }
- project.graph({ root: string }) -> graph JSON
- project.out_of_date({ root: string, outDir?: string, jobname?: string, pdfPath?: string }) -> { upToDate: boolean, newerSources: string[], missing: string[] }

Forward search
- forward_search.hint({ texFile, line, column?, pdfPath, os? }) -> { viewer: string, command: string, args: string[] }

Watch
- watch.start({ root, engine?, outDir?, synctex?, shellEscape?, interaction?, jobname? }) -> { id, pid, args, startedAt }
- watch.stop({ id }) -> { stopped: boolean }
- watch.list() -> { watchers: ... }
- watch.tail({ id, lines? }) -> string

Documentation and packages
- tex.kpsewhich({ file, format? }) -> { path, stdout, stderr, command, argv }
- tex.texdoc({ package, listOnly? }) -> { docs: { path, uri }[], stdout, stderr, command, argv }
- tex.pkg_info({ name }) -> { manager, stdout, stderr, command, argv }
- tex.pkg_install({ name, manager?, dryRun? }) -> { manager, stdout, stderr, command, argv }

PDF post‑processing
- pdf.optimize({ input, output?, method?, linearize?, gsQuality? }) -> { method, output, stdout, stderr, command, argv }
- pdf.info({ input }) -> { pages?, stdout, stderr, command, argv }

Container workflows
- container.info() -> { dockerAvailable, dockerPath, version?, images? }
- latex.compile_container({ image?, root, engine?, outDir?, shellEscape?, interaction?, jobname? }) -> { success, stdout, stderr, command, argv }
  - Policy: shell-escape is dropped when disallowed and a warning is prepended in stdout
- latex.clean_container({ image?, root, deep?, outDir? }) -> { success, stdout, stderr, command, argv }

Configuration tools
- config.show() -> merged configuration JSON
- config.validate() -> { ok: boolean, diagnostics: { key, ok, message }[] }
- config.reload() -> { reloaded: true, config }
