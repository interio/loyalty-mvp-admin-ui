import React, { useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DetailSection } from "../components/DetailSection";
import { useAuth } from "../auth/AuthContext";
import { useTenant } from "../modules/tenants/TenantContext";
import { CUSTOMER_QUERY } from "../modules/customers/queries";
import { CUSTOMER_TRANSACTIONS_QUERY, MANUAL_ADJUST_POINTS_MUTATION } from "../modules/ledger/queries";
import { USERS_BY_CUSTOMER_QUERY } from "../modules/users/queries";

type Transaction = {
  id: string;
  customerId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  comment?: string | null;
  amount: number;
  reason: string;
  correlationId?: string | null;
  createdAt: string;
  appliedRulesJson?: string | null;
};

export const CustomerTransactionsPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [adjustAmount, setAdjustAmount] = React.useState("");
  const [adjustCorrelationId, setAdjustCorrelationId] = React.useState("");
  const [adjustComment, setAdjustComment] = React.useState("");
  const [adjustError, setAdjustError] = React.useState<string | null>(null);

  const { data: customerData, loading: customerLoading, error: customerError, refetch: refetchCustomer } = useQuery(CUSTOMER_QUERY, {
    variables: { id: customerId ?? "" },
    skip: !customerId,
    fetchPolicy: "network-only",
  });
  const customer = customerData?.customer ?? null;

  const { data: usersData } = useQuery(USERS_BY_CUSTOMER_QUERY, {
    variables: { customerId: customerId ?? "" },
    skip: !customerId,
  });
  const users = usersData?.usersByCustomer ?? [];

  const { data: txData, loading: txLoading, error: txError, refetch: refetchTransactions } = useQuery(CUSTOMER_TRANSACTIONS_QUERY, {
    variables: { customerId: customerId ?? "" },
    skip: !customerId,
    fetchPolicy: "network-only",
  });
  const transactions: Transaction[] = txData?.customerTransactions ?? [];
  const [manualAdjustPoints, { loading: adjusting }] = useMutation(MANUAL_ADJUST_POINTS_MUTATION);

  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  const userEmailById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((user: any) => {
      if (user?.id && user?.email) {
        map.set(user.id, user.email);
      }
    });
    return map;
  }, [users]);

  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");
  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "—");

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

  const renderCorrelation = (tx: Transaction) => {
    const correlationId = tx.correlationId?.trim();
    if (!correlationId) return "—";

    if (tx.reason === "reward_redeem") {
      return (
        <Link component={RouterLink} to={`/reward-orders/${correlationId}`} underline="hover">
          {correlationId}
        </Link>
      );
    }

    if (tx.reason === "invoice_earn") {
      return (
        <Link
          component={RouterLink}
          to="/invoices"
          state={{ prefillSearch: correlationId, autoOpenInvoiceId: correlationId }}
          underline="hover"
        >
          {correlationId}
        </Link>
      );
    }

    return correlationId;
  };

  const openAdjustDialog = () => {
    setAdjustAmount("");
    setAdjustCorrelationId("");
    setAdjustComment("");
    setAdjustError(null);
    setAdjustOpen(true);
  };

  const submitAdjustment = async () => {
    if (!customerId) return;
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
            customerId,
            amount: amountValue,
            actorEmail: user?.email ?? null,
            comment: adjustComment.trim() || null,
            correlationId: adjustCorrelationId.trim() || null,
          },
        },
      });
      await Promise.all([refetchCustomer(), refetchTransactions()]);
      setAdjustOpen(false);
    } catch (err) {
      setAdjustError((err as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Points transactions"
        subheader={
          selectedTenantName
            ? `Viewing transactions for ${selectedTenantName}`
            : "Select a tenant from the header to load transactions."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                onClick={() => navigate("/customers", { state: { expandCustomerId: customerId } })}
                disabled={!customerId}
              >
                Back to customer
              </Button>
              <Button variant="text" onClick={() => navigate("/customers")}>
                Back to customers
              </Button>
            </Stack>
          </Box>
          {!selectedTenantId && !tenantsLoading && (
            <Alert severity="info">Select a tenant to view customer transactions.</Alert>
          )}
          {(customerError || txError) && (
            <Alert severity="error">{customerError?.message ?? txError?.message}</Alert>
          )}
          {(customerLoading || txLoading) && <LinearProgress />}
          {customer && (
            <DetailSection title="Points account">
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Customer: {customer.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Balance: {customer.pointsAccount?.balance ?? 0} • Updated: {formatDate(customer.pointsAccount?.updatedAt)}
                </Typography>
                <Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={openAdjustDialog}
                    disabled={!customerId}
                  >
                    Manual adjustment
                  </Button>
                </Box>
              </Stack>
            </DetailSection>
          )}
          {selectedTenantId && !txLoading && transactions.length === 0 && (
            <Alert severity="info">No transactions found for this customer.</Alert>
          )}
          {transactions.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Comment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rules</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Correlation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => {
                  const userEmail = tx.actorUserId ? userEmailById.get(tx.actorUserId) : null;
                  const actorLabel = tx.actorEmail
                    ? tx.actorEmail
                    : tx.actorUserId && userEmail
                      ? `${userEmail} (${tx.actorUserId})`
                      : customer?.contactEmail ?? "—";
                  const appliedRules = parseAppliedRules(tx.appliedRulesJson);
                  const rulesLabel = appliedRules.length > 0 ? `${appliedRules.length} rule(s)` : "—";
                  return (
                    <TableRow key={tx.id}>
                    <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                    <TableCell>{tx.amount}</TableCell>
                    <TableCell>{tx.reason}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap title={tx.comment ?? ""}>
                        {tx.comment ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {rulesLabel}
                        </Typography>
                        {appliedRules.length > 0 && (
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            {appliedRules.map((rule: any, idx: number) => {
                              const ruleType = rule.ruleType ?? rule.RuleType ?? "rule";
                              const ruleName = rule.ruleName ?? rule.RuleName ?? "—";
                              const ruleVersion = rule.ruleVersion ?? rule.RuleVersion ?? "?";
                              const ruleId = rule.ruleId ?? rule.RuleId ?? "";
                              const details = describeRuleDetails(rule);
                              return (
                                <Box key={`${tx.id}-rule-${idx}`} sx={{ bgcolor: "var(--detail-section-inner-bg)", borderRadius: 1, p: 1 }}>
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
                      <TableCell>{renderCorrelation(tx)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Stack>
      </CardContent>
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} aria-labelledby="manual-adjust-title">
        <DialogTitle id="manual-adjust-title">Manual points adjustment</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 360 }}>
          <TextField
            label="Amount"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            helperText="Use negative values to deduct points."
            type="number"
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
          {adjustError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {adjustError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAdjustment} disabled={adjusting}>
            {adjusting ? "Saving..." : "Apply"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
