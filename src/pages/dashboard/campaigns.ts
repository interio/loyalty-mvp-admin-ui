import moment from "moment";
import type { CSSProperties } from "react";
import type { CampaignRule, CampaignStatus, NormalizedCampaign } from "./types";

const dayMs = 24 * 60 * 60 * 1000;

export const parseCampaignDate = (value?: string | null): number | null => {
  if (!value) return null;

  const parsedIso = moment.parseZone(value, moment.ISO_8601, true);
  if (parsedIso.isValid()) return parsedIso.valueOf();

  const parsedFallback = moment(value, ["DD/MM/YYYY, HH:mm:ss", "DD/MM/YYYY HH:mm:ss", "YYYY-MM-DD HH:mm:ss"], true);
  if (parsedFallback.isValid()) return parsedFallback.valueOf();

  return null;
};

export const getCampaignStatusStyle = (status: CampaignStatus): CSSProperties => {
  if (status === "active") {
    return {
      background: "#008200",
      border: "1px solid #205527",
      color: "#FFFFFF",
      borderRadius: 6,
      fontWeight: 600,
    };
  }

  if (status === "future") {
    return {
      background: "#E6F2ED",
      border: "1px solid #008200",
      color: "#1C1F1E",
      borderRadius: 6,
      fontWeight: 600,
    };
  }

  return {
    background: "#F1F2EF",
    border: "1px solid #C3C3C3",
    color: "#1C1F1E",
    borderRadius: 6,
    opacity: 0.85,
    fontWeight: 500,
  };
};

export const normalizeCampaigns = (campaigns: CampaignRule[], referenceTs: number): NormalizedCampaign[] => {
  const normalizedCampaigns: NormalizedCampaign[] = [];

  campaigns.forEach((campaign) => {
    const startTs = parseCampaignDate(campaign.startDate);
    if (startTs === null) return;

    const parsedEndTs = parseCampaignDate(campaign.endDate);
    const hasExplicitEndDate = parsedEndTs !== null;

    let status: CampaignStatus = "active";
    if (startTs > referenceTs) {
      status = "future";
    } else if (hasExplicitEndDate && parsedEndTs < referenceTs) {
      status = "past";
    }

    // Open-ended campaigns stay visible through the end of the relevant year.
    // Using a finite boundary is safer than an "infinite" end timestamp for timeline rendering.
    let endTs = hasExplicitEndDate
      ? parsedEndTs
      : moment.max(moment(startTs), moment(referenceTs)).endOf("year").valueOf();

    if (endTs <= startTs) {
      endTs = startTs + dayMs;
    }

    normalizedCampaigns.push({
      id: campaign.id,
      ruleName: campaign.ruleName,
      startTs,
      endTs,
      hasExplicitEndDate,
      status,
    });
  });

  return normalizedCampaigns.sort((left, right) => {
    if (left.startTs !== right.startTs) {
      return left.startTs - right.startTs;
    }

    return left.ruleName.localeCompare(right.ruleName);
  });
};

export const formatCampaignDate = (timestamp: number): string => new Date(timestamp).toLocaleDateString();
