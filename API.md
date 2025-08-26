# API Surface (Planned)

- detect_toolchain() -> { tools: { name, path, version }[] }
- texstudio.open({ file, line?, column?, master?, noSession?, newInstance? }) -> { opened: boolean, command }
- latex.compile({ root, engine?, outDir?, synctex?, shellEscape?, interaction?, haltOnError?, jobname? }) -> { success, pdfPath?, logPath?, diagnostics[] }
- latex.clean({ root, deep? }) -> { cleaned: boolean }
- bib.build({ tool: biber|bibtex, rootOrAux }) -> { success, log }
- lint.chktex({ files, config?, minSeverity? }) -> { diagnostics[] }
- format.latexindent({ fileOrText, config?, inPlace?, preserveEOL? }) -> { formattedText? }
- project.scaffold({ template, name?, author?, withBib?, withLatexmkrc? }) -> { createdPaths[] }
- logs.parse({ logPath?|text }) -> { diagnostics[] }
- forward_search_hint({ texFile, line, column, pdfPath, os? }) -> { viewer, command }
- health.check() -> { status, details }
