import React, { useMemo } from "react";
import { useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import { RULE_ENTITIES_QUERY } from "./queries";

type RuleEntity = {
  id: string;
  tenantId?: string | null;
  code: string;
  displayName: string;
  isActive: boolean;
  createdAt?: string;
};

export const EntitiesView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenants, selectedTenantId } = useTenant();
  const { data, loading, error, refetch } = useQuery(RULE_ENTITIES_QUERY, {
    variables: { tenantId: selectedTenantId ?? null },
  });
  const entities: RuleEntity[] = data?.ruleEntities ?? [];
  const [entitiesRefreshed, setEntitiesRefreshed] = React.useState(false);

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    tenants.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const getScopeLabel = (tenantId?: string | null) => {
    if (!tenantId) return "Global";
    return tenantNameById.get(tenantId) ?? tenantId;
  };

  React.useEffect(() => {
    const refreshEntities = Boolean(
      (location.state as { refreshEntities?: boolean } | null)?.refreshEntities,
    );
    if (!refreshEntities) return;
    if (entitiesRefreshed) return;
    setEntitiesRefreshed(true);
    void refetch();
  }, [location.state, entitiesRefreshed, refetch]);

  return (
    <Card sx={{ borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
          <Box>
            <Typography variant="h5">Entities</Typography>
            <Typography variant="body2" color="text.secondary">
              Define entity types for the rule builder catalog.
            </Typography>
          </Box>
          <Button
            variant="contained"
            sx={{ bgcolor: "#0c9b50" }}
            onClick={() => navigate("/entities/new")}
          >
            Add new entity rule
          </Button>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error">{error.message}</Alert>}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 2,
          }}
        >
          {entities.map((entity) => (
            <Card
              key={entity.id}
              variant="outlined"
              sx={{ borderColor: "#e0e7e2", backgroundColor: "#fff" }}
            >
              <CardActionArea onClick={() => navigate(`/entities/${entity.id}`)}>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {entity.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      code: {entity.code}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={entity.isActive ? "Active" : "Inactive"}
                        color={entity.isActive ? "success" : "default"}
                        variant={entity.isActive ? "filled" : "outlined"}
                      />
                      <Chip size="small" label={getScopeLabel(entity.tenantId)} variant="outlined" />
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        {!loading && entities.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No rule entities yet. Create the first entity to get started.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
