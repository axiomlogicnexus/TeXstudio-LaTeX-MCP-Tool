// Process utilities: safe child process spawning for external tools
// - No shell execution: avoids injection and quoting issues
// - Captures stdout and stderr
// - Optional timeout and cancellation support
import { spawn, SpawnOptions } from "node:child_process";

export interface RunOptions {
  // Working directory for the process
  cwd?: string;
  // Environment variables override
  env?: NodeJS.ProcessEnv;
  // Kill the process after this many milliseconds
  timeoutMs?: number;
  // AbortSignal to cancel the process from the caller
  signal?: AbortSignal;
}

export interface RunResult {
  // Executable invoked
  command: string;
  // Argument list
  args: string[];
  // Exit code (null if terminated/killed)
  code: number | null;
  // Captured stdout
  stdout: string;
  // Captured stderr
  stderr: string;
  // Whether a timeout occurred
  timedOut: boolean;
}

// Run a command with args, returning captured output and exit status
export async function runCommand(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const spawnOpts: SpawnOptions = {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false, // use args array; do not invoke a shell
    };

    const child = spawn(command, args, spawnOpts);

    let stdout = "";
    let stderr = "";
    let timeout: NodeJS.Timeout | undefined;
    let finished = false;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
    };

    // Enforce timeout if requested
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        if (finished) return;
        finished = true;
        try { child.kill(); } catch {}
        resolve({ command, args, code: null, stdout, stderr: stderr + "\n[timeout] process exceeded " + options.timeoutMs + "ms", timedOut: true });
      }, options.timeoutMs);
    }

    // Support external cancellation
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
