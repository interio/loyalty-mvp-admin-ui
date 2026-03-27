import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar, Box, Button, Container, TextField, Typography, Paper } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarIcon from "@mui/icons-material/Star";
import { alpha } from "@mui/material/styles";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ display: "flex", alignItems: "center", minHeight: "100vh" }}>
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 4,
          width: "100%",
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 4px 14px rgba(195,195,195,0.28)",
          backgroundColor: theme.palette.background.paper,
        })}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={(theme) => ({
              m: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.22),
              color: theme.palette.primary.light,
              border: `1px solid ${alpha(theme.palette.primary.light, 0.5)}`,
            })}
          >
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            Loyalty Login <StarIcon sx={{ color: "#FF2B00", fontSize: 18 }} />
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 1 }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Typography variant="body2" color="text.secondary">
              Dummy SSO placeholder — will be replaced by Entra ID.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
