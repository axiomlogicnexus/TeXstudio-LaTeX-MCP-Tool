import { detect_toolchain } from "./tools/detect.js";
import { openInTeXstudio } from "./tools/texstudio.js";
import { compileLatex, cleanAux } from "./tools/latex.js";

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === "health") {
      const res = await detect_toolchain();
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    if (cmd === "open" && process.argv[3]) {
      const res = await openInTeXstudio({ file: process.argv[3], line: process.argv[4] ? Number(process.argv[4]) : undefined });
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    if (cmd === "compile") {
      // Accept --root path or join remaining args to form a path
      const args = process.argv.slice(3);
      let rootArg: string | undefined;
      const i = args.indexOf("--root");
      if (i >= 0 && args[i + 1]) {
        rootArg = args[i + 1];
      } else if (args.length) {
        rootArg = args.join(" ");
      }
      if (!rootArg) {
        console.error("Usage: compile --root <path-to-root.tex> (or compile <path with spaces>)");
        process.exit(2);
      }
      const res = await compileLatex({ root: rootArg });
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    if (cmd === "clean" && process.argv[3]) {
      const res = await cleanAux({ root: process.argv[3] });
      console.log(JSON.stringify(res, null, 2));
      return;
    }
    console.log("TeXstudio-LaTeX MCP Tool scaffold. Commands: health | open <file> [line] | compile <root.tex> | clean <root.tex>");
  } catch (err) {
    console.error("Error:", err);
    process.exitCode = 1;
  }
}

main();
