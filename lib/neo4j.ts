import neo4j, { Driver } from 'neo4j-driver'

let driver: Driver | null = null

export function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI as string
    const user = process.env.NEO4J_USER as string
    const password = process.env.NEO4J_PASSWORD as string
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
  }
  return driver
}

export const neo4jDriver = getDriver()