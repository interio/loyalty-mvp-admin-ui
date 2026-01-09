import React from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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

const lastRedemptions = [
  { customer: "Green Harbor Pub", item: "Keg - Heineken 50L", points: 1200 },
  { customer: "Brew & Co", item: "Loyalty Voucher Pack", points: 540 },
  { customer: "Dockside Taproom", item: "Branded Glassware", points: 320 },
  { customer: "The Barrel House", item: "Promo Crate", points: 780 },
  { customer: "Sunset Lounge", item: "Cider Sampler", points: 460 },
];

export const DashboardPage: React.FC = () => {
  const [range, setRange] = React.useState<OrdersRange>("24h");
  const data = ordersData[range];
  const maxOrders = Math.max(...data.map((item) => item.orders));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#0f3d23" }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: "#4a5f52" }}>
          Overview of sales and orders activity (stub data).
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Sales Information
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7c72", mb: 3 }}>
                Stub metrics for loyalty redemptions.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f4f8f5" }}>
                    <Typography variant="overline" sx={{ color: "#567a66" }}>
                      Total Points Spent
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f3d23" }}>
                      128,400
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#f4f8f5" }}>
                    <Typography variant="overline" sx={{ color: "#567a66" }}>
                      Average Redemption
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f3d23" }}>
                      320 pts
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Last Redemption Orders
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Points Spent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lastRedemptions.map((row) => (
                      <TableRow key={`${row.customer}-${row.item}`}>
                        <TableCell>{row.customer}</TableCell>
                        <TableCell>{row.item}</TableCell>
                        <TableCell align="right">{row.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
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
              <Typography variant="body2" sx={{ color: "#6b7c72", mb: 2 }}>
                Stub chart with time on the X axis and order volume on the Y axis.
              </Typography>

              <Box sx={{ border: "1px dashed #c9d6cf", borderRadius: 2, p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#6b7c72" }}>
                    Orders
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7c72" }}>
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
                            bgcolor: "#0c9b50",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: "#4a5f52" }}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6b7c72" }}>
                        {item.orders}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
