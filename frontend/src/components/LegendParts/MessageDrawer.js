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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
  try {
    const response = await fetch("http://localhost:8000/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: email, message }),
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
          label="Recipient Email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Message"
          fullWidth
          multiline
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" fullWidth onClick={handleSend}>
          Send
        </Button>
      </Box>
    </StyledDrawer>
  );
};

export default MessageDrawer;
