import React from "react";
import { Link as RouterLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import PeopleIcon from "@mui/icons-material/People";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import StoreIcon from "@mui/icons-material/Store";
import RuleIcon from "@mui/icons-material/Rule";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BusinessIcon from "@mui/icons-material/Business";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useAuth } from "../auth/AuthContext";
import { TenantProvider, useTenant } from "../modules/tenants/TenantContext";

const drawerWidth = 240;
const logoUrl = new URL("../assets/eazle_logo_transparent.png", import.meta.url).href;

const navItems = [
  { label: "Dashboard", path: "/", icon: <DashboardCustomizeIcon /> },
  { label: "Tenants", path: "/tenants", icon: <BusinessIcon /> },
  { label: "Customers", path: "/customers", icon: <PeopleIcon /> },
  { label: "Users", path: "/users", icon: <AccountCircleIcon /> },
  { label: "Products", path: "/products", icon: <StoreIcon /> },
  { label: "Rules", path: "/rules", icon: <RuleIcon /> },
  { label: "Invoices", path: "/invoices", icon: <ReceiptLongIcon /> },
];

export const AppLayout: React.FC = () => (
  <TenantProvider>
    <AppLayoutContent />
  </TenantProvider>
);

const AppLayoutContent: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { tenants, selectedTenantId, setSelectedTenantId, loading: tenantsLoading } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const drawer = (
    <div>
      <Toolbar sx={{ color: "#0f3d23" }}>
        <Box component="img" src={logoUrl} alt="Eazle logo" sx={{ width: 60, height: "auto", mr: 1 }} />
        <Typography variant="h6" noWrap component="div">
          Loyalty
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f0f5f1" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          ml: { sm: `${drawerWidth}px` },
          background: "linear-gradient(90deg, #006e3a 0%, #0c9b50 100%)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box component="img" src={logoUrl} alt="Eazle logo" sx={{ width: 60, height: "auto", mr: 1 }} />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Loyalty
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <FormControl
              size="small"
              variant="outlined"
              sx={{
                minWidth: 200,
                "& .MuiInputBase-root": {
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.6)",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.6)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#fff",
                },
                "& .MuiSvgIcon-root": { color: "#fff" },
              }}
            >
              <Select
                value={selectedTenantId ?? ""}
                onChange={(e) => setSelectedTenantId(String(e.target.value))}
                displayEmpty
                disabled={tenantsLoading || tenants.length === 0}
                renderValue={(value) => {
                  if (!value) return "Select tenant";
                  const tenant = tenants.find((t) => t.id === value);
                  return tenant ? tenant.name : "Select tenant";
                }}
                size="small"
              >
                <MenuItem disabled value="">
                  {tenantsLoading ? "Loading tenants..." : "Select tenant"}
                </MenuItem>
                {tenants.map((tenant) => (
                  <MenuItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {user && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2">{user.email}</Typography>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.7)" }}
                >
                  Logout
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label="navigation">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid #e0e7e2",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
