import React from "react";
import { Box, Grid2, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { formatCampaignDate } from "./campaigns";
import type { NormalizedCampaign } from "./types";

type Props = {
  pastCampaigns: NormalizedCampaign[];
  currentCampaigns: NormalizedCampaign[];
  futureCampaigns: NormalizedCampaign[];
  onRuleClick: (id: string) => void;
};

type GroupOptions = {
  showStartDate: boolean;
  showEndDate: boolean;
};

const CampaignGroup: React.FC<{
  title: string;
  items: NormalizedCampaign[];
  options: GroupOptions;
  onRuleClick: (id: string) => void;
}> = ({ title, items, options, onRuleClick }) => (
  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider", height: "100%" }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
      {title}
    </Typography>
    {items.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        No campaigns.
      </Typography>
    ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            {options.showStartDate && <TableCell>Start</TableCell>}
            {options.showEndDate && <TableCell>End</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((campaign) => (
            <TableRow
              key={campaign.id}
              hover
              onClick={() => onRuleClick(campaign.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onRuleClick(campaign.id);
                }
              }}
              role="link"
              tabIndex={0}
              sx={{
                cursor: "pointer",
                transition: "background-color 160ms ease",
                "& td": {
                  transition: "color 160ms ease",
                },
                "&:hover": {
                  bgcolor: "rgba(0, 130, 0, 0.12)",
                },
                "&:hover td": {
                  color: "primary.main",
                },
                "&:hover td:first-of-type": {
                  textDecoration: "underline",
                  textDecorationThickness: "1px",
                },
              }}
            >
              <TableCell>{campaign.ruleName}</TableCell>
              {options.showStartDate && <TableCell>{formatCampaignDate(campaign.startTs)}</TableCell>}
              {options.showEndDate && <TableCell>{campaign.hasExplicitEndDate ? formatCampaignDate(campaign.endTs) : "No end date"}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Box>
);

export const CampaignsOverviewSection: React.FC<Props> = ({ pastCampaigns, currentCampaigns, futureCampaigns, onRuleClick }) => (
  <Grid2 container spacing={2}>
    <Grid2 size={{ xs: 12, lg: 4 }}>
      <CampaignGroup title="Past Campaigns" items={pastCampaigns} options={{ showStartDate: false, showEndDate: true }} onRuleClick={onRuleClick} />
    </Grid2>
    <Grid2 size={{ xs: 12, lg: 4 }}>
      <CampaignGroup title="Current Campaigns" items={currentCampaigns} options={{ showStartDate: true, showEndDate: true }} onRuleClick={onRuleClick} />
    </Grid2>
    <Grid2 size={{ xs: 12, lg: 4 }}>
      <CampaignGroup title="Future Campaigns" items={futureCampaigns} options={{ showStartDate: true, showEndDate: false }} onRuleClick={onRuleClick} />
    </Grid2>
  </Grid2>
);
