import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import { CREATE_TENANT_MUTATION, TENANTS_PAGE_QUERY } from "./queries";

type TenantRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export const TenantsView: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, loading, error, refetch } = useQuery(TENANTS_PAGE_QUERY, {
    variables: { page, pageSize },
  });
  const [createTenant, { loading: creating, error: createError }] = useMutation(CREATE_TENANT_MUTATION);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const tenants: TenantRow[] = data?.tenantsPage?.nodes ?? [];
  const pageInfo = data?.tenantsPage?.pageInfo;

  const optionalOrNull = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setMessage(null);
    await createTenant({
      variables: {
        input: {
          name: name.trim(),
          email: optionalOrNull(email),
          phone: optionalOrNull(phone),
          address: optionalOrNull(address),
        },
      },
    });
    setName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setShowForm(false);
    setMessage("Tenant created.");
    setPage(1);
    refetch({ page: 1, pageSize });
  };

  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 4px 14px rgba(195,195,195,0.28)" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <Box>
            <Typography variant="h5">Tenants</Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage tenants for the loyalty platform.
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close form" : "Create tenant"}
          </Button>
        </Stack>

        {showForm && (
          <Box
            component="form"
            onSubmit={handleCreate}
            sx={{ mt: 2, mb: 3, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Tenant name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <TextField
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              multiline
              minRows={2}
            />
            {createError && <Alert severity="error">{createError.message}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}
            <Box>
              <Button type="submit" variant="contained" disabled={creating}>
                {creating ? "Creating..." : "Save tenant"}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Update/delete not available in backend yet; only create is supported.
            </Typography>
          </Box>
        )}

        {loading && <Typography>Loading...</Typography>}
        {error && <Alert severity="error">{error.message}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
          Total tenants: {pageInfo?.totalCount ?? 0}
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Tenant ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.email ?? "—"}</TableCell>
                  <TableCell>{t.phone ?? "—"}</TableCell>
                  <TableCell>{t.address ?? "—"}</TableCell>
                  <TableCell>{t.id}</TableCell>
                </TableRow>
              ))}
              {!loading && tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No tenants available yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {(pageInfo?.totalPages ?? 0) > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={pageInfo?.totalPages ?? 0}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
