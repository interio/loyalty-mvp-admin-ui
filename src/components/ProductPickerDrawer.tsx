import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { PRODUCTS_QUERY } from "../modules/products/queries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

type Product = {
  id: string;
  distributorDisplayName?: string | null;
  sku: string;
  gtin?: string | null;
  name: string;
};

type SortField = "name" | "distributor" | "sku" | "gtin";
type SortDirection = "asc" | "desc";
type GtinFilter = "all" | "with_gtin" | "without_gtin";

const PAGE_SIZE = 10;

const normalizeSkus = (values: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  values.forEach((raw) => {
    const value = raw.trim();
    if (!value) return;
    const key = value.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(value);
  });
  return normalized;
};

type ProductPickerDrawerProps = {
  open: boolean;
  tenantId?: string | null;
  selectedSkus: string[];
  onClose: () => void;
  onConfirm: (selectedSkus: string[]) => void;
  title?: string;
};

export const ProductPickerDrawer: React.FC<ProductPickerDrawerProps> = ({
  open,
  tenantId,
  selectedSkus,
  onClose,
  onConfirm,
  title = "Product picker",
}) => {
  const [search, setSearch] = useState("");
  const [distributorFilter, setDistributorFilter] = useState<string>("all");
  const [gtinFilter, setGtinFilter] = useState<GtinFilter>("all");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [selectedSkuSet, setSelectedSkuSet] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const { data, loading, error } = useQuery(PRODUCTS_QUERY, {
    variables: { tenantId: tenantId ?? "" },
    skip: !open || !tenantId,
    fetchPolicy: "cache-and-network",
  });

  const products: Product[] = data?.products ?? [];

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDistributorFilter("all");
    setGtinFilter("all");
    setSelectedOnly(false);
    setSortField("name");
    setSortDirection("asc");
    setPage(1);
    setSelectedSkuSet(new Set(normalizeSkus(selectedSkus)));
  }, [open, selectedSkus]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, distributorFilter, gtinFilter, selectedOnly]);

  const distributorOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      const distributor = product.distributorDisplayName?.trim();
      if (distributor) set.add(distributor);
    });
    return Array.from(set).sort((left, right) => left.localeCompare(right));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = debouncedSearch.toLowerCase();

    return products.filter((product) => {
      const distributor = product.distributorDisplayName?.trim() ?? "";
      const hasGtin = Boolean(product.gtin?.trim());

      if (distributorFilter !== "all" && distributor !== distributorFilter) return false;
      if (gtinFilter === "with_gtin" && !hasGtin) return false;
      if (gtinFilter === "without_gtin" && hasGtin) return false;
      if (selectedOnly && !selectedSkuSet.has(product.sku)) return false;

      if (!normalizedSearch) return true;

      const haystack = [product.name, distributor, product.sku, product.gtin ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [products, debouncedSearch, distributorFilter, gtinFilter, selectedOnly, selectedSkuSet]);

  const sortedProducts = useMemo(() => {
    const getValue = (product: Product) => {
      switch (sortField) {
        case "name":
          return product.name;
        case "distributor":
          return product.distributorDisplayName ?? "";
        case "sku":
          return product.sku;
        case "gtin":
          return product.gtin ?? "";
        default:
          return "";
      }
    };

    return [...filteredProducts].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);
      const result = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredProducts, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedProducts.slice(start, start + PAGE_SIZE);
  }, [page, sortedProducts]);

  const visibleSkus = useMemo(
    () => pagedProducts.map((product) => product.sku).filter((value) => value.trim().length > 0),
    [pagedProducts],
  );

  const allVisibleSelected = visibleSkus.length > 0 && visibleSkus.every((sku) => selectedSkuSet.has(sku));
  const someVisibleSelected = visibleSkus.some((sku) => selectedSkuSet.has(sku));

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  };

  const toggleProduct = (sku: string, checked: boolean) => {
    setSelectedSkuSet((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(sku);
      } else {
        next.delete(sku);
      }
      return next;
    });
  };

  const toggleVisible = (checked: boolean) => {
    setSelectedSkuSet((prev) => {
      const next = new Set(prev);
      visibleSkus.forEach((sku) => {
        if (checked) {
          next.add(sku);
        } else {
          next.delete(sku);
        }
      });
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(normalizeSkus(Array.from(selectedSkuSet)));
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: 960 },
          maxWidth: "100vw",
        },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Select products to use in campaign rules.
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close product picker">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack spacing={2}>
            <TextField
              placeholder="Search by name, distributor, SKU, or GTIN"
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
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="picker-distributor-filter">Distributor</InputLabel>
                <Select
                  labelId="picker-distributor-filter"
                  label="Distributor"
                  value={distributorFilter}
                  onChange={(e) => setDistributorFilter(String(e.target.value))}
                >
                  <MenuItem value="all">All distributors</MenuItem>
                  {distributorOptions.map((distributor) => (
                    <MenuItem key={distributor} value={distributor}>
                      {distributor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="picker-gtin-filter">GTIN</InputLabel>
                <Select
                  labelId="picker-gtin-filter"
                  label="GTIN"
                  value={gtinFilter}
                  onChange={(e) => setGtinFilter(e.target.value as GtinFilter)}
                >
                  <MenuItem value="all">All products</MenuItem>
                  <MenuItem value="with_gtin">With GTIN</MenuItem>
                  <MenuItem value="without_gtin">Without GTIN</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                sx={{ m: 0, minHeight: 56, px: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, justifyContent: "space-between" }}
                control={<Switch checked={selectedOnly} onChange={(e) => setSelectedOnly(e.target.checked)} />}
                label="Selected only"
                labelPlacement="start"
              />
            </Stack>
          </Stack>
        </Box>

        {!tenantId && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info">Select a tenant to load products.</Alert>
          </Box>
        )}
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error.message}</Alert>
          </Box>
        )}
        {loading && <LinearProgress />}

        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && someVisibleSelected}
                      onChange={(e) => toggleVisible(e.target.checked)}
                      inputProps={{ "aria-label": "Select visible products" }}
                    />
                  </TableCell>
                  <TableCell sortDirection={sortField === "name" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === "name"}
                      direction={sortField === "name" ? sortDirection : "asc"}
                      onClick={() => toggleSort("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortField === "distributor" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === "distributor"}
                      direction={sortField === "distributor" ? sortDirection : "asc"}
                      onClick={() => toggleSort("distributor")}
                    >
                      Distributor
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortField === "sku" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === "sku"}
                      direction={sortField === "sku" ? sortDirection : "asc"}
                      onClick={() => toggleSort("sku")}
                    >
                      SKU
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortField === "gtin" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === "gtin"}
                      direction={sortField === "gtin" ? sortDirection : "asc"}
                      onClick={() => toggleSort("gtin")}
                    >
                      GTIN
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedProducts.map((product) => {
                  const isSelected = selectedSkuSet.has(product.sku);
                  return (
                    <TableRow key={product.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => toggleProduct(product.sku, e.target.checked)}
                          inputProps={{ "aria-label": `Select ${product.name}` }}
                        />
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.distributorDisplayName ?? "-"}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.gtin ?? "-"}</TableCell>
                    </TableRow>
                  );
                })}
                {!loading && pagedProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        No products match your current filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {selectedSkuSet.size} selected
            </Typography>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            )}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleConfirm} disabled={!tenantId}>
                Confirm selection
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
};
