import { gql } from "@apollo/client";

export const TENANTS_QUERY = gql`
  query Tenants {
    tenants {
      id
      name
    }
  }
`;

export const CREATE_TENANT_MUTATION = gql`
  mutation CreateTenant($input: CreateTenantInput!) {
    createTenant(input: $input) {
      id
      name
    }
  }
`;
