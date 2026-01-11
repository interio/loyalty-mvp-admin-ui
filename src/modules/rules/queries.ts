import { gql } from "@apollo/client";

export const RULES_BY_TENANT_QUERY = gql`
  query RulesByTenant($tenantId: UUID!) {
    pointsRulesByTenant(tenantId: $tenantId) {
      id
      tenantId
      name
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

export const RULES_BY_TENANT_PAGE_QUERY = gql`
  query RulesByTenantPage($tenantId: UUID!, $page: Int!, $pageSize: Int!) {
    pointsRulesByTenantPage(tenantId: $tenantId, page: $page, pageSize: $pageSize) {
      nodes {
        id
        tenantId
        name
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
      pageInfo {
        totalCount
        page
        pageSize
        totalPages
      }
    }
  }
`;
