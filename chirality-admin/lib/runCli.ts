import { spawn } from "child_process";
import path from "node:path";

const PY = process.env.PYTHON_BIN || "python3";
const CLI = process.env.CHIRALITY_CLI_PY;

if (!CLI) {
  // we throw here at module init to catch misconfig early
  throw new Error("CHIRALITY_CLI_PY not set; point it to chirality_cli.py");
}

export async function cliSemanticInit({
  packPath,
  matrix = "A",
  dryRun = true
}: { packPath: string; matrix?: string; dryRun?: boolean }): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      CLI!,
      "semantic-init",
      "--pack", packPath,
      "--matrix", matrix
    ];
    if (dryRun) args.push("--dry-run");

    const proc = spawn(PY, args, { env: process.env });

    let out = "", err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) return resolve(out.trim());
      reject(new Error(`semantic-init failed (code ${code})\n${err || out}`));
    });
  });
}