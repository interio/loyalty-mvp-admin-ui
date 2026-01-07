import React from "react";
import { Box, Divider, Typography } from "@mui/material";
import type { Theme } from "@mui/material/styles";

type DetailSectionProps = {
  title: string;
  children: React.ReactNode;
  sx?: Record<string, any>;
};

export const DetailSection: React.FC<DetailSectionProps> = ({ title, children, sx }) => (
  <Box
    sx={{
      "--detail-section-bg": (theme: Theme) => theme.detailSection.background,
      "--detail-section-inner-bg": (theme: Theme) => theme.detailSection.innerBackground,
      "--detail-section-title-color": (theme: Theme) => theme.detailSection.titleColor,
      "--detail-section-divider-color": (theme: Theme) => theme.detailSection.dividerColor,
      bgcolor: "var(--detail-section-bg)",
      borderRadius: 2,
      p: 2,
      ...sx,
    }}
  >
    <Typography variant="overline" sx={{ letterSpacing: 1, fontWeight: 700, color: "var(--detail-section-title-color)" }}>
      {title}
    </Typography>
    <Divider sx={{ my: 1.5, borderColor: "var(--detail-section-divider-color)" }} />
    {children}
  </Box>
);
