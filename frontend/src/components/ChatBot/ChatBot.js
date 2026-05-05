// ChatBot.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import { useDarkMode } from "../context/DarkModeContext";

const ChatBot = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const { darkMode } = useDarkMode();

  const API_BASE = useMemo(() => {
    const base = process.env.REACT_APP_API_URL || "";
    return base.replace(/\/+$/, "");
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { sender: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      const botMessage = { sender: "bot", text: data?.answer ?? "" };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Error contacting the chatbot." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter sends; Shift+Enter makes a newline (keeps it usable if you ever switch TextField to multiline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const rootClass = `chatbot ${darkMode ? "chatbot--dark" : "chatbot--light"}`;

  if (collapsed) {
    return (
      <Box className={rootClass}>
        <IconButton
          className="chatbot__fab"
          onClick={() => setCollapsed(false)}
          aria-label="Open chatbot"
        >
          <ChatBubbleOutlineOutlinedIcon className="chatbot__fabIcon" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box className={`${rootClass} chatbot__panel`}>
      <Paper elevation={6} className="chatbot__paper">
        {/* Header */}
        <Box className="chatbot__header">
          <Typography className="chatbot__title">💬 Chatbot</Typography>
          <Button
            className="chatbot__collapse"
            size="small"
            onClick={() => setCollapsed(true)}
          >
            ⇲
          </Button>
        </Box>

        {/* Body */}
        <Paper elevation={0} className="chatbot__body">
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              display="flex"
              justifyContent={msg.sender === "user" ? "flex-end" : "flex-start"}
              mb={1}
            >
              <Paper
                elevation={2}
                className={`chatbot__bubble ${
                  msg.sender === "user"
                    ? "chatbot__bubble--user"
                    : "chatbot__bubble--bot"
                }`}
              >
                <Typography variant="body2" whiteSpace="pre-line">
                  {msg.text}
                </Typography>
              </Paper>
            </Box>
          ))}

          {loading && (
            <Box display="flex" alignItems="center" gap={1} px={1} py={0.5}>
              <CircularProgress size={16} />
              <Typography variant="body2">Bot is thinking...</Typography>
            </Box>
          )}

          <div ref={chatEndRef} />
        </Paper>

        {/* Composer */}
        <Box className="chatbot__composer">
          <TextField
            className="chatbot__input"
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              // Keep MUI-specific input skinning here (optional). You can also move these to SCSS if preferred.
              minWidth: 0,
              "& .MuiOutlinedInput-root": {
                borderRadius: 8,
              },
            }}
          />

          <Button
            className="chatbot__send"
            variant="contained"
            onClick={sendMessage}
            disabled={loading}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatBot;
