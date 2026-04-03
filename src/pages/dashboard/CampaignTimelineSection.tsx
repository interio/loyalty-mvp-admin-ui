import React from "react";
import moment from "moment";
import Timeline, { DateHeader, TimelineHeaders } from "react-calendar-timeline";
import "react-calendar-timeline/lib/Timeline.css";
import { Box, Button, Typography } from "@mui/material";
import { getCampaignStatusStyle } from "./campaigns";
import type { NormalizedCampaign } from "./types";

type Props = {
  campaigns: NormalizedCampaign[];
  onRuleClick: (id: string) => void;
};

export const CampaignTimelineSection: React.FC<Props> = ({ campaigns, onRuleClick }) => {
  const [timelineMonthStart, setTimelineMonthStart] = React.useState(() => moment().startOf("month"));

  const visibleTimeStart = React.useMemo(() => timelineMonthStart.clone().startOf("month").valueOf(), [timelineMonthStart]);
  const visibleTimeEnd = React.useMemo(() => timelineMonthStart.clone().endOf("month").valueOf(), [timelineMonthStart]);
  const monthRangeMs = visibleTimeEnd - visibleTimeStart;

  const { timelineGroups, timelineItems, timelineRuleByItemId, timelineKey } = React.useMemo(() => {
    const visibleCampaigns = campaigns.filter((campaign) => campaign.startTs <= visibleTimeEnd && campaign.endTs >= visibleTimeStart);
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
      const itemId = index + 1;
      groups.push({ id: rowId, title: "" });
      items.push({
        id: itemId,
        group: rowId,
        title: campaign.ruleName,
        start_time: campaign.startTs,
        end_time: campaign.endTs,
        itemProps: { style: getCampaignStatusStyle(campaign.status) },
      });
      ruleByItemId.set(itemId, campaign.id);
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
      timelineKey: items.map((item) => `${item.id}:${item.start_time}:${item.end_time}:${item.group}`).join("|"),
    };
  }, [campaigns, visibleTimeEnd, visibleTimeStart]);

  const handleTimelineWheelCapture = (event: React.WheelEvent<HTMLDivElement>) => {
    // Keep timeline navigation strictly on < and > controls.
    if (Math.abs(event.deltaX) > 0 || event.shiftKey || event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };

  return (
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
              onRuleClick(ruleId);
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
  );
};
