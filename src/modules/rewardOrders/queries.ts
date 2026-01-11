import { gql } from "@apollo/client";

export const REWARD_ORDERS_BY_TENANT_QUERY = gql`
  query RewardOrdersByTenant($tenantId: UUID!) {
    rewardOrdersByTenant(tenantId: $tenantId) {
      id
      tenantId
      customerId
      actorUserId
      status
      totalPoints
      placedOnBehalf
      providerReference
      createdAt
      updatedAt
      items {
        id
        rewardProductId
        rewardVendor
        sku
        name
        quantity
        pointsCost
        totalPoints
      }
    }
  }
`;

export const REWARD_ORDERS_BY_TENANT_PAGE_QUERY = gql`
  query RewardOrdersByTenantPage($tenantId: UUID!, $page: Int!, $pageSize: Int!) {
    rewardOrdersByTenantPage(tenantId: $tenantId, page: $page, pageSize: $pageSize) {
      nodes {
        id
        tenantId
        customerId
        actorUserId
        status
        totalPoints
        placedOnBehalf
        providerReference
        createdAt
        updatedAt
        items {
          id
          rewardProductId
          rewardVendor
          sku
          name
          quantity
          pointsCost
          totalPoints
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

export const REWARD_ORDER_QUERY = gql`
  query RewardOrder($tenantId: UUID!, $id: UUID!) {
    rewardOrder(tenantId: $tenantId, id: $id) {
      id
      tenantId
      customerId
      actorUserId
      status
      totalPoints
      placedOnBehalf
      providerReference
      createdAt
      updatedAt
      items {
        id
        rewardProductId
        rewardVendor
        sku
        name
        quantity
        pointsCost
        totalPoints
      }
    }
  }
`;

export const UPDATE_REWARD_ORDER_STATUS_MUTATION = gql`
  mutation UpdateRewardOrderStatus($input: UpdateRewardOrderStatusInput!) {
    updateRewardOrderStatus(input: $input) {
      id
      status
      updatedAt
    }
  }
`;
