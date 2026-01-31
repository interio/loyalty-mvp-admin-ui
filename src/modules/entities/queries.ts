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

export const RULE_ATTRIBUTES_QUERY = gql`
  query RuleAttributes($entityCode: String!, $tenantId: UUID) {
    ruleAttributes(entityCode: $entityCode, tenantId: $tenantId) {
      id
      entityId
      code
      displayName
      valueType
      isMultiValue
      isQueryable
      uiControl
      createdAt
    }
  }
`;

export const RULE_ATTRIBUTE_OPERATORS_QUERY = gql`
  query RuleAttributeOperators($attributeId: UUID!) {
    ruleAttributeOperators(attributeId: $attributeId) {
      id
      attributeId
      operator
    }
  }
`;

export const CREATE_RULE_ATTRIBUTE_MUTATION = gql`
  mutation CreateRuleAttribute($input: CreateRuleAttributeInput!) {
    createRuleAttribute(input: $input) {
      id
      entityId
      code
      displayName
      valueType
      isMultiValue
      isQueryable
      uiControl
      createdAt
    }
  }
`;

export const UPDATE_RULE_ATTRIBUTE_MUTATION = gql`
  mutation UpdateRuleAttribute($input: UpdateRuleAttributeInput!) {
    updateRuleAttribute(input: $input) {
      id
      entityId
      code
      displayName
      valueType
      isMultiValue
      isQueryable
      uiControl
      createdAt
    }
  }
`;

export const DELETE_RULE_ATTRIBUTE_MUTATION = gql`
  mutation DeleteRuleAttribute($id: UUID!) {
    deleteRuleAttribute(id: $id)
  }
`;

export const SET_RULE_ATTRIBUTE_OPERATORS_MUTATION = gql`
  mutation SetRuleAttributeOperators($input: SetRuleAttributeOperatorsInput!) {
    setRuleAttributeOperators(input: $input) {
      id
      attributeId
      operator
    }
  }
`;

export const RULE_OPERATOR_CATALOG_QUERY = gql`
  query RuleOperatorCatalog {
    ruleOperatorCatalog {
      value
      label
    }
  }
`;
