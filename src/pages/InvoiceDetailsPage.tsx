import React, { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid2,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography } from "@mui/material";
import { DetailSection } from "../components/DetailSection";
import { useTenant } from "../modules/tenants/TenantContext";
import { INVOICE_BY_ID_QUERY } from "../modules/invoices/queries";

type Invoice = {
  id: string;
  tenantId: string;
  invoiceId: string;
  orderId?: string | null;
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

export const InvoiceDetailsPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();

  const { data, loading, error } = useQuery(INVOICE_BY_ID_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", id: invoiceId ?? "" },
    skip: !selectedTenantId || !invoiceId });

  const invoice: Invoice | null = data?.invoiceById ?? null;
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");
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

  const lines = invoice?.lines ?? [];
  const totals = lines.reduce(
    (acc, line) => ({
      quantity: acc.quantity + (line.quantity || 0),
      netAmount: acc.netAmount + (line.netAmount || 0) }),
    { quantity: 0, netAmount: 0 },
  );

  return (
    <Card>
      <CardHeader
        title="Order details"
        subheader={
          selectedTenantName
            ? `Viewing order for ${selectedTenantName}`
            : "Select a tenant from the header to load order details."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Button variant="outlined" onClick={() => navigate("/invoices", { state: { refreshInvoices: true } })}>
              Back to orders
            </Button>
          </Box>
          {!selectedTenantId && !tenantsLoading && (
            <Alert severity="info">Select a tenant to view orders.</Alert>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          {selectedTenantId && !loading && !invoice && <Alert severity="warning">Invoice not found.</Alert>}
          {invoice && (
            <>
              <DetailSection title="Invoice overview">
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Invoice ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.invoiceId}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Tenant ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.tenantId}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Order ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.orderId ?? "—"}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Customer External ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.customerExternalId ?? "—"}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Currency
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.currency ?? "—"}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Status
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.status}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Attempts
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.attemptCount}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Actor Email
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.actorEmail ?? "—"}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Actor External ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.actorExternalId ?? "—"}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Occurred At
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(invoice.occurredAt)}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Received At
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(invoice.receivedAt)}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Processed At
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(invoice.processedAt)}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Last Attempt At
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(invoice.lastAttemptAt)}
                    </Typography>
                  </Grid2>
                  <Grid2 size={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Error
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {invoice.error ?? "—"}
                    </Typography>
                  </Grid2>
                </Grid2>
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

              <DetailSection title="Rules applied" sx={{ mt: 2 }}>
                {(() => {
                  const appliedRules = parseAppliedRules(invoice.appliedRulesJson);
                  if (appliedRules.length === 0) {
                    return (
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        No rules data available yet.
                      </Typography>
                    );
                  }
                  return (
                    <Stack spacing={1}>
                      {appliedRules.map((rule: any, idx: number) => {
                        const ruleType = rule.ruleType ?? rule.RuleType ?? "rule";
                        const ruleName = rule.ruleName ?? rule.RuleName ?? "—";
                        const ruleVersion = rule.ruleVersion ?? rule.RuleVersion ?? "?";
                        const pointsAwarded = rule.pointsAwarded ?? rule.PointsAwarded ?? 0;
                        const ruleId = rule.ruleId ?? rule.RuleId ?? "";
                        const details = describeRuleDetails(rule);
                        return (
                          <Box key={`${invoice.id}-rule-${idx}`} sx={{ bgcolor: "var(--detail-section-inner-bg)", borderRadius: 1, p: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              name: {ruleName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              type: {ruleType}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              version: v{ruleVersion}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              points: {pointsAwarded}
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
                  );
                })()}
              </DetailSection>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
