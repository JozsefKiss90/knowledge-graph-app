import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
} from '@mui/material';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { useDarkMode } from "../context/DarkModeContext";

const ChatBot = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { darkMode } = useDarkMode();
  const API_BASE = process.env.REACT_APP_API_URL?.replace(/\/+$/, '');

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = { sender: 'user', text: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      const botMessage = { sender: 'bot', text: data.answer };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: '⚠️ Error contacting the chatbot.' },
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') sendMessage();
  };

  // 💬 Collapsed state: just a floating circular icon
  if (collapsed) {
    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <IconButton
          onClick={() => setCollapsed(false)}
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: darkMode ? '#652effff' : '#ffffffff',
            border: darkMode ? '#ffffffff' : '2px solid #4005adff',
            boxShadow: 4,
            '&:hover': {
              bgcolor: darkMode ? '#561bf7ff' : '#ffffffff',
              border: '2px solid #4005adff',
            },
          }}
        >
          <ChatBubbleOutlineOutlinedIcon sx={{ color: darkMode ? "white" : '#4005adff' }} />
        </IconButton>
      </Box>
    );
  }

  // ⬇ Expanded state: current panel as before
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 360,
        maxHeight: 480,
        zIndex: 1000,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 1,
          bgcolor: darkMode ? '#652effff' : 'rgba(255, 255, 255, 1)', 
          color: darkMode ? '#f0f0f0' : '#000',
          borderRadius: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with collapse button */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1">💬 Chatbot</Typography>
          <Button
            size="small"
            onClick={() => setCollapsed(true)}
            sx={{
              minWidth: 'auto',
              color: darkMode ? '#f0f0f0' : '#000',
              '&:hover': {
                backgroundColor: darkMode ? '#2a3b4d' : '#e0e0e0',
              },
            }}
          >
            ⇲
          </Button>
        </Box>

        {/* Body */}
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            bgcolor: darkMode ? '#4005adff' : '#4005adff',
            borderRadius: 1,
          }}
        >
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              display="flex"
              justifyContent={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
              mb={1}
            >
              <Paper
                elevation={2}
                sx={{
                  p: 1,
                  maxWidth: '75%',
                  bgcolor: msg.sender === 'user' ? '#4005adff' : '#e0e0e0',
                  color: msg.sender === 'user' ? 'white' : 'black',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" whiteSpace="pre-line">
                  {msg.text}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">Bot is thinking...</Typography>
            </Box>
          )}
          <div ref={chatEndRef} />
        </Paper>
        <Box sx={{ display: 'flex', flexWrap:'nowrap', flexGrow:1, justifyContent:'space-between', borderRadius: 1,}}>  
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow:1, }}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              sx={{
                // Critical in flex rows: allow shrinking without overflow
                minWidth: 0,

                // Style the OUTER input container (this is what fills the field)
                "& .MuiOutlinedInput-root": {
                  backgroundColor: darkMode ? "#4e27a1ff" : "#ffffffff",
                  borderRadius: 1,
                },

                // Style the actual <input>
                "& .MuiOutlinedInput-input": {
                  color:  darkMode ? "white" : "black",
                },

                "& .MuiOutlinedInput-input::placeholder": {
                  color: darkMode ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)",
                  opacity: 1,
                },
              }}
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={loading}
              sx={{ width: 84, flex: "0 0 auto", alignSelf: "flex-end", color: darkMode ? '#ffffffff' : '#4500e0ff',  backgroundColor: darkMode ? '#4500e0ff' : '#ffffffff', '&:hover': { backgroundColor: darkMode ? '#3300aaff' : '#ffffffff', }, }}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatBot;