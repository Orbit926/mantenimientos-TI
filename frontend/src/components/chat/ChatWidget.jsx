import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Paper,
  Typography,
  TextField,
  IconButton,
  Zoom,
  Avatar,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { sendMessage } from '../../api/chat';

const BOT_AVATAR = <SmartToyIcon sx={{ fontSize: 18 }} />;

const WELCOME = {
  role: 'assistant',
  content: '¡Hola! Soy tu asistente de soporte técnico. ¿En qué puedo ayudarte hoy?',
};

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        alignItems: 'flex-end',
        gap: 1,
      }}
    >
      {!isUser && (
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: isError ? 'error.light' : '#1565c0',
            flexShrink: 0,
          }}
        >
          {BOT_AVATAR}
        </Avatar>
      )}
      <Box
        sx={{
          maxWidth: '78%',
          px: 1.5,
          py: 1,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          bgcolor: isUser ? '#1565c0' : isError ? '#ffebee' : '#f0f4f8',
          color: isUser ? '#fff' : isError ? 'error.main' : 'text.primary',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        {msg.content}
      </Box>
    </Box>
  );
}

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1.5 }}>
      <Avatar sx={{ width: 28, height: 28, bgcolor: '#1565c0', flexShrink: 0 }}>
        {BOT_AVATAR}
      </Avatar>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: '16px 16px 16px 4px',
          bgcolor: '#f0f4f8',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#90a4ae',
              animation: 'bounce 1.2s infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes bounce': {
                '0%, 80%, 100%': { transform: 'scale(0.8)', opacity: 0.5 },
                '40%': { transform: 'scale(1.2)', opacity: 1 },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const historyForApi = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(text, historyForApi);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content:
            apiError ||
            'No se pudo conectar con la IA. Intenta nuevamente más tarde.',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([WELCOME]);
    setInput('');
  };

  return (
    <>
      {/* ── Floating button ─────────────────────────── */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            bgcolor: '#1565c0',
            '&:hover': { bgcolor: '#0d47a1' },
            boxShadow: '0 4px 20px rgba(21,101,192,0.5)',
          }}
        >
          <SmartToyIcon />
        </Fab>
      </Zoom>

      {/* ── Chat panel ──────────────────────────────── */}
      <Zoom in={open}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            height: 520,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: '#1565c0',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <SmartToyIcon sx={{ fontSize: 18 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                Asistente TI
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Powered by Ollama
              </Typography>
            </Box>
            <Tooltip title="Limpiar conversación">
              <IconButton size="small" onClick={handleClear} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff' } }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar">
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              px: 2,
              py: 1.5,
              bgcolor: '#fafafa',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#cfd8dc', borderRadius: 2 },
            }}
          >
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderTop: '1px solid #e0e0e0',
              bgcolor: '#fff',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <TextField
              inputRef={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              multiline
              maxRows={4}
              size="small"
              fullWidth
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  fontSize: '0.85rem',
                },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!input.trim() || loading}
              sx={{
                bgcolor: '#1565c0',
                color: '#fff',
                width: 36,
                height: 36,
                flexShrink: 0,
                '&:hover': { bgcolor: '#0d47a1' },
                '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
              }}
            >
              {loading ? (
                <CircularProgress size={16} sx={{ color: '#9e9e9e' }} />
              ) : (
                <SendIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Box>
        </Paper>
      </Zoom>
    </>
  );
}
