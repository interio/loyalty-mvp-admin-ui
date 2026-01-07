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
