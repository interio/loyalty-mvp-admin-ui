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
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useTenant } from "../tenants/TenantContext";
import { DISTRIBUTORS_BY_TENANT_PAGE_QUERY } from "./queries";

type Distributor = {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  createdAt?: string;
};

export const DistributorsView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");
  const [expandedDistributorId, setExpandedDistributorId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const { data, loading, error } = useQuery(DISTRIBUTORS_BY_TENANT_PAGE_QUERY, {
    variables: {
      tenantId: selectedTenantId ?? "",
      page,
      pageSize,
      search: debouncedSearch || null },
    skip: !selectedTenantId });

  const distributors: Distributor[] = data?.distributorsByTenantPage?.nodes ?? [];
  const pageInfo = data?.distributorsByTenantPage?.pageInfo;
  const tenantName = useMemo(() => tenants.find((t) => t.id === selectedTenantId)?.name, [tenants, selectedTenantId]);
  const totalLabel = debouncedSearch
    ? `Matches: ${pageInfo?.totalCount ?? 0}`
    : `Total distributors: ${pageInfo?.totalCount ?? 0}`;
  const totalPages = pageInfo?.totalPages ?? 0;

  useEffect(() => {
    setExpandedDistributorId(null);
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
        title="Distributors"
        subheader={
          tenantName
            ? `Viewing distributors for ${tenantName}`
            : tenantsLoading
              ? "Loading tenants..."
              : "Select a tenant from the header to load distributors."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search distributors by name or display name"
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
              Choose a tenant to see its distributors.
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Display Name</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {distributors.map((distributor) => {
                  const isExpanded = expandedDistributorId === distributor.id;
                  return (
                    <React.Fragment key={distributor.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedDistributorId(isExpanded ? null : distributor.id)}
                          >
                            {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{distributor.displayName}</TableCell>
                        <TableCell>{distributor.name}</TableCell>
                        <TableCell>{formatDate(distributor.createdAt)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 3, py: 2, bgcolor: "#F5F6F4", borderTop: "1px solid", borderColor: "divider" }}>
                              <DetailSection title="Distributor details">
                                <Grid2 container spacing={2}>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Distributor ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {distributor.id}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Tenant ID
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {distributor.tenantId}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Name
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {distributor.name}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Display Name
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {distributor.displayName}
                                    </Typography>
                                  </Grid2>
                                  <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                      Created
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatDate(distributor.createdAt)}
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
                {selectedTenantId && !loading && distributors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        {debouncedSearch ? "No distributors match this search." : "No distributors available."}
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
