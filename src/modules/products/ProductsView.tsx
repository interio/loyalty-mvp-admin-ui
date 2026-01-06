import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
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
import { PRODUCTS_QUERY, PRODUCTS_SEARCH_QUERY } from "./queries";

type Product = {
  id: string;
  distributorId: string;
  sku: string;
  gtin?: string | null;
  name: string;
  cost: number;
  createdAt?: string;
  updatedAt?: string;
  attributes?: { key: string; value?: string | null }[];
};

export const ProductsView: React.FC = () => {
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(PRODUCTS_QUERY);
  const [searchProducts, { data: searchData, loading: searching, error: searchError }] = useLazyQuery(PRODUCTS_SEARCH_QUERY);

  const products: Product[] = data?.products ?? [];
  const searchedProducts: Product[] = searchData?.productsSearch ?? [];

  const activeProducts = search.trim() ? searchedProducts : products;
  const activeError = search.trim() ? searchError : error;
  const activeLoading = search.trim() ? searching : loading;

  useEffect(() => {
    setExpandedProductId(null);
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (!term) return;
    const handle = setTimeout(() => {
      searchProducts({ variables: { search: term } });
    }, 250);
    return () => clearTimeout(handle);
  }, [search, searchProducts]);

  useEffect(() => {
    if (!search.trim()) {
      refetch();
    }
  }, [search, refetch]);

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "—");

  return (
    <Card>
      <CardHeader
        title="Products"
        subheader="Viewing all products"
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
          {activeError && <Alert severity="error">{activeError.message}</Alert>}
          {activeLoading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>GTIN</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeProducts.map((product) => {
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
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.gtin ?? "—"}</TableCell>
                        <TableCell>{product.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{formatDate(product.updatedAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Product details
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemText primary="Product ID" secondary={product.id} />
                                </ListItem>
                                <ListItem>
                                  <ListItemText primary="Distributor ID" secondary={product.distributorId} />
                                </ListItem>
                                <ListItem>
                                  <ListItemText primary="SKU" secondary={product.sku} />
                                </ListItem>
                                <ListItem>
                                  <ListItemText primary="GTIN" secondary={product.gtin ?? "—"} />
                                </ListItem>
                                <ListItem>
                                  <ListItemText
                                    primary="Cost"
                                    secondary={product.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemText primary="Created" secondary={formatDate(product.createdAt)} />
                                </ListItem>
                                <ListItem>
                                  <ListItemText primary="Updated" secondary={formatDate(product.updatedAt)} />
                                </ListItem>
                                {product.attributes && product.attributes.length > 0 && (
                                  <ListItem>
                                    <ListItemText
                                      primary="Attributes"
                                      secondary={
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
                                            product.attributes.reduce<Record<string, any>>((acc, kv) => {
                                              acc[kv.key] = kv.value;
                                              return acc;
                                            }, {}),
                                            null,
                                            2,
                                          )}
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                )}
                              </List>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {!activeLoading && activeProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        No products match this search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>
    </Card>
  );
};
