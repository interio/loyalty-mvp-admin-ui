import { gql } from "@apollo/client";

export const RULE_ENTITIES_QUERY = gql`
  query RuleEntities($tenantId: UUID) {
    ruleEntities(tenantId: $tenantId) {
      id
      tenantId
      code
      displayName
      isActive
      createdAt
    }
  }
`;

export const CREATE_RULE_ENTITY_MUTATION = gql`
  mutation CreateRuleEntity($input: CreateRuleEntityInput!) {
    createRuleEntity(input: $input) {
      id
      tenantId
      code
      displayName
      isActive
      createdAt
    }
  }
`;

export const UPDATE_RULE_ENTITY_MUTATION = gql`
  mutation UpdateRuleEntity($input: UpdateRuleEntityInput!) {
    updateRuleEntity(input: $input) {
      id
      tenantId
      code
      displayName
      isActive
      createdAt
    }
  }
`;

export const DELETE_RULE_ENTITY_MUTATION = gql`
  mutation DeleteRuleEntity($id: UUID!) {
    deleteRuleEntity(id: $id)
  }
`;
