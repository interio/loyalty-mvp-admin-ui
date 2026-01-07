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
      lines {
        sku
        quantity
        netAmount
      }
    }
  }
`;
