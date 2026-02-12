import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
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
import SearchIcon from "@mui/icons-material/Search";
import { useTenant } from "../tenants/TenantContext";
import { INVOICES_BY_TENANT_PAGE_QUERY } from "./queries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

type Invoice = {
  id: string;
  tenantId: string;
  invoiceId: string;
  customerExternalId?: string | null;
  occurredAt?: string | null;
  receivedAt: string;
  status: string;
  attemptCount: number;
  lastAttemptAt?: string | null;
  processedAt?: string | null;
  error?: string | null;
  currency?: string | null;
  actorEmail?: string | null;
  actorExternalId?: string | null;
  lines?: { sku: string; quantity: number; netAmount: number }[];
  appliedRulesJson?: string | null;
};

type InvoicesRouteState = {
  refreshInvoices?: boolean;
  prefillSearch?: string;
  autoOpenInvoiceId?: string;
};

export const InvoicesView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingAutoOpenInvoiceId, setPendingAutoOpenInvoiceId] = useState<string | null>(null);
  const pageSize = 25;
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const locationState = (location.state as InvoicesRouteState | null) ?? null;

  const { data, loading, error, refetch } = useQuery(INVOICES_BY_TENANT_PAGE_QUERY, {
    variables: {
      tenantId: selectedTenantId ?? "",
      page,
      pageSize,
      search: debouncedSearch || null,
    },
    skip: !selectedTenantId,
  });

  const invoices: Invoice[] = data?.invoicesByTenantPage?.nodes ?? [];
  const pageInfo = data?.invoicesByTenantPage?.pageInfo;
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );
  const refreshInvoices = locationState?.refreshInvoices === true;

  useEffect(() => {
    if (selectedTenantId) {
      setPage(1);
    }
  }, [selectedTenantId, debouncedSearch]);

  useEffect(() => {
    const prefillSearch = locationState?.prefillSearch?.trim();
    const autoOpenInvoiceId = locationState?.autoOpenInvoiceId?.trim();
    if (!prefillSearch && !autoOpenInvoiceId) return;

    if (prefillSearch) {
      setSearch(prefillSearch);
      setPage(1);
    }
    if (autoOpenInvoiceId) {
      setPendingAutoOpenInvoiceId(autoOpenInvoiceId);
    }

    navigate(".", { replace: true, state: refreshInvoices ? { refreshInvoices: true } : {} });
  }, [locationState?.prefillSearch, locationState?.autoOpenInvoiceId, refreshInvoices, navigate]);

  useEffect(() => {
    if ((pageInfo?.totalPages ?? 0) > 0 && page > (pageInfo?.totalPages ?? 0)) {
      setPage(pageInfo?.totalPages ?? 1);
    }
  }, [pageInfo, page]);

  useEffect(() => {
    if (!refreshInvoices || !selectedTenantId) return;
    void refetch({
      tenantId: selectedTenantId,
      page,
      pageSize,
      search: debouncedSearch || null,
    });
    navigate(".", { replace: true, state: {} });
  }, [refreshInvoices, selectedTenantId, page, pageSize, debouncedSearch, refetch, navigate]);

  useEffect(() => {
    if (!selectedTenantId || !pendingAutoOpenInvoiceId || loading) return;

    const target = pendingAutoOpenInvoiceId.trim().toLowerCase();
    const exactMatch = invoices.find((invoice) => invoice.invoiceId?.trim().toLowerCase() === target);
    if (exactMatch) {
      setPendingAutoOpenInvoiceId(null);
      navigate(`/invoices/${exactMatch.id}`);
      return;
    }

    if (debouncedSearch.toLowerCase() === target) {
      setPendingAutoOpenInvoiceId(null);
    }
  }, [selectedTenantId, pendingAutoOpenInvoiceId, loading, invoices, debouncedSearch, navigate]);

  const totalLabel = debouncedSearch
    ? `Matches: ${pageInfo?.totalCount ?? 0}`
    : `Total invoices: ${pageInfo?.totalCount ?? 0}`;

  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");

  return (
    <Card>
      <CardHeader
        title="Invoices"
        subheader={
          selectedTenantName
            ? `Viewing invoices for ${selectedTenantName}`
            : "Select a tenant from the header to load invoices."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search by invoice ID, customer external ID, status, or error"
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
              Choose a tenant to see its invoices.
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice ID</TableCell>
                  <TableCell>Customer External ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Occurred</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Total Qty</TableCell>
                  <TableCell>Total Net</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => {
                  const lines = invoice.lines ?? [];
                  const totals = lines.reduce(
                    (acc, line) => ({
                      quantity: acc.quantity + (line.quantity || 0),
                      netAmount: acc.netAmount + (line.netAmount || 0),
                    }),
                    { quantity: 0, netAmount: 0 },
                  );
                  return (
                    <TableRow
                      key={invoice.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell>{invoice.invoiceId}</TableCell>
                      <TableCell>{invoice.customerExternalId ?? "—"}</TableCell>
                      <TableCell>{invoice.status}</TableCell>
                      <TableCell>{formatDateTime(invoice.occurredAt)}</TableCell>
                      <TableCell>{formatDateTime(invoice.receivedAt)}</TableCell>
                      <TableCell>{invoice.attemptCount}</TableCell>
                      <TableCell>{totals.quantity}</TableCell>
                      <TableCell>{totals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap title={invoice.error ?? ""}>
                          {invoice.error ?? "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {selectedTenantId && !loading && invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearch ? "No invoices match this search." : "No invoices found for this tenant."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {(pageInfo?.totalPages ?? 0) > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Pagination
                count={pageInfo?.totalPages ?? 0}
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
