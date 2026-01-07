import { gql } from "@apollo/client";

export const CUSTOMER_TRANSACTIONS_QUERY = gql`
  query CustomerTransactions($customerId: UUID!) {
    customerTransactions(customerId: $customerId) {
      id
      customerId
      actorUserId
      amount
      reason
      correlationId
      createdAt
      appliedRulesJson
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
