import fs from "node:fs";
import path from "node:path";
import { Config, defaultConfig } from "./schema.js";

let _cfgCache: Config | null = null;

function readJsonIfExists(p: string): any | null {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function loadConfig(): Config {
  if (_cfgCache) return _cfgCache as Config;
  const env: Partial<Config> = {};
  if (process.env.WORKSPACE_ROOT) env.workspaceRoot = path.resolve(process.env.WORKSPACE_ROOT);
  if (process.env.TEX_MCP_ALLOW_SHELL_ESCAPE) {
    const v = (process.env.TEX_MCP_ALLOW_SHELL_ESCAPE || "").toLowerCase();
    env.allowShellEscape = v === "1" || v === "true" || v === "on" || v === "yes";
  }
  if (process.env.TEXSTUDIO_EXE) env.texstudioExe = process.env.TEXSTUDIO_EXE;

  // Optional project config at WORKSPACE_ROOT/.texstudio-mcp.json
  const ws = env.workspaceRoot || process.cwd();
  const fileCfg = readJsonIfExists(path.join(ws, ".texstudio-mcp.json"));

  _cfgCache = {
    ...defaultConfig,
    ...fileCfg,
    ...env,
  };
  return _cfgCache as Config;
}

export function reloadConfig(): Config {
  _cfgCache = null;
  return loadConfig();
}
