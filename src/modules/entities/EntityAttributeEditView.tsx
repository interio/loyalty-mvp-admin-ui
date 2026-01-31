import React, { useEffect, useMemo, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTenant } from "../tenants/TenantContext";
import {
  CREATE_RULE_ATTRIBUTE_MUTATION,
  CREATE_RULE_ATTRIBUTE_OPTION_MUTATION,
  DELETE_RULE_ATTRIBUTE_OPTION_MUTATION,
  DELETE_RULE_ATTRIBUTE_MUTATION,
  RULE_ATTRIBUTE_OPERATORS_QUERY,
  RULE_ATTRIBUTE_OPTIONS_QUERY,
  RULE_ATTRIBUTES_QUERY,
  RULE_ENTITIES_QUERY,
  RULE_OPERATOR_CATALOG_QUERY,
  SET_RULE_ATTRIBUTE_OPERATORS_MUTATION,
  UPDATE_RULE_ATTRIBUTE_OPTION_MUTATION,
  UPDATE_RULE_ATTRIBUTE_MUTATION,
} from "./queries";

type RuleEntity = {
  id: string;
  tenantId?: string | null;
  code: string;
  displayName: string;
  isActive: boolean;
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
};

type RuleAttributeOption = {
  id: string;
  attributeId: string;
  value: string;
  label: string;
};

type RuleOperator = {
  value: string;
  label: string;
};

const valueTypeOptions = ["string", "number", "bool", "date", "enum"] as const;
const uiControlOptions = ["text", "number", "select", "multiselect"] as const;

export const EntityAttributeEditView: React.FC = () => {
  const { entityId, attributeId } = useParams<{ entityId: string; attributeId: string }>();
  const isNew = !attributeId || attributeId === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTenantId } = useTenant();
  const apolloClient = useApolloClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [valueType, setValueType] = useState<string>("string");
  const [uiControl, setUiControl] = useState<string>("text");
  const [isQueryable, setIsQueryable] = useState(true);
  const [isMultiValue, setIsMultiValue] = useState(false);
  const [operators, setOperators] = useState<string[]>([]);
  const [optionDrafts, setOptionDrafts] = useState<Record<string, { value: string; label: string }>>({});
  const [optionValue, setOptionValue] = useState("");
  const [optionLabel, setOptionLabel] = useState("");
  const [optionError, setOptionError] = useState<string | null>(null);
  const [optionMessage, setOptionMessage] = useState<string | null>(null);
  const [savingOptionId, setSavingOptionId] = useState<string | null>(null);
  const [retriedLookup, setRetriedLookup] = useState(false);

  const { data: entitiesData, loading: entitiesLoading, error: entitiesError } = useQuery(RULE_ENTITIES_QUERY, {
    variables: { tenantId: selectedTenantId ?? null },
  });
  const entities: RuleEntity[] = entitiesData?.ruleEntities ?? [];

  const { data: operatorData, loading: operatorLoading, error: operatorError } = useQuery(RULE_OPERATOR_CATALOG_QUERY);
  const operatorCatalog: RuleOperator[] = operatorData?.ruleOperatorCatalog ?? [];

  const entity = useMemo(() => {
    if (!entityId) return null;
    return entities.find((e) => e.id === entityId) ?? null;
  }, [entities, entityId]);

  const scopedTenantId = entity?.tenantId ?? null;
  const {
    data: attributesData,
    loading: attributesLoading,
    error: attributesError,
    refetch: refetchAttributes,
  } = useQuery(RULE_ATTRIBUTES_QUERY, {
    variables: { entityCode: entity?.code ?? "", tenantId: scopedTenantId },
    fetchPolicy: "network-only",
    skip: !entity?.code,
  });
  const attributes: RuleAttribute[] = attributesData?.ruleAttributes ?? [];

  const attribute = useMemo(() => {
    if (isNew || !attributeId) return null;
    return attributes.find((a) => a.id === attributeId) ?? null;
  }, [attributes, attributeId, isNew]);

  const [createAttribute] = useMutation(CREATE_RULE_ATTRIBUTE_MUTATION);
  const [updateAttribute] = useMutation(UPDATE_RULE_ATTRIBUTE_MUTATION);
  const [deleteAttribute] = useMutation(DELETE_RULE_ATTRIBUTE_MUTATION);
  const [setAttributeOperators] = useMutation(SET_RULE_ATTRIBUTE_OPERATORS_MUTATION);
  const [createOption] = useMutation(CREATE_RULE_ATTRIBUTE_OPTION_MUTATION);
  const [updateOption] = useMutation(UPDATE_RULE_ATTRIBUTE_OPTION_MUTATION);
  const [deleteOption] = useMutation(DELETE_RULE_ATTRIBUTE_OPTION_MUTATION);

  useEffect(() => {
    if (entitiesError) setError(entitiesError.message);
  }, [entitiesError]);

  useEffect(() => {
    if (attributesError) setError(attributesError.message);
  }, [attributesError]);

  useEffect(() => {
    if (operatorError) setError(operatorError.message);
  }, [operatorError]);

  useEffect(() => {
    if (!attribute) return;
    setCode(attribute.code ?? "");
    setDisplayName(attribute.displayName ?? "");
    setValueType(attribute.valueType ?? "string");
    setUiControl(attribute.uiControl ?? "text");
    setIsQueryable(attribute.isQueryable ?? true);
    setIsMultiValue(attribute.isMultiValue ?? false);
  }, [attribute]);

  useEffect(() => {
    if (!attribute) return;
    let cancelled = false;
    const loadOperators = async () => {
      const res = await apolloClient.query({
        query: RULE_ATTRIBUTE_OPERATORS_QUERY,
        variables: { attributeId: attribute.id },
        fetchPolicy: "network-only",
      });
      if (cancelled) return;
      const ops = res.data?.ruleAttributeOperators?.map((o: any) => o.operator) ?? [];
      setOperators(ops);
    };
    void loadOperators();
    return () => {
      cancelled = true;
    };
  }, [apolloClient, attribute]);

  const justCreated = Boolean((location.state as { justCreated?: boolean } | null)?.justCreated);

  useEffect(() => {
    if (!justCreated) return;
    setMessage("Attribute created.");
  }, [justCreated]);

  useEffect(() => {
    if (!justCreated) return;
    if (attributesLoading) return;
    if (attribute) return;
    if (retriedLookup) return;
    setRetriedLookup(true);
    void refetchAttributes();
  }, [justCreated, attributesLoading, attribute, retriedLookup, refetchAttributes]);

  useEffect(() => {
    if (operators.length > 0) return;
    if (operatorCatalog.length === 0) return;
    setOperators([operatorCatalog[0].value]);
  }, [operatorCatalog, operators.length]);

  const {
    data: optionsData,
    loading: optionsLoading,
    refetch: refetchOptions,
  } = useQuery(RULE_ATTRIBUTE_OPTIONS_QUERY, {
    variables: { attributeId: attribute?.id ?? "" },
    fetchPolicy: "network-only",
    skip: !attribute?.id,
  });
  const options: RuleAttributeOption[] = optionsData?.ruleAttributeOptions ?? [];

  useEffect(() => {
    if (options.length === 0) return;
    setOptionDrafts((prev) => {
      const next = { ...prev };
      options.forEach((opt) => {
        if (!next[opt.id]) {
          next[opt.id] = { value: opt.value, label: opt.label };
        }
      });
      return next;
    });
  }, [options]);

  const isOptionsEnabled = valueType === "enum" || uiControl === "select" || uiControl === "multiselect";

  const handleAddOption = async () => {
    if (!attribute) return;
    setOptionError(null);
    setOptionMessage(null);
    const trimmedValue = optionValue.trim();
    const trimmedLabel = optionLabel.trim();
    if (!trimmedValue || !trimmedLabel) {
      setOptionError("Both value and label are required.");
      return;
    }
    setSaving(true);
    try {
      const result = await createOption({
        variables: {
          input: {
            attributeId: attribute.id,
            value: trimmedValue,
            label: trimmedLabel,
          },
        },
      });
      if (!result.data?.createRuleAttributeOption) {
        throw new Error("Failed to create option.");
      }
      setOptionValue("");
      setOptionLabel("");
      setOptionMessage("Option added.");
      refetchOptions();
    } catch (err) {
      setOptionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOption = async (optionId: string) => {
    const draft = optionDrafts[optionId];
    if (!draft) return;
    setOptionError(null);
    setOptionMessage(null);
    const trimmedValue = draft.value.trim();
    const trimmedLabel = draft.label.trim();
    if (!trimmedValue || !trimmedLabel) {
      setOptionError("Both value and label are required.");
      return;
    }
    setSavingOptionId(optionId);
    try {
      const result = await updateOption({
        variables: {
          input: {
            id: optionId,
            value: trimmedValue,
            label: trimmedLabel,
          },
        },
      });
      if (!result.data?.updateRuleAttributeOption) {
        throw new Error("Failed to update option.");
      }
      setOptionMessage("Option updated.");
      refetchOptions();
    } catch (err) {
      setOptionError((err as Error).message);
    } finally {
      setSavingOptionId(null);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    setOptionError(null);
    setOptionMessage(null);
    setSavingOptionId(optionId);
    try {
      const result = await deleteOption({ variables: { id: optionId } });
      if (!result.data?.deleteRuleAttributeOption) {
        throw new Error("Failed to delete option.");
      }
      setOptionMessage("Option deleted.");
      setOptionDrafts((prev) => {
        const next = { ...prev };
        delete next[optionId];
        return next;
      });
      refetchOptions();
    } catch (err) {
      setOptionError((err as Error).message);
    } finally {
      setSavingOptionId(null);
    }
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    if (!entity) {
      setError("Entity not found.");
      return;
    }

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
    if (operators.length === 0) {
      setError("Select at least one operator.");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const result = await createAttribute({
          variables: {
            input: {
              entityId: entity.id,
              code: trimmedCode,
              displayName: trimmedName,
              valueType,
              isMultiValue,
              isQueryable,
              uiControl,
            },
          },
        });
        const created = result.data?.createRuleAttribute;
        if (!created) {
          throw new Error("Failed to create attribute.");
        }
        await setAttributeOperators({
          variables: {
            input: {
              attributeId: created.id,
              operators,
            },
          },
        });
        navigate(`/entities/${entity.id}/attributes/${created.id}`, { state: { justCreated: true } });
        return;
      }

      if (!attributeId) {
        throw new Error("Missing attribute id.");
      }

      const result = await updateAttribute({
        variables: {
          input: {
            id: attributeId,
            code: trimmedCode,
            displayName: trimmedName,
            valueType,
            isMultiValue,
            isQueryable,
            uiControl,
          },
        },
      });
      if (!result.data?.updateRuleAttribute) {
        throw new Error("Failed to update attribute.");
      }
      await setAttributeOperators({
        variables: {
          input: {
            attributeId,
            operators,
          },
        },
      });
      setMessage("Attribute updated.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!attributeId || isNew) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deleteAttribute({ variables: { id: attributeId } });
      if (!result.data?.deleteRuleAttribute) {
        throw new Error("Failed to delete attribute.");
      }
      navigate(`/entities/${entityId}`, { state: { refreshAttributes: true } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  if (!entityId) {
    return (
      <Card>
        <CardHeader title="Attribute" subheader="Missing entity id." />
        <CardContent>
          <Alert severity="warning">Select an entity first.</Alert>
          <Button sx={{ mt: 2 }} onClick={() => navigate("/entities")}>
            Back to entities
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isNew && entity && !attributesLoading && !attribute && (!justCreated || retriedLookup)) {
    return (
      <Card>
        <CardHeader title="Attribute" subheader="Attribute not found." />
        <CardContent>
          <Alert severity="warning">No attribute matches this ID.</Alert>
          <Button sx={{ mt: 2 }} onClick={() => navigate(`/entities/${entityId}`)}>
            Back to entity
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={isNew ? "Add Attribute" : "Edit Attribute"}
        subheader={entity ? `${entity.displayName} (${entity.code})` : "Loading entity"}
      />
      <CardContent>
        <Stack spacing={2}>
          {(entitiesLoading || attributesLoading || operatorLoading || optionsLoading) && <LinearProgress />}
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              required
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="attribute-value-type">Value type</InputLabel>
              <Select
                labelId="attribute-value-type"
                label="Value type"
                value={valueType}
                onChange={(e) => setValueType(String(e.target.value))}
              >
                {valueTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="attribute-ui-control">UI control</InputLabel>
              <Select
                labelId="attribute-ui-control"
                label="UI control"
                value={uiControl}
                onChange={(e) => setUiControl(String(e.target.value))}
              >
                {uiControlOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Operators
            </Typography>
            <FormGroup row>
              {operatorCatalog.map((op) => (
                <FormControlLabel
                  key={op.value}
                  control={
                    <Checkbox
                      checked={operators.includes(op.value)}
                      onChange={(e) => {
                        setOperators((prev) =>
                          e.target.checked
                            ? [...prev, op.value]
                            : prev.filter((value) => value !== op.value),
                        );
                      }}
                    />
                  }
                  label={op.label}
                />
              ))}
            </FormGroup>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Options (for select/enum attributes)
            </Typography>
            {!isOptionsEnabled && (
              <Alert severity="info">
                Enable options by setting value type to enum or UI control to select/multiselect.
              </Alert>
            )}
            {isOptionsEnabled && !attribute && (
              <Alert severity="info">Save the attribute first to add options.</Alert>
            )}
            {isOptionsEnabled && attribute && (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Value"
                    value={optionValue}
                    onChange={(e) => setOptionValue(e.target.value)}
                    fullWidth
                    helperText="Internal value (e.g., beer)."
                  />
                  <TextField
                    label="Label"
                    value={optionLabel}
                    onChange={(e) => setOptionLabel(e.target.value)}
                    fullWidth
                    helperText="Displayed to admins (e.g., Beer)."
                  />
                  <Button variant="contained" onClick={handleAddOption} disabled={saving}>
                    Add
                  </Button>
                </Stack>

                {options.map((opt) => {
                  const draft = optionDrafts[opt.id] ?? { value: opt.value, label: opt.label };
                  return (
                    <Stack key={opt.id} direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                      <TextField
                        label="Value"
                        value={draft.value}
                        onChange={(e) =>
                          setOptionDrafts((prev) => ({
                            ...prev,
                            [opt.id]: { ...draft, value: e.target.value },
                          }))
                        }
                        fullWidth
                      />
                      <TextField
                        label="Label"
                        value={draft.label}
                        onChange={(e) =>
                          setOptionDrafts((prev) => ({
                            ...prev,
                            [opt.id]: { ...draft, label: e.target.value },
                          }))
                        }
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        onClick={() => handleUpdateOption(opt.id)}
                        disabled={savingOptionId === opt.id}
                      >
                        {savingOptionId === opt.id ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteOption(opt.id)}
                        disabled={savingOptionId === opt.id}
                      >
                        Delete
                      </Button>
                    </Stack>
                  );
                })}
                {options.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No options yet. Add the first one above.
                  </Typography>
                )}
                {optionError && <Alert severity="error">{optionError}</Alert>}
                {optionMessage && <Alert severity="success">{optionMessage}</Alert>}
              </Stack>
            )}
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save attribute"}
            </Button>
            {!isNew && (
              <Button variant="outlined" color="error" onClick={() => setDeleteOpen(true)} disabled={saving}>
                Delete attribute
              </Button>
            )}
            <Button variant="text" onClick={() => navigate(`/entities/${entityId}`)} disabled={saving}>
              Back to entity
            </Button>
          </Stack>
        </Stack>
      </CardContent>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete attribute?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will remove the attribute and its operator settings.
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
