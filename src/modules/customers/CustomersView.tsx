import React, { useEffect, useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
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
import { CUSTOMERS_BY_TENANT_QUERY, CUSTOMERS_BY_TENANT_SEARCH_QUERY } from "./queries";
import { USERS_BY_CUSTOMER_QUERY } from "../users/queries";
import { CUSTOMER_TRANSACTIONS_QUERY } from "../ledger/queries";
import { useTenant } from "../tenants/TenantContext";

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

  const { data, loading, error, refetch } = useQuery(CUSTOMERS_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });
  const [loadUsers] = useLazyQuery(USERS_BY_CUSTOMER_QUERY);
  const [loadTransactions] = useLazyQuery(CUSTOMER_TRANSACTIONS_QUERY);
  const [searchCustomers, { data: searchData, loading: searching, error: searchError }] = useLazyQuery(
    CUSTOMERS_BY_TENANT_SEARCH_QUERY,
  );

  const customers: Customer[] = data?.customersByTenant ?? [];
  const searchedCustomers: Customer[] = searchData?.customersByTenantSearch ?? [];
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  const activeCustomers = search.trim() ? searchedCustomers : customers;
  const activeError = search.trim() ? searchError : error;
  const activeLoading = search.trim() ? searching : loading;

  useEffect(() => {
    setExpandedCustomerId(null);
  }, [selectedTenantId]);

  useEffect(() => {
    const term = search.trim();
    if (!selectedTenantId) return;
    if (!term) return;
    const handle = setTimeout(() => {
      searchCustomers({ variables: { tenantId: selectedTenantId, search: term } });
    }, 250);
    return () => clearTimeout(handle);
  }, [search, selectedTenantId, searchCustomers]);

  useEffect(() => {
    if (selectedTenantId && !search.trim()) {
      refetch({ tenantId: selectedTenantId });
    }
  }, [selectedTenantId, search, refetch]);

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
          {!selectedTenantId && !tenantsLoading && (
            <Typography variant="body2" color="text.secondary">
              Choose a tenant to see its customers.
            </Typography>
          )}
          {activeError && <Alert severity="error">{activeError.message}</Alert>}
          {activeLoading && <LinearProgress />}
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
                {activeCustomers.map((customer) => {
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
                                                <TableCell>{formatDate(tx.createdAt)}</TableCell>
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
                {selectedTenantId && !activeLoading && activeCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        No customers match this search.
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
