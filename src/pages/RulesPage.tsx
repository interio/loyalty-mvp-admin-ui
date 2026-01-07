import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
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
import { RULES_BY_TENANT_QUERY } from "../modules/rules/queries";

type RuleType = "sku_quantity" | "spend";

type PointsRule = {
  id: string;
  tenantId: string;
  ruleType: string;
  active: boolean;
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  conditions?: { key: string; value?: string | null }[];
};

type RuleEditState = {
  active: boolean;
  priority: string;
  effectiveFrom: string;
  effectiveTo: string;
  conditions: Record<string, string>;
};

export const RulesPage: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [ruleType, setRuleType] = useState<RuleType | "">("");
  const [sku, setSku] = useState("");
  const [quantityStep, setQuantityStep] = useState<number>(0);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [spendStep, setSpendStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [editStateById, setEditStateById] = useState<Record<string, RuleEditState>>({});
  const [ruleMessages, setRuleMessages] = useState<Record<string, string>>({});
  const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);

  const { data, loading: rulesLoading, error: rulesError, refetch } = useQuery(RULES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });
  const [loadRules] = useLazyQuery(RULES_BY_TENANT_QUERY);
  const rules: PointsRule[] = data?.pointsRulesByTenant ?? [];

  const disabled = !selectedTenantId || !ruleType || loading;

  useEffect(() => {
    setExpandedRuleId(null);
    setEditStateById({});
    setRuleMessages({});
    setRuleErrors({});
  }, [selectedTenantId]);

  useEffect(() => {
    if (!expandedRuleId) return;
    const rule = rules.find((r) => r.id === expandedRuleId);
    if (!rule) return;
    setEditStateById((prev) => (prev[rule.id] ? prev : { ...prev, [rule.id]: buildEditState(rule) }));
  }, [expandedRuleId, rules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) return;
    setMessage(null);
    setError(null);
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
            ruleType,
            priority: ruleType === "sku_quantity" ? 2 : 1,
            active: true,
            conditions,
            effectiveFrom: new Date().toISOString(),
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
      setRuleType("");
      setSku("");
      setQuantityStep(0);
      setRewardPoints(0);
      setSpendStep(0);
      await loadRules({ variables: { tenantId: selectedTenantId } });
      refetch();
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
  const toLocalInput = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 16) : "");

  const buildEditState = (rule: PointsRule): RuleEditState => {
    const conditions = (rule.conditions ?? []).reduce<Record<string, string>>((acc, kv) => {
      acc[kv.key] = kv.value ?? "";
      return acc;
    }, {});
    return {
      active: rule.active,
      priority: String(rule.priority ?? 0),
      effectiveFrom: toLocalInput(rule.effectiveFrom),
      effectiveTo: toLocalInput(rule.effectiveTo),
      conditions,
    };
  };

  const buildConditionsPayload = (rule: PointsRule, state: RuleEditState) => {
    if (rule.ruleType === "sku_quantity") {
      return {
        sku: (state.conditions.sku ?? "").trim(),
        quantityStep: Number(state.conditions.quantityStep || 0),
        rewardPoints: Number(state.conditions.rewardPoints || 0),
      };
    }
    return {
      spendStep: Number(state.conditions.spendStep || 0),
      rewardPoints: Number(state.conditions.rewardPoints || 0),
    };
  };

  const handleUpdateRule = async (rule: PointsRule) => {
    if (!selectedTenantId) return;
    const state = editStateById[rule.id];
    if (!state) return;
    setSavingRuleId(rule.id);
    setRuleErrors((prev) => ({ ...prev, [rule.id]: "" }));
    setRuleMessages((prev) => ({ ...prev, [rule.id]: "" }));
    try {
      const payload = {
        tenantId: selectedTenantId,
        ruleType: rule.ruleType,
        active: state.active,
        priority: Number(state.priority || 0),
        effectiveFrom: state.effectiveFrom ? new Date(state.effectiveFrom).toISOString() : undefined,
        effectiveTo: state.effectiveTo ? new Date(state.effectiveTo).toISOString() : null,
        conditions: buildConditionsPayload(rule, state),
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
      setRuleMessages((prev) => ({ ...prev, [rule.id]: "Rule updated." }));
      await loadRules({ variables: { tenantId: selectedTenantId } });
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
      const res = await fetch(`${apiBaseUrl}/api/v1/rules/points/${rule.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || "Failed to delete rule");
      }
      setRuleMessages((prev) => ({ ...prev, [rule.id]: "Rule deleted." }));
      setEditStateById((prev) => {
        const next = { ...prev };
        delete next[rule.id];
        return next;
      });
      await loadRules({ variables: { tenantId: selectedTenantId } });
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
              </Select>
            </FormControl>

            {ruleFields}

            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}

            <Box>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#0c9b50" }} disabled={disabled}>
                {loading ? "Saving..." : "Save rule"}
              </Button>
            </Box>
          </Box>
        )}

        {rulesError && <Alert severity="error">{rulesError.message}</Alert>}
        {rulesLoading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Type</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Effective To</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => {
                const isExpanded = expandedRuleId === rule.id;
                const editState = editStateById[rule.id];
                return (
                  <React.Fragment key={rule.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}>
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{rule.ruleType}</TableCell>
                      <TableCell>{rule.active ? "Yes" : "No"}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>{formatDate(rule.effectiveFrom)}</TableCell>
                      <TableCell>{formatDate(rule.effectiveTo)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
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
                                  Rule type: {rule.ruleType}
                                </Typography>
                                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={!!editState?.active}
                                        onChange={(e) =>
                                          setEditStateById((prev) => ({
                                            ...prev,
                                            [rule.id]: {
                                              ...(prev[rule.id] ?? buildEditState(rule)),
                                              active: e.target.checked,
                                            },
                                          }))
                                        }
                                      />
                                    }
                                    label="Active"
                                  />
                                  <TextField
                                    label="Priority"
                                    type="number"
                                    value={editState?.priority ?? ""}
                                    onChange={(e) =>
                                      setEditStateById((prev) => ({
                                        ...prev,
                                        [rule.id]: {
                                          ...(prev[rule.id] ?? buildEditState(rule)),
                                          priority: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <TextField
                                    label="Effective from"
                                    type="datetime-local"
                                    value={editState?.effectiveFrom ?? ""}
                                    onChange={(e) =>
                                      setEditStateById((prev) => ({
                                        ...prev,
                                        [rule.id]: {
                                          ...(prev[rule.id] ?? buildEditState(rule)),
                                          effectiveFrom: e.target.value,
                                        },
                                      }))
                                    }
                                    InputLabelProps={{ shrink: true }}
                                  />
                                  <TextField
                                    label="Effective to"
                                    type="datetime-local"
                                    value={editState?.effectiveTo ?? ""}
                                    onChange={(e) =>
                                      setEditStateById((prev) => ({
                                        ...prev,
                                        [rule.id]: {
                                          ...(prev[rule.id] ?? buildEditState(rule)),
                                          effectiveTo: e.target.value,
                                        },
                                      }))
                                    }
                                    InputLabelProps={{ shrink: true }}
                                  />
                                </Stack>
                              </Stack>
                            </DetailSection>
                            <DetailSection title="Conditions" sx={{ mt: 2 }}>
                              {editState ? (
                                rule.ruleType === "sku_quantity" ? (
                                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                      label="Product SKU"
                                      value={editState.conditions.sku ?? ""}
                                      onChange={(e) =>
                                        setEditStateById((prev) => ({
                                          ...prev,
                                          [rule.id]: {
                                            ...(prev[rule.id] ?? buildEditState(rule)),
                                            conditions: {
                                              ...(prev[rule.id] ?? buildEditState(rule)).conditions,
                                              sku: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      fullWidth
                                    />
                                    <TextField
                                      label="Quantity step (X)"
                                      type="number"
                                      value={editState.conditions.quantityStep ?? ""}
                                      onChange={(e) =>
                                        setEditStateById((prev) => ({
                                          ...prev,
                                          [rule.id]: {
                                            ...(prev[rule.id] ?? buildEditState(rule)),
                                            conditions: {
                                              ...(prev[rule.id] ?? buildEditState(rule)).conditions,
                                              quantityStep: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      fullWidth
                                    />
                                    <TextField
                                      label="Reward points (Y)"
                                      type="number"
                                      value={editState.conditions.rewardPoints ?? ""}
                                      onChange={(e) =>
                                        setEditStateById((prev) => ({
                                          ...prev,
                                          [rule.id]: {
                                            ...(prev[rule.id] ?? buildEditState(rule)),
                                            conditions: {
                                              ...(prev[rule.id] ?? buildEditState(rule)).conditions,
                                              rewardPoints: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      fullWidth
                                    />
                                  </Stack>
                                ) : (
                                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                    <TextField
                                      label="Spend X (currency)"
                                      type="number"
                                      value={editState.conditions.spendStep ?? ""}
                                      onChange={(e) =>
                                        setEditStateById((prev) => ({
                                          ...prev,
                                          [rule.id]: {
                                            ...(prev[rule.id] ?? buildEditState(rule)),
                                            conditions: {
                                              ...(prev[rule.id] ?? buildEditState(rule)).conditions,
                                              spendStep: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      fullWidth
                                    />
                                    <TextField
                                      label="Get Y points"
                                      type="number"
                                      value={editState.conditions.rewardPoints ?? ""}
                                      onChange={(e) =>
                                        setEditStateById((prev) => ({
                                          ...prev,
                                          [rule.id]: {
                                            ...(prev[rule.id] ?? buildEditState(rule)),
                                            conditions: {
                                              ...(prev[rule.id] ?? buildEditState(rule)).conditions,
                                              rewardPoints: e.target.value,
                                            },
                                          },
                                        }))
                                      }
                                      fullWidth
                                    />
                                  </Stack>
                                )
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Loading rule conditions...
                                </Typography>
                              )}
                            </DetailSection>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                              <Button
                                variant="contained"
                                sx={{ bgcolor: "#0c9b50" }}
                                onClick={() => handleUpdateRule(rule)}
                                disabled={savingRuleId === rule.id || deletingRuleId === rule.id}
                              >
                                {savingRuleId === rule.id ? "Saving..." : "Save changes"}
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
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      No rules found for this tenant.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
