import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Card,
  CardHeader,
  CardContent,
  LinearProgress,
  Pagination,
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
      search: debouncedSearch || null },
    skip: !selectedTenantId });

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

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "—");

  const handleOpen = (productId: string) => {
    navigate(`/reward-products/${productId}`);
  };

  return (
    <Card>
      <CardHeader
        title="Reward Catalog"
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>GTIN</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rewardProducts.map((product) => {
                  const enabled = parseEnabled(product.attributes);
                  return (
                    <TableRow
                      key={product.id}
                      hover
                      onClick={() => handleOpen(product.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {product.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{product.rewardVendor}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.gtin ?? "—"}</TableCell>
                      <TableCell>{product.pointsCost.toLocaleString()}</TableCell>
                      <TableCell>{enabled ? "Enabled" : "Disabled"}</TableCell>
                      <TableCell>{formatDate(product.updatedAt)}</TableCell>
                    </TableRow>
                  );
                })}
                {!loading && selectedTenantId && rewardProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearch ? "No reward products match this search." : "No reward products available."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
