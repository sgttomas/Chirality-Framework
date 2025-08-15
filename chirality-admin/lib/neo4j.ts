import neo4j, { Driver } from "neo4j-driver";
import type { Canon } from "./types";

let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI!;
    const user = process.env.NEO4J_USER!;
    const password = process.env.NEO4J_PASSWORD!;
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function listCanons() {
  const session = getDriver().session();
  try {
    const res = await session.run(
      "MATCH (c:Canon) RETURN c ORDER BY c.createdAt DESC LIMIT 100"
    );
    return res.records.map((r) => r.get("c").properties);
  } finally {
    await session.close();
  }
}

export async function getCanon(id: string) {
  const session = getDriver().session();
  try {
    const res = await session.run("MATCH (c:Canon) WHERE id(c) = toInteger($id) RETURN c", { id });
    const rec = res.records[0];
    return rec ? rec.get("c").properties : null;
  } finally {
    await session.close();
  }
}

export async function writeCanon(canon: Canon) {
  const session = getDriver().session();
  try {
    const res = await session.run(
      `CREATE (c:Canon {
        cf_version:$cf_version, model:$model,
        station_default:$station_default, matrix_default:$matrix_default,
        principles:$principles, row_family:$row_family, col_family:$col_family,
        createdAt: datetime()
      }) RETURN id(c) as id`,
      canon as any
    );
    return res.records[0].get("id").toString();
  } finally {
    await session.close();
  }
}