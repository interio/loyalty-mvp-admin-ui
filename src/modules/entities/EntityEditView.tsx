import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import {
  CREATE_RULE_ENTITY_MUTATION,
  DELETE_RULE_ENTITY_MUTATION,
  RULE_ATTRIBUTES_QUERY,
  RULE_ENTITIES_QUERY,
  UPDATE_RULE_ENTITY_MUTATION,
} from "./queries";

type RuleEntity = {
  id: string;
  tenantId?: string | null;
  code: string;
  displayName: string;
  isActive: boolean;
  createdAt?: string;
};

type RuleAttribute = {
  id: string;
  entityId: string;
  code: string;
  displayName: string;
  valueType: string;
  isMultiValue: boolean;
  isQueryable: boolean;
  uiControl: string;
  createdAt?: string;
};

export const EntityEditView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { tenants, selectedTenantId } = useTenant();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [tenantId, setTenantId] = useState<string>("");
  const [loadedEntityId, setLoadedEntityId] = useState<string | null>(null);
  const [initializedTenant, setInitializedTenant] = useState(false);

  const { data, loading, error: queryError, refetch: refetchEntities } = useQuery(RULE_ENTITIES_QUERY, {
    variables: { tenantId: selectedTenantId ?? null },
  });
  const entities: RuleEntity[] = data?.ruleEntities ?? [];

  const [createEntity] = useMutation(CREATE_RULE_ENTITY_MUTATION);
  const [updateEntity] = useMutation(UPDATE_RULE_ENTITY_MUTATION);
  const [deleteEntity] = useMutation(DELETE_RULE_ENTITY_MUTATION);

  useEffect(() => {
    if (!initializedTenant && isNew) {
      setTenantId(selectedTenantId ?? "");
      setInitializedTenant(true);
    }
  }, [initializedTenant, isNew, selectedTenantId]);

  const entity = useMemo(() => {
    if (isNew || !id) return null;
    return entities.find((e) => e.id === id) ?? null;
  }, [entities, id, isNew]);

  const scopedTenantId = entity?.tenantId ?? null;
  const { data: attributesData, loading: attributesLoading } = useQuery(RULE_ATTRIBUTES_QUERY, {
    variables: { entityCode: entity?.code ?? "", tenantId: scopedTenantId },
    skip: !entity?.code,
  });
  const attributes: RuleAttribute[] = attributesData?.ruleAttributes ?? [];

  useEffect(() => {
    if (!entity) return;
    if (loadedEntityId === entity.id) return;
    setCode(entity.code ?? "");
    setDisplayName(entity.displayName ?? "");
    setIsActive(entity.isActive ?? true);
    setTenantId(entity.tenantId ?? "");
    setLoadedEntityId(entity.id);
  }, [entity, loadedEntityId]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    }
  }, [queryError]);


  const handleSave = async () => {
    setError(null);
    setMessage(null);

    const trimmedCode = code.trim();
    const trimmedName = displayName.trim();
    if (!trimmedCode) {
      setError("Code is required.");
      return;
    }
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const result = await createEntity({
          variables: {
            input: {
              code: trimmedCode,
              displayName: trimmedName,
              isActive,
              tenantId: tenantId || null,
            },
          },
        });
        const created = result.data?.createRuleEntity;
        if (!created) {
          throw new Error("Failed to create entity.");
        }
        navigate(`/entities/${created.id}`);
        return;
      }

      if (!id) {
        throw new Error("Missing entity id.");
      }

      const result = await updateEntity({
        variables: {
          input: {
            id,
            code: trimmedCode,
            displayName: trimmedName,
            isActive,
            tenantId: tenantId || null,
          },
        },
      });
      if (!result.data?.updateRuleEntity) {
        throw new Error("Failed to update entity.");
      }
      setMessage("Entity updated.");
      refetchEntities();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteEntity({ variables: { id } });
      if (!result.data?.deleteRuleEntity) {
        throw new Error("Failed to delete entity.");
      }
      navigate("/entities");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (!isNew && !loading && !entity) {
    return (
      <Card>
        <CardHeader title="Entity" subheader="Entity not found." />
        <CardContent>
          <Alert severity="warning">No rule entity matches this ID.</Alert>
          <Button sx={{ mt: 2 }} onClick={() => navigate("/entities")}>
            Back to entities
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={isNew ? "Add Entity" : "Edit Entity"}
        subheader={isNew ? "Create a new entity type for the rule catalog." : entity?.displayName}
      />
      <CardContent>
        <Stack spacing={2}>
          {loading && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          {!isNew && entity && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Entity ID
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {entity.id}
              </Typography>
            </Box>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              required
              helperText="Unique identifier, e.g. product."
            />
            <TextField
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              required
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <FormControl fullWidth>
              <InputLabel id="entity-tenant-label">Tenant scope</InputLabel>
              <Select
                labelId="entity-tenant-label"
                label="Tenant scope"
                value={tenantId}
                onChange={(e) => setTenantId(String(e.target.value))}
              >
                <MenuItem value="">Global (all tenants)</MenuItem>
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label={isActive ? "Active" : "Inactive"}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save entity"}
            </Button>
            {!isNew && (
              <Button variant="outlined" color="error" onClick={() => setDeleteOpen(true)} disabled={saving}>
                Delete entity
              </Button>
            )}
            <Button variant="text" onClick={() => navigate("/entities")} disabled={saving}>
              Back to entities
            </Button>
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
              <Typography variant="h6">Attributes</Typography>
              <Button
                variant="contained"
                sx={{ bgcolor: "#0c9b50" }}
                onClick={() => entity && navigate(`/entities/${entity.id}/attributes/new`)}
                disabled={!entity}
              >
                Create new attribute
              </Button>
            </Stack>
            {attributesLoading && <LinearProgress sx={{ mb: 2 }} />}
            {!entity && (
              <Alert severity="info">Create the entity first to manage attributes.</Alert>
            )}
            {entity && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Display name</TableCell>
                      <TableCell>Value type</TableCell>
                      <TableCell>UI control</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attributes.map((attr) => (
                      <TableRow key={attr.id} hover>
                        <TableCell>{attr.code}</TableCell>
                        <TableCell>{attr.displayName}</TableCell>
                        <TableCell>{attr.valueType}</TableCell>
                        <TableCell>{attr.uiControl}</TableCell>
                        <TableCell align="right">
                          <Button
                            variant="text"
                            onClick={() => navigate(`/entities/${entity.id}/attributes/${attr.id}`)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!attributesLoading && attributes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">
                            No attributes created yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      </CardContent>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete entity?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Deleting this entity will also remove its related attributes and operators.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
