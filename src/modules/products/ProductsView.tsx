import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
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
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import { DetailSection } from "../../components/DetailSection";
import { PRODUCTS_PAGE_QUERY } from "./queries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useTenant } from "../tenants/TenantContext";

type Product = {
  id: string;
  tenantId: string;
  distributorId: string;
  distributorDisplayName?: string | null;
  sku: string;
  gtin?: string | null;
  name: string;
  cost: number;
  createdAt?: string;
  updatedAt?: string;
  attributes?: { key: string; value?: string | null }[];
};

export const ProductsView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const { data, loading, error } = useQuery(PRODUCTS_PAGE_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", page, pageSize, search: debouncedSearch || null },
    skip: !selectedTenantId,
  });

  const products: Product[] = data?.productsPage?.nodes ?? [];
  const pageInfo = data?.productsPage?.pageInfo;
  const tenantName = useMemo(() => tenants.find((t) => t.id === selectedTenantId)?.name, [tenants, selectedTenantId]);

  const totalLabel = debouncedSearch
    ? `Matches: ${pageInfo?.totalCount ?? 0}`
    : `Total products: ${pageInfo?.totalCount ?? 0}`;
  const totalPages = pageInfo?.totalPages ?? 0;

  useEffect(() => {
    setExpandedProductId(null);
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "—");

  return (
    <Card>
      <CardHeader
        title="Products"
        subheader={
          tenantName
            ? `Viewing products for ${tenantName}`
            : tenantsLoading
              ? "Loading tenants..."
              : "Select a tenant from the header to load products."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search products by name, SKU, or GTIN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {totalLabel}
          </Typography>
          {!selectedTenantId && !tenantsLoading && (
            <Alert severity="info">Select a tenant to view products.</Alert>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Distributor</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>GTIN</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const isExpanded = expandedProductId === product.id;
                  return (
                    <React.Fragment key={product.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => setExpandedProductId(isExpanded ? null : product.id)}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.distributorDisplayName ?? "—"}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.gtin ?? "—"}</TableCell>
                        <TableCell>{product.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{formatDate(product.updatedAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <DetailSection title="Product details">
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Product ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.id}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Tenant ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.tenantId}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Distributor ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.distributorId}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Distributor
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.distributorDisplayName ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      SKU
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.sku}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      GTIN
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.gtin ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Cost
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Created
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(product.createdAt)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Updated
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(product.updatedAt)}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </DetailSection>
                              <DetailSection title="Product attributes" sx={{ mt: 2 }}>
                                {product.attributes && product.attributes.length > 0 ? (
                                  <Box
                                    component="pre"
                                    sx={{
                                      m: 0,
                                      p: 1.5,
                                      bgcolor: "var(--detail-section-inner-bg)",
                                      borderRadius: 1,
                                      fontSize: 12,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {JSON.stringify(
                                      product.attributes.reduce<Record<string, any>>((acc, kv) => {
                                        acc[kv.key] = kv.value;
                                        return acc;
                                      }, {}),
                                      null,
                                      2,
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    No attributes available.
                                  </Typography>
                                )}
                              </DetailSection>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {!loading && products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearch ? "No products match this search." : "No products available."}
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
