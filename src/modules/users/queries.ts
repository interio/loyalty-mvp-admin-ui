import { gql } from "@apollo/client";

export const USERS_BY_CUSTOMER_QUERY = gql`
  query UsersByCustomer($customerId: UUID!) {
    usersByCustomer(customerId: $customerId) {
      id
      email
      role
      customerId
      tenantId
    }
  }
`;
