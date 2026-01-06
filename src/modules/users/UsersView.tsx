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
import { USERS_BY_CUSTOMER_QUERY } from "./queries";

export const UsersView: React.FC = () => {
  const [customerId, setCustomerId] = useState("");
  const { data, loading, error } = useQuery(USERS_BY_CUSTOMER_QUERY, {
    variables: { customerId },
    skip: !customerId,
  });
  const users = data?.usersByCustomer ?? [];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Load users" />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Customer ID"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                helperText="Enter customer ID to list users."
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
          <CardHeader title="Users" />
          <CardContent>
            {!customerId && <Typography>Enter a customer ID to load users.</Typography>}
            {loading && <Typography>Loading...</Typography>}
            {error && <Alert severity="error">{error.message}</Alert>}
            <List dense>
              {users.map((u: any) => (
                <ListItem key={u.id} divider>
                  <ListItemText primary={u.email} secondary={`id: ${u.id} • role: ${u.role ?? "-"}`} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
