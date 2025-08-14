import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const GRAPH_API = process.env.NEXT_PUBLIC_GRAPH_API ?? 'http://localhost:8080/graphql';

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: GRAPH_API,
    // credentials: 'include', // if you need cookies
  }),
  cache: new InMemoryCache(),
  // defaultOptions: { watchQuery: { fetchPolicy: 'cache-and-network' } }
});