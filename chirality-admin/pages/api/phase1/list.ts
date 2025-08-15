import type { NextApiRequest, NextApiResponse } from "next";
import { listCanons } from "@/lib/neo4j";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const items = await listCanons();
  res.status(200).json({ items });
}