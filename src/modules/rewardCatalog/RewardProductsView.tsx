import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  LinearProgress,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import { REWARD_PRODUCTS_PAGE_QUERY } from "./queries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

type RewardProduct = {
  id: string;
  tenantId: string;
  rewardVendor: string;
  sku: string;
  gtin?: string | null;
  name: string;
  pointsCost: number;
  attributes?: { key: string; value?: string | null }[];
  createdAt?: string;
  updatedAt?: string;
};

const parseEnabled = (attributes?: { key: string; value?: string | null }[]) => {
  if (!attributes || attributes.length === 0) return true;
  const entry = attributes.find((attr) => attr.key.toLowerCase() === "enabled");
  if (!entry || entry.value == null) return true;
  const normalized = entry.value.toString().trim().toLowerCase();
  return !["false", "0", "no", "off"].includes(normalized);
};

export const RewardProductsView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const pageSize = 18;
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const { data, loading, error } = useQuery(REWARD_PRODUCTS_PAGE_QUERY, {
    variables: {
      tenantId: selectedTenantId ?? null,
      page,
      pageSize,
      search: debouncedSearch || null,
    },
    skip: !selectedTenantId,
  });

  const rewardProducts: RewardProduct[] = data?.rewardProductsPage?.nodes ?? [];
  const pageInfo = data?.rewardProductsPage?.pageInfo;

  const totalLabel = debouncedSearch
    ? `Matches: ${pageInfo?.totalCount ?? 0}`
    : `Total reward products: ${pageInfo?.totalCount ?? 0}`;
  const totalPages = pageInfo?.totalPages ?? 0;

  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  useEffect(() => {
    setSearch("");
    setPage(1);
  }, [selectedTenantId]);

useEffect(() => {
  setPage(1);
}, [debouncedSearch]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const handleOpen = (productId: string) => {
    navigate(`/reward-products/${productId}`);
  };

  return (
    <Card>
      <CardHeader
        title="Reward Products"
        subheader={
          selectedTenantName
            ? `Viewing reward catalog for ${selectedTenantName}`
            : "Select a tenant from the header to load the reward catalog."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search reward products by name, SKU, or vendor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!selectedTenantId}
          />
          {selectedTenantId && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {totalLabel}
            </Typography>
          )}
          {!selectedTenantId && (
            <Alert severity="info">Select a tenant to view reward products.</Alert>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <Grid container spacing={2}>
            {rewardProducts.map((product) => {
              const enabled = parseEnabled(product.attributes);
              return (
                <Grid key={product.id} item xs={12} sm={6} md={4}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardActionArea onClick={() => handleOpen(product.id)} sx={{ height: "100%" }}>
                      <CardContent sx={{ height: "100%" }}>
                        <Stack spacing={1} sx={{ height: "100%" }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="h6">{product.name}</Typography>
                            <Chip
                              label={enabled ? "Enabled" : "Disabled"}
                              size="small"
                              color={enabled ? "success" : "default"}
                              variant={enabled ? "filled" : "outlined"}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Vendor: {product.rewardVendor}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            SKU: {product.sku}
                          </Typography>
                          {product.gtin && (
                            <Typography variant="body2" color="text.secondary">
                              GTIN: {product.gtin}
                            </Typography>
                          )}
                          <Box sx={{ mt: "auto" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {product.pointsCost.toLocaleString()} points
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Tap to edit details
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
            {!loading && selectedTenantId && rewardProducts.length === 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  {debouncedSearch ? "No reward products match this search." : "No reward products available."}
                </Alert>
              </Grid>
            )}
          </Grid>
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
