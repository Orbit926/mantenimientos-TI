import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { mantenimientosService } from '../../services/mantenimientos';
import { formatDate } from '../../utils/formatters';
import { ESTATUS_MANTENIMIENTO_CHOICES } from '../../utils/constants';

export default function MantenimientosList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingId, setGeneratingId] = useState(null);
  const [filters, setFilters] = useState({ estatus: '', tecnico: '' });

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.estatus) params.estatus = filters.estatus;
    mantenimientosService
      .list(params)
      .then((data) => setItems(data.results ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters.estatus]);

  useEffect(() => { load(); }, [load]);

  const filtered = filters.tecnico
    ? items.filter((m) =>
        m.tecnico_nombre?.toLowerCase().includes(filters.tecnico.toLowerCase())
      )
    : items;

  const handleGenerarPDF = async (id, e) => {
    e.stopPropagation();
    setGeneratingId(id);
    try {
      await mantenimientosService.generarPDF(id);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Mantenimientos"
        subtitle="Registro de mantenimientos de equipos"
        actions={
          <Button variant="contained" onClick={() => navigate('/mantenimientos/nuevo')}>
            + Nuevo mantenimiento
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Estatus"
            select
            value={filters.estatus}
            onChange={(e) => setFilters((p) => ({ ...p, estatus: e.target.value }))}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {ESTATUS_MANTENIMIENTO_CHOICES.map(({ value, label }) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Técnico"
            value={filters.tecnico}
            onChange={(e) => setFilters((p) => ({ ...p, tecnico: e.target.value }))}
            size="small"
            placeholder="Filtrar por técnico..."
          />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell>Técnico</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado equipo</TableCell>
              <TableCell>Estatus</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No se encontraron mantenimientos
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/mantenimientos/${m.id}`)}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{m.equipo_codigo}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.equipo_descripcion}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{m.tecnico_nombre}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{formatDate(m.fecha_ejecucion)}</Typography></TableCell>
                  <TableCell>
                    {m.estado_equipo_post
                      ? <StatusChip type="estado_equipo" value={m.estado_equipo_post} />
                      : <Typography variant="body2" color="text.secondary">—</Typography>
                    }
                  </TableCell>
                  <TableCell><StatusChip type="estatus" value={m.estatus} /></TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => navigate(`/mantenimientos/${m.id}`)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {m.estatus !== 'COMPLETADO' && (
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => navigate(`/mantenimientos/${m.id}/editar`)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Generar PDF">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => handleGenerarPDF(m.id, e)}
                          disabled={generatingId === m.id}
                        >
                          {generatingId === m.id
                            ? <CircularProgress size={16} />
                            : <AutorenewIcon fontSize="small" />
                          }
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
