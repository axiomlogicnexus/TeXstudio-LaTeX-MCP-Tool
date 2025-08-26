import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function isExecutable(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    try {
      // On Windows, X_OK is not reliable; existence is enough for exe files
      fs.accessSync(p, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

export function which(command: string): string | null {
  const envPath = process.env.PATH || "";
  const segments = envPath.split(path.delimiter);
  const isWin = os.platform() === "win32";
  const exts = isWin ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];

  for (const seg of segments) {
    const base = seg || ".";
    if (isWin) {
      for (const ext of exts) {
        const withExt = command.toLowerCase().endsWith(ext.toLowerCase()) ? command : command + ext.toLowerCase();
        const p = path.join(base, withExt);
        if (fs.existsSync(p)) return p;
        const withExtU = command.toUpperCase().endsWith(ext.toUpperCase()) ? command : command + ext.toUpperCase();
        const p2 = path.join(base, withExtU);
        if (fs.existsSync(p2)) return p2;
      }
    } else {
      const p = path.join(base, command);
      if (fs.existsSync(p) && isExecutable(p)) return p;
    }
  }
  return null;
}
