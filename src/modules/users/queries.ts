import { gql } from "@apollo/client";

export const USERS_BY_CUSTOMER_QUERY = gql`
  query UsersByCustomer($customerId: UUID!) {
    usersByCustomer(customerId: $customerId) {
      id
      email
      role
      customerId
      tenantId
      externalId
      createdAt
      customer {
        id
        name
      }
    }
  }
`;

export const USERS_BY_TENANT_QUERY = gql`
  query UsersByTenant($tenantId: UUID!) {
    usersByTenant(tenantId: $tenantId) {
      id
      email
      role
      customerId
      tenantId
      externalId
      createdAt
      customer {
        id
        name
      }
    }
  }
`;

export const USERS_BY_TENANT_PAGE_QUERY = gql`
  query UsersByTenantPage($tenantId: UUID!, $page: Int!, $pageSize: Int!) {
    usersByTenantPage(tenantId: $tenantId, page: $page, pageSize: $pageSize) {
      nodes {
        id
        email
        role
        customerId
        tenantId
        externalId
        createdAt
        customer {
          id
          name
        }
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

export const USERS_BY_TENANT_SEARCH_QUERY = gql`
  query UsersByTenantSearch($tenantId: UUID!, $search: String!) {
    usersByTenantSearch(tenantId: $tenantId, search: $search) {
      id
      email
      role
      customerId
      tenantId
      externalId
      createdAt
      customer {
        id
        name
      }
    }
  }
`;
