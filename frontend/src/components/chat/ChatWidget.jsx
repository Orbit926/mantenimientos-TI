import { useState, useRef, useEffect, useCallback } from 'react';
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
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import { sendMessage, sendImage } from '../../api/chat';

const BOT_AVATAR = <SmartToyIcon sx={{ fontSize: 18 }} />;

const WELCOME = {
  role: 'assistant',
  content: '¡Hola! Soy tu asistente de soporte técnico. ¿En qué puedo ayudarte hoy?',
};

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';
  const isImage = msg.role === 'image';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: (isUser || isImage) ? 'flex-end' : 'flex-start',
        mb: 1.5,
        alignItems: 'flex-end',
        gap: 1,
      }}
    >
      {!isUser && !isImage && (
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
          px: isImage ? 0 : 1.5,
          py: isImage ? 0 : 1,
          borderRadius: (isUser || isImage) ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          bgcolor: isUser ? '#1565c0' : isError ? '#ffebee' : isImage ? 'transparent' : '#f0f4f8',
          color: isUser ? '#fff' : isError ? 'error.main' : 'text.primary',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: isImage ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {isImage ? (
          <Box
            component="img"
            src={msg.content}
            alt="imagen adjunta"
            sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2, display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
          />
        ) : msg.content}
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

const MIN_W = 300;
const MAX_W = 800;
const MIN_H = 360;
const MAX_H = 900;
const DEFAULT_W = 380;
const DEFAULT_H = 520;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [pendingImage, setPendingImage] = useState(null); // { file, previewUrl }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeRef = useRef(null); // stores { startX, startY, startW, startH, dir }

  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
      dir,
    };

    const onMove = (ev) => {
      const { startX, startY, startW, startH, dir: d } = resizeRef.current;
      const dx = startX - ev.clientX; // panel crece hacia la izquierda
      const dy = startY - ev.clientY; // panel crece hacia arriba
      setSize({
        w: d.includes('w') ? Math.min(MAX_W, Math.max(MIN_W, startW + dx)) : startW,
        h: d.includes('h') ? Math.min(MAX_H, Math.max(MIN_H, startH + dy)) : startH,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size.w, size.h]);

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
    const hasImage = !!pendingImage;
    if ((!text && !hasImage) || loading) return;

    setLoading(true);

    // --- envío de imagen ---
    if (hasImage) {
      const { file, previewUrl } = pendingImage;
      // mostrar preview en el chat como mensaje del usuario
      setMessages((prev) => [
        ...prev,
        { role: 'image', content: previewUrl },
        ...(text ? [{ role: 'user', content: text }] : []),
      ]);
      setInput('');
      setPendingImage(null);
      try {
        const data = await sendImage(file, text);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.description },
        ]);
      } catch (err) {
        const apiError = err?.response?.data?.error;
        setMessages((prev) => [
          ...prev,
          {
            role: 'error',
            content: apiError || 'No se pudo analizar la imagen. Intenta nuevamente.',
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    // --- envío de texto ---
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
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

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
    e.target.value = '';
  };

  const cancelImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    cancelImage();
    setMessages([WELCOME]);
    setInput('');
  };

  const handleReset = () => setSize({ w: DEFAULT_W, h: DEFAULT_H });

  // Returns [sx, onMouseDown] — kept separate so MUI doesn't receive onMouseDown inside sx
  const handle = (dir, cursor, top, left, right, bottom, width, height) => ({
    sx: { position: 'absolute', top, left, right, bottom, width, height, cursor, zIndex: 10, userSelect: 'none' },
    onMouseDown: (e) => startResize(e, dir),
  });

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
            width: { xs: 'calc(100vw - 32px)', sm: size.w },
            height: size.h,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Resize handles ───────────────────────── */}
          {/* top edge */}
          <Box {...handle('h', 'ns-resize', 0, 8, 8, 'auto', 'auto', 6)} />
          {/* left edge */}
          <Box {...handle('w', 'ew-resize', 8, 0, 'auto', 8, 6, 'auto')} />
          {/* top-left corner */}
          <Box {...handle('wh', 'nwse-resize', 0, 0, 'auto', 'auto', 12, 12)} />
          {/* top-right corner (resize height only, right edge is fixed) */}
          <Box {...handle('h', 'ns-resize', 0, 'auto', 0, 'auto', 12, 12)} />
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
            <Tooltip title="Restaurar tamaño">
              <IconButton size="small" onClick={handleReset} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff' }, fontSize: '0.7rem', px: 0.5 }}>
                <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 700, letterSpacing: 0 }}>⊡</Typography>
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

          {/* Image preview strip */}
          {pendingImage && (
            <Box
              sx={{
                px: 1.5,
                pt: 1,
                pb: 0,
                bgcolor: '#fff',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexShrink: 0,
              }}
            >
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Box
                  component="img"
                  src={pendingImage.previewUrl}
                  alt="preview"
                  sx={{ height: 56, borderRadius: 1.5, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                />
                <IconButton
                  size="small"
                  onClick={cancelImage}
                  sx={{
                    position: 'absolute', top: -6, right: -6,
                    bgcolor: '#455a64', color: '#fff', width: 18, height: 18,
                    '&:hover': { bgcolor: '#263238' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 11 }} />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Escribe un comentario opcional y envía
              </Typography>
            </Box>
          )}

          {/* Input */}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderTop: pendingImage ? 'none' : '1px solid #e0e0e0',
              bgcolor: '#fff',
              display: 'flex',
              gap: 0.5,
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            {/* hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleImagePick}
            />
            <Tooltip title="Adjuntar imagen">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || !!pendingImage}
                sx={{
                  color: pendingImage ? '#1565c0' : '#90a4ae',
                  '&:hover': { color: '#1565c0' },
                  '&.Mui-disabled': { color: '#e0e0e0' },
                  flexShrink: 0,
                  mb: 0.25,
                }}
              >
                {pendingImage ? <ImageIcon fontSize="small" /> : <AttachFileIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <TextField
              inputRef={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingImage ? 'Comentario opcional...' : 'Escribe un mensaje...'}
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
              disabled={(!input.trim() && !pendingImage) || loading}
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
