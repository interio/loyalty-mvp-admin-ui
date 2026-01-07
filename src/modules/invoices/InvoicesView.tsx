import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  InputAdornment,
  LinearProgress,
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
import SearchIcon from "@mui/icons-material/Search";
import { useTenant } from "../tenants/TenantContext";
import { INVOICES_BY_TENANT_QUERY } from "./queries";

type Invoice = {
  id: string;
  tenantId: string;
  invoiceId: string;
  customerExternalId?: string | null;
  occurredAt?: string | null;
  receivedAt: string;
  status: string;
  attemptCount: number;
  lastAttemptAt?: string | null;
  processedAt?: string | null;
  error?: string | null;
};

export const InvoicesView: React.FC = () => {
  const { selectedTenantId, tenants, loading: tenantsLoading } = useTenant();
  const [search, setSearch] = useState("");

  const { data, loading, error, refetch } = useQuery(INVOICES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "", take: 200 },
    skip: !selectedTenantId,
  });

  const invoices: Invoice[] = data?.invoicesByTenant ?? [];
  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId)?.name,
    [tenants, selectedTenantId],
  );

  useEffect(() => {
    if (selectedTenantId) {
      refetch({ tenantId: selectedTenantId, take: 200 });
    }
  }, [selectedTenantId, refetch]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) => {
      const haystack = [
        invoice.invoiceId,
        invoice.customerExternalId ?? "",
        invoice.status,
        invoice.error ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [invoices, search]);

  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");

  return (
    <Card>
      <CardHeader
        title="Invoices"
        subheader={
          selectedTenantName
            ? `Viewing invoices for ${selectedTenantName}`
            : "Select a tenant from the header to load invoices."
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            placeholder="Search by invoice ID, customer external ID, status, or error"
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
              Choose a tenant to see its invoices.
            </Typography>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice ID</TableCell>
                  <TableCell>Customer External ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Occurred</TableCell>
                  <TableCell>Received</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow hover key={invoice.id}>
                    <TableCell>{invoice.invoiceId}</TableCell>
                    <TableCell>{invoice.customerExternalId ?? "—"}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell>{formatDateTime(invoice.occurredAt)}</TableCell>
                    <TableCell>{formatDateTime(invoice.receivedAt)}</TableCell>
                    <TableCell>{invoice.attemptCount}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap title={invoice.error ?? ""}>
                        {invoice.error ?? "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {selectedTenantId && !loading && filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        No invoices match this search.
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
