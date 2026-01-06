import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApolloError, useQuery } from "@apollo/client";
import { TENANTS_QUERY } from "./queries";

type Tenant = {
  id: string;
  name: string;
};

type TenantContextValue = {
  tenants: Tenant[];
  selectedTenantId?: string;
  setSelectedTenantId: (id: string) => void;
  loading: boolean;
  error?: ApolloError;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const STORAGE_KEY = "selectedTenantId";

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  });
  const { data, loading, error } = useQuery(TENANTS_QUERY);
  const tenants = data?.tenants ?? [];

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [selectedTenantId, tenants]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedTenantId) {
      localStorage.setItem(STORAGE_KEY, selectedTenantId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedTenantId]);

  const value = useMemo(
    () => ({
      tenants,
      selectedTenantId,
      setSelectedTenantId: (id: string) => setSelectedTenantId(id || undefined),
      loading,
      error,
    }),
    [tenants, selectedTenantId, loading, error],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
};
