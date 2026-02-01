import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./apolloClient";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { TenantsPage } from "./pages/TenantsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { UsersPage } from "./pages/UsersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { RewardProductsPage } from "./pages/RewardProductsPage";
import { RewardProductEditPage } from "./pages/RewardProductEditPage";
import { RewardOrdersPage } from "./pages/RewardOrdersPage";
import { RewardOrderDetailsPage } from "./pages/RewardOrderDetailsPage";
import { RulesPage } from "./pages/RulesPage";
import { ComplexRuleEditPage } from "./pages/ComplexRuleEditPage";
import { EntitiesPage } from "./pages/EntitiesPage";
import { EntityEditPage } from "./pages/EntityEditPage";
import { EntityAttributeEditPage } from "./pages/EntityAttributeEditPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { theme } from "./theme";

const App: React.FC = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/tenants" element={<TenantsPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/reward-products" element={<RewardProductsPage />} />
                  <Route path="/reward-products/:id" element={<RewardProductEditPage />} />
                  <Route path="/reward-orders" element={<RewardOrdersPage />} />
                  <Route path="/reward-orders/:id" element={<RewardOrderDetailsPage />} />
                  <Route path="/rules" element={<RulesPage />} />
                  <Route path="/rules/complex/:ruleId" element={<ComplexRuleEditPage />} />
                  <Route path="/entities" element={<EntitiesPage />} />
                  <Route path="/entities/:id" element={<EntityEditPage />} />
                  <Route path="/entities/:entityId/attributes/new" element={<EntityAttributeEditPage />} />
                  <Route path="/entities/:entityId/attributes/:attributeId" element={<EntityAttributeEditPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
};

export default App;
