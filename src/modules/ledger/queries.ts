import { gql } from "@apollo/client";

export const CUSTOMER_TRANSACTIONS_QUERY = gql`
  query CustomerTransactions($customerId: UUID!) {
    customerTransactions(customerId: $customerId) {
      id
      customerId
      actorUserId
      actorEmail
      comment
      amount
      reason
      correlationId
      createdAt
      appliedRulesJson
    }
  }
`;

export const TENANT_POINTS_SUMMARY_QUERY = gql`
  query TenantPointsSummary($tenantId: UUID!, $from: DateTime!, $to: DateTime!) {
    tenantPointsSummary(tenantId: $tenantId, from: $from, to: $to) {
      tenantId
      from
      to
      pointsEarned
      pointsSpent
    }
  }
`;

export const MANUAL_ADJUST_POINTS_MUTATION = gql`
  mutation ManualAdjustPoints($input: ManualAdjustPointsInput!) {
    manualAdjustPoints(input: $input) {
      customerId
      balance
      updatedAt
    }
  }
`;
