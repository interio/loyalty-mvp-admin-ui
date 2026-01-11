import React, { useEffect, useMemo, useState } from "react";
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
  Pagination,
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
import { DetailSection } from "../../components/DetailSection";
import { USERS_BY_TENANT_PAGE_QUERY, USERS_BY_TENANT_SEARCH_QUERY } from "./queries";
import { useTenant } from "../tenants/TenantContext";

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

  const { data, loading, error } = useQuery(USERS_BY_TENANT_PAGE_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", page, pageSize },
    skip: !selectedTenantId,
  });
  const [searchUsers, { data: searchData, loading: searching, error: searchError }] = useLazyQuery(
    USERS_BY_TENANT_SEARCH_QUERY,
  );

  const users: User[] = data?.usersByTenantPage?.nodes ?? [];
  const pageInfo = data?.usersByTenantPage?.pageInfo;
  const searchedUsers: User[] = searchData?.usersByTenantSearch ?? [];

  const activeUsers = search.trim() ? searchedUsers : users;
  const activeError = search.trim() ? searchError : error;
  const activeLoading = search.trim() ? searching : loading;
  const totalLabel = search.trim()
    ? `Matches: ${searchedUsers.length}`
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
  }, [selectedTenantId]);

  useEffect(() => {
    if (!search.trim() && totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [search, totalPages, page]);

  useEffect(() => {
    const term = search.trim();
    if (!selectedTenantId) return;
    if (!term) return;
    const handle = setTimeout(() => {
      searchUsers({ variables: { tenantId: selectedTenantId, search: term } });
    }, 250);
    return () => clearTimeout(handle);
  }, [search, selectedTenantId, searchUsers]);

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
              ),
            }}
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
          {activeError && <Alert severity="error">{activeError.message}</Alert>}
          {activeLoading && <LinearProgress />}
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
                {activeUsers.map((user) => {
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
                            <Box sx={{ px: 3, py: 2, bgcolor: "#f7faf8", borderTop: "1px solid #e0e7e2" }}>
                              <DetailSection title="User details">
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      User ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.id}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Tenant ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.tenantId}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Customer
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.customer?.name ? `${user.customer.name} (${user.customerId})` : user.customerId}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      External ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.externalId ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Role
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {user.role ?? "—"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Created
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(user.createdAt)}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </DetailSection>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {selectedTenantId && !activeLoading && activeUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        No users match this search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {!search.trim() && totalPages > 1 && (
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
