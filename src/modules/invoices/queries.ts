import { gql } from "@apollo/client";

export const INVOICES_BY_TENANT_QUERY = gql`
  query InvoicesByTenant($tenantId: UUID!, $take: Int!) {
    invoicesByTenant(tenantId: $tenantId, take: $take) {
      id
      tenantId
      invoiceId
      customerExternalId
      currency
      actorEmail
      actorExternalId
      occurredAt
      receivedAt
      status
      attemptCount
      lastAttemptAt
      processedAt
      error
      appliedRulesJson
      lines {
        sku
        quantity
        netAmount
      }
    }
  }
`;

export const INVOICES_BY_TENANT_PAGE_QUERY = gql`
  query InvoicesByTenantPage($tenantId: UUID!, $page: Int!, $pageSize: Int!) {
    invoicesByTenantPage(tenantId: $tenantId, page: $page, pageSize: $pageSize) {
      nodes {
        id
        tenantId
        invoiceId
        customerExternalId
        currency
        actorEmail
        actorExternalId
        occurredAt
        receivedAt
        status
        attemptCount
        lastAttemptAt
        processedAt
        error
        appliedRulesJson
        lines {
          sku
          quantity
          netAmount
        }
      }
      pageInfo {
        totalCount
        page
        pageSize
        totalPages
      }
    }
  }
`;
