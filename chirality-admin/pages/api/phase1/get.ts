import type { NextApiRequest, NextApiResponse } from "next";
import { getCanon } from "@/lib/neo4j";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== "GET" || !id) return res.status(405).end();
  const node = await getCanon(String(id));
  res.status(200).json({ canon: node });
}