import { spawn, SpawnOptions } from "node:child_process";

export interface RunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface RunResult {
  command: string;
  args: string[];
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function runCommand(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const spawnOpts: SpawnOptions = {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    };

    const child = spawn(command, args, spawnOpts);

    let stdout = "";
    let stderr = "";
    let timeout: NodeJS.Timeout | undefined;
    let finished = false;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
    };

    if (options.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        if (finished) return;
        finished = true;
        try { child.kill(); } catch {}
        resolve({ command, args, code: null, stdout, stderr: stderr + "\n[timeout] process exceeded " + options.timeoutMs + "ms", timedOut: true });
      }, options.timeoutMs);
    }

    options.signal?.addEventListener("abort", () => {
      try { child.kill(); } catch {}
    });

    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });

    child.on("error", (err) => {
      cleanup();
      if (finished) return;
      finished = true;
      reject(err);
    });

    child.on("close", (code) => {
      cleanup();
      if (finished) return;
      finished = true;
      resolve({ command, args, code, stdout, stderr, timedOut: false });
    });
  });
}
