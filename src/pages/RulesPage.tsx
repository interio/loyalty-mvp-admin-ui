import React, { useEffect, useMemo, useState } from "react";
import { useApolloClient, useLazyQuery, useQuery } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { apiBaseUrl } from "../config";
import { useAuth } from "../auth/AuthContext";
import { useTenant } from "../modules/tenants/TenantContext";
import {
  RULE_ATTRIBUTE_OPERATORS_QUERY,
  RULE_ATTRIBUTE_OPTIONS_QUERY,
  RULE_ATTRIBUTES_QUERY,
  RULE_ENTITIES_QUERY,
  RULE_OPERATOR_CATALOG_QUERY,
} from "../modules/entities/queries";
import { RULES_BY_TENANT_PAGE_QUERY } from "../modules/rules/queries";

type RuleType = "sku_quantity" | "spend" | "complex_rule";

type PointsRule = {
  id: string;
  tenantId: string;
  name: string;
  ruleType: string;
  rewardPoints: number;
  createdBy?: string | null;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  conditions?: { key: string; value?: string | null }[];
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
  isQueryable: boolean;
  uiControl: string;
};

type RuleAttributeOperator = {
  id: string;
  attributeId: string;
  operator: string;
};

type RuleAttributeOption = {
  id: string;
  attributeId: string;
  value: string;
  label: string;
};

type RuleOperatorInfo = {
  value: string;
  label: string;
};

type ConditionGroup = {
  id: string;
  type: "group";
  operator: "AND" | "OR";
  children: ConditionNode[];
};

type ConditionRow = {
  id: string;
  type: "condition";
  entityId?: string;
  attributeId?: string;
  operator?: string;
  value?: string;
  values?: string[];
};

type ConditionNode = ConditionGroup | ConditionRow;

type ComplexRuleNodePayload = {
  type: "group" | "condition";
  logic?: "AND" | "OR";
  children?: ComplexRuleNodePayload[];
  entityCode?: string;
  attributeCode?: string;
  operator?: string;
  valueJson?: unknown;
};

