import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    detailSection: {
      background: string;
      innerBackground: string;
      titleColor: string;
      dividerColor: string;
    };
  }
  interface ThemeOptions {
    detailSection?: {
      background: string;
      innerBackground: string;
      titleColor: string;
      dividerColor: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: "#0c9b50",
    },
    secondary: {
      main: "#0b1f14",
    },
    background: {
      default: "#f7faf8",
    },
  },
  shape: { borderRadius: 10 },
  detailSection: {
    background: "#eef3ef",
    innerBackground: "#f6faf7",
    titleColor: "#213129",
    dividerColor: "#d6e2d8",
  },
});
