import React, { useState } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
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
import { CUSTOMERS_BY_TENANT_QUERY } from "./queries";

export const CustomersView: React.FC = () => {
  const [tenantId, setTenantId] = useState("");
  const { data, loading, error } = useQuery(CUSTOMERS_BY_TENANT_QUERY, {
    variables: { tenantId },
    skip: !tenantId,
  });
  const customers = data?.customersByTenant ?? [];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Load customers" />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Tenant ID"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                helperText="Enter tenant ID to list customers."
              />
              <Typography variant="body2" color="text.secondary">
                Read-only for now. Update mutations are not exposed in the backend yet.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="Customers" />
          <CardContent>
            {!tenantId && <Typography>Enter a tenant ID to load customers.</Typography>}
            {loading && <Typography>Loading...</Typography>}
            {error && <Alert severity="error">{error.message}</Alert>}
            <List dense>
              {customers.map((c: any) => (
                <ListItem key={c.id} divider>
                  <ListItemText
                    primary={c.name}
                    secondary={`id: ${c.id} • external: ${c.externalId ?? "-"} • email: ${c.contactEmail ?? "-"}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
