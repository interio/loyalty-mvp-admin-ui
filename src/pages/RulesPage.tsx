import React, { useEffect, useMemo, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
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
import { ProductPickerDrawer } from "../components/ProductPickerDrawer";
import { TENANT_CONFIG_VALUE_QUERY } from "../modules/config/queries";
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
type ComplexAwardMode = "static" | "per_currency";

type PointsRule = {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
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
type TenantConfigValueResult = {
  tenantConfigValue?: string | null;
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createCondition = (): ConditionRow => ({ id: makeId(), type: "condition" });
const createGroup = (operator: "AND" | "OR" = "AND"): ConditionGroup => ({
  id: makeId(),
  type: "group",
  operator,
  children: [createCondition()],
});
const sanitizeSkuValues = (values: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  values.forEach((raw) => {
    raw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .forEach((value) => {
        const key = value.toUpperCase();
        if (seen.has(key)) return;
        seen.add(key);
        normalized.push(value);
      });
  });
  return normalized;
};
const mergeSkuValues = (values: string[], pendingInput: string) => sanitizeSkuValues([...values, pendingInput]);

export const RulesPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isCreatePage = location.pathname === "/rules/new";
  const { user } = useAuth();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const apolloClient = useApolloClient();
  const [ruleName, setRuleName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [ruleType, setRuleType] = useState<RuleType | "">("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [skus, setSkus] = useState<string[]>([]);
  const [skuInputValue, setSkuInputValue] = useState("");
  const [quantityStep, setQuantityStep] = useState<number>(0);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [spendStep, setSpendStep] = useState<number>(0);
  const [pointsToGrant, setPointsToGrant] = useState<number>(0);
  const [complexAwardMode, setComplexAwardMode] = useState<ComplexAwardMode>("static");
  const [complexAwardPoints, setComplexAwardPoints] = useState<number>(1);
  const [complexAwardCurrencyAmount, setComplexAwardCurrencyAmount] = useState<number>(1);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [complexProductPickerConditionId, setComplexProductPickerConditionId] = useState<string | null>(null);
  const [conditionTree, setConditionTree] = useState<ConditionGroup>(() => createGroup("AND"));
  const [attributesByEntity, setAttributesByEntity] = useState<Record<string, RuleAttribute[]>>({});
  const [operatorsByAttribute, setOperatorsByAttribute] = useState<Record<string, RuleAttributeOperator[]>>({});
  const [optionsByAttribute, setOptionsByAttribute] = useState<Record<string, RuleAttributeOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, loading: rulesLoading, error: rulesError, refetch } = useQuery(RULES_BY_TENANT_PAGE_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", page, pageSize },
    skip: !selectedTenantId || isCreatePage,
  });
  const rules: PointsRule[] = data?.pointsRulesByTenantPage?.nodes ?? [];
  const pageInfo = data?.pointsRulesByTenantPage?.pageInfo;
  const { data: ruleEntityData } = useQuery(RULE_ENTITIES_QUERY, {
    variables: { tenantId: selectedTenantId ?? null },
    skip: !selectedTenantId,
  });
  const { data: tenantCurrencyData } = useQuery<TenantConfigValueResult>(TENANT_CONFIG_VALUE_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", configName: "currency" },
    skip: !selectedTenantId,
  });
  const ruleEntities: RuleEntity[] = ruleEntityData?.ruleEntities ?? [];
  const tenantCurrencyCode = (tenantCurrencyData?.tenantConfigValue ?? "").trim().toUpperCase();
  const currencyLabel = tenantCurrencyCode || "local currency";
  const currencyAmountFieldLabel = tenantCurrencyCode ? `${tenantCurrencyCode} amount` : "Local currency amount";
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
  const isStaticComplexAward = complexAwardMode === "static";
  const complexStaticAwardValid = pointsToGrant > 0;
  const complexPerCurrencyAwardValid = complexAwardPoints > 0 && complexAwardCurrencyAmount > 0;
  const complexAwardConfigValid = isStaticComplexAward ? complexStaticAwardValid : complexPerCurrencyAwardValid;
  const isSkuQuantityRule = ruleType === "sku_quantity";
  const isSpendRule = ruleType === "spend";
  const effectiveSkus = useMemo(() => mergeSkuValues(skus, skuInputValue), [skus, skuInputValue]);
  const complexDetailsValid = ruleName.trim().length > 0 && complexAwardConfigValid;
  const simpleRuleValid = isSkuQuantityRule
    ? effectiveSkus.length > 0 && quantityStep > 0 && rewardPoints > 0
    : isSpendRule
      ? spendStep > 0 && rewardPoints > 0
      : true;
  const disabled =
    !selectedTenantId ||
    !ruleName.trim() ||
    !ruleType ||
    loading ||
    (isComplexRule && !complexDetailsValid) ||
    (!isComplexRule && !simpleRuleValid);
  const validationHint = useMemo(() => {
    if (loading) return null;
    if (!selectedTenantId) return "Select a tenant first.";
    if (!ruleName.trim()) return "Campaign name is required.";
    if (!ruleType) return "Select a campaign type.";
    if (isComplexRule && !complexDetailsValid) {
      if (!complexAwardConfigValid) {
        return isStaticComplexAward
          ? "Points to grant must be greater than 0 for complex campaign."
          : "Both fields in the per-currency points setup must be greater than 0.";
      }
    }
    if (!isComplexRule && !simpleRuleValid) {
      if (isSkuQuantityRule) {
        if (effectiveSkus.length === 0) return "Add at least one SKU (press Enter or click outside the field to apply input).";
        if (quantityStep <= 0) return "Quantity step must be greater than 0.";
        if (rewardPoints <= 0) return "Reward points must be greater than 0.";
      }
      if (isSpendRule) {
        if (spendStep <= 0) return "Spend step must be greater than 0.";
        if (rewardPoints <= 0) return "Reward points must be greater than 0.";
      }
    }

    return null;
  }, [
    loading,
    selectedTenantId,
    ruleName,
    ruleType,
    isComplexRule,
    complexDetailsValid,
    complexAwardConfigValid,
    isStaticComplexAward,
    simpleRuleValid,
    isSkuQuantityRule,
    effectiveSkus.length,
    quantityStep,
    rewardPoints,
    isSpendRule,
    spendStep,
  ]);
  // Temporary: until real backend auth exists, we pass the email from local dummy auth.
  const createdBy = user?.email?.trim().toLowerCase() ?? "unknown-admin@example.local";

  const refreshRules = (location.state as { refreshRules?: boolean } | null)?.refreshRules === true;
  useEffect(() => {
    if (isCreatePage || !refreshRules || !selectedTenantId) return;
    void refetch({ tenantId: selectedTenantId, page, pageSize });
  }, [isCreatePage, refreshRules, selectedTenantId, page, pageSize, refetch]);

  const toLocalDateTimeInput = (value: Date) => {
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };

  const toIsoFromInput = (value: string) => (value ? new Date(value).toISOString() : undefined);

  const resetForm = () => {
    setRuleName("");
    setShortDescription("");
    setRuleType("");
    setEffectiveFrom(toLocalDateTimeInput(new Date()));
    setEffectiveTo("");
    setSkus([]);
    setSkuInputValue("");
    setQuantityStep(0);
    setRewardPoints(0);
    setSpendStep(0);
    setPointsToGrant(0);
    setComplexAwardMode("static");
    setComplexAwardPoints(1);
    setComplexAwardCurrencyAmount(1);
    setProductPickerOpen(false);
    setComplexProductPickerConditionId(null);
    setConditionTree(createGroup("AND"));
  };

  useEffect(() => {
    setPage(1);
    setAttributesByEntity({});
    setOperatorsByAttribute({});
    setOptionsByAttribute({});
    setProductPickerOpen(false);
    setComplexProductPickerConditionId(null);
    setConditionTree(createGroup("AND"));
  }, [selectedTenantId]);

  useEffect(() => {
    if (!isCreatePage) return;
    if (!effectiveFrom) {
      setEffectiveFrom(toLocalDateTimeInput(new Date()));
    }
  }, [isCreatePage, effectiveFrom]);

  useEffect(() => {
    if ((pageInfo?.totalPages ?? 0) > 0 && page > (pageInfo?.totalPages ?? 0)) {
      setPage(pageInfo?.totalPages ?? 1);
    }
  }, [pageInfo, page]);

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
          description: shortDescription.trim() || null,
          ruleType: "complex_rule",
          createdBy,
          active: false,
          awardMode: complexAwardMode,
          pointsToGrant: isStaticComplexAward ? pointsToGrant : 0,
          pointsPerCurrencyPoints: isStaticComplexAward ? null : complexAwardPoints,
          pointsPerCurrencyAmount: isStaticComplexAward ? null : complexAwardCurrencyAmount,
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
        resetForm();
        navigate("/rules", { state: { refreshRules: true } });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const submittedSkus = mergeSkuValues(skus, skuInputValue);
      setSkus(submittedSkus);
      setSkuInputValue("");
      const conditions =
        ruleType === "sku_quantity"
          ? { skus: submittedSkus, quantityStep: quantityStep || 0 }
          : { spendStep: spendStep || 0 };

      const payload = {
        rules: [
          {
            tenantId: selectedTenantId,
            name: ruleName.trim(),
            description: shortDescription.trim() || null,
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
      resetForm();
      navigate("/rules", { state: { refreshRules: true } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const ruleFields = useMemo(() => {
    if (ruleType === "sku_quantity") {
      return (
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => setProductPickerOpen(true)}
              disabled={!selectedTenantId}
            >
              Open product picker
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Selected products: {skus.length}
            </Typography>
          </Stack>
          <Autocomplete
            multiple
            freeSolo
            options={[] as string[]}
            value={skus}
            inputValue={skuInputValue}
            onInputChange={(_, newInputValue) => setSkuInputValue(newInputValue)}
            onBlur={() => {
              const merged = mergeSkuValues(skus, skuInputValue);
              if (merged.length !== skus.length || skuInputValue.trim().length > 0) {
                setSkus(merged);
              }
              if (skuInputValue) {
                setSkuInputValue("");
              }
            }}
            onChange={(_, newValue) => setSkus(sanitizeSkuValues((newValue as string[]).map((value) => String(value))))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Product SKUs"
                helperText="Add one or more SKUs. Use the product picker or enter/paste comma-separated SKUs manually."
              />
            )}
            fullWidth
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
  }, [ruleType, skus, skuInputValue, quantityStep, rewardPoints, spendStep, selectedTenantId]);

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

  const usesMultiValueInput = (condition: ConditionRow, attribute: RuleAttribute) =>
    attribute.isMultiValue || attribute.uiControl === "multiselect" || condition.operator === "in" || condition.operator === "nin";

  const isProductPickerAttribute = (attribute: RuleAttribute) => {
    const normalizedUiControl = attribute.uiControl.trim().toLowerCase().replace(/[\s-]/g, "_");
    return normalizedUiControl === "product_picker" || normalizedUiControl === "productpicker";
  };

  const getConditionSkuValues = (condition: ConditionRow, attribute: RuleAttribute) => {
    if (usesMultiValueInput(condition, attribute)) {
      return sanitizeSkuValues(condition.values ?? []);
    }
    return sanitizeSkuValues(condition.value ? [condition.value] : []);
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

  const findConditionById = (node: ConditionNode, targetId: string): ConditionRow | null => {
    if (node.type === "condition") return node.id === targetId ? node : null;
    for (const child of node.children) {
      const found = findConditionById(child, targetId);
      if (found) return found;
    }
    return null;
  };

  const renderValueInput = (condition: ConditionRow, attribute?: RuleAttribute) => {
    if (!attribute) {
      return <TextField label="Value" value="" disabled fullWidth />;
    }

    const isMulti = attribute.isMultiValue || attribute.uiControl === "multiselect";
    const isEnumLike = attribute.valueType === "enum" || attribute.uiControl === "select" || attribute.uiControl === "multiselect";
    const options = optionsByAttribute[attribute.id] ?? [];
    const operator = condition.operator;

    if (isProductPickerAttribute(attribute)) {
      const selectedCount = getConditionSkuValues(condition, attribute).length;
      if (usesMultiValueInput(condition, attribute)) {
        return (
          <Stack spacing={1}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SearchIcon />}
                onClick={() => setComplexProductPickerConditionId(condition.id)}
                disabled={!selectedTenantId}
              >
                Open product picker
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Selected products: {selectedCount}
              </Typography>
            </Stack>
            <Autocomplete
              multiple
              freeSolo
              options={[] as string[]}
              value={condition.values ?? []}
              onChange={(_, newValue) =>
                updateCondition(condition.id, {
                  values: sanitizeSkuValues((newValue as string[]).map((value) => String(value))),
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="SKUs"
                  helperText="Choose products from picker or enter/paste SKU values manually."
                />
              )}
            />
          </Stack>
        );
      }

      return (
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchIcon />}
              onClick={() => setComplexProductPickerConditionId(condition.id)}
              disabled={!selectedTenantId}
            >
              Open product picker
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Selected products: {selectedCount}
            </Typography>
          </Stack>
          <TextField
            label="SKU"
            value={condition.value ?? ""}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            fullWidth
            helperText="Choose a product from picker or enter SKU manually."
          />
        </Stack>
      );
    }

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

  const complexPickerCondition = complexProductPickerConditionId
    ? findConditionById(conditionTree, complexProductPickerConditionId)
    : null;
  const complexPickerAttribute = complexPickerCondition
    ? getAttributeById(complexPickerCondition.entityId, complexPickerCondition.attributeId)
    : undefined;
  const canOpenComplexProductPicker = Boolean(
    complexPickerCondition &&
      complexPickerAttribute &&
      isProductPickerAttribute(complexPickerAttribute),
  );
  const complexPickerSelectedSkus =
    complexPickerCondition && complexPickerAttribute && canOpenComplexProductPicker
      ? getConditionSkuValues(complexPickerCondition, complexPickerAttribute)
      : [];

  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 4px 14px rgba(195,195,195,0.28)" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <Box>
            <Typography variant="h5">{isCreatePage ? "Create Campaign" : "Campaigns"}</Typography>
            <Typography variant="body2" color="text.secondary">
              {isCreatePage
                ? tenantName
                  ? `Create a campaign for ${tenantName}`
                  : tenantsLoading
                    ? "Loading tenants..."
                    : "Select a tenant to create a campaign."
                : tenantName
                  ? `Campaigns for ${tenantName}`
                  : tenantsLoading
                    ? "Loading tenants..."
                    : "Select a tenant to view campaigns."}
            </Typography>
          </Box>
          {isCreatePage ? (
            <Button variant="outlined" onClick={() => navigate("/rules")}>
              Back to campaigns
            </Button>
          ) : (
            <Button variant="contained" onClick={() => navigate("/rules/new")} disabled={!selectedTenantId}>
              Create campaign
            </Button>
          )}
        </Stack>

        {isCreatePage && (
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
            <TextField
              label="Campaign short description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText="Short summary shown in campaign views."
            />
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                Campaign schedule
              </Typography>
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
            </Box>
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

            {isComplexRule && (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                  Points award
                </Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="complex-award-mode-label">Award mode</InputLabel>
                    <Select
                      labelId="complex-award-mode-label"
                      value={complexAwardMode}
                      label="Award mode"
                      onChange={(e) => setComplexAwardMode(e.target.value as ComplexAwardMode)}
                    >
                      <MenuItem value="static">Static points amount</MenuItem>
                      <MenuItem value="per_currency">Points per {currencyLabel}</MenuItem>
                    </Select>
                  </FormControl>

                  {isStaticComplexAward ? (
                    <TextField
                      label="Points to grant"
                      type="number"
                      value={pointsToGrant || ""}
                      onChange={(e) => setPointsToGrant(Number(e.target.value))}
                      fullWidth
                      inputProps={{ min: 0 }}
                      helperText="Fixed amount awarded when campaign conditions are met."
                    />
                  ) : (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                      <TextField
                        label="Points"
                        type="number"
                        value={complexAwardPoints || ""}
                        onChange={(e) => setComplexAwardPoints(Number(e.target.value))}
                        fullWidth
                        inputProps={{ min: 0 }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        per
                      </Typography>
                      <TextField
                        label={currencyAmountFieldLabel}
                        type="number"
                        value={complexAwardCurrencyAmount || ""}
                        onChange={(e) => setComplexAwardCurrencyAmount(Number(e.target.value))}
                        fullWidth
                        inputProps={{ min: 0 }}
                        helperText={`Example: 1 point per 1 ${currencyLabel}.`}
                      />
                    </Stack>
                  )}
                </Stack>
              </Box>
            )}

            {ruleType && (
              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                  Rule builder
                </Typography>
                {isComplexRule ? (
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
                ) : (
                  ruleFields
                )}
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
            {!error && validationHint && <Alert severity="info">{validationHint}</Alert>}

            <Box>
              <Button type="submit" variant="contained" disabled={disabled}>
                {loading ? "Saving..." : "Save campaign"}
              </Button>
            </Box>

            <ProductPickerDrawer
              open={productPickerOpen}
              tenantId={selectedTenantId}
              selectedSkus={skus}
              onClose={() => setProductPickerOpen(false)}
              onConfirm={(selectedSkusFromPicker) => {
                setSkus(sanitizeSkuValues(selectedSkusFromPicker));
                setSkuInputValue("");
              }}
            />
            <ProductPickerDrawer
              open={canOpenComplexProductPicker}
              tenantId={selectedTenantId}
              selectedSkus={complexPickerSelectedSkus}
              onClose={() => setComplexProductPickerConditionId(null)}
              onConfirm={(selectedSkusFromPicker) => {
                const targetConditionId = complexProductPickerConditionId;
                if (!targetConditionId) return;
                const normalizedSkus = sanitizeSkuValues(selectedSkusFromPicker);
                setConditionTree((prev) =>
                  updateNode(prev, targetConditionId, (node) => {
                    if (node.type !== "condition") return node;
                    const attribute = getAttributeById(node.entityId, node.attributeId);
                    if (!attribute || !isProductPickerAttribute(attribute)) return node;
                    if (usesMultiValueInput(node, attribute)) {
                      return { ...node, values: normalizedSkus, value: "" };
                    }
                    return { ...node, value: normalizedSkus[0] ?? "", values: [] };
                  }) as ConditionGroup,
                );
                setComplexProductPickerConditionId(null);
              }}
            />
          </Box>
        )}

        {!isCreatePage && selectedTenantId && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            Total campaigns: {pageInfo?.totalCount ?? 0}
          </Typography>
        )}
        {!isCreatePage && (
          <>
            {rulesError && <Alert severity="error">{rulesError.message}</Alert>}
            {rulesLoading && <LinearProgress />}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
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
                      <TableCell>{rule.description?.trim() ? rule.description : "—"}</TableCell>
                      <TableCell>{rule.ruleType}</TableCell>
                      <TableCell>{rule.rewardPoints}</TableCell>
                      <TableCell>{rule.active ? "Yes" : "No"}</TableCell>
                      <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                      <TableCell>{formatDate(rule.effectiveTo)}</TableCell>
                    </TableRow>
                  ))}
                  {selectedTenantId && !rulesLoading && rules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
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
          </>
        )}
     </CardContent>
   </Card>
  );
};
