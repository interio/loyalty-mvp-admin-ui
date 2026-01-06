import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CREATE_TENANT_MUTATION, TENANTS_QUERY } from "./queries";

export const TenantsView: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(TENANTS_QUERY);
  const [createTenant, { loading: creating, error: createError }] = useMutation(CREATE_TENANT_MUTATION);
  const [name, setName] = useState("");
  const tenants = data?.tenants ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createTenant({ variables: { input: { name: name.trim() } } });
    setName("");
    refetch();
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Create tenant" />
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={handleCreate}>
              <TextField
                label="Tenant name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {createError && <Alert severity="error">{createError.message}</Alert>}
              <Button type="submit" variant="contained" sx={{ bgcolor: "#0c9b50" }} disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
              <Typography variant="body2" color="text.secondary">
                Update/delete not available in backend yet; only create is supported.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Tenants" />
          <CardContent>
            {loading && <Typography>Loading...</Typography>}
            {error && <Alert severity="error">{error.message}</Alert>}
            <List dense>
              {tenants.map((t: any) => (
                <ListItem key={t.id} divider>
                  <ListItemText primary={t.name} secondary={t.id} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
