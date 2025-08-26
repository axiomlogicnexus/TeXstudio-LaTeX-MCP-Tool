import fs from "node:fs";
import path from "node:path";

export interface ScaffoldOptions {
  template: "article" | "report" | "book" | "beamer";
  name?: string;
  author?: string;
  withBib?: boolean;
  withLatexmkrc?: boolean;
  outDir?: string;
}

export function project_scaffold(opts: ScaffoldOptions): { createdPaths: string[] } {
  const created: string[] = [];
  const dir = path.resolve(opts.outDir || "tex_project");
  fs.mkdirSync(dir, { recursive: true });
  created.push(dir);
  const main = path.join(dir, "main.tex");
  const title = opts.name || "Document";
  const author = opts.author || "Author";
  const baseDoc = `\\documentclass{${opts.template}}
\\usepackage[utf8]{inputenc}
\\title{${title}}
\\author{${author}}
\\date{\\today}
\\begin{document}
\\maketitle
Hello, TeX.
\\end{document}\n`;
  fs.writeFileSync(main, baseDoc, "utf8");
  created.push(main);
  if (opts.withBib) {
    const bib = path.join(dir, "refs.bib");
    fs.writeFileSync(bib, "@book{key, title={Title}, author={Someone}, year={2024}}\n", "utf8");
    created.push(bib);
  }
  if (opts.withLatexmkrc) {
    const rc = path.join(dir, ".latexmkrc");
    fs.writeFileSync(rc, "$pdf_mode = 1;\n$interaction = 'nonstopmode';\n$pdflatex = 'pdflatex -synctex=1 %O %S';\n", "utf8");
    created.push(rc);
  }
  return { createdPaths: created };
}
