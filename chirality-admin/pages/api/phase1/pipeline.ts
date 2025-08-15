import type { NextApiRequest, NextApiResponse } from "next";
import { cliFullPipeline } from "@/lib/runCli";
import path from "node:path";
import fs from "node:fs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { packPath } = req.body as { packPath?: string };

    if (packPath && !fs.existsSync(packPath)) {
      return res.status(400).json({ error: `Pack not found at ${packPath}` });
    }

    const out = await cliFullPipeline({ packPath });
    return res.status(200).send(out);
  } catch (e: any) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}