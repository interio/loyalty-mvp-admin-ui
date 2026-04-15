import React from "react";
import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardContent, Grid2, LinearProgress, Typography } from "@mui/material";
import { useTenant } from "../modules/tenants/TenantContext";
import { CAMPAIGN_RULES_BY_TENANT_QUERY } from "../modules/rules/queries";
import { normalizeCampaigns } from "./dashboard/campaigns";
import { CampaignsOverviewSection } from "./dashboard/CampaignsOverviewSection";
import { CampaignTimelineSection } from "./dashboard/CampaignTimelineSection";
import { OrdersInformationCard } from "./dashboard/OrdersInformationCard";
import type { CampaignRule } from "./dashboard/types";
import { UsersInformationCard } from "./dashboard/UsersInformationCard";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTenantId } = useTenant();

  const { data: campaignsData, loading: campaignsLoading, error: campaignsError } = useQuery(CAMPAIGN_RULES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });

  const campaigns: CampaignRule[] = campaignsData?.campaignRulesByTenant ?? [];

  const normalizedCampaigns = React.useMemo(() => normalizeCampaigns(campaigns, Date.now()), [campaigns]);

  const pastCampaigns = React.useMemo(
    () => normalizedCampaigns.filter((campaign) => campaign.status === "past"),
    [normalizedCampaigns],
  );
  const currentCampaigns = React.useMemo(
    () => normalizedCampaigns.filter((campaign) => campaign.status === "active"),
    [normalizedCampaigns],
  );
  const futureCampaigns = React.useMemo(
    () => normalizedCampaigns.filter((campaign) => campaign.status === "future"),
    [normalizedCampaigns],
  );

  const handleRuleClick = React.useCallback(
    (ruleId: string) => {
      navigate(`/rules/${ruleId}`);
    },
    [navigate],
  );

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of customer, user, and order activity.
        </Typography>
      </Box>

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, lg: 7 }}>
          <UsersInformationCard />
        </Grid2>

        <Grid2 size={{ xs: 12, lg: 5 }}>
          <OrdersInformationCard />
        </Grid2>
      </Grid2>

      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Campaigns
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Campaigns are sourced from rules in the backend.
              </Typography>

              {!selectedTenantId && <Alert severity="info">Select a tenant from the header to load campaigns.</Alert>}
              {campaignsLoading && <LinearProgress sx={{ mb: 2 }} />}
              {campaignsError && <Alert severity="error">{campaignsError.message}</Alert>}

              {selectedTenantId && !campaignsLoading && !campaignsError && (
                <>
                  <CampaignsOverviewSection
                    pastCampaigns={pastCampaigns}
                    currentCampaigns={currentCampaigns}
                    futureCampaigns={futureCampaigns}
                    onRuleClick={handleRuleClick}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <CampaignTimelineSection campaigns={normalizedCampaigns} onRuleClick={handleRuleClick} />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  );
};
