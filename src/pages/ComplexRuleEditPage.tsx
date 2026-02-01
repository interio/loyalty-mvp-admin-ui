import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApolloClient, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { DetailSection } from "../components/DetailSection";
import { useTenant } from "../modules/tenants/TenantContext";
import {
  RULE_ATTRIBUTES_QUERY,
  RULE_ENTITIES_QUERY,
  RULE_OPERATOR_CATALOG_QUERY,
} from "../modules/entities/queries";
import { RULES_BY_TENANT_QUERY, RULE_CONDITION_TREE_FLAT_QUERY } from "../modules/rules/queries";

type PointsRule = {
  id: string;
  tenantId: string;
  name: string;
  ruleType: string;
  ruleVersion: number;
  active: boolean;
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
};

type RuleEntity = {
  id: string;
  code: string;
  displayName: string;
};

type RuleAttribute = {
  id: string;
  entityId: string;
  code: string;
  displayName: string;
  valueType: string;
  isMultiValue: boolean;
  uiControl: string;
};

type RuleOperatorInfo = {
  value: string;
  label: string;
};

type RuleConditionTreeGroupFlat = {
  id: string;
  parentGroupId?: string | null;
  logic: "AND" | "OR";
  sortOrder: number;
};

type RuleConditionTreeConditionFlat = {
  id: string;
  groupId: string;
  entityCode: string;
  attributeCode: string;
  operator: string;
  valueJson: string;
  sortOrder: number;
};

type RuleConditionTreeFlat = {
  rootGroupId: string;
  groups: RuleConditionTreeGroupFlat[];
  conditions: RuleConditionTreeConditionFlat[];
};

type RuleConditionTreeCondition = {
  id: string;
  entityCode: string;
  attributeCode: string;
  operator: string;
  valueJson: string;
  sortOrder: number;
};

type RuleConditionTreeGroup = {
  id: string;
  logic: "AND" | "OR";
  children: RuleConditionTreeNode[];
};

type RuleConditionTreeNode = {
  type: "group" | "condition";
  sortOrder: number;
  condition?: RuleConditionTreeCondition | null;
  group?: RuleConditionTreeGroup | null;
};

