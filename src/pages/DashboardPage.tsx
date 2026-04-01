import React from "react";
import { useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import Timeline, { DateHeader, TimelineHeaders } from "react-calendar-timeline";
import "react-calendar-timeline/lib/Timeline.css";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid2,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTenant } from "../modules/tenants/TenantContext";
import { CAMPAIGN_RULES_BY_TENANT_QUERY } from "../modules/rules/queries";

type OrdersRange = "24h" | "7d" | "30d";

const ordersData: Record<OrdersRange, { label: string; orders: number }[]> = {
  "24h": [
    { label: "06:00", orders: 12 },
    { label: "10:00", orders: 22 },
    { label: "14:00", orders: 18 },
    { label: "18:00", orders: 26 },
    { label: "22:00", orders: 9 },
  ],
  "7d": [
    { label: "Mon", orders: 120 },
    { label: "Tue", orders: 140 },
    { label: "Wed", orders: 110 },
    { label: "Thu", orders: 160 },
    { label: "Fri", orders: 190 },
    { label: "Sat", orders: 130 },
    { label: "Sun", orders: 90 },
  ],
  "30d": [
    { label: "Week 1", orders: 620 },
    { label: "Week 2", orders: 710 },
    { label: "Week 3", orders: 580 },
    { label: "Week 4", orders: 760 },
  ],
};

const ordersSummaryData: Record<OrdersRange, { totalPointsSpent: string; averageRedemption: string }> = {
  "24h": { totalPointsSpent: "12,840", averageRedemption: "287 pts" },
  "7d": { totalPointsSpent: "88,320", averageRedemption: "314 pts" },
  "30d": { totalPointsSpent: "368,410", averageRedemption: "329 pts" },
};

const usersOverview = [
  { label: "Total customers", value: "1,248" },
  { label: "Total users", value: "3,964" },
  { label: "Active users (30d)", value: "2,781" },
  { label: "New users this month", value: "186" },
];

const customerUserStats = [
  { customer: "Green Harbor Pub", users: 38, activeUsers: 29, newUsers: 4 },
  { customer: "Dockside Taproom", users: 31, activeUsers: 25, newUsers: 6 },
  { customer: "The Barrel House", users: 28, activeUsers: 20, newUsers: 3 },
  { customer: "Sunset Lounge", users: 22, activeUsers: 16, newUsers: 2 },
  { customer: "Brew & Co", users: 19, activeUsers: 14, newUsers: 1 },
];

type CampaignRule = {
  id: string;
  ruleName: string;
  startDate: string;
  endDate?: string | null;
};

type CampaignStatus = "past" | "active" | "future";

const dayMs = 24 * 60 * 60 * 1000;

const parseCampaignDate = (value?: string | null): number | null => {
  if (!value) return null;

  const parsedIso = moment.parseZone(value, moment.ISO_8601, true);
  if (parsedIso.isValid()) return parsedIso.valueOf();

  const parsedFallback = moment(value, ["DD/MM/YYYY, HH:mm:ss", "DD/MM/YYYY HH:mm:ss", "YYYY-MM-DD HH:mm:ss"], true);
  if (parsedFallback.isValid()) return parsedFallback.valueOf();

  return null;
};

