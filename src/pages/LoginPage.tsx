import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Avatar, Box, Button, Container, TextField, Typography, Paper } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

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
      <Paper elevation={4} sx={{ p: 4, width: "100%", borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Avatar sx={{ m: 1, bgcolor: "#0c9b50" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ color: "#0b1f14" }}>
            Loyalty Login
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
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 1, bgcolor: "#0c9b50" }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <Typography variant="body2" sx={{ color: "#4e5c55" }}>
              Dummy SSO placeholder — will be replaced by Entra ID.
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
