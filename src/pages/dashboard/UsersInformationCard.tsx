import React from "react";
import { Box, Card, CardContent, Grid2, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

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

export const UsersInformationCard: React.FC = () => (
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
);
