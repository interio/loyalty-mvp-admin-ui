import { gql } from "@apollo/client";

export const TENANT_CONFIG_VALUE_QUERY = gql`
  query TenantConfigValue($tenantId: UUID!, $configName: String!) {
    tenantConfigValue(tenantId: $tenantId, configName: $configName)
  }
`;

export const SET_TENANT_CONFIG_VALUE_MUTATION = gql`
  mutation SetTenantConfigValue($input: SetTenantConfigValueInput!) {
    setTenantConfigValue(input: $input)
  }
`;
