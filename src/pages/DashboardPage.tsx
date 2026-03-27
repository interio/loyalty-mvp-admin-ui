import React from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid2,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

type OrdersRange = "24h" | "7d" | "30d";

const ordersData: Record<OrdersRange, { label: string; orders: number }[]> = {
  "24h": [
    { label: "06:00", orders: 12 },
    { label: "10:00", orders: 22 },
    { label: "14:00", orders: 18 },
    { label: "18:00", orders: 26 },
    { label: "22:00", orders: 9 },
  ],
  "7d": [
    { label: "Mon", orders: 120 },
    { label: "Tue", orders: 140 },
    { label: "Wed", orders: 110 },
    { label: "Thu", orders: 160 },
    { label: "Fri", orders: 190 },
    { label: "Sat", orders: 130 },
    { label: "Sun", orders: 90 },
  ],
  "30d": [
    { label: "Week 1", orders: 620 },
    { label: "Week 2", orders: 710 },
    { label: "Week 3", orders: 580 },
    { label: "Week 4", orders: 760 },
  ],
};

const ordersSummaryData: Record<OrdersRange, { totalPointsSpent: string; averageRedemption: string }> = {
  "24h": { totalPointsSpent: "12,840", averageRedemption: "287 pts" },
  "7d": { totalPointsSpent: "88,320", averageRedemption: "314 pts" },
  "30d": { totalPointsSpent: "368,410", averageRedemption: "329 pts" },
};

const usersOverview = [
  { label: "Total customers", value: "1,248" },
  { label: "Total users", value: "3,964" },
  { label: "Active users (30d)", value: "2,781" },
  { label: "New users this month", value: "186" },
];

const customerUserStats = [
  { customer: "Green Harbor Pub", users: 38, activeUsers: 29, newUsers: 4 },
  { customer: "Dockside Taproom", users: 31, activeUsers: 25, newUsers: 6 },
  { customer: "The Barrel House", users: 28, activeUsers: 20, newUsers: 3 },
  { customer: "Sunset Lounge", users: 22, activeUsers: 16, newUsers: 2 },
  { customer: "Brew & Co", users: 19, activeUsers: 14, newUsers: 1 },
];

export const DashboardPage: React.FC = () => {
  const [range, setRange] = React.useState<OrdersRange>("24h");
  const data = ordersData[range];
  const summary = ordersSummaryData[range];
  const maxOrders = Math.max(...data.map((item) => item.orders));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of customer, user, and order activity (stub data).
        </Typography>
      </Box>

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Users Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Stub metrics for customers and users.
              </Typography>

              <Grid2 container spacing={2}>
                {usersOverview.map((metric) => (
                  <Grid2 key={metric.label} size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="overline" color="text.secondary">
                        {metric.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {metric.value}
                      </Typography>
                    </Box>
                  </Grid2>
                ))}
              </Grid2>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Customer User Breakdown
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Total Users</TableCell>
                      <TableCell align="right">Active (30d)</TableCell>
                      <TableCell align="right">New This Month</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerUserStats.map((row) => (
                      <TableRow key={row.customer}>
                        <TableCell>{row.customer}</TableCell>
                        <TableCell align="right">{row.users}</TableCell>
                        <TableCell align="right">{row.activeUsers}</TableCell>
                        <TableCell align="right">{row.newUsers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, lg: 5 }}>
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
                Stub chart with time on the X axis and order volume on the Y axis.
              </Typography>

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
                  {data.map((item) => (
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
                        {item.orders}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Grid2 container spacing={2} sx={{ mt: 2 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="overline" color="text.secondary">
                      Total Points Spent
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {summary.totalPointsSpent}
                    </Typography>
                  </Box>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="overline" color="text.secondary">
                      Average Redemption
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {summary.averageRedemption}
                    </Typography>
                  </Box>
                </Grid2>
              </Grid2>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  );
};
