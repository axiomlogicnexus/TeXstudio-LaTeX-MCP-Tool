/**
 * Windows App Paths registry probing for executables.
 *
 * Checks under HKLM/HKCU App Paths for a given exe name, returning the absolute
 * path if found.
 */
import { runCommand } from "../utils/process.js";

export async function queryWindowsAppPath(exeName: string): Promise<string | null> {
  const keys = [
    `HKLM/Software/Microsoft/Windows/CurrentVersion/App Paths/${exeName}`,
    `HKCU/Software/Microsoft/Windows/CurrentVersion/App Paths/${exeName}`,
    `HKLM/Software/WOW6432Node/Microsoft/Windows/CurrentVersion/App Paths/${exeName}`
  ];
  for (const k of keys) {
    try {
      const res = await runCommand("reg", ["query", k.split("/").join("\\"), "/ve"], { timeoutMs: 800 });
      const text = (res.stdout || "") + "\n" + (res.stderr || "");
      const m = /REG_SZ\s+(.+)$/m.exec(text);
      if (m) {
        const p = m[1].trim().replace(/^"|"$/g, "");
        return p;
      }
    } catch {}
  }
  return null;
}
