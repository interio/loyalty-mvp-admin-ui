import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTenant } from "../tenants/TenantContext";
import { SET_TENANT_CONFIG_VALUE_MUTATION, TENANT_CONFIG_VALUE_QUERY } from "./queries";

const CURRENCY_CONFIG_NAME = "currency";
type TenantConfigValueData = {
  tenantConfigValue?: string | null;
};

type TenantConfigValueVars = {
  tenantId: string;
  configName: string;
};

export const ConfigView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId),
    [tenants, selectedTenantId],
  );
  const [currency, setCurrency] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data,
    loading: loadingConfig,
    error: loadError,
    refetch,
  } = useQuery<TenantConfigValueData, TenantConfigValueVars>(TENANT_CONFIG_VALUE_QUERY, {
    variables: {
      tenantId: selectedTenantId ?? "",
      configName: CURRENCY_CONFIG_NAME,
    },
    skip: !selectedTenantId,
    fetchPolicy: "network-only",
  });

  const [setTenantConfigValue, { loading: saving, error: saveError }] = useMutation(
    SET_TENANT_CONFIG_VALUE_MUTATION,
  );

  useEffect(() => {
    if (!selectedTenantId) {
      setCurrency("");
      setMessage(null);
      setFormError(null);
      return;
    }

    setCurrency(data?.tenantConfigValue ?? "");
  }, [data, selectedTenantId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setFormError(null);

    if (!selectedTenantId) {
      setFormError("Select a tenant first.");
      return;
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (!normalizedCurrency) {
      setFormError("Currency is required.");
      return;
    }

    await setTenantConfigValue({
      variables: {
        input: {
          tenantId: selectedTenantId,
          configName: CURRENCY_CONFIG_NAME,
          configValue: normalizedCurrency,
        },
      },
    });

    await refetch();
    setCurrency(normalizedCurrency);
    setMessage("Currency config saved.");
  };

  return (
    <Card>
      <CardHeader
        title="Config"
        subheader={
          selectedTenant
            ? `Manage tenant settings for ${selectedTenant.name}.`
            : "Select a tenant from the header to edit configuration."
        }
      />
      <CardContent>
        <Box
          component="form"
          onSubmit={handleSave}
          sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}
        >
          <TextField
            label="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            placeholder="EUR"
            helperText="ISO 4217 code, for example EUR, USD or ZAR."
            inputProps={{ maxLength: 3 }}
            disabled={!selectedTenantId || loadingConfig || saving}
            required
          />

          {!selectedTenantId && !tenantsLoading && (
            <Typography variant="body2" color="text.secondary">
              No tenant selected.
            </Typography>
          )}

          <Stack spacing={1}>
            {loadError && <Alert severity="error">{loadError.message}</Alert>}
            {saveError && <Alert severity="error">{saveError.message}</Alert>}
            {formError && <Alert severity="error">{formError}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
          </Stack>

          <Box>
            <Button type="submit" variant="contained" disabled={!selectedTenantId || loadingConfig || saving}>
              {saving ? "Saving..." : "Save config"}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