export const ComplexRuleEditPage: React.FC = () => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [attributesByEntity, setAttributesByEntity] = useState<Record<string, RuleAttribute[]>>({});

  const { data: rulesData, loading: rulesLoading, error: rulesError } = useQuery(RULES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });
  const rules: PointsRule[] = rulesData?.pointsRulesByTenant ?? [];
  const rule = useMemo(() => rules.find((item) => item.id === ruleId), [rules, ruleId]);

  const { data: flatData, loading: flatLoading, error: flatError } = useQuery(RULE_CONDITION_TREE_FLAT_QUERY, {
    variables: { ruleId: ruleId ?? "", tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId || !ruleId,
    fetchPolicy: "network-only",
  });
  const flatTree: RuleConditionTreeFlat | null = flatData?.ruleConditionTreeFlat ?? null;

  const { data: ruleEntityData } = useQuery(RULE_ENTITIES_QUERY, {
    variables: { tenantId: selectedTenantId ?? null },
    skip: !selectedTenantId,
  });
  const ruleEntities: RuleEntity[] = ruleEntityData?.ruleEntities ?? [];

  const { data: operatorCatalogData } = useQuery(RULE_OPERATOR_CATALOG_QUERY);
  const operatorCatalog: RuleOperatorInfo[] = operatorCatalogData?.ruleOperatorCatalog ?? [];
  const operatorLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    operatorCatalog.forEach((op) => map.set(op.value, op.label));
    return map;
  }, [operatorCatalog]);

  const entityByCode = useMemo(() => {
    const map = new Map<string, RuleEntity>();
    ruleEntities.forEach((entity) => map.set(entity.code, entity));
    return map;
  }, [ruleEntities]);

  const loadAttributesForEntity = async (entityCode: string) => {
    if (!selectedTenantId) return;
    if (attributesByEntity[entityCode]) return;
    const res = await apolloClient.query({
      query: RULE_ATTRIBUTES_QUERY,
      variables: { entityCode, tenantId: selectedTenantId ?? null },
      fetchPolicy: "network-only",
    });
    const attrs: RuleAttribute[] = res.data?.ruleAttributes ?? [];
    setAttributesByEntity((prev) => ({ ...prev, [entityCode]: attrs }));
  };

  useEffect(() => {
    if (!flatTree) return;
    const entityCodes = new Set<string>();
    flatTree.conditions.forEach((condition) => {
      if (condition.entityCode !== "rule") {
        entityCodes.add(condition.entityCode);
      }
    });
    entityCodes.forEach((code) => {
      void loadAttributesForEntity(code);
    });
  }, [flatTree]);

  const getEntityLabel = (entityCode: string) => {
    if (entityCode === "rule") return "Rule";
    return entityByCode.get(entityCode)?.displayName ?? entityCode;
  };

  const getAttributeLabel = (entityCode: string, attributeCode: string) => {
    if (entityCode === "rule" && attributeCode === "rewardPoints") return "Points to grant";
    const attrs = attributesByEntity[entityCode] ?? [];
    return attrs.find((attr) => attr.code === attributeCode)?.displayName ?? attributeCode;
  };

  const formatValueJson = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.join(", ");
      if (parsed === null || parsed === undefined) return "—";
      if (typeof parsed === "object") return JSON.stringify(parsed);
      return String(parsed);
    } catch {
      return raw;
    }
  };

  const buildTreeFromFlat = (flat: RuleConditionTreeFlat | null) => {
    if (!flat) return null;
    const groupById = new Map<string, RuleConditionTreeGroup>();
    flat.groups.forEach((group) => {
      groupById.set(group.id, { id: group.id, logic: group.logic, children: [] });
    });

    const nodesByGroup = new Map<string, RuleConditionTreeNode[]>();
    const pushNode = (groupId: string, node: RuleConditionTreeNode) => {
      const existing = nodesByGroup.get(groupId) ?? [];
      existing.push(node);
      nodesByGroup.set(groupId, existing);
    };

    flat.groups.forEach((group) => {
      if (!group.parentGroupId) return;
      const childGroup = groupById.get(group.id);
      if (!childGroup) return;
      pushNode(group.parentGroupId, {
        type: "group",
        sortOrder: group.sortOrder,
        group: childGroup,
      });
    });

    flat.conditions.forEach((condition) => {
      pushNode(condition.groupId, {
        type: "condition",
        sortOrder: condition.sortOrder,
        condition: {
          id: condition.id,
          entityCode: condition.entityCode,
          attributeCode: condition.attributeCode,
          operator: condition.operator,
          valueJson: condition.valueJson,
          sortOrder: condition.sortOrder,
        },
      });
    });

    groupById.forEach((group, groupId) => {
      const nodes = nodesByGroup.get(groupId) ?? [];
      group.children = nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    return groupById.get(flat.rootGroupId) ?? null;
  };

  const tree = useMemo(() => buildTreeFromFlat(flatTree), [flatTree]);
  const pointsToGrant = useMemo(() => {
    if (!flatTree) return "—";
    const reward = flatTree.conditions.find(
      (condition) => condition.entityCode === "rule" && condition.attributeCode === "rewardPoints",
    );
    return reward ? formatValueJson(reward.valueJson) : "—";
  }, [flatTree]);

  const renderConditionTree = (group: RuleConditionTreeGroup, depth = 0) => (
    <Box
      key={group.id}
      sx={{
        border: "1px solid #e0e7e2",
        borderRadius: 2,
        p: 2,
        mt: 1,
        backgroundColor: depth === 0 ? "#fff" : "#f7faf8",
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Chip label={group.logic === "AND" ? "ALL" : "ANY"} size="small" />
        <Typography variant="body2" color="text.secondary">
          {group.logic === "AND" ? "If all of these conditions are true." : "If any of these conditions are true."}
        </Typography>
      </Stack>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {group.children.map((node, index) => {
          if (node.type === "group" && node.group) {
            return renderConditionTree(node.group, depth + 1);
          }
          if (node.type === "condition" && node.condition) {
            const condition = node.condition;
            const operatorLabel = operatorLabelByValue.get(condition.operator) ?? condition.operator;
            return (
              <Stack
                key={`${condition.id}-${index}`}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ pl: depth * 1.5 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {getEntityLabel(condition.entityCode)}.{getAttributeLabel(condition.entityCode, condition.attributeCode)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {operatorLabel}
                </Typography>
                <Typography variant="body2">{formatValueJson(condition.valueJson)}</Typography>
              </Stack>
            );
          }
          return null;
        })}
      </Stack>
    </Box>
  );

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");
  const tenantName = useMemo(() => tenants.find((t) => t.id === selectedTenantId)?.name, [tenants, selectedTenantId]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Complex Rule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review the stored condition tree for this rule.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate("/rules")}>
          Back to rules
        </Button>
      </Stack>

      {!selectedTenantId && !tenantsLoading && (
        <Alert severity="info">Select a tenant to view complex rules.</Alert>
      )}

      {rulesError && <Alert severity="error">{rulesError.message}</Alert>}
      {flatError && <Alert severity="error">{flatError.message}</Alert>}

      {(rulesLoading || flatLoading || tenantsLoading) && <LinearProgress />}

      {selectedTenantId && tenantName && (
        <Typography variant="body2" color="text.secondary">
          Tenant: {tenantName}
        </Typography>
      )}

      {selectedTenantId && !rulesLoading && !rule && (
        <Alert severity="warning">Rule not found for this tenant.</Alert>
      )}

      {rule && rule.ruleType !== "complex_rule" && (
        <Alert severity="warning">This rule is not a complex rule.</Alert>
      )}

      {rule && rule.ruleType === "complex_rule" && (
        <>
          <DetailSection title="Rule details">
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Rule ID: {rule.id}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Name: {rule.name}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Active: {rule.active ? "Yes" : "No"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Priority: {rule.priority}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Effective from: {formatDate(rule.effectiveFrom)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Effective to: {formatDate(rule.effectiveTo)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Points to grant: {pointsToGrant}
              </Typography>
            </Stack>
          </DetailSection>

          <DetailSection title="Condition tree" sx={{ mt: 2 }}>
            {flatLoading && <LinearProgress />}
            {!flatLoading && !tree && <Alert severity="info">No condition tree found for this rule.</Alert>}
            {!flatLoading && tree && renderConditionTree(tree)}
          </DetailSection>
        </>
      )}
    </Box>
  );
};
