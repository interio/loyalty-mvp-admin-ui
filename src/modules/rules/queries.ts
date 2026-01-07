import { gql } from "@apollo/client";

export const RULES_BY_TENANT_QUERY = gql`
  query RulesByTenant($tenantId: UUID!) {
    pointsRulesByTenant(tenantId: $tenantId) {
      id
      tenantId
      ruleType
      ruleVersion
      active
      priority
      effectiveFrom
      effectiveTo
      createdAt
      updatedAt
      conditions {
        key
        value
      }
    }
  }
`;
