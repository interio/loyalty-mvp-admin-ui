import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

type Props = {
  title: string;
  description?: string;
};

export const PlaceholderPage: React.FC<Props> = ({ title, description }) => (
  <Card sx={{ borderRadius: 2, boxShadow: "0 4px 14px rgba(195,195,195,0.28)" }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description ?? "Coming next."}
      </Typography>
    </CardContent>
  </Card>
);
