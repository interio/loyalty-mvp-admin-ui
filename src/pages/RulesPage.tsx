import React, { useEffect, useMemo, useState } from "react";
import { useApolloClient, useLazyQuery, useQuery } from "@apollo/client";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { DetailSection } from "../components/DetailSection";
import { apiBaseUrl } from "../config";
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
  ruleVersion: number;
  active: boolean;
  priority: number;
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

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const createCondition = (): ConditionRow => ({ id: makeId(), type: "condition" });
const createGroup = (operator: "AND" | "OR" = "AND"): ConditionGroup => ({
  id: makeId(),
  type: "group",
  operator,
  children: [createCondition()],
});

export const RulesPage: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const apolloClient = useApolloClient();
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<RuleType | "">("");
  const [ruleActive, setRuleActive] = useState(true);
  const [priority, setPriority] = useState<number>(1);
  const [priorityTouched, setPriorityTouched] = useState(false);
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
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [activeById, setActiveById] = useState<Record<string, boolean>>({});
  const [ruleMessages, setRuleMessages] = useState<Record<string, string>>({});
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);
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

  const toLocalDateTimeInput = (value: Date) => {
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };

  const toIsoFromInput = (value: string) => (value ? new Date(value).toISOString() : undefined);

  const resetForm = () => {
    setRuleName("");
    setRuleType("");
    setRuleActive(true);
    setPriority(1);
    setPriorityTouched(false);
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
    setExpandedRuleId(null);
    setActiveById({});
    setRuleMessages({});
    setRuleErrors({});
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
    if (!priorityTouched) {
      setPriority(ruleType === "sku_quantity" ? 2 : 1);
    }
  }, [ruleType, priorityTouched]);

  useEffect(() => {
    if ((pageInfo?.totalPages ?? 0) > 0 && page > (pageInfo?.totalPages ?? 0)) {
      setPage(pageInfo?.totalPages ?? 1);
    }
  }, [pageInfo, page]);

  useEffect(() => {
    if (!expandedRuleId) return;
    const rule = rules.find((r) => r.id === expandedRuleId);
    if (!rule) return;
    setActiveById((prev) => (rule.id in prev ? prev : { ...prev, [rule.id]: rule.active }));
  }, [expandedRuleId, rules]);

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
      setMessage("Complex rules are UI-only for now. Saving is not implemented yet.");
      return;
    }
    setLoading(true);
    try {
      const conditions =
        ruleType === "sku_quantity"
          ? { sku: sku.trim(), quantityStep: quantityStep || 0, rewardPoints: rewardPoints || 0 }
          : { spendStep: spendStep || 0, rewardPoints: rewardPoints || 0 };

      const payload = {
        rules: [
          {
            tenantId: selectedTenantId,
            name: ruleName.trim(),
            ruleType,
            priority,
            active: ruleActive,
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
        throw new Error(detail || "Failed to save rule");
      }
      setMessage("Rule saved.");
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
  const getConditionValue = (rule: PointsRule, key: string) => {
    const entry = rule.conditions?.find((c) => c.key === key);
    return entry?.value ?? "";
  };

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
        border: "1px solid #e0e7e2",
        borderRadius: 2,
        p: 2,
        mt: 1,
        backgroundColor: depth === 0 ? "#fff" : "#f7faf8",
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

  const handleUpdateRule = async (rule: PointsRule) => {
    if (!selectedTenantId) return;
    const nextActive = activeById[rule.id];
    if (nextActive === undefined) return;
    setSavingRuleId(rule.id);
    setRuleErrors((prev) => ({ ...prev, [rule.id]: "" }));
    setRuleMessages((prev) => ({ ...prev, [rule.id]: "" }));
    try {
      const payload = {
        tenantId: selectedTenantId,
        active: nextActive,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/rules/points/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to update rule");
      }
      setRuleMessages((prev) => ({ ...prev, [rule.id]: "Rule status updated." }));
      await loadRules({ variables: { tenantId: selectedTenantId, page, pageSize } });
      refetch();
    } catch (err) {
      setRuleErrors((prev) => ({ ...prev, [rule.id]: (err as Error).message }));
    } finally {
      setSavingRuleId(null);
    }
  };

  const handleDeleteRule = async (rule: PointsRule) => {
    if (!selectedTenantId) return;
    setDeletingRuleId(rule.id);
    setRuleErrors((prev) => ({ ...prev, [rule.id]: "" }));
    setRuleMessages((prev) => ({ ...prev, [rule.id]: "" }));
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/rules/points/${rule.id}?tenantId=${encodeURIComponent(selectedTenantId)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to delete rule");
      }
      setRuleMessages((prev) => ({ ...prev, [rule.id]: "Rule deleted." }));
      setActiveById((prev) => {
        const next = { ...prev };
        delete next[rule.id];
        return next;
      });
      await loadRules({ variables: { tenantId: selectedTenantId, page, pageSize } });
      refetch();
    } catch (err) {
      setRuleErrors((prev) => ({ ...prev, [rule.id]: (err as Error).message }));
    } finally {
      setDeletingRuleId(null);
    }
  };

  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <Box>
            <Typography variant="h5">Points Rules</Typography>
            <Typography variant="body2" color="text.secondary">
              {tenantName
                ? `Rules for ${tenantName}`
                : tenantsLoading
                  ? "Loading tenants..."
                  : "Select a tenant to view rules."}
            </Typography>
          </Box>
          <Button variant="contained" sx={{ bgcolor: "#0c9b50" }} onClick={() => setShowForm((v) => !v)} disabled={!selectedTenantId}>
            {showForm ? "Close form" : "Create rule"}
          </Button>
        </Stack>

        {showForm && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ mt: 2, mb: 3, p: 2, border: "1px solid #e0e7e2", borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Rule name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              fullWidth
              required
              helperText="Give the rule a descriptive name."
            />
            <FormControl fullWidth required>
              <InputLabel id="rule-type-label">Rule type</InputLabel>
              <Select
                labelId="rule-type-label"
                value={ruleType}
                label="Rule type"
                onChange={(e) => setRuleType(e.target.value as RuleType)}
              >
                <MenuItem value="spend">Spend X get Y points</MenuItem>
                <MenuItem value="sku_quantity">SKU quantity rule</MenuItem>
                <MenuItem value="complex_rule">Complex Rule</MenuItem>
              </Select>
            </FormControl>

            {ruleFields}

            {!isComplexRule && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControlLabel
                    control={<Switch checked={ruleActive} onChange={(e) => setRuleActive(e.target.checked)} />}
                    label={ruleActive ? "Active" : "Inactive"}
                  />
                  <TextField
                    label="Priority"
                    type="number"
                    value={priority}
                    onChange={(e) => {
                      setPriorityTouched(true);
                      setPriority(Number(e.target.value));
                    }}
                    fullWidth
                    inputProps={{ min: 0 }}
                    helperText="Higher priority rules run first."
                  />
                </Stack>
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
              <Box sx={{ border: "1px solid #e0e7e2", borderRadius: 2, p: 2 }}>
                <Stepper activeStep={complexStep} sx={{ mb: 2 }}>
                  <Step>
                    <StepLabel>Rule details</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Conditions builder</StepLabel>
                  </Step>
                </Stepper>

                {complexStep === 0 && (
                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControlLabel
                        control={<Switch checked={ruleActive} onChange={(e) => setRuleActive(e.target.checked)} />}
                        label={ruleActive ? "Active" : "Inactive"}
                      />
                      <TextField
                        label="Priority"
                        type="number"
                        value={priority}
                        onChange={(e) => {
                          setPriorityTouched(true);
                          setPriority(Number(e.target.value));
                        }}
                        fullWidth
                        inputProps={{ min: 0 }}
                        helperText="Higher priority rules run first."
                      />
                    </Stack>
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
                <Alert severity="info">Complex rules are UI-only for now. Saving is not implemented yet.</Alert>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  {complexStep > 0 && (
                    <Button variant="outlined" onClick={() => setComplexStep(0)}>
                      Back
                    </Button>
                  )}
                  {complexStep === 0 && (
                    <Button
                      variant="contained"
                      sx={{ bgcolor: "#0c9b50" }}
                      onClick={() => setComplexStep(1)}
                      disabled={!complexDetailsValid}
                    >
                      Next
                    </Button>
                  )}
                  {complexStep === 1 && (
                    <Button type="submit" variant="contained" sx={{ bgcolor: "#0c9b50" }} disabled={disabled}>
                      {loading ? "Saving..." : "Save rule"}
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}

            {!isComplexRule && (
              <Box>
                <Button type="submit" variant="contained" sx={{ bgcolor: "#0c9b50" }} disabled={disabled}>
                  {loading ? "Saving..." : "Save rule"}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {selectedTenantId && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            Total rules: {pageInfo?.totalCount ?? 0}
          </Typography>
        )}
        {rulesError && <Alert severity="error">{rulesError.message}</Alert>}
        {rulesLoading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Effective To</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => {
                const isExpanded = expandedRuleId === rule.id;
                const activeValue = activeById[rule.id] ?? rule.active;
                const activeDirty = activeValue !== rule.active;
                return (
                  <React.Fragment key={rule.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}>
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.ruleType}</TableCell>
                      <TableCell>{rule.ruleVersion}</TableCell>
                      <TableCell>{rule.active ? "Yes" : "No"}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                      <TableCell>{formatDate(rule.effectiveTo)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                            <DetailSection title="Rule details">
                              <Stack spacing={1}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Rule ID: {rule.id}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Tenant ID: {rule.tenantId}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Created: {formatDate(rule.createdAt)}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Updated: {formatDate(rule.updatedAt)}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Name: {rule.name}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Rule type: {rule.ruleType}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  Version: {rule.ruleVersion}
                                </Typography>
                                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={activeValue}
                                        onChange={(e) =>
                                          setActiveById((prev) => ({
                                            ...prev,
                                            [rule.id]: e.target.checked,
                                          }))
                                        }
                                      />
                                    }
                                    label={activeValue ? "Active" : "Inactive"}
                                  />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Priority
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {rule.priority}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Effective from
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(rule.effectiveFrom)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Effective to
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(rule.effectiveTo)}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Stack>
                            </DetailSection>
                            <DetailSection title="Conditions" sx={{ mt: 2 }}>
                              {rule.ruleType === "sku_quantity" ? (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                  <TextField
                                    label="Product SKU"
                                    value={getConditionValue(rule, "sku")}
                                    fullWidth
                                    disabled
                                  />
                                  <TextField
                                    label="Quantity step (X)"
                                    type="number"
                                    value={getConditionValue(rule, "quantityStep")}
                                    fullWidth
                                    disabled
                                  />
                                  <TextField
                                    label="Reward points (Y)"
                                    type="number"
                                    value={getConditionValue(rule, "rewardPoints")}
                                    fullWidth
                                    disabled
                                  />
                                </Stack>
                              ) : (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                  <TextField
                                    label="Spend X (currency)"
                                    type="number"
                                    value={getConditionValue(rule, "spendStep")}
                                    fullWidth
                                    disabled
                                  />
                                  <TextField
                                    label="Get Y points"
                                    type="number"
                                    value={getConditionValue(rule, "rewardPoints")}
                                    fullWidth
                                    disabled
                                  />
                                </Stack>
                              )}
                            </DetailSection>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                              <Button
                                variant="contained"
                                sx={{ bgcolor: "#0c9b50" }}
                                onClick={() => handleUpdateRule(rule)}
                                disabled={savingRuleId === rule.id || deletingRuleId === rule.id || !activeDirty}
                              >
                                {savingRuleId === rule.id ? "Saving..." : "Save status"}
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={() => setConfirmDeleteRuleId(rule.id)}
                                disabled={savingRuleId === rule.id || deletingRuleId === rule.id}
                              >
                                {deletingRuleId === rule.id ? "Deleting..." : "Delete rule"}
                              </Button>
                            </Stack>
                            {ruleErrors[rule.id] && (
                              <Alert severity="error" sx={{ mt: 2 }}>
                                {ruleErrors[rule.id]}
                              </Alert>
                            )}
                            {ruleMessages[rule.id] && (
                              <Alert severity="success" sx={{ mt: 2 }}>
                                {ruleMessages[rule.id]}
                              </Alert>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {selectedTenantId && !rulesLoading && rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="text.secondary">
                      No rules found for this tenant.
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
        <Dialog
          open={!!confirmDeleteRuleId}
          onClose={() => setConfirmDeleteRuleId(null)}
          aria-labelledby="delete-rule-title"
        >
          <DialogTitle id="delete-rule-title">Delete rule?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone. The rule will be permanently removed.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmDeleteRuleId(null)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                const rule = rules.find((r) => r.id === confirmDeleteRuleId);
                setConfirmDeleteRuleId(null);
                if (rule) void handleDeleteRule(rule);
              }}
            >
              Delete rule
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