const getCampaignStatusStyle = (status: CampaignStatus): React.CSSProperties => {
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

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTenantId } = useTenant();
  const [range, setRange] = React.useState<OrdersRange>("24h");
  const [timelineMonthStart, setTimelineMonthStart] = React.useState(() => moment().startOf("month"));
  const data = ordersData[range];
  const summary = ordersSummaryData[range];
  const maxOrders = Math.max(...data.map((item) => item.orders));

  const { data: campaignsData, loading: campaignsLoading, error: campaignsError } = useQuery(CAMPAIGN_RULES_BY_TENANT_QUERY, {
    variables: { tenantId: selectedTenantId ?? "" },
    skip: !selectedTenantId,
  });

  const campaigns: CampaignRule[] = campaignsData?.campaignRulesByTenant ?? [];

  const { pastCampaigns, currentCampaigns, futureCampaigns } = React.useMemo(() => {
    const now = Date.now();
    const past: CampaignRule[] = [];
    const current: CampaignRule[] = [];
    const future: CampaignRule[] = [];

    for (const campaign of campaigns) {
      const startTs = parseCampaignDate(campaign.startDate);
      const endTs = parseCampaignDate(campaign.endDate);
      if (startTs === null) continue;

      if (startTs > now) {
        future.push(campaign);
        continue;
      }

      if (endTs !== null && endTs < now) {
        past.push(campaign);
        continue;
      }

      current.push(campaign);
    }

    return { pastCampaigns: past, currentCampaigns: current, futureCampaigns: future };
  }, [campaigns]);

  const visibleTimeStart = React.useMemo(() => timelineMonthStart.clone().startOf("month").valueOf(), [timelineMonthStart]);
  const visibleTimeEnd = React.useMemo(() => timelineMonthStart.clone().endOf("month").valueOf(), [timelineMonthStart]);
  const monthRangeMs = visibleTimeEnd - visibleTimeStart;

  const timelineCampaigns = React.useMemo(() => {
    const now = Date.now();
    const normalizedCampaigns: {
      itemId: number;
      ruleId: string;
      ruleName: string;
      startTs: number;
      endTs: number;
      status: CampaignStatus;
    }[] = [];

    campaigns.forEach((campaign, index) => {
      const itemId = index + 1;
      const startTs = parseCampaignDate(campaign.startDate);
      if (startTs === null) return;

      const parsedEndTs = parseCampaignDate(campaign.endDate);
      const hasValidEnd = parsedEndTs !== null;

      let status: CampaignStatus = "active";
      if (startTs > now) {
        status = "future";
      } else if (hasValidEnd && parsedEndTs < now) {
        status = "past";
      }

      let endTs = hasValidEnd ? parsedEndTs : startTs + 30 * dayMs;
      if (endTs <= startTs) {
        endTs = startTs + dayMs;
      }
      if (!hasValidEnd && status === "active") {
        endTs = Math.max(endTs, now + 30 * dayMs);
      }

      normalizedCampaigns.push({
        itemId,
        ruleId: campaign.id,
        ruleName: campaign.ruleName,
        startTs,
        endTs,
        status,
      });
    });

    return normalizedCampaigns.sort((left, right) => {
      if (left.startTs !== right.startTs) {
        return left.startTs - right.startTs;
      }

      return left.ruleName.localeCompare(right.ruleName);
    });
  }, [campaigns]);

  const { timelineGroups, timelineItems, timelineRuleByItemId, timelineKey } = React.useMemo(() => {
    const visibleCampaigns = timelineCampaigns.filter(
      (campaign) => campaign.startTs <= visibleTimeEnd && campaign.endTs >= visibleTimeStart,
    );
    const groups: { id: number; title: string }[] = [];
    const items: {
      id: number;
      group: number;
      title: string;
      start_time: number;
      end_time: number;
      itemProps: { style: React.CSSProperties };
    }[] = [];
    const ruleByItemId = new Map<number, string>();

    visibleCampaigns.forEach((campaign, index) => {
      const rowId = index + 1;
      groups.push({ id: rowId, title: "" });
      items.push({
        id: campaign.itemId,
        group: rowId,
        title: campaign.ruleName,
        start_time: campaign.startTs,
        end_time: campaign.endTs,
        itemProps: { style: getCampaignStatusStyle(campaign.status) },
      });
      ruleByItemId.set(campaign.itemId, campaign.ruleId);
    });

    if (visibleCampaigns.length === 0) {
      return {
        timelineGroups: groups,
        timelineItems: items,
        timelineRuleByItemId: ruleByItemId,
        timelineKey: "empty",
      };
    }

    return {
      timelineGroups: groups,
      timelineItems: items,
      timelineRuleByItemId: ruleByItemId,
      timelineKey: items
        .map((item) => `${item.id}:${item.start_time}:${item.end_time}:${item.group}`)
        .join("|"),
    };
  }, [timelineCampaigns, visibleTimeEnd, visibleTimeStart]);

  const handleTimelineWheelCapture = (event: React.WheelEvent<HTMLDivElement>) => {
    // Keep timeline navigation strictly on < and > controls.
    if (Math.abs(event.deltaX) > 0 || event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };

  const formatDate = (value?: string | null) => {
    const parsed = parseCampaignDate(value);
    return parsed === null ? "No end date" : new Date(parsed).toLocaleDateString();
  };

  const renderCampaignGroup = (
    title: string,
    items: CampaignRule[],
    options: { showStartDate: boolean; showEndDate: boolean },
  ) => (
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
                onClick={() => navigate(`/rules/${campaign.id}`)}
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
                {options.showStartDate && <TableCell>{formatDate(campaign.startDate)}</TableCell>}
                {options.showEndDate && <TableCell>{formatDate(campaign.endDate)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of customer, user, and order activity (stub data).
        </Typography>
      </Box>

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Users Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Stub metrics for customers and users.
              </Typography>

              <Grid2 container spacing={2}>
                {usersOverview.map((metric) => (
                  <Grid2 key={metric.label} size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="overline" color="text.secondary">
                        {metric.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {metric.value}
                      </Typography>
                    </Box>
                  </Grid2>
                ))}
              </Grid2>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Customer User Breakdown
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Total Users</TableCell>
                      <TableCell align="right">Active (30d)</TableCell>
                      <TableCell align="right">New This Month</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerUserStats.map((row) => (
                      <TableRow key={row.customer}>
                        <TableCell>{row.customer}</TableCell>
                        <TableCell align="right">{row.users}</TableCell>
                        <TableCell align="right">{row.activeUsers}</TableCell>
                        <TableCell align="right">{row.newUsers}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid2>

        <Grid2 size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Orders Information
                </Typography>
                <FormControl size="small">
                  <Select value={range} onChange={(event) => setRange(event.target.value as OrdersRange)}>
                    <MenuItem value="24h">Past 24 hours</MenuItem>
                    <MenuItem value="7d">Past 7 days</MenuItem>
                    <MenuItem value="30d">Past month</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Stub chart with time on the X axis and order volume on the Y axis.
              </Typography>

              <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Orders
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Time
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", height: 180 }}>
                  {data.map((item) => (
                    <Box key={item.label} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: "100%", height: 120, display: "flex", alignItems: "flex-end" }}>
                        <Box
                          sx={{
                            width: "100%",
                            height: `${(item.orders / maxOrders) * 100}%`,
                            bgcolor: "primary.main",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.orders}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Grid2 container spacing={2} sx={{ mt: 2 }}>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="overline" color="text.secondary">
                      Total Points Spent
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {summary.totalPointsSpent}
                    </Typography>
                  </Box>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: "#F5F6F4", border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="overline" color="text.secondary">
                      Average Redemption
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {summary.averageRedemption}
                    </Typography>
                  </Box>
                </Grid2>
              </Grid2>
            </CardContent>
          </Card>
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
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, lg: 4 }}>
                    {renderCampaignGroup("Past Campaigns", pastCampaigns, { showStartDate: false, showEndDate: true })}
                  </Grid2>
                  <Grid2 size={{ xs: 12, lg: 4 }}>
                    {renderCampaignGroup("Current Campaigns", currentCampaigns, { showStartDate: true, showEndDate: true })}
                  </Grid2>
                  <Grid2 size={{ xs: 12, lg: 4 }}>
                    {renderCampaignGroup("Future Campaigns", futureCampaigns, { showStartDate: true, showEndDate: false })}
                  </Grid2>
                  <Grid2 size={12} sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "#E3E5E2",
                        bgcolor: "#FFFFFF",
                        "& .rct-header-root": {
                          bgcolor: "#F5F6F4",
                          borderBottom: "1px solid #E3E5E2",
                        },
                        "& .rct-sidebar": {
                          borderRight: "1px solid #E3E5E2",
                        },
                        "& .rct-sidebar-row, & .rct-horizontal-lines .rct-hl-even, & .rct-horizontal-lines .rct-hl-odd": {
                          borderBottom: "1px solid #E3E5E2",
                          bgcolor: "#FFFFFF",
                        },
                        "& .rct-vertical-lines .rct-vl": {
                          borderLeft: "1px solid #E3E5E2",
                        },
                        "& .rct-dateHeader": {
                          color: "#1C1F1E",
                        },
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                        Campaign Timeline
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Past, active, and future campaigns on a single timeline.
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                        <Button size="small" variant="outlined" onClick={() => setTimelineMonthStart((prev) => prev.clone().subtract(1, "month"))}>
                          {"<"}
                        </Button>
                        <Typography variant="subtitle2" sx={{ color: "#1C1F1E", fontWeight: 700 }}>
                          {timelineMonthStart.format("MMMM YYYY")}
                        </Typography>
                        <Button size="small" variant="outlined" onClick={() => setTimelineMonthStart((prev) => prev.clone().add(1, "month"))}>
                          {">"}
                        </Button>
                      </Box>
                      {timelineItems.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No campaigns to visualize.
                        </Typography>
                      ) : (
                        <Box onWheelCapture={handleTimelineWheelCapture}>
                          <Timeline
                            key={`${timelineMonthStart.format("YYYY-MM")}-${timelineKey}`}
                            groups={timelineGroups}
                            items={timelineItems}
                            visibleTimeStart={visibleTimeStart}
                            visibleTimeEnd={visibleTimeEnd}
                            minZoom={monthRangeMs}
                            maxZoom={monthRangeMs}
                            buffer={1}
                            sidebarWidth={0}
                            lineHeight={52}
                            itemHeightRatio={0.72}
                            canMove={false}
                            canResize={false}
                            canChangeGroup={false}
                            stackItems
                            onItemSelect={(itemId) => {
                              const ruleId = timelineRuleByItemId.get(Number(itemId));
                              if (!ruleId) return;
                              navigate(`/rules/${ruleId}`);
                            }}
                            onTimeChange={(_, __, updateScrollCanvas) => {
                              updateScrollCanvas(visibleTimeStart, visibleTimeEnd);
                            }}
                          >
                            <TimelineHeaders>
                              <DateHeader unit="month" />
                              <DateHeader unit="day" labelFormat="D" />
                            </TimelineHeaders>
                          </Timeline>
                        </Box>
                      )}
                    </Box>
                  </Grid2>
                </Grid2>
              )}
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  );
};
