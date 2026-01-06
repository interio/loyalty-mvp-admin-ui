import React, { useMemo, useState } from "react";
import { useLazyQuery, useQuery } from "@apollo/client";
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
  List,
  ListItem,
  ListItemText,
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
import { CUSTOMERS_BY_TENANT_QUERY } from "./queries";
import { USERS_BY_CUSTOMER_QUERY } from "../users/queries";
import { useTenant } from "../tenants/TenantContext";

type Customer = {
  id: string;
  name: string;
  externalId?: string;
  contactEmail?: string;
  tenantId: string;
  createdAt?: string;
  pointsAccount?: {
    balance?: number;
    updatedAt?: string;
  } | null;
};

export const CustomersView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [usersCache, setUsersCache] = useState<Record<string, any[]>>({});
  const [loadingUsersFor, setLoadingUsersFor] = useState<string | null>(null);

  const { data, loading, error } = useQuery(CUSTOMERS_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });
  const [loadUsers] = useLazyQuery(USERS_BY_CUSTOMER_QUERY);

  const customers: Customer[] = data?.customersByTenant ?? [];
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.trim().toLowerCase();
    return customers.filter((c) =>
      [c.name, c.contactEmail, c.externalId, c.id].some((field) => field?.toLowerCase().includes(term)),
    );
  }, [customers, search]);

  const handleExpand = async (customerId: string) => {
    const isOpen = expandedCustomerId === customerId;
    if (isOpen) {
      setExpandedCustomerId(null);
      return;
    }
    setExpandedCustomerId(customerId);
    if (usersCache[customerId]) return;

    setLoadingUsersFor(customerId);
    try {
      const result = await loadUsers({ variables: { customerId } });
      const users = result.data?.usersByCustomer ?? [];
      setUsersCache((prev) => ({ ...prev, [customerId]: users }));
    } finally {
      setLoadingUsersFor(null);
    }
  };

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "-");

  return (
    <Card>
      <CardHeader
        title="Customers"
        subheader={
          selectedTenantName
            ? `Viewing customers for ${selectedTenantName}`
            : "Select a tenant from the header to load customers."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search customers by name, email, external ID, or ID"
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
              Choose a tenant to see its customers.
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>External ID</TableCell>
                  <TableCell>Contact Email</TableCell>
                  <TableCell>Balance</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const isExpanded = expandedCustomerId === customer.id;
                  const users = usersCache[customer.id];
                  return (
                    <React.Fragment key={customer.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleExpand(customer.id)}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.externalId ?? "—"}</TableCell>
                        <TableCell>{customer.contactEmail ?? "—"}</TableCell>
                        <TableCell>{customer.pointsAccount?.balance ?? 0}</TableCell>
                        <TableCell>{formatDate(customer.createdAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Customer details
                                  </Typography>
                                  <List dense>
                                    <ListItem>
                                      <ListItemText primary="Customer ID" secondary={customer.id} />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemText primary="Tenant ID" secondary={customer.tenantId} />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemText
                                        primary="Points account"
                                        secondary={`Balance: ${customer.pointsAccount?.balance ?? 0} • Updated: ${
                                          formatDate(customer.pointsAccount?.updatedAt ?? undefined)
                                        }`}
                                      />
                                    </ListItem>
                                  </List>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Associated users
                                  </Typography>
                                  {loadingUsersFor === customer.id && <LinearProgress />}
                                  {users?.length === 0 && loadingUsersFor !== customer.id && (
                                    <Typography variant="body2" color="text.secondary">
                                      No users found for this customer.
                                    </Typography>
                                  )}
                                  {users && users.length > 0 && (
                                    <List dense>
                                      {users.map((user: any) => (
                                        <ListItem key={user.id} divider>
                                          <ListItemText
                                            primary={user.email}
                                            secondary={`id: ${user.id} • role: ${user.role ?? "-"} • customer: ${
                                              user.customerId
                                            }`}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  )}
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {selectedTenantId && !loading && filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        No customers match this search.
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
