import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid2,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import {
  DELETE_REWARD_PRODUCT_MUTATION,
  REWARD_PRODUCT_QUERY,
  UPSERT_REWARD_PRODUCT_MUTATION } from "./queries";

type RewardProductDetail = {
  id: string;
  tenantId: string;
  rewardVendor: string;
  sku: string;
  gtin?: string | null;
  name: string;
  pointsCost: number;
  inventoryQuantity: number;
  attributes?: { key: string; value?: string | null }[];
  createdAt?: string;
  updatedAt?: string;
};

const parseEnabledValue = (value: any) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  return !["false", "0", "no", "off"].includes(normalized);
};

export const RewardProductEditView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedTenantId } = useTenant();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [product, setProduct] = useState<RewardProductDetail | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState("");
  const [pointsCost, setPointsCost] = useState("");
  const [stock, setStock] = useState("");
  const [attributesText, setAttributesText] = useState("{}");
  const [enabled, setEnabled] = useState(true);

  const {
    data,
    loading,
    error: queryError,
    refetch } = useQuery(REWARD_PRODUCT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", id: id ?? "" },
    skip: !selectedTenantId || !id });

  const [upsertRewardProduct] = useMutation(UPSERT_REWARD_PRODUCT_MUTATION);
  const [deleteRewardProduct] = useMutation(DELETE_REWARD_PRODUCT_MUTATION);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);

  useEffect(() => {
    if (!data?.rewardProduct) return;
    const details = data.rewardProduct as RewardProductDetail;
    const attrs = (details.attributes ?? []).reduce<Record<string, string>>((acc, attr) => {
      acc[attr.key] = attr.value ?? "";
      return acc;
    }, {});
    const { enabled: enabledAttr, ...rest } = attrs;
    setProduct(details);
    setName(details.name ?? "");
    setPointsCost(String(details.pointsCost ?? 0));
    setStock(String(details.inventoryQuantity ?? 0));
    setEnabled(parseEnabledValue(enabledAttr));
    setAttributesText(JSON.stringify(rest, null, 2));
  }, [data]);

  const parsedAttributes = useMemo(() => {
    const trimmed = attributesText.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [attributesText]);

  const handleSave = async () => {
    if (!product || !selectedTenantId) return;
    setError(null);
    setMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    const costValue = Number(pointsCost);
    if (!Number.isFinite(costValue) || costValue < 0) {
      setError("Price must be a non-negative number.");
      return;
    }

    const stockValue = Number(stock);
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      setError("Stock must be a non-negative number.");
      return;
    }

    if (parsedAttributes === null) {
      setError("Attributes must be a valid JSON object.");
      return;
    }

    const attributesObject = { ...parsedAttributes } as Record<string, any>;
    delete attributesObject.enabled;
    const attributes = [
      ...Object.entries(attributesObject).map(([key, value]) => ({
        key,
        value:
          value === null || value === undefined
            ? null
            : typeof value === "string"
              ? value
              : JSON.stringify(value) })),
      { key: "enabled", value: enabled ? "true" : "false" },
    ];

    setSaving(true);
    try {
      const result = await upsertRewardProduct({
        variables: {
          input: {
            tenantId: selectedTenantId,
            rewardVendor: product.rewardVendor,
            sku: product.sku,
            gtin: product.gtin ?? null,
            name: trimmedName,
            pointsCost: Math.round(costValue),
            inventoryQuantity: Math.round(stockValue),
            attributes } } });
      if (!result.data?.upsertRewardProduct) {
        throw new Error("Failed to save reward product.");
      }

      setMessage("Reward product updated.");
      await refetch();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !selectedTenantId) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteRewardProduct({
        variables: { tenantId: selectedTenantId, id: product.id } });
      if (!result.data?.deleteRewardProduct) {
        throw new Error("Failed to delete reward product.");
      }
      navigate("/reward-products");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (!selectedTenantId) {
    return (
      <Card>
        <CardHeader title="Reward Product" subheader="Select a tenant to edit reward products." />
        <CardContent>
          <Alert severity="info">Select a tenant from the header, then open a reward product.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Edit Reward Product"
        subheader={product ? product.name : "Loading reward product details"}
      />
      <CardContent>
        <Stack spacing={2}>
          {loading && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          {!loading && !product && (
            <Alert severity="warning">Reward product not found for the selected tenant.</Alert>
          )}

          {product && (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Reward product ID
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {product.id}
                </Typography>
              </Box>

              <Divider />

              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField label="Vendor" value={product.rewardVendor} fullWidth disabled />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField label="SKU" value={product.sku} fullWidth disabled />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField label="GTIN" value={product.gtin ?? ""} fullWidth disabled />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FormControlLabel
                    control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
                    label={enabled ? "Enabled" : "Disabled"}
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    required
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Price (points)"
                    type="number"
                    value={pointsCost}
                    onChange={(e) => setPointsCost(e.target.value)}
                    fullWidth
                    required
                  />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    fullWidth
                  />
                </Grid2>
                <Grid2 size={12}>
                  <TextField
                    label="Attributes (JSON)"
                    value={attributesText}
                    onChange={(e) => setAttributesText(e.target.value)}
                    fullWidth
                    multiline
                    minRows={5}
                    helperText="Provide a JSON object. The enabled flag is managed separately."
                  />
                </Grid2>
              </Grid2>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
                <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteOpen(true)}
                  disabled={saving || loading}
                >
                  Delete product
                </Button>
                <Button variant="text" onClick={() => navigate("/reward-products")} disabled={saving || loading}>
                  Back to reward products
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete reward product?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently remove the reward product and its inventory record.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
