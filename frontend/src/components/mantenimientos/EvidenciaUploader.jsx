import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Paper,
  MenuItem,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

const TIPO_CHOICES = [
  { value: 'ANTES', label: 'Antes' },
  { value: 'DURANTE', label: 'Durante' },
  { value: 'DESPUES', label: 'Después' },
  { value: 'GENERAL', label: 'General' },
];

const TIPO_COLOR = {
  ANTES: 'default',
  DURANTE: 'warning',
  DESPUES: 'success',
  GENERAL: 'info',
};

/**
 * Uploader de evidencias fotográficas del estado del equipo.
 *
 * Props:
 *  - evidencias: array de { id, tipo, descripcion, imagen_url, created_at }
 *  - onUpload(file, tipo, descripcion): Promise — sube una nueva imagen
 *  - onDelete(evidenciaId): Promise — elimina una evidencia
 *  - disabled: bool — desactiva el uploader (p. ej. cuando no hay mantenimientoId aún)
 *  - helperText: string opcional que se muestra cuando está deshabilitado
 */
export default function EvidenciaUploader({
  evidencias = [],
  onUpload,
  onDelete,
  disabled = false,
  helperText = '',
}) {
  const fileInputRef = useRef(null);
  const [tipo, setTipo] = useState('GENERAL');
  const [descripcion, setDescripcion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a seleccionar el mismo archivo
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es muy grande (máx 10 MB).');
      return;
    }

    setError('');
    setUploading(true);
    try {
      await onUpload(file, tipo, descripcion);
      setDescripcion('');
    } catch (err) {
      setError(err?.message || 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;
    try {
      await onDelete(id);
    } catch (err) {
      setError(err?.message || 'Error al eliminar la imagen.');
    }
  };

  return (
    <Box>
      {disabled && helperText && (
        <Alert severity="info" sx={{ mb: 2 }}>{helperText}</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Zona de upload */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          bgcolor: disabled ? 'grey.50' : 'background.paper',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              select
              label="Tipo"
              size="small"
              fullWidth
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={disabled || uploading}
            >
              {TIPO_CHOICES.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Descripción (opcional)"
              size="small"
              fullWidth
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={disabled || uploading}
              placeholder="Ej: Pantalla con daño en esquina superior"
              inputProps={{ maxLength: 300 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              component="label"
              startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
              disabled={disabled || uploading}
            >
              {uploading ? 'Subiendo...' : 'Subir foto'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFile}
              />
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Galería */}
      {evidencias.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          No hay evidencias registradas.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {evidencias.map((ev) => (
            <Grid key={ev.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '75%', // 4:3
                    bgcolor: 'grey.100',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPreviewUrl(ev.imagen_url)}
                >
                  <Box
                    component="img"
                    src={ev.imagen_url}
                    alt={ev.descripcion || 'Evidencia'}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      '&:hover': { bgcolor: 'white' },
                    }}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ p: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={TIPO_CHOICES.find((t) => t.value === ev.tipo)?.label ?? ev.tipo}
                      size="small"
                      color={TIPO_COLOR[ev.tipo] ?? 'default'}
                      variant="outlined"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(ev.id)}
                      disabled={disabled}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {ev.descripcion && (
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {ev.descripcion}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de preview */}
      <Dialog open={Boolean(previewUrl)} onClose={() => setPreviewUrl(null)} maxWidth="md" fullWidth>
        <DialogTitle>Vista previa</DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt="Preview"
              sx={{ width: '100%', height: 'auto', display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewUrl(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
