import { gql } from "@apollo/client";

export const PRODUCTS_QUERY = gql`
  query Products {
    products {
      id
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
  query ProductsPage($page: Int!, $pageSize: Int!, $search: String) {
    productsPage(page: $page, pageSize: $pageSize, search: $search) {
      nodes {
        id
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
  query ProductsSearch($search: String!) {
    productsSearch(search: $search) {
      id
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
