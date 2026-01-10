import React, { useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import { REWARD_ORDERS_BY_TENANT_QUERY } from "./queries";

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
  items: {
    id: string;
    rewardProductId: string;
    rewardVendor: string;
    sku: string;
    name: string;
    quantity: number;
    pointsCost: number;
    totalPoints: number;
  }[];
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "—");

const statusColor = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("dispatch")) return "info";
  if (normalized.includes("failed")) return "error";
  if (normalized.includes("cancel")) return "default";
  return "success";
};

export const RewardOrdersView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(REWARD_ORDERS_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });

  const orders: RewardOrder[] = data?.rewardOrdersByTenant ?? [];
  const tenantName = useMemo(() => tenants.find((t) => t.id === selectedTenantId)?.name, [tenants, selectedTenantId]);

  return (
    <Card>
      <CardHeader
        title="Reward Orders"
        subheader={
          tenantName
            ? `Viewing reward orders for ${tenantName}`
            : tenantsLoading
              ? "Loading tenants..."
              : "Select a tenant from the header to load reward orders."
        }
      />
      <CardContent>
        {error && <Alert severity="error">{error.message}</Alert>}
        {loading && <LinearProgress />}
        {!selectedTenantId && (
          <Alert severity="info">Select a tenant to view reward orders.</Alert>
        )}
        {selectedTenantId && !loading && orders.length === 0 && (
          <Alert severity="info">No reward orders found for this tenant.</Alert>
        )}
        {orders.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Total Points</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Placed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    hover
                    onClick={() => navigate(`/reward-orders/${order.id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {order.id}
                      </Typography>
                      {order.providerReference && (
                        <Typography variant="caption" color="text.secondary">
                          Provider: {order.providerReference}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={order.status}
                        color={statusColor(order.status) as "default" | "info" | "success" | "error"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {order.customerId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Actor: {order.actorUserId}
                      </Typography>
                    </TableCell>
                    <TableCell>{order.totalPoints.toLocaleString()}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {order.items.length} item{order.items.length === 1 ? "" : "s"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.placedOnBehalf ? "Placed on behalf" : "Self-service"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
