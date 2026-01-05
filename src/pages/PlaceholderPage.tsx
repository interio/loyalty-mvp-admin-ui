import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

type Props = {
  title: string;
  description?: string;
};

export const PlaceholderPage: React.FC<Props> = ({ title, description }) => (
  <Card sx={{ borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
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
