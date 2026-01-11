import { gql } from "@apollo/client";

export const TENANTS_QUERY = gql`
  query Tenants {
    tenants {
      id
      name
    }
  }
`;

export const TENANTS_PAGE_QUERY = gql`
  query TenantsPage($page: Int!, $pageSize: Int!) {
    tenantsPage(page: $page, pageSize: $pageSize) {
      nodes {
        id
        name
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

export const CREATE_TENANT_MUTATION = gql`
  mutation CreateTenant($input: CreateTenantInput!) {
    createTenant(input: $input) {
      id
      name
    }
  }
`;
