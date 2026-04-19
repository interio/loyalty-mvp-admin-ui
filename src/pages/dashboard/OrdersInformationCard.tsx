import React from "react";
import { useQuery } from "@apollo/client";
import { Alert, Box, Card, CardContent, Divider, FormControl, Grid2, LinearProgress, MenuItem, Select, Typography } from "@mui/material";
import { TENANT_POINTS_SUMMARY_QUERY } from "../../modules/ledger/queries";
import { REWARD_ORDERS_BY_TENANT_RANGE_QUERY } from "../../modules/rewardOrders/queries";
import { useTenant } from "../../modules/tenants/TenantContext";
import type { OrdersRange } from "./types";

type RewardOrderActivity = {
  id: string;
  createdAt: string;
  totalPoints: number;
  status: string;
};

type RewardOrdersByRangeResponse = {
  rewardOrdersByTenantRange?: RewardOrderActivity[];
};

type TenantPointsSummaryResponse = {
  tenantPointsSummary?: {
    pointsEarned?: number;
    pointsSpent?: number;
  };
};

type RangeWindow = {
  from: Date;
  to: Date;
  labels: string[];
  getBucketIndex: (value: Date) => number;
};

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;
const numberFormatter = new Intl.NumberFormat("en-US");

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildRangeWindow = (range: OrdersRange): RangeWindow => {
  const now = new Date();

  if (range === "24h") {
    const bucketCount = 6;
    const bucketMs = 4 * MS_HOUR;
    const to = now;
    const from = new Date(to.getTime() - bucketCount * bucketMs);
    const labels = Array.from({ length: bucketCount }, (_, index) =>
      new Date(from.getTime() + index * bucketMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    );

    return {
      from,
      to,
      labels,
      getBucketIndex: (value) => Math.floor((value.getTime() - from.getTime()) / bucketMs),
    };
  }

  if (range === "7d") {
    const bucketCount = 7;
    const to = now;
    const start = new Date(to);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (bucketCount - 1));
    const labels = Array.from({ length: bucketCount }, (_, index) =>
      new Date(start.getTime() + index * MS_DAY).toLocaleDateString([], { weekday: "short" }),
    );

    return {
      from: start,
      to,
      labels,
      getBucketIndex: (value) => Math.floor((value.getTime() - start.getTime()) / MS_DAY),
    };
  }

  const bucketCount = 4;
  const to = now;
  const from = new Date(to.getTime() - 30 * MS_DAY);
  const bucketMs = (to.getTime() - from.getTime()) / bucketCount;
  const labels = Array.from({ length: bucketCount }, (_, index) => `Week ${index + 1}`);

  return {
    from,
    to,
    labels,
    getBucketIndex: (value) => Math.floor((value.getTime() - from.getTime()) / bucketMs),
  };
};

const formatInt = (value: number): string => numberFormatter.format(Math.max(0, Math.round(value)));

export const OrdersInformationCard: React.FC = () => {
  const { selectedTenantId } = useTenant();
  const [range, setRange] = React.useState<OrdersRange>("24h");

  const rangeWindow = React.useMemo(() => buildRangeWindow(range), [range]);
  const rangeVariables = React.useMemo(
    () => ({
      tenantId: selectedTenantId ?? "",
      from: rangeWindow.from.toISOString(),
      to: rangeWindow.to.toISOString(),
    }),
    [rangeWindow.from, rangeWindow.to, selectedTenantId],
  );

  const { data: rewardOrdersData, loading: rewardOrdersLoading, error: rewardOrdersError } = useQuery<RewardOrdersByRangeResponse>(
    REWARD_ORDERS_BY_TENANT_RANGE_QUERY,
    {
      variables: rangeVariables,
      skip: !selectedTenantId,
    },
  );

  const { data: pointsSummaryData, loading: pointsSummaryLoading, error: pointsSummaryError } = useQuery<TenantPointsSummaryResponse>(
    TENANT_POINTS_SUMMARY_QUERY,
    {
      variables: rangeVariables,
      skip: !selectedTenantId,
    },
  );

  const chartData = React.useMemo(() => {
    const buckets = rangeWindow.labels.map((label) => ({ label, orders: 0 }));
    const orders = rewardOrdersData?.rewardOrdersByTenantRange ?? [];

    orders.forEach((order) => {
      const createdAt = parseDate(order.createdAt);
      if (!createdAt) return;

      const bucketIndex = rangeWindow.getBucketIndex(createdAt);
      if (bucketIndex < 0 || bucketIndex >= buckets.length) return;
      buckets[bucketIndex].orders += 1;
    });

    return buckets;
  }, [rangeWindow, rewardOrdersData]);

  const totalOrders = React.useMemo(() => chartData.reduce((sum, item) => sum + item.orders, 0), [chartData]);

  const totalPointsSpent = pointsSummaryData?.tenantPointsSummary?.pointsSpent ?? 0;
  const totalPointsEarned = pointsSummaryData?.tenantPointsSummary?.pointsEarned ?? 0;
  const averageRedemption = totalOrders > 0 ? totalPointsSpent / totalOrders : 0;
  const maxOrders = Math.max(1, ...chartData.map((item) => item.orders));

  const loading = rewardOrdersLoading || pointsSummaryLoading;
  const error = rewardOrdersError ?? pointsSummaryError;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Orders Information
          </Typography>
          <FormControl size="small">
            <Select value={range} onChange={(event) => setRange(event.target.value as OrdersRange)}>
              <MenuItem value="24h">Past 24 hours</MenuItem>
              <MenuItem value="7d">Past 7 days</MenuItem>
              <MenuItem value="30d">Past month</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Order volume and points metrics sourced from reward orders and tenant ledger activity.
        </Typography>

        {!selectedTenantId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a tenant from the header to load order and points metrics.
          </Alert>
        )}
        {selectedTenantId && loading && <LinearProgress sx={{ mb: 2 }} />}
        {selectedTenantId && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Orders
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Time
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", height: 180 }}>
            {chartData.map((item) => (
              <Box key={item.label} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: "100%", height: 120, display: "flex", alignItems: "flex-end" }}>
                  <Box
                    sx={{
                      width: "100%",
                      height: `${(item.orders / maxOrders) * 100}%`,
                      bgcolor: "primary.main",
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTenantId ? item.orders : "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Grid2 container spacing={2} sx={{ mt: 2 }}>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="overline" color="text.secondary">
                Total Points Spent
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedTenantId ? formatInt(totalPointsSpent) : "—"}
              </Typography>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="overline" color="text.secondary">
                Points Earned
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedTenantId ? formatInt(totalPointsEarned) : "—"}
              </Typography>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
              <Typography variant="overline" color="text.secondary">
                Average Redemption
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedTenantId ? `${formatInt(averageRedemption)} pts` : "—"}
              </Typography>
            </Box>
          </Grid2>
        </Grid2>
      </CardContent>
    </Card>
  );
};
