import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.GRAPH_API_SCHEMA ?? 'http://localhost:8080/graphql',
  documents: ['src/**/*.{ts,tsx,graphql,gql}'],
  overwrite: true,
  generates: {
    'src/gql/': {
      preset: 'client',
      presetConfig: {
        fragmentMasking: false
      }
    }
  },
  hooks: {
    afterAllFileWrite: ['prettier --write']
  }
};
export default config;