import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { graphqlEndpoint } from "./config";

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: graphqlEndpoint,
    fetchOptions: {
      mode: "cors",
    },
  }),
  cache: new InMemoryCache(),
});
