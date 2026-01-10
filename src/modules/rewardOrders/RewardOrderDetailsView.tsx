import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import { REWARD_ORDER_QUERY, UPDATE_REWARD_ORDER_STATUS_MUTATION } from "./queries";

type RewardOrderItem = {
  id: string;
  rewardProductId: string;
  rewardVendor: string;
  sku: string;
  name: string;
  quantity: number;
  pointsCost: number;
  totalPoints: number;
};

type RewardOrder = {
  id: string;
  tenantId: string;
  customerId: string;
  actorUserId: string;
  status: string;
  totalPoints: number;
  placedOnBehalf: boolean;
  providerReference?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: RewardOrderItem[];
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "—");

const statusColor = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("dispatch")) return "info";
  if (normalized.includes("failed")) return "error";
  if (normalized.includes("cancel")) return "default";
  return "success";
};

const STATUS_OPTIONS_PASCAL = [
  { value: "PendingDispatch", label: "Pending dispatch" },
  { value: "Dispatched", label: "Dispatched" },
  { value: "Failed", label: "Failed" },
  { value: "Cancelled", label: "Cancelled" },
];

const STATUS_OPTIONS_SNAKE = [
  { value: "PENDING_DISPATCH", label: "Pending dispatch" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const RewardOrderDetailsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedTenantId } = useTenant();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(REWARD_ORDER_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", id: id ?? "" },
    skip: !selectedTenantId || !id,
  });

  const [updateStatus] = useMutation(UPDATE_REWARD_ORDER_STATUS_MUTATION);

  const order: RewardOrder | null = data?.rewardOrder ?? null;
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
  }, [order]);

  const statusOptions = useMemo(() => {
    if (!status) return STATUS_OPTIONS_PASCAL;
    return status.includes("_") ? STATUS_OPTIONS_SNAKE : STATUS_OPTIONS_PASCAL;
  }, [status]);

  const hasChanges = order && status && status !== order.status;

  const handleSave = async () => {
    if (!order || !selectedTenantId) return;
    setSaving(true);
    setSaveError(null);
    setMessage(null);
    try {
      const result = await updateStatus({
        variables: {
          input: {
            tenantId: selectedTenantId,
            orderId: order.id,
            status,
          },
        },
      });
      if (!result.data?.updateRewardOrderStatus) {
        throw new Error("Failed to update reward order status.");
      }
      setMessage("Order status updated.");
      await refetch();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedTenantId) {
    return (
      <Card>
        <CardHeader title="Reward Order" subheader="Select a tenant to view reward order details." />
        <CardContent>
          <Alert severity="info">Select a tenant from the header, then open a reward order.</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Reward Order Details"
        subheader={order ? `Order ${order.id}` : "Loading reward order"}
      />
      <CardContent>
        <Stack spacing={2}>
          {loading && <LinearProgress />}
          {error && <Alert severity="error">{error.message}</Alert>}
          {saveError && <Alert severity="error">{saveError}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          {!loading && !order && (
            <Alert severity="warning">Reward order not found for the selected tenant.</Alert>
          )}

          {order && (
            <>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Customer ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {order.customerId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Actor User ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {order.actorUserId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Total Points
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {order.totalPoints.toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Placement
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {order.placedOnBehalf ? "Placed on behalf" : "Self-service"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Created
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(order.createdAt)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Updated
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(order.updatedAt)}
                  </Typography>
                </Box>
                {order.providerReference && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Provider Reference
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {order.providerReference}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Current Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={order.status}
                      color={statusColor(order.status) as "default" | "info" | "success" | "error"}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>

              <Box>
                <FormControl fullWidth>
                  <InputLabel id="reward-order-status-label">Change status</InputLabel>
                  <Select
                    labelId="reward-order-status-label"
                    label="Change status"
                    value={status}
                    onChange={(e) => setStatus(String(e.target.value))}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button variant="contained" onClick={handleSave} disabled={!hasChanges || saving}>
                  {saving ? "Saving..." : "Save status"}
                </Button>
                <Button variant="text" onClick={() => navigate("/reward-orders")} disabled={saving}>
                  Back to orders
                </Button>
              </Stack>

              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Order Items
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Points</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.rewardVendor}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.pointsCost}</TableCell>
                          <TableCell>{item.totalPoints}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
