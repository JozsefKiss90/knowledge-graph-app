// src/components/layout/AppShell.js
import { Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, IconButton, Typography, Box, Button } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";

export default function AppShell({ children }) {
  const location = useLocation();
  const isGraph = location.pathname === "/";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ px: 3, gap: 3 }}>
          <TimelineIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            EU Knowledge Graph
          </Typography>

          {isGraph && (
            <Typography variant="body2" sx={{ mr: 2, opacity: 0.7 }}>
              Horizon Europe – Work Programme explorer
            </Typography>
          )}

          <Button
            component={Link}
            to="/bookmarks"
            startIcon={<StarIcon />}
            color="inherit"
            size="small"
          >
            Bookmarks
          </Button>
          <IconButton component={Link} to="/about" size="small" color="inherit">
            <InfoOutlinedIcon />
          </IconButton>

 
        </Toolbar>
      </AppBar>

      <Box sx={{ height: "calc(100vh - 64px)", display: "flex" }}>{children}</Box>
    </Box>
  );
}