type ComplexRuleGroupPayload = {
  logic: "AND" | "OR";
  children: ComplexRuleNodePayload[];
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createCondition = (): ConditionRow => ({ id: makeId(), type: "condition" });
const createGroup = (operator: "AND" | "OR" = "AND"): ConditionGroup => ({
  id: makeId(),
  type: "group",
  operator,
  children: [createCondition()],
});

export const RulesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const apolloClient = useApolloClient();
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<RuleType | "">("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [sku, setSku] = useState("");
  const [quantityStep, setQuantityStep] = useState<number>(0);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [spendStep, setSpendStep] = useState<number>(0);
  const [pointsToGrant, setPointsToGrant] = useState<number>(0);
  const [complexStep, setComplexStep] = useState(0);
  const [conditionTree, setConditionTree] = useState<ConditionGroup>(() => createGroup("AND"));
  const [attributesByEntity, setAttributesByEntity] = useState<Record<string, RuleAttribute[]>>({});
  const [operatorsByAttribute, setOperatorsByAttribute] = useState<Record<string, RuleAttributeOperator[]>>({});
  const [optionsByAttribute, setOptionsByAttribute] = useState<Record<string, RuleAttributeOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, loading: rulesLoading, error: rulesError, refetch } = useQuery(RULES_BY_TENANT_PAGE_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", page, pageSize },
    skip: !selectedTenantId,
  });
  const [loadRules] = useLazyQuery(RULES_BY_TENANT_PAGE_QUERY);
  const rules: PointsRule[] = data?.pointsRulesByTenantPage?.nodes ?? [];
  const pageInfo = data?.pointsRulesByTenantPage?.pageInfo;
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
  const entityById = useMemo(() => {
    const map = new Map<string, RuleEntity>();
    ruleEntities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [ruleEntities]);

  const isComplexRule = ruleType === "complex_rule";
  const complexDetailsValid = ruleName.trim().length > 0 && pointsToGrant > 0;
  const disabled = !selectedTenantId || !ruleName.trim() || !ruleType || loading || (isComplexRule && !complexDetailsValid);
  // Temporary: until real backend auth exists, we pass the email from local dummy auth.
  const createdBy = user?.email?.trim().toLowerCase() ?? "unknown-admin@example.local";

  const refreshRules = (location.state as { refreshRules?: boolean } | null)?.refreshRules === true;
  useEffect(() => {
    if (!refreshRules || !selectedTenantId) return;
    void refetch({ tenantId: selectedTenantId, page, pageSize });
  }, [refreshRules, selectedTenantId, page, pageSize, refetch]);

  const toLocalDateTimeInput = (value: Date) => {
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };

  const toIsoFromInput = (value: string) => (value ? new Date(value).toISOString() : undefined);

  const resetForm = () => {
    setRuleName("");
    setRuleType("");
    setEffectiveFrom(toLocalDateTimeInput(new Date()));
    setEffectiveTo("");
    setSku("");
    setQuantityStep(0);
    setRewardPoints(0);
    setSpendStep(0);
    setPointsToGrant(0);
    setComplexStep(0);
    setConditionTree(createGroup("AND"));
  };

  useEffect(() => {
    setPage(1);
    setAttributesByEntity({});
    setOperatorsByAttribute({});
    setOptionsByAttribute({});
    setConditionTree(createGroup("AND"));
  }, [selectedTenantId]);

  useEffect(() => {
    if (!showForm) return;
    if (!effectiveFrom) {
      setEffectiveFrom(toLocalDateTimeInput(new Date()));
    }
  }, [showForm, effectiveFrom]);

  useEffect(() => {
    if ((pageInfo?.totalPages ?? 0) > 0 && page > (pageInfo?.totalPages ?? 0)) {
      setPage(pageInfo?.totalPages ?? 1);
    }
  }, [pageInfo, page]);

  useEffect(() => {
    if (ruleType === "complex_rule") {
      setComplexStep(0);
    }
  }, [ruleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    setMessage(null);
    setError(null);
    if (ruleType === "complex_rule") {
      const rootGroup = buildComplexPayload();
      if (!rootGroup) return;
      setLoading(true);
      try {
        const payload = {
          tenantId: selectedTenantId,
          name: ruleName.trim(),
          ruleType: "complex_rule",
          createdBy,
          active: false,
          pointsToGrant,
          effectiveFrom: toIsoFromInput(effectiveFrom),
          effectiveTo: toIsoFromInput(effectiveTo),
          rootGroup,
        };

        const res = await fetch(`${apiBaseUrl}/api/v1/rules/points/complex`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || "Failed to save campaign");
        }

        setMessage("Campaign saved.");
        setShowForm(false);
        resetForm();
        setPage(1);
        await loadRules({ variables: { tenantId: selectedTenantId, page: 1, pageSize } });
        refetch({ tenantId: selectedTenantId, page: 1, pageSize });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const conditions =
        ruleType === "sku_quantity"
          ? { sku: sku.trim(), quantityStep: quantityStep || 0 }
          : { spendStep: spendStep || 0 };

      const payload = {
        rules: [
          {
            tenantId: selectedTenantId,
            name: ruleName.trim(),
            ruleType,
            createdBy,
            rewardPoints: rewardPoints || 0,
            active: false,
            conditions,
            effectiveFrom: toIsoFromInput(effectiveFrom),
            effectiveTo: toIsoFromInput(effectiveTo),
          },
        ],
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/rules/points/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to save campaign");
      }
      setMessage("Campaign saved.");
      setShowForm(false);
      resetForm();
      setPage(1);
      await loadRules({ variables: { tenantId: selectedTenantId, page: 1, pageSize } });
      refetch({ tenantId: selectedTenantId, page: 1, pageSize });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const ruleFields = useMemo(() => {
    if (ruleType === "sku_quantity") {
      return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Product SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            fullWidth
            required
            helperText="Choose an SKU from products."
          />
          <TextField
            label="Quantity step (X)"
            type="number"
            value={quantityStep || ""}
            onChange={(e) => setQuantityStep(Number(e.target.value))}
            fullWidth
            required
          />
          <TextField
            label="Reward points (Y)"
            type="number"
            value={rewardPoints || ""}
            onChange={(e) => setRewardPoints(Number(e.target.value))}
            fullWidth
            required
          />
        </Stack>
      );
    }

    if (ruleType === "spend") {
      return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Spend X (currency)"
            type="number"
            value={spendStep || ""}
            onChange={(e) => setSpendStep(Number(e.target.value))}
            fullWidth
            required
          />
          <TextField
            label="Get Y points"
            type="number"
            value={rewardPoints || ""}
            onChange={(e) => setRewardPoints(Number(e.target.value))}
            fullWidth
            required
          />
        </Stack>
      );
    }

    return null;
  }, [ruleType, sku, quantityStep, rewardPoints, spendStep]);

  const tenantName = useMemo(() => tenants.find((t) => t.id === selectedTenantId)?.name, [tenants, selectedTenantId]);
  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");

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

  const loadOperatorsForAttribute = async (attributeId: string) => {
    if (operatorsByAttribute[attributeId]) return;
    const res = await apolloClient.query({
      query: RULE_ATTRIBUTE_OPERATORS_QUERY,
      variables: { attributeId },
      fetchPolicy: "network-only",
    });
    const ops: RuleAttributeOperator[] = res.data?.ruleAttributeOperators ?? [];
    setOperatorsByAttribute((prev) => ({ ...prev, [attributeId]: ops }));
  };

  const loadOptionsForAttribute = async (attributeId: string) => {
    if (optionsByAttribute[attributeId]) return;
    const res = await apolloClient.query({
      query: RULE_ATTRIBUTE_OPTIONS_QUERY,
      variables: { attributeId },
      fetchPolicy: "network-only",
    });
    const opts: RuleAttributeOption[] = res.data?.ruleAttributeOptions ?? [];
    setOptionsByAttribute((prev) => ({ ...prev, [attributeId]: opts }));
  };

  const getAttributesForEntity = (entityId?: string) => {
    if (!entityId) return [];
    const entity = entityById.get(entityId);
    if (!entity) return [];
    return attributesByEntity[entity.code] ?? [];
  };

  const getAttributeById = (entityId: string | undefined, attributeId: string | undefined) => {
    if (!entityId || !attributeId) return undefined;
    return getAttributesForEntity(entityId).find((attr) => attr.id === attributeId);
  };

  const normalizeScalarValue = (raw: string, attribute: RuleAttribute, errors: string[]) => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      errors.push("Value is required for every condition.");
      return null;
    }
    switch (attribute.valueType) {
      case "number": {
        const num = Number(trimmed);
        if (Number.isNaN(num)) {
          errors.push(`"${attribute.displayName}" expects a numeric value.`);
          return null;
        }
        return num;
      }
      case "bool":
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
        errors.push(`"${attribute.displayName}" expects true or false.`);
        return null;
      default:
        return trimmed;
    }
  };

  const buildComplexPayload = (): ComplexRuleGroupPayload | null => {
    const errors: string[] = [];

    const buildNode = (node: ConditionNode): ComplexRuleNodePayload | null => {
      if (node.type === "group") {
        const children = node.children.map(buildNode).filter(Boolean) as ComplexRuleNodePayload[];
        if (children.length === 0) {
          errors.push("Each group must contain at least one condition.");
          return null;
        }
        return {
          type: "group",
          logic: node.operator,
          children,
        };
      }

      if (!node.entityId || !node.attributeId || !node.operator) {
        errors.push("All conditions must include entity, attribute, and operator.");
        return null;
      }

      const entity = entityById.get(node.entityId);
      const attribute = getAttributeById(node.entityId, node.attributeId);
      if (!entity || !attribute) {
        errors.push("Selected entity or attribute is not available.");
        return null;
      }

      const hasValues = (node.values ?? []).length > 0;
      const valueJson = hasValues
        ? (node.values ?? [])
            .map((value) => normalizeScalarValue(String(value), attribute, errors))
            .filter((value) => value !== null)
        : normalizeScalarValue(String(node.value ?? ""), attribute, errors);

      if (valueJson === null || (Array.isArray(valueJson) && valueJson.length === 0)) {
        errors.push("Value is required for every condition.");
        return null;
      }

      return {
        type: "condition",
        entityCode: entity.code,
        attributeCode: attribute.code,
        operator: node.operator,
        valueJson,
      };
    };

    const rootPayload = buildNode(conditionTree);
    if (!rootPayload || rootPayload.type !== "group") {
      errors.push("Root group is missing.");
    }

    if (errors.length > 0) {
      setError(errors[0]);
      return null;
    }

    return {
      logic: conditionTree.operator,
      children: rootPayload.type === "group" ? rootPayload.children ?? [] : [],
    };
  };

  const updateNode = (node: ConditionNode, targetId: string, updater: (node: ConditionNode) => ConditionNode) => {
    if (node.id === targetId) return updater(node);
    if (node.type === "group") {
      return {
        ...node,
        children: node.children.map((child) => updateNode(child, targetId, updater)),
      };
    }
    return node;
  };

  const removeNode = (node: ConditionNode, targetId: string): ConditionNode | null => {
    if (node.id === targetId) return null;
    if (node.type === "group") {
      return {
        ...node,
        children: node.children
          .map((child) => removeNode(child, targetId))
          .filter((child): child is ConditionNode => child !== null),
      };
    }
    return node;
  };

  const addCondition = (groupId: string) => {
    setConditionTree((prev) =>
      updateNode(prev, groupId, (node) =>
        node.type === "group" ? { ...node, children: [...node.children, createCondition()] } : node,
      ) as ConditionGroup,
    );
  };

  const addGroup = (groupId: string, operator: "AND" | "OR") => {
    setConditionTree((prev) =>
      updateNode(prev, groupId, (node) =>
        node.type === "group" ? { ...node, children: [...node.children, createGroup(operator)] } : node,
      ) as ConditionGroup,
    );
  };

  const updateCondition = (conditionId: string, updates: Partial<ConditionRow>) => {
    setConditionTree((prev) =>
      updateNode(prev, conditionId, (node) =>
        node.type === "condition" ? { ...node, ...updates } : node,
      ) as ConditionGroup,
    );
  };

  const updateGroupOperator = (groupId: string, operator: "AND" | "OR") => {
    setConditionTree((prev) =>
      updateNode(prev, groupId, (node) =>
        node.type === "group" ? { ...node, operator } : node,
      ) as ConditionGroup,
    );
  };

  const removeConditionNode = (nodeId: string) => {
    setConditionTree((prev) => (removeNode(prev, nodeId) as ConditionGroup) ?? prev);
  };

  const renderValueInput = (condition: ConditionRow, attribute?: RuleAttribute) => {
    if (!attribute) {
      return <TextField label="Value" value="" disabled fullWidth />;
    }

    const isMulti = attribute.isMultiValue || attribute.uiControl === "multiselect";
    const isEnumLike = attribute.valueType === "enum" || attribute.uiControl === "select" || attribute.uiControl === "multiselect";
    const options = optionsByAttribute[attribute.id] ?? [];
    const operator = condition.operator;

    if (isEnumLike) {
      if (options.length === 0) {
        return (
          <TextField
            label="Value"
            value=""
            disabled
            fullWidth
            helperText="No options configured for this attribute."
          />
        );
      }

      if (isMulti || operator === "in" || operator === "nin") {
        return (
          <FormControl fullWidth>
            <InputLabel id={`value-${condition.id}`}>Values</InputLabel>
            <Select
              labelId={`value-${condition.id}`}
              label="Values"
              multiple
              value={condition.values ?? []}
              onChange={(e) => updateCondition(condition.id, { values: e.target.value as string[] })}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={options.find((o) => o.value === value)?.label ?? value} />
                  ))}
                </Box>
              )}
            >
              {options.map((opt) => (
                <MenuItem key={opt.id} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }

      return (
        <FormControl fullWidth>
          <InputLabel id={`value-${condition.id}`}>Value</InputLabel>
          <Select
            labelId={`value-${condition.id}`}
            label="Value"
            value={condition.value ?? ""}
            onChange={(e) => updateCondition(condition.id, { value: String(e.target.value) })}
          >
            {options.map((opt) => (
              <MenuItem key={opt.id} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (attribute.valueType === "bool") {
      if (isMulti) {
        return (
          <FormControl fullWidth>
            <InputLabel id={`value-${condition.id}`}>Values</InputLabel>
            <Select
              labelId={`value-${condition.id}`}
              label="Values"
              multiple
              value={condition.values ?? []}
              onChange={(e) => updateCondition(condition.id, { values: e.target.value as string[] })}
            >
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
            </Select>
          </FormControl>
        );
      }

      return (
        <FormControl fullWidth>
          <InputLabel id={`value-${condition.id}`}>Value</InputLabel>
          <Select
            labelId={`value-${condition.id}`}
            label="Value"
            value={condition.value ?? ""}
            onChange={(e) => updateCondition(condition.id, { value: String(e.target.value) })}
          >
            <MenuItem value="true">True</MenuItem>
            <MenuItem value="false">False</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (isMulti || operator === "in" || operator === "nin") {
      return (
        <Autocomplete
          multiple
          freeSolo
          options={[] as string[]}
          value={condition.values ?? []}
          onChange={(_, newValue) => updateCondition(condition.id, { values: newValue as string[] })}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Values"
              type={attribute.valueType === "number" ? "number" : "text"}
            />
          )}
        />
      );
    }

    return (
      <TextField
        label="Value"
        type={attribute.valueType === "number" ? "number" : "text"}
        value={condition.value ?? ""}
        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        fullWidth
      />
    );
  };

  const renderConditionRow = (condition: ConditionRow, depth: number) => {
    const attributes = getAttributesForEntity(condition.entityId);
    const attribute = getAttributeById(condition.entityId, condition.attributeId);
    const operatorOptions = condition.attributeId
      ? operatorsByAttribute[condition.attributeId] ?? []
      : [];

    return (
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { md: "center" }, pl: depth * 2, width: "100%" }}
      >
        <FormControl fullWidth sx={{ flex: { xs: "1 1 100%", md: "1 1 0" }, minWidth: 180 }}>
          <InputLabel id={`entity-${condition.id}`}>Entity</InputLabel>
          <Select
            labelId={`entity-${condition.id}`}
            label="Entity"
            value={condition.entityId ?? ""}
            onChange={(e) => {
              const entityId = String(e.target.value);
              const entity = entityById.get(entityId);
              updateCondition(condition.id, {
                entityId,
                attributeId: undefined,
                operator: undefined,
                value: "",
                values: [],
              });
              if (entity?.code) {
                void loadAttributesForEntity(entity.code);
              }
            }}
          >
            {ruleEntities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id}>
                {entity.displayName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          fullWidth
          disabled={!condition.entityId}
          sx={{ flex: { xs: "1 1 100%", md: "1 1 0" }, minWidth: 180 }}
        >
          <InputLabel id={`attribute-${condition.id}`}>Attribute</InputLabel>
          <Select
            labelId={`attribute-${condition.id}`}
            label="Attribute"
            value={condition.attributeId ?? ""}
            onChange={(e) => {
              const attributeId = String(e.target.value);
              updateCondition(condition.id, {
                attributeId,
                operator: undefined,
                value: "",
                values: [],
              });
              if (attributeId) {
                void loadOperatorsForAttribute(attributeId);
                void loadOptionsForAttribute(attributeId);
              }
            }}
          >
            {attributes.length === 0 && condition.entityId && (
              <MenuItem value="" disabled>
                No attributes available
              </MenuItem>
            )}
            {attributes.map((attr) => (
              <MenuItem key={attr.id} value={attr.id}>
                {attr.displayName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          fullWidth
          disabled={!condition.attributeId}
          sx={{ flex: { xs: "1 1 100%", md: "1 1 0" }, minWidth: 180 }}
        >
          <InputLabel id={`operator-${condition.id}`}>Operator</InputLabel>
          <Select
            labelId={`operator-${condition.id}`}
            label="Operator"
            value={condition.operator ?? ""}
            onChange={(e) => updateCondition(condition.id, { operator: String(e.target.value) })}
          >
            {operatorOptions.length === 0 && condition.attributeId && (
              <MenuItem value="" disabled>
                No operators available
              </MenuItem>
            )}
            {operatorOptions.map((op) => (
              <MenuItem key={op.id} value={op.operator}>
                {operatorLabelByValue.get(op.operator) ?? op.operator}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: { xs: "1 1 100%", md: "1.5 1 0" }, minWidth: 220 }}>
          {renderValueInput(condition, attribute)}
        </Box>

        <Button
          color="error"
          variant="text"
          onClick={() => removeConditionNode(condition.id)}
          sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
        >
          Remove
        </Button>
      </Stack>
    );
  };

  const renderGroup = (group: ConditionGroup, depth = 0, isRoot = false) => (
    <Box
      key={group.id}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        mt: 1,
        backgroundColor: depth === 0 ? "#FFFFFF" : "#F5F6F4",
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id={`group-${group.id}`}>Group logic</InputLabel>
          <Select
            labelId={`group-${group.id}`}
            label="Group logic"
            value={group.operator}
            onChange={(e) => updateGroupOperator(group.id, e.target.value as "AND" | "OR")}
          >
            <MenuItem value="AND">ALL (AND)</MenuItem>
            <MenuItem value="OR">ANY (OR)</MenuItem>
          </Select>
          <FormHelperText>
            {group.operator === "AND"
              ? "If all of these conditions are true."
              : "If any of these conditions are true."}
          </FormHelperText>
        </FormControl>
        {!isRoot && (
          <Button color="error" variant="text" onClick={() => removeConditionNode(group.id)}>
            Remove group
          </Button>
        )}
      </Stack>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {group.children.map((child) =>
          child.type === "group" ? renderGroup(child, depth + 1) : renderConditionRow(child, depth + 1),
        )}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => addCondition(group.id)}>
          Add condition
        </Button>
        <Button variant="outlined" onClick={() => addGroup(group.id, "AND")}>
          Add ALL group
        </Button>
        <Button variant="outlined" onClick={() => addGroup(group.id, "OR")}>
          Add ANY group
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 4px 14px rgba(195,195,195,0.28)" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <Box>
            <Typography variant="h5">Campaigns</Typography>
            <Typography variant="body2" color="text.secondary">
              {tenantName
                ? `Campaigns for ${tenantName}`
                : tenantsLoading
                  ? "Loading tenants..."
                  : "Select a tenant to view campaigns."}
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setShowForm((v) => !v)} disabled={!selectedTenantId}>
            {showForm ? "Close form" : "Create campaign"}
          </Button>
        </Stack>

        {showForm && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ mt: 2, mb: 3, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Campaign name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              fullWidth
              required
              helperText="Give the campaign a descriptive name."
            />
            <FormControl fullWidth required>
              <InputLabel id="rule-type-label">Campaign type</InputLabel>
              <Select
                labelId="rule-type-label"
                value={ruleType}
                label="Campaign type"
                onChange={(e) => setRuleType(e.target.value as RuleType)}
              >
                <MenuItem value="spend">Spend X get Y points</MenuItem>
                <MenuItem value="sku_quantity">SKU quantity campaign</MenuItem>
                <MenuItem value="complex_rule">Complex campaign</MenuItem>
              </Select>
            </FormControl>

            {ruleFields}

            {!isComplexRule && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Effective from"
                    type="datetime-local"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Effective to"
                    type="datetime-local"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </>
            )}

            {isComplexRule && (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Stepper activeStep={complexStep} sx={{ mb: 2 }}>
                  <Step>
                    <StepLabel>Campaign details</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Conditions builder</StepLabel>
                  </Step>
                </Stepper>

                {complexStep === 0 && (
                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        label="Effective from"
                        type="datetime-local"
                        value={effectiveFrom}
                        onChange={(e) => setEffectiveFrom(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Effective to"
                        type="datetime-local"
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    </Stack>
                    <TextField
                      label="Points to grant"
                      type="number"
                      value={pointsToGrant || ""}
                      onChange={(e) => setPointsToGrant(Number(e.target.value))}
                      fullWidth
                      inputProps={{ min: 0 }}
                    />
                  </Stack>
                )}

                {complexStep === 1 && (
                  <Stack spacing={2}>
                    {selectedTenantId ? (
                      ruleEntities.length === 0 ? (
                        <Alert severity="info">No entities available yet. Create entities and attributes first.</Alert>
                      ) : (
                        <Box>{renderGroup(conditionTree, 0, true)}</Box>
                      )
                    ) : (
                      <Alert severity="info">Select a tenant to build conditions.</Alert>
                    )}
                  </Stack>
                )}

                <Divider sx={{ my: 2 }} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  {complexStep > 0 && (
                    <Button variant="outlined" onClick={() => setComplexStep(0)}>
                      Back
                    </Button>
                  )}
                  {complexStep === 0 && (
                    <Button
                      variant="contained"
                      onClick={() => setComplexStep(1)}
                      disabled={!complexDetailsValid}
                    >
                      Next
                    </Button>
                  )}
                  {complexStep === 1 && (
                    <Button type="submit" variant="contained" disabled={disabled}>
                      {loading ? "Saving..." : "Save campaign"}
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}

            {!isComplexRule && (
              <Box>
                <Button type="submit" variant="contained" disabled={disabled}>
                  {loading ? "Saving..." : "Save campaign"}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {selectedTenantId && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            Total campaigns: {pageInfo?.totalCount ?? 0}
          </Typography>
        )}
        {rulesError && <Alert severity="error">{rulesError.message}</Alert>}
        {rulesLoading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Reward Points</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Effective To</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow
                  key={rule.id}
                  hover
                  onClick={() => navigate(`/rules/${rule.id}`)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {rule.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{rule.ruleType}</TableCell>
                  <TableCell>{rule.rewardPoints}</TableCell>
                  <TableCell>{rule.active ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                  <TableCell>{formatDate(rule.effectiveTo)}</TableCell>
                </TableRow>
              ))}
              {selectedTenantId && !rulesLoading && rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No campaigns found for this tenant.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {(pageInfo?.totalPages ?? 0) > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={pageInfo?.totalPages ?? 0}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
     </CardContent>
   </Card>
  );
};
