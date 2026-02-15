import { gql } from "@apollo/client";

export const DISTRIBUTORS_BY_TENANT_QUERY = gql`
  query DistributorsByTenant($tenantId: UUID!) {
    distributorsByTenant(tenantId: $tenantId) {
      id
      tenantId
      name
      displayName
      createdAt
    }
  }
`;

export const DISTRIBUTORS_BY_TENANT_PAGE_QUERY = gql`
  query DistributorsByTenantPage($tenantId: UUID!, $page: Int!, $pageSize: Int!, $search: String) {
    distributorsByTenantPage(tenantId: $tenantId, page: $page, pageSize: $pageSize, search: $search) {
      nodes {
        id
        tenantId
        name
        displayName
        createdAt
      }
      pageInfo {
        totalCount
        page
        pageSize
        totalPages
      }
    }
  }
`;

export const DISTRIBUTORS_BY_TENANT_SEARCH_QUERY = gql`
  query DistributorsByTenantSearch($tenantId: UUID!, $search: String!) {
    distributorsByTenantSearch(tenantId: $tenantId, search: $search) {
      id
      tenantId
      name
      displayName
      createdAt
    }
  }
`;
