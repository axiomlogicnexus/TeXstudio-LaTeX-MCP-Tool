import { detectToolchain, ToolInfo } from "../discovery/detect.js";

let _cache: { at: number; tools: ToolInfo[] } | null = null;
const TTL_MS = 60_000; // 60s cache

export async function detect_toolchain(): Promise<{ tools: ToolInfo[] }> {
  const now = Date.now();
  if (_cache && (now - _cache.at) < TTL_MS) {
    return { tools: _cache.tools };
  }
  const tools = await detectToolchain();
  _cache = { at: now, tools };
  return { tools };
}
