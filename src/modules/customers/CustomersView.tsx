import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
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
import { CUSTOMER_TRANSACTIONS_QUERY, MANUAL_ADJUST_POINTS_MUTATION } from "../ledger/queries";
import { useTenant } from "../tenants/TenantContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

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
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [usersCache, setUsersCache] = useState<Record<string, any[]>>({});
  const [loadingUsersFor, setLoadingUsersFor] = useState<string | null>(null);
  const [transactionsCache, setTransactionsCache] = useState<Record<string, any[]>>({});
  const [loadingTransactionsFor, setLoadingTransactionsFor] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustCustomerId, setAdjustCustomerId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustCorrelationId, setAdjustCorrelationId] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const pageSize = 25;
  const { data, loading, error } = useQuery(CUSTOMERS_BY_TENANT_PAGE_QUERY, {
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
  const [loadTransactions] = useLazyQuery(CUSTOMER_TRANSACTIONS_QUERY);
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
    if (usersCache[customerId] && transactionsCache[customerId]) return;

    setLoadingUsersFor(customerId);
    setLoadingTransactionsFor(customerId);
    try {
      const result = await loadUsers({ variables: { customerId } });
      const users = result.data?.usersByCustomer ?? [];
      setUsersCache((prev) => ({ ...prev, [customerId]: users }));
      const txResult = await loadTransactions({ variables: { customerId } });
      const transactions = txResult.data?.customerTransactions ?? [];
      setTransactionsCache((prev) => ({ ...prev, [customerId]: transactions }));
    } finally {
      setLoadingUsersFor(null);
      setLoadingTransactionsFor(null);
    }
  };

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "-");
  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : "-");
  const parseAppliedRules = (raw?: string | null) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const describeRuleDetails = (rule: any) => {
    const details = rule.conditions ?? rule.Conditions ?? {};
    if (!details || typeof details !== "object") return "";
    const entries = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `${key}:${value}`);
    return entries.length > 0 ? `{${entries.join(", ")}}` : "";
  };

  const openAdjustDialog = (customerId: string) => {
    setAdjustCustomerId(customerId);
    setAdjustAmount("");
    setAdjustCorrelationId("");
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
            correlationId: adjustCorrelationId.trim() || null,
          },
        },
      });
      const txResult = await loadTransactions({ variables: { customerId: adjustCustomerId } });
      const transactions = txResult.data?.customerTransactions ?? [];
      setTransactionsCache((prev) => ({ ...prev, [adjustCustomerId]: transactions }));
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
                  <TableCell>External ID</TableCell>
                  <TableCell>Contact Email</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const users = usersCache[customer.id];
                  const transactions = transactionsCache[customer.id];
                  return (
                    <React.Fragment key={customer.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleExpand(customer.id)}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.externalId ?? "—"}</TableCell>
                        <TableCell>{customer.contactEmail ?? "—"}</TableCell>
                        <TableCell>{customer.pointsAccount?.balance ?? 0}</TableCell>
                        <TableCell>{formatDate(customer.createdAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
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
                                      <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                          Points account
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          Balance: {customer.pointsAccount?.balance ?? 0} • Updated:{" "}
                                          {formatDate(customer.pointsAccount?.updatedAt ?? undefined)}
                                        </Typography>
                                      </Grid>
                                    </Grid>
                                  </DetailSection>
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
                                <Grid item xs={12}>
                                  <DetailSection title="Points transactions history">
                                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        sx={{ bgcolor: "#0c9b50" }}
                                        onClick={() => openAdjustDialog(customer.id)}
                                      >
                                        Manual adjustment
                                      </Button>
                                    </Box>
                                    {loadingTransactionsFor === customer.id && <LinearProgress />}
                                    {transactions?.length === 0 && loadingTransactionsFor !== customer.id && (
                                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        No transactions found for this customer.
                                      </Typography>
                                    )}
                                    {transactions && transactions.length > 0 && (
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Rules</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Correlation</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {transactions.map((tx: any) => {
                                            const userEmail = users?.find((u: any) => u.id === tx.actorUserId)?.email;
                                            const actorLabel = tx.actorUserId && userEmail
                                              ? `${userEmail} (${tx.actorUserId})`
                                              : customer.contactEmail ?? "—";
                                            const appliedRules = parseAppliedRules(tx.appliedRulesJson);
                                            const rulesLabel = appliedRules.length > 0 ? `${appliedRules.length} rule(s)` : "—";
                                            return (
                                              <TableRow key={tx.id}>
                                              <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                                                <TableCell>{tx.amount}</TableCell>
                                                <TableCell>{tx.reason}</TableCell>
                                                <TableCell>
                                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {rulesLabel}
                                                  </Typography>
                                                  {appliedRules.length > 0 && (
                                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                                      {appliedRules.map((rule: any, idx: number) => {
                                                        const ruleType = rule.ruleType ?? rule.RuleType ?? "rule";
                                                        const ruleVersion = rule.ruleVersion ?? rule.RuleVersion ?? "?";
                                                        const pointsAwarded = rule.pointsAwarded ?? rule.PointsAwarded ?? 0;
                                                        const ruleId = rule.ruleId ?? rule.RuleId ?? "";
                                                        const details = describeRuleDetails(rule);
                                                        return (
                                                          <Box key={`${tx.id}-rule-${idx}`} sx={{ bgcolor: "var(--detail-section-inner-bg)", borderRadius: 1, p: 1 }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                              type: {ruleType}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                              version: v{ruleVersion}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                              id: {ruleId || "—"}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                              conditions: {details || "—"}
                                                            </Typography>
                                                          </Box>
                                                        );
                                                      })}
                                                    </Stack>
                                                  )}
                                                </TableCell>
                                                <TableCell>{actorLabel}</TableCell>
                                                <TableCell>{tx.correlationId ?? "—"}</TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
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
