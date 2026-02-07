import { gql } from "@apollo/client";

export const PRODUCTS_QUERY = gql`
  query Products($tenantId: UUID!) {
    products(tenantId: $tenantId) {
      id
      tenantId
      distributorId
      sku
      gtin
      name
      cost
      createdAt
      updatedAt
      attributes {
        key
        value
      }
    }
  }
`;

export const PRODUCTS_PAGE_QUERY = gql`
  query ProductsPage($tenantId: UUID!, $page: Int!, $pageSize: Int!, $search: String) {
    productsPage(tenantId: $tenantId, page: $page, pageSize: $pageSize, search: $search) {
      nodes {
        id
        tenantId
        distributorId
        sku
        gtin
        name
        cost
        createdAt
        updatedAt
        attributes {
          key
          value
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

export const PRODUCTS_SEARCH_QUERY = gql`
  query ProductsSearch($tenantId: UUID!, $search: String!) {
    productsSearch(tenantId: $tenantId, search: $search) {
      id
      tenantId
      distributorId
      sku
      gtin
      name
      cost
      createdAt
      updatedAt
      attributes {
        key
        value
      }
    }
  }
`;
