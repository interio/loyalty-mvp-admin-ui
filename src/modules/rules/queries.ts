import { gql } from "@apollo/client";

export const RULES_BY_TENANT_QUERY = gql`
  query RulesByTenant($tenantId: UUID!) {
    pointsRulesByTenant(tenantId: $tenantId) {
      id
      tenantId
      name
      ruleType
      rewardPoints
      active
      priority
      effectiveFrom
      effectiveTo
      createdBy
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
        rewardPoints
        active
        priority
        effectiveFrom
        effectiveTo
        createdBy
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

export const RULE_CONDITION_TREE_FLAT_QUERY = gql`
  query RuleConditionTreeFlat($ruleId: UUID!, $tenantId: UUID!) {
    ruleConditionTreeFlat(ruleId: $ruleId, tenantId: $tenantId) {
      rootGroupId
      groups {
        id
        parentGroupId
        logic
        sortOrder
      }
      conditions {
        id
        groupId
        entityCode
        attributeCode
        operator
        valueJson
        sortOrder
      }
    }
  }
`;

export const CAMPAIGN_RULES_BY_TENANT_QUERY = gql`
  query CampaignRulesByTenant($tenantId: UUID!) {
    campaignRulesByTenant(tenantId: $tenantId) {
      id
      ruleName
      startDate
      endDate
    }
  }
`;
