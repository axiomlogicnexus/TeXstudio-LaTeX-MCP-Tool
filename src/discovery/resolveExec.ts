import os from "node:os";
import { which } from "./which.js";
import { queryWindowsAppPath } from "./winAppPaths.js";

/**
 * Resolve an executable path with OS-specific fallbacks.
 * - Uses which() first
 * - On Windows, falls back to App Paths registry (HKLM/HKCU)
 */
export async function resolveExec(command: string): Promise<string | null> {
  const w = which(command);
  if (w) return w;
  if (os.platform() === "win32") {
    const name = command.toLowerCase().endsWith(".exe") ? command : command + ".exe";
    const reg = await queryWindowsAppPath(name);
    if (reg) return reg;
  }
  return null;
}
