import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  Grid2,
  IconButton,
  InputAdornment,
  LinearProgress,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import { DetailSection } from "../../components/DetailSection";
import { USERS_BY_TENANT_PAGE_QUERY } from "./queries";
import { useTenant } from "../tenants/TenantContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

type User = {
  id: string;
  email: string;
  role?: string;
  customerId: string;
  tenantId: string;
  externalId?: string | null;
  createdAt?: string;
  customer?: { id: string; name: string };
};

export const UsersView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const { data, loading, error } = useQuery(USERS_BY_TENANT_PAGE_QUERY, {
    variables: {
      tenantId: selectedTenantId ?? "",
      page,
      pageSize,
      search: debouncedSearch || null },
    skip: !selectedTenantId });

  const users: User[] = data?.usersByTenantPage?.nodes ?? [];
  const pageInfo = data?.usersByTenantPage?.pageInfo;

  const totalLabel = debouncedSearch
    ? `Matches: ${pageInfo?.totalCount ?? 0}`
    : `Total users: ${pageInfo?.totalCount ?? 0}`;
  const totalPages = pageInfo?.totalPages ?? 0;

  const tenantName = useMemo(() => tenants.find((t) => t.id === selectedTenantId)?.name, [tenants, selectedTenantId]);

  useEffect(() => {
    setExpandedUserId(null);
  }, [selectedTenantId, page]);

  useEffect(() => {
    if (selectedTenantId) {
      setPage(1);
    }
  }, [selectedTenantId, debouncedSearch]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "—");

  return (
    <Card>
      <CardHeader
        title="Users"
        subheader={
          tenantName ? `Viewing users for ${tenantName}` : "Select a tenant from the header to load users."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search users by email, role, or external ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!selectedTenantId}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ) }}
          />
          {selectedTenantId && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {totalLabel}
            </Typography>
          )}
          {!selectedTenantId && !tenantsLoading && (
            <Typography variant="body2" color="text.secondary">
              Choose a tenant to see its users.
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>External ID</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const isExpanded = expandedUserId === user.id;
                  return (
                    <React.Fragment key={user.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton size="small" onClick={() => setExpandedUserId(isExpanded ? null : user.id)}>
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role ?? "—"}</TableCell>
                        <TableCell>
                          {user.customer?.name ?? "—"}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {user.customerId}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.externalId ?? "—"}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#F5F6F4", borderTop: "1px solid", borderColor: "divider" }}>
                              <DetailSection title="User details">
                                <Grid2 container spacing={2}>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      User ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.id}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Tenant ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.tenantId}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Customer
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.customer?.name ? `${user.customer.name} (${user.customerId})` : user.customerId}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      External ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.externalId ?? "—"}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Role
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.role ?? "—"}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Created
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(user.createdAt)}
                                    </Typography>
                                  </Grid2>
                                </Grid2>
                              </DetailSection>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {selectedTenantId && !loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearch ? "No users match this search." : "No users found for this tenant."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
