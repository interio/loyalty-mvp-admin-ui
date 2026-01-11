import { gql } from "@apollo/client";

export const REWARD_PRODUCTS_QUERY = gql`
  query RewardProducts($tenantId: UUID) {
    rewardProducts(tenantId: $tenantId) {
      id
      tenantId
      rewardVendor
      sku
      gtin
      name
      pointsCost
      attributes {
        key
        value
      }
      createdAt
      updatedAt
    }
  }
`;

export const REWARD_PRODUCTS_PAGE_QUERY = gql`
  query RewardProductsPage($tenantId: UUID, $page: Int!, $pageSize: Int!, $search: String) {
    rewardProductsPage(tenantId: $tenantId, page: $page, pageSize: $pageSize, search: $search) {
      nodes {
        id
        tenantId
        rewardVendor
        sku
        gtin
        name
        pointsCost
        attributes {
          key
          value
        }
        createdAt
        updatedAt
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

export const REWARD_PRODUCTS_SEARCH_QUERY = gql`
  query RewardProductsSearch($search: String!, $tenantId: UUID) {
    rewardProductsSearch(search: $search, tenantId: $tenantId) {
      id
      tenantId
      rewardVendor
      sku
      gtin
      name
      pointsCost
      attributes {
        key
        value
      }
      createdAt
      updatedAt
    }
  }
`;

export const REWARD_PRODUCT_QUERY = gql`
  query RewardProduct($tenantId: UUID!, $id: UUID!) {
    rewardProduct(tenantId: $tenantId, id: $id) {
      id
      tenantId
      rewardVendor
      sku
      gtin
      name
      pointsCost
      inventoryQuantity
      attributes {
        key
        value
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPSERT_REWARD_PRODUCT_MUTATION = gql`
  mutation UpsertRewardProduct($input: UpsertRewardProductInput!) {
    upsertRewardProduct(input: $input) {
      id
      tenantId
      rewardVendor
      sku
      gtin
      name
      pointsCost
      inventoryQuantity
      attributes {
        key
        value
      }
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_REWARD_PRODUCT_MUTATION = gql`
  mutation DeleteRewardProduct($tenantId: UUID!, $id: UUID!) {
    deleteRewardProduct(tenantId: $tenantId, id: $id)
  }
`;
