export type OrdersRange = "24h" | "7d" | "30d";

export type CampaignRule = {
  id: string;
  ruleName: string;
  startDate: string;
  endDate?: string | null;
};

export type CampaignStatus = "past" | "active" | "future";

export type NormalizedCampaign = {
  id: string;
  ruleName: string;
  startTs: number;
  endTs: number;
  hasExplicitEndDate: boolean;
  status: CampaignStatus;
};
