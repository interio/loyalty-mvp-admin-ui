import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
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
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
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

  const { data, loading: rulesLoading, error: rulesError, refetch } = useQuery(RULES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });
  const [loadRules] = useLazyQuery(RULES_BY_TENANT_QUERY);
  const rules: PointsRule[] = data?.pointsRulesByTenant ?? [];

  const disabled = !selectedTenantId || !ruleType || loading;

  useEffect(() => {
    setExpandedRuleId(null);
  }, [selectedTenantId]);

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
                            <Typography variant="subtitle2" gutterBottom>
                              Rule details
                            </Typography>
                            <Stack spacing={1}>
                              <Typography variant="body2" color="text.secondary">
                                Rule ID: {rule.id}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Tenant ID: {rule.tenantId}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Created: {formatDate(rule.createdAt)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Updated: {formatDate(rule.updatedAt)}
                              </Typography>
                              {rule.conditions && rule.conditions.length > 0 && (
                                <Box
                                  component="pre"
                                  sx={{
                                    m: 0,
                                    p: 1,
                                    bgcolor: "#eef3ef",
                                    borderRadius: 1,
                                    fontSize: 12,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {JSON.stringify(
                                    rule.conditions.reduce<Record<string, string | null>>((acc, kv) => {
                                      acc[kv.key] = kv.value ?? null;
                                      return acc;
                                    }, {}),
                                    null,
                                    2,
                                  )}
                                </Box>
                              )}
                            </Stack>
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
      </CardContent>
    </Card>
  );
};
