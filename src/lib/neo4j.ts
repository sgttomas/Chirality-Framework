import neo4j, { Driver } from 'neo4j-driver';

declare global {
  // eslint-disable-next-line no-var
  var __neo4jDriver: Driver | null | undefined;
}

export function getNeo4jDriver(): Driver {
  if (globalThis.__neo4jDriver) return globalThis.__neo4jDriver;

  const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = process.env;
  if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    throw new Error('Missing Neo4j environment variables');
  }
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  globalThis.__neo4jDriver = driver;
  return driver;
}

// Lazy-loaded driver instance for backward compatibility
let _driverInstance: Driver | null = null;
export const neo4jDriver = {
  session: () => {
    if (!_driverInstance) {
      _driverInstance = getNeo4jDriver();
    }
    return _driverInstance.session();
  },
  close: () => {
    if (_driverInstance) {
      return _driverInstance.close();
    }
    return Promise.resolve();
  }
};