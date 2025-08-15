import type { NextApiRequest, NextApiResponse } from "next";
import { cliSemanticInit } from "@/lib/runCli";
import path from "node:path";
import fs from "node:fs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { packPath, matrix } = req.body as { packPath?: string; matrix?: string };

    if (!packPath) {
      return res.status(400).json({ error: "packPath required" });
    }
    // verify file exists (dev convenience)
    if (!fs.existsSync(packPath)) {
      return res.status(400).json({ error: `Pack not found at ${packPath}` });
    }

    const out = await cliSemanticInit({ packPath, matrix: matrix || "A", dryRun: true });
    // out is a JSON string like { "Canon": { ... } }
    return res.status(200).send(out);
  } catch (e: any) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}