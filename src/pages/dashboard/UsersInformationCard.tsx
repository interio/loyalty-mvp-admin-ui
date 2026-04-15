import React from "react";
import { useQuery } from "@apollo/client";
import { Alert, Box, Card, CardContent, Grid2, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { CUSTOMERS_COUNT_BY_TENANT_QUERY } from "../../modules/customers/queries";
import { INVOICE_ACTIVITY_BY_TENANT_QUERY } from "../../modules/invoices/queries";
import { useTenant } from "../../modules/tenants/TenantContext";
import { USERS_BY_TENANT_QUERY } from "../../modules/users/queries";

type DashboardUser = {
  id: string;
  email: string;
  customerId: string;
  externalId?: string | null;
  createdAt?: string | null;
  customer?: { id: string; name: string } | null;
};

type DashboardUsersResponse = {
  usersByTenant?: DashboardUser[];
};

type CustomersCountResponse = {
  customersByTenantPage?: {
    pageInfo?: {
      totalCount?: number;
    };
  };
};

type InvoiceActivityRecord = {
  actorEmail?: string | null;
  actorExternalId?: string | null;
  occurredAt?: string | null;
  receivedAt?: string | null;
};

type InvoiceActivityResponse = {
  invoicesByTenant?: InvoiceActivityRecord[];
};

type BreakdownRow = {
  customerId: string;
  customer: string;
  users: number;
  activeUsers: number;
  newUsers: number;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const normalizeKey = (value?: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const UsersInformationCard: React.FC = () => {
  const { selectedTenantId } = useTenant();

  const { data: usersData, loading: usersLoading, error: usersError } = useQuery<DashboardUsersResponse>(USERS_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });

  const { data: customersData, loading: customersLoading, error: customersError } = useQuery<CustomersCountResponse>(
    CUSTOMERS_COUNT_BY_TENANT_QUERY,
    {
      variables: { tenantId: selectedTenantId ?? "" },
      skip: !selectedTenantId,
    },
  );

  const { data: invoiceActivityData, loading: invoiceActivityLoading, error: invoiceActivityError } = useQuery<InvoiceActivityResponse>(
    INVOICE_ACTIVITY_BY_TENANT_QUERY,
    {
      variables: { tenantId: selectedTenantId ?? "", take: 1000 },
      skip: !selectedTenantId,
    },
  );

  const {
    totalCustomers,
    totalUsers,
    activeUsers30d,
    newUsersThisMonth,
    customerBreakdown,
  } = React.useMemo(() => {
    const users = usersData?.usersByTenant ?? [];
    const invoices = invoiceActivityData?.invoicesByTenant ?? [];
    const customerCount = customersData?.customersByTenantPage?.pageInfo?.totalCount ?? 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userIdByEmail = new Map<string, string>();
    const userIdByExternalId = new Map<string, string>();
    users.forEach((user) => {
      const emailKey = normalizeKey(user.email);
      if (emailKey && !userIdByEmail.has(emailKey)) {
        userIdByEmail.set(emailKey, user.id);
      }

      const externalIdKey = normalizeKey(user.externalId);
      if (externalIdKey && !userIdByExternalId.has(externalIdKey)) {
        userIdByExternalId.set(externalIdKey, user.id);
      }
    });

    const activeUserIds = new Set<string>();
    invoices.forEach((invoice) => {
      const activityDate = parseDate(invoice.occurredAt) ?? parseDate(invoice.receivedAt);
      if (!activityDate || activityDate < thirtyDaysAgo) return;

      const emailKey = normalizeKey(invoice.actorEmail);
      if (emailKey) {
        const userId = userIdByEmail.get(emailKey);
        if (userId) activeUserIds.add(userId);
      }

      const externalIdKey = normalizeKey(invoice.actorExternalId);
      if (externalIdKey) {
        const userId = userIdByExternalId.get(externalIdKey);
        if (userId) activeUserIds.add(userId);
      }
    });

    const breakdownByCustomer = new Map<string, BreakdownRow>();
    let newUsersCount = 0;

    users.forEach((user) => {
      const createdAt = parseDate(user.createdAt);
      const isNewThisMonth = createdAt ? createdAt >= startOfMonth : false;
      const isActive30d = activeUserIds.has(user.id);
      if (isNewThisMonth) newUsersCount += 1;

      const customerId = user.customerId || "unassigned";
      const customerName = user.customer?.name?.trim() || "Unassigned";
      const existing = breakdownByCustomer.get(customerId);

      if (!existing) {
        breakdownByCustomer.set(customerId, {
          customerId,
          customer: customerName,
          users: 1,
          activeUsers: isActive30d ? 1 : 0,
          newUsers: isNewThisMonth ? 1 : 0,
        });
        return;
      }

      existing.users += 1;
      if (isActive30d) existing.activeUsers += 1;
      if (isNewThisMonth) existing.newUsers += 1;
      if (existing.customer === "Unassigned" && customerName !== "Unassigned") {
        existing.customer = customerName;
      }
    });

    const sortedBreakdown = Array.from(breakdownByCustomer.values())
      .sort((left, right) => right.users - left.users || right.activeUsers - left.activeUsers || left.customer.localeCompare(right.customer))
      .slice(0, 5);

    return {
      totalCustomers: customerCount,
      totalUsers: users.length,
      activeUsers30d: activeUserIds.size,
      newUsersThisMonth: newUsersCount,
      customerBreakdown: sortedBreakdown,
    };
  }, [customersData, invoiceActivityData, usersData]);

  const usersOverview = React.useMemo(
    () => [
      { label: "Total customers", value: numberFormatter.format(totalCustomers) },
      { label: "Total users", value: numberFormatter.format(totalUsers) },
      { label: "Active users (30d)", value: numberFormatter.format(activeUsers30d) },
      { label: "New users this month", value: numberFormatter.format(newUsersThisMonth) },
    ],
    [activeUsers30d, newUsersThisMonth, totalCustomers, totalUsers],
  );

  const loading = usersLoading || customersLoading || invoiceActivityLoading;
  const error = usersError ?? customersError ?? invoiceActivityError;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Users Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Tenant metrics sourced from users, customers, and recent invoice activity.
        </Typography>

        {!selectedTenantId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Select a tenant from the header to load user metrics.
          </Alert>
        )}
        {selectedTenantId && loading && <LinearProgress sx={{ mb: 2 }} />}
        {selectedTenantId && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <Grid2 container spacing={2}>
          {usersOverview.map((metric) => (
            <Grid2 key={metric.label} size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">
                  {metric.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {selectedTenantId ? metric.value : "—"}
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
              {!selectedTenantId && (
                <TableRow>
                  <TableCell colSpan={4}>Select a tenant to see the breakdown.</TableCell>
                </TableRow>
              )}
              {selectedTenantId && !loading && customerBreakdown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>No users found for this tenant.</TableCell>
                </TableRow>
              )}
              {customerBreakdown.map((row) => (
                <TableRow key={row.customerId}>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell align="right">{numberFormatter.format(row.users)}</TableCell>
                  <TableCell align="right">{numberFormatter.format(row.activeUsers)}</TableCell>
                  <TableCell align="right">{numberFormatter.format(row.newUsers)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
};
