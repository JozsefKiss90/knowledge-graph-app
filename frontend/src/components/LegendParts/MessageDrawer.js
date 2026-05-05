import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import Drawer from "@mui/material/Drawer";
import { Box, TextField, Button, Typography } from "@mui/material";

// Styled drawer component
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== "darkMode",
})(({ darkMode }) => ({
  "& .MuiDrawer-paper": {
    backgroundColor: darkMode ? "#2a2a3a" : "#f5f5f5", 
    color: darkMode ? "#ffffff" : "#000000",
    width: 300,
    padding: "20px",
  },
}));

const MessageDrawer = ({ anchor, open, onClose, darkMode }) => {
  const [message, setMessage] = useState("");
  const handleSend = async () => {
  try {
    const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_BASE}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: "jozsefkiss90@gmail.com", message }),
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }

    const result = await response.json();
    console.log("Email sent:", result);
    onClose();
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

  return (
    <StyledDrawer anchor={anchor} open={open} onClose={onClose} darkMode={darkMode}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Send Message
        </Typography>
        <TextField
          label="Message"
          fullWidth
          multiline
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{
            mb: 2,
            input: { color: "white" },
            textarea: { color: "white" },
            label: { color: "white" },
            "& .MuiInputBase-root": {
              color: "white",
            },
            "& .MuiInputLabel-root": {
              color: "white",
            },
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "white",
              },
              "&:hover fieldset": {
                borderColor: "white",
              },
              "&.Mui-focused fieldset": {
                borderColor: "white",
              },
            },
          }}
        />
        <Button variant="contained" fullWidth onClick={handleSend}>
          Send
        </Button>
      </Box>
    </StyledDrawer>
  );
};

export default MessageDrawer;
