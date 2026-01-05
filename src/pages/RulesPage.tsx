import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { apiBaseUrl } from "../config";

type RuleType = "sku_quantity" | "spend";

export const RulesPage: React.FC = () => {
  const [tenantId, setTenantId] = useState("");
  const [ruleType, setRuleType] = useState<RuleType | "">("");
  const [sku, setSku] = useState("");
  const [quantityStep, setQuantityStep] = useState<number>(0);
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [spendStep, setSpendStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = !tenantId || !ruleType || loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            tenantId: tenantId.trim(),
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

  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Points Rules
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configure earning logic (SKU quantity or spend rules). Stored in PointsRules (JSONB payload).
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Tenant ID"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
            fullWidth
            helperText="Target tenant for the rule."
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
            </Select>
          </FormControl>

          {ruleFields}

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          <Box>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: "#0c9b50" }}
              disabled={disabled}
            >
              {loading ? "Saving..." : "Save rule"}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
