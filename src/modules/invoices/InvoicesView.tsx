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
import { useTenant } from "../tenants/TenantContext";
import { INVOICES_BY_TENANT_QUERY } from "./queries";

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
};

export const InvoicesView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(INVOICES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", take: 200 },
    skip: !selectedTenantId,
  });

  const invoices: Invoice[] = data?.invoicesByTenant ?? [];
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  useEffect(() => {
    if (selectedTenantId) {
      refetch({ tenantId: selectedTenantId, take: 200 });
    }
  }, [selectedTenantId, refetch]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) => {
      const haystack = [
        invoice.invoiceId,
        invoice.customerExternalId ?? "",
        invoice.status,
        invoice.error ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [invoices, search]);

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
                  <TableCell />
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
                {filteredInvoices.map((invoice) => {
                  const isExpanded = expandedInvoiceId === invoice.id;
                  const lines = invoice.lines ?? [];
                  const totals = lines.reduce(
                    (acc, line) => ({
                      quantity: acc.quantity + (line.quantity || 0),
                      netAmount: acc.netAmount + (line.netAmount || 0),
                    }),
                    { quantity: 0, netAmount: 0 },
                  );
                  return (
                    <React.Fragment key={invoice.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
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
                      <TableRow>
                        <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <DetailSection title="Invoice details">
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Invoice ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {invoice.invoiceId}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Tenant ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {invoice.tenantId}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Customer External ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {invoice.customerExternalId ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Currency
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {invoice.currency ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Actor Email
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {invoice.actorEmail ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Actor External ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {invoice.actorExternalId ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Occurred At
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDateTime(invoice.occurredAt)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Processed At
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDateTime(invoice.processedAt)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Last Attempt At
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDateTime(invoice.lastAttemptAt)}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </DetailSection>
                              <DetailSection title="Rules applied" sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  No rules data available yet.
                                </Typography>
                              </DetailSection>
                              <DetailSection title="Line items" sx={{ mt: 2 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                                      <TableCell sx={{ fontWeight: 700 }}>Net Amount</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {lines.map((line, idx) => (
                                      <TableRow key={`${invoice.id}-line-${idx}`}>
                                        <TableCell>{line.sku}</TableCell>
                                        <TableCell>{line.quantity}</TableCell>
                                        <TableCell>{line.netAmount}</TableCell>
                                      </TableRow>
                                    ))}
                                    {lines.length > 0 && (
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Totals</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{totals.quantity}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>
                                          {totals.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    {lines.length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={3}>
                                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            No line items available.
                                          </Typography>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </DetailSection>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {selectedTenantId && !loading && filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Typography variant="body2" color="text.secondary">
                        No invoices match this search.
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
