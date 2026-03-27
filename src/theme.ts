import { alpha, createTheme } from "@mui/material/styles";

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
    mode: "light",
    primary: {
      main: "#008200",
      light: "#008200",
      dark: "#205527",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#205527",
    },
    error: {
      main: "#FF2B00",
    },
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
    action: {
      hover: "#F5F6F4",
    },
    text: {
      primary: "#1F2A23",
      secondary: "#5F6B63",
    },
    divider: "#E3E5E2",
  },
  typography: {
    fontFamily: '"Heineken", "Heineken Sans", "Avenir Next", "Helvetica Neue", sans-serif',
    h4: {
      fontFamily: '"Heineken", "Heineken Sans", "Avenir Next", "Helvetica Neue", sans-serif',
      fontWeight: 700,
      letterSpacing: 0.5,
    },
    h5: {
      fontFamily: '"Heineken", "Heineken Sans", "Avenir Next", "Helvetica Neue", sans-serif',
      fontWeight: 700,
      letterSpacing: 0.35,
    },
    h6: {
      fontFamily: '"Heineken", "Heineken Sans", "Avenir Next", "Helvetica Neue", sans-serif',
      fontWeight: 700,
      letterSpacing: 0.25,
    },
    button: {
      fontWeight: 700,
      letterSpacing: 0.25,
    },
  },
  shape: { borderRadius: 14 },
  detailSection: {
    background: "#F5F6F4",
    innerBackground: "#FFFFFF",
    titleColor: "#1F2A23",
    dividerColor: "#E3E5E2",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#FFFFFF",
          color: "#1F2A23",
        },
        "::selection": {
          backgroundColor: alpha("#008200", 0.2),
          color: "#1F2A23",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: () => ({
          backgroundColor: "#FFFFFF",
          backgroundImage: "none",
          border: "1px solid #E3E5E2",
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: () => ({
          backgroundColor: "#FFFFFF",
          border: "1px solid #E3E5E2",
          boxShadow: "0 4px 14px rgba(195,195,195,0.28)",
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: () => ({
          backgroundColor: "#FFFFFF",
          backgroundImage: "none",
          borderRight: "1px solid #E3E5E2",
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: () => ({
          backgroundColor: "#FFFFFF",
          backgroundImage: "none",
          color: "#1F2A23",
          borderBottom: "1px solid #E3E5E2",
          boxShadow: "none",
        }),
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          margin: "2px 8px",
          color: theme.palette.text.primary,
          "&:hover": {
            backgroundColor: "#F5F6F4",
          },
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.text.primary,
            "& .MuiListItemIcon-root": {
              color: theme.palette.primary.main,
            },
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          },
        }),
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: () => ({
          color: "#7B857D",
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
        },
        containedPrimary: {
          backgroundColor: "#008200",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "#205527",
          },
        },
        outlined: {
          borderColor: "#E3E5E2",
          color: "#1F2A23",
          "&:hover": {
            borderColor: "#E3E5E2",
            backgroundColor: "#F5F6F4",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: "#FFFFFF",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E3E5E2",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E3E5E2",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#008200",
          },
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
          "&.Mui-focused": {
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderBottomColor: alpha(theme.palette.divider, 0.65),
        }),
        head: ({ theme }) => ({
          color: theme.palette.text.secondary,
          fontWeight: 700,
          backgroundColor: "#FFFFFF",
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.MuiTableRow-hover:hover": {
            backgroundColor: "#F5F6F4",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlined: ({ theme }) => ({
          borderColor: "#E3E5E2",
          color: theme.palette.text.secondary,
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&:hover": {
            backgroundColor: "#F5F6F4",
          },
          "&.Mui-selected": {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          },
          "&.Mui-selected:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          },
        }),
      },
    },
  },
});
