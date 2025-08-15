import type { NextApiRequest, NextApiResponse } from "next";
import { writeCanon } from "@/lib/neo4j";
import { safeParse } from "@/lib/sanitize";
import type { Canon } from "@/lib/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const body = typeof req.body === "string" ? safeParse(req.body, {}) : req.body;
    const canon: Canon | undefined = body?.Canon || body?.canon || body;
    if (!canon?.cf_version || !canon?.model) {
      return res.status(400).json({ error: "Invalid Canon payload" });
    }
    const id = await writeCanon(canon);
    return res.status(200).json({ success: true, id });
  } catch (e: any) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}