import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ENCABEZADOS_REQUERIDOS = [
  'codigo_interno', 'marca', 'modelo', 'numero_serie', 'tipo_equipo',
  'ubicacion', 'colaborador_nombre', 'colaborador_correo',
  'colaborador_puesto', 'fecha_proximo_mantenimiento',
];

/**
 * Aplana los errores DRF de un campo a un string legible.
 * `errores` puede ser: ["msg"], "msg", o {sub: ["msg"]}.
 */
function flattenError(errores) {
  if (Array.isArray(errores)) return errores.join(' · ');
  if (typeof errores === 'string') return errores;
  if (errores && typeof errores === 'object') {
    return Object.entries(errores)
      .map(([k, v]) => `${k}: ${flattenError(v)}`)
      .join(' · ');
  }
  return String(errores);
}

export default function ImportarCSVDialog({ open, onClose, onImport, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);  // { creados, fallidos, errores, detail }
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setFile(null);
    setLoading(false);
    setResultado(null);
    setErrorMsg('');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setErrorMsg('');
    setResultado(null);
    try {
      const data = await onImport(file);
      setResultado(data);
      // Si todo bien, notificamos al padre para que recargue.
      if (onSuccess) onSuccess(data);
    } catch (err) {
      const data = err.responseData;
      if (data?.errores && Array.isArray(data.errores)) {
        // Errores por fila.
        setResultado(data);
      } else {
        setErrorMsg(data?.detail || err.message || 'Error al importar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const importacionExitosa = resultado && resultado.fallidos === 0 && resultado.creados > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Importar equipos desde CSV</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>
          Sube un archivo <strong>.csv codificado en UTF-8</strong>. Si una fila tiene errores,
          no se importará ningún equipo y verás el detalle por fila para corregirlos.
        </DialogContentText>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            Encabezados esperados (en este orden):
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {ENCABEZADOS_REQUERIDOS.map((h) => (
              <Chip key={h} label={h} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>

        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={loading}
        >
          {file ? file.name : 'Seleccionar archivo CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResultado(null);
              setErrorMsg('');
            }}
          />
        </Button>

        {errorMsg && (
          <Alert severity="error" sx={{ mt: 2 }}>{errorMsg}</Alert>
        )}

        {importacionExitosa && (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
            <AlertTitle>Importación exitosa</AlertTitle>
            Se crearon <strong>{resultado.creados}</strong> equipo(s).
          </Alert>
        )}

        {resultado && resultado.fallidos > 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error" sx={{ mb: 1 }}>
              <AlertTitle>No se importó nada</AlertTitle>
              {resultado.detail || `Hay ${resultado.fallidos} fila(s) con errores.`}
            </Alert>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 80, fontWeight: 700 }}>Fila</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Errores</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultado.errores.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.fila}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{flattenError(e.errores)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          {importacionExitosa ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!importacionExitosa && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!file || loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          >
            Importar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
