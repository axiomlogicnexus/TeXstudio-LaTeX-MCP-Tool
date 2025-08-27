import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { which } from "./which.js";
import { runCommand } from "../utils/process.js";
import { loadConfig } from "../config/load.js";

function exists(p?: string | null): p is string {
  return !!p && fs.existsSync(p);
}

async function queryRegistryForAppPath(subkey: string): Promise<string | null> {
  try {
    const res = await runCommand("reg", ["query", subkey, "/ve"], { timeoutMs: 3000 });
    const text = (res.stdout || "") + "\n" + (res.stderr || "");
    // Expect a line like: (Default)    REG_SZ    C:\\Program Files\\TeXstudio\\texstudio.exe
    for (const line of text.split(/\r?\n/)) {
      if (line.includes("REG_SZ")) {
        const parts = line.split("REG_SZ");
        const candidate = parts[1]?.trim().replace(/^"|"$/g, "");
        if (candidate && fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function resolveTeXstudioPath(): Promise<string | null> {
  // 0) Config override (may come from env or project file)
  const cfg = loadConfig();
  if (exists(cfg.texstudioExe)) return cfg.texstudioExe!;
  // 1) Explicit env override
  const envPath = process.env.TEXSTUDIO_EXE;
  if (exists(envPath)) return envPath!;

  // 2) PATH lookup
  const name = os.platform() === "win32" ? "texstudio.exe" : "texstudio";
  const viaPath = which(name) || which("texstudio");
  if (exists(viaPath)) return viaPath!;

  if (os.platform() === "win32") {
    // 3) Windows Registry (App Paths)
    const keys = [
      "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\texstudio.exe",
      "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\texstudio.exe",
      "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\texstudio.exe"
    ];
    for (const k of keys) {
      const p = await queryRegistryForAppPath(k);
      if (exists(p)) return p!;
    }

    // 4) Common install locations
    const commons = [
      "C:\\Program Files\\TeXstudio\\texstudio.exe",
      "C:\\Program Files (x86)\\TeXstudio\\texstudio.exe"
    ];
    for (const c of commons) {
      if (exists(c)) return c;
    }
  }

  if (os.platform() === "darwin") {
    // macOS app bundle
    const mac = "/Applications/TeXstudio.app/Contents/MacOS/texstudio";
    if (exists(mac)) return mac;
  }

  // Linux already covered by which
  return null;
}
