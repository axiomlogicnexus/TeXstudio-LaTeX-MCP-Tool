import { detectToolchain, ToolInfo } from "../discovery/detect.js";

export async function detect_toolchain(): Promise<{ tools: ToolInfo[] }> {
  const tools = await detectToolchain();
  return { tools };
}
