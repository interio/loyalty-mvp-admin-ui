import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { CUSTOMERS_BY_TENANT_PAGE_QUERY } from "./queries";
import { USERS_BY_CUSTOMER_QUERY } from "../users/queries";
import { MANUAL_ADJUST_POINTS_MUTATION } from "../ledger/queries";
import { useTenant } from "../tenants/TenantContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useAuth } from "../../auth/AuthContext";

type Customer = {
  id: string;
  name: string;
  externalId?: string;
  contactEmail?: string;
  tenantId: string;
  createdAt?: string;
  pointsAccount?: {
    balance?: number;
    updatedAt?: string;
  } | null;
};

export const CustomersView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [usersCache, setUsersCache] = useState<Record<string, any[]>>({});
  const [loadingUsersFor, setLoadingUsersFor] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustCustomerId, setAdjustCustomerId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustCorrelationId, setAdjustCorrelationId] = useState("");
  const [adjustComment, setAdjustComment] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const pageSize = 25;
  const { data, loading, error, refetch } = useQuery(CUSTOMERS_BY_TENANT_PAGE_QUERY, {
    variables: {
      tenantId: selectedTenantId ?? "",
      page,
      pageSize,
      search: debouncedSearch || null,
    },
    skip: !selectedTenantId,
    notifyOnNetworkStatusChange: true,
  });
  const [loadUsers] = useLazyQuery(USERS_BY_CUSTOMER_QUERY);
  const [manualAdjustPoints, { loading: adjusting }] = useMutation(MANUAL_ADJUST_POINTS_MUTATION);

  const customers: Customer[] = data?.customersByTenantPage?.nodes ?? [];
  const pageInfo = data?.customersByTenantPage?.pageInfo;
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );
  const totalLabel = debouncedSearch
    ? `Matches: ${pageInfo?.totalCount ?? 0}`
    : `Total customers: ${pageInfo?.totalCount ?? 0}`;
  const totalPages = pageInfo?.totalPages ?? 0;

  useEffect(() => {
    setExpandedCustomerId(null);
  }, [selectedTenantId, page]);

  useEffect(() => {
    if (selectedTenantId) {
      setPage(1);
    }
  }, [selectedTenantId, debouncedSearch]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);



  const handleExpand = async (customerId: string) => {
    const isOpen = expandedCustomerId === customerId;
    if (isOpen) {
      setExpandedCustomerId(null);
      return;
    }
    setExpandedCustomerId(customerId);
    if (usersCache[customerId]) return;

    setLoadingUsersFor(customerId);
    try {
      const result = await loadUsers({ variables: { customerId } });
      const users = result.data?.usersByCustomer ?? [];
      setUsersCache((prev) => ({ ...prev, [customerId]: users }));
    } finally {
      setLoadingUsersFor(null);
    }
  };

  const expandCustomerId = (location.state as { expandCustomerId?: string } | null)?.expandCustomerId;
  useEffect(() => {
    if (!expandCustomerId) return;
    if (expandCustomerId === expandedCustomerId) return;
    void handleExpand(expandCustomerId);
    navigate(".", { replace: true, state: {} });
  }, [expandCustomerId, expandedCustomerId, navigate]);

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "-");

  const openAdjustDialog = (customerId: string) => {
    setAdjustCustomerId(customerId);
    setAdjustAmount("");
    setAdjustCorrelationId("");
    setAdjustComment("");
    setAdjustError(null);
    setAdjustOpen(true);
  };

  const submitAdjustment = async () => {
    if (!adjustCustomerId) return;
    const amountValue = Number(adjustAmount);
    if (!Number.isFinite(amountValue) || amountValue === 0) {
      setAdjustError("Amount must be a non-zero number.");
      return;
    }
    setAdjustError(null);
    try {
      await manualAdjustPoints({
        variables: {
          input: {
            customerId: adjustCustomerId,
            amount: amountValue,
            actorEmail: user?.email ?? null,
            comment: adjustComment.trim() || null,
            correlationId: adjustCorrelationId.trim() || null,
          },
        },
      });
      if (selectedTenantId) {
        await refetch({
          tenantId: selectedTenantId,
          page,
          pageSize,
          search: debouncedSearch || null,
        });
      }
      setAdjustOpen(false);
    } catch (err) {
      setAdjustError((err as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Customers"
        subheader={
          selectedTenantName
            ? `Viewing customers for ${selectedTenantName}`
            : "Select a tenant from the header to load customers."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search customers by name, email, external ID, or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!selectedTenantId}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          {selectedTenantId && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {totalLabel}
            </Typography>
          )}
          {!selectedTenantId && !tenantsLoading && (
            <Typography variant="body2" color="text.secondary">
              Choose a tenant to see its customers.
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>External ID</TableCell>
                  <TableCell>Contact Email</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const users = usersCache[customer.id];
                  return (
                    <React.Fragment key={customer.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleExpand(customer.id)}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.pointsAccount?.balance ?? 0}</TableCell>
                        <TableCell>{customer.externalId ?? "—"}</TableCell>
                        <TableCell>{customer.contactEmail ?? "—"}</TableCell>
                        <TableCell>{formatDate(customer.createdAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Stack spacing={2}>
                                    <DetailSection title="Customer details">
                                      <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Customer ID
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {customer.id}
                                          </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Tenant ID
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {customer.tenantId}
                                          </Typography>
                                        </Grid>
                                      </Grid>
                                    </DetailSection>
                                    <DetailSection title="Points account">
                                      <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Balance
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {customer.pointsAccount?.balance ?? 0}
                                          </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            Updated
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {formatDate(customer.pointsAccount?.updatedAt ?? undefined)}
                                          </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() => navigate(`/customers/${customer.id}/transactions`)}
                                            >
                                              View transactions
                                            </Button>
                                            <Button
                                              size="small"
                                              variant="contained"
                                              sx={{ bgcolor: "#0c9b50" }}
                                              onClick={() => openAdjustDialog(customer.id)}
                                            >
                                              Manual adjustment
                                            </Button>
                                          </Stack>
                                        </Grid>
                                      </Grid>
                                    </DetailSection>
                                  </Stack>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <DetailSection title="Associated users">
                                    {loadingUsersFor === customer.id && <LinearProgress />}
                                    {users?.length === 0 && loadingUsersFor !== customer.id && (
                                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        No users found for this customer.
                                      </Typography>
                                    )}
                                    {users && users.length > 0 && (
                                      <Stack spacing={1}>
                                        {users.map((user: any) => (
                                          <Box key={user.id} sx={{ p: 1, bgcolor: "var(--detail-section-inner-bg)", borderRadius: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                              {user.email}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              id: {user.id} • role: {user.role ?? "-"}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Stack>
                                    )}
                                  </DetailSection>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {selectedTenantId && !loading && customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearch ? "No customers match this search." : "No customers available."}
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
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} aria-labelledby="manual-adjust-title">
        <DialogTitle id="manual-adjust-title">Manual points adjustment</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <TextField
              label="Amount"
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              helperText="Use negative values to deduct points."
              required
            />
            <TextField
              label="Correlation ID (optional)"
              value={adjustCorrelationId}
              onChange={(e) => setAdjustCorrelationId(e.target.value)}
            />
            <TextField
              label="Comment"
              value={adjustComment}
              onChange={(e) => setAdjustComment(e.target.value)}
              placeholder="Why was this adjustment made?"
              multiline
              minRows={3}
            />
            {adjustError && <Alert severity="error">{adjustError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: "#0c9b50" }} onClick={submitAdjustment} disabled={adjusting}>
            {adjusting ? "Saving..." : "Apply"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
