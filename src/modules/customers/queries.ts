import { gql } from "@apollo/client";

export const CUSTOMERS_BY_TENANT_QUERY = gql`
  query CustomersByTenant($tenantId: UUID!) {
    customersByTenant(tenantId: $tenantId) {
      id
      name
      externalId
      contactEmail
      tenantId
      createdAt
      pointsAccount {
        balance
        updatedAt
      }
    }
  }
`;

export const CUSTOMERS_BY_TENANT_SEARCH_QUERY = gql`
  query CustomersByTenantSearch($tenantId: UUID!, $search: String!) {
    customersByTenantSearch(tenantId: $tenantId, search: $search) {
      id
      name
      externalId
      contactEmail
      tenantId
      createdAt
      pointsAccount {
        balance
        updatedAt
      }
    }
  }
`;
