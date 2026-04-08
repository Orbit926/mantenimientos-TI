import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatusChip from '../components/common/StatusChip';
import { mantenimientosService } from '../services/mantenimientos';
import { formatDate } from '../utils/formatters';
import { ESTATUS_MANTENIMIENTO_CHOICES } from '../utils/constants';

const EMPTY_FILTERS = {
  tecnico: '',
  estatus: '',
  fecha_desde: '',
  fecha_hasta: '',
  equipo_search: '',
};

export default function Historial() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (applied.estatus) params.estatus = applied.estatus;
    mantenimientosService
      .list(params)
      .then((data) => setItems(data.results ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [applied.estatus]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => setApplied({ ...filters });

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const visible = items.filter((m) => {
    if (applied.tecnico && !m.tecnico_nombre?.toLowerCase().includes(applied.tecnico.toLowerCase()))
      return false;
    if (applied.equipo_search) {
      const q = applied.equipo_search.toLowerCase();
      if (!m.equipo_codigo?.toLowerCase().includes(q) && !m.equipo_descripcion?.toLowerCase().includes(q))
        return false;
    }
    if (applied.fecha_desde && m.fecha_ejecucion < applied.fecha_desde) return false;
    if (applied.fecha_hasta && m.fecha_ejecucion > applied.fecha_hasta) return false;
    return true;
  });

  const setF = (name) => (e) => setFilters((p) => ({ ...p, [name]: e.target.value }));

  return (
    <Box>
      <PageHeader
        title="Historial"
        subtitle="Búsqueda y consulta de mantenimientos pasados"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Equipo / código"
              value={filters.equipo_search}
              onChange={setF('equipo_search')}
              size="small"
              fullWidth
              placeholder="Código o descripción..."
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              label="Técnico"
              value={filters.tecnico}
              onChange={setF('tecnico')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              label="Estatus"
              select
              value={filters.estatus}
              onChange={setF('estatus')}
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {ESTATUS_MANTENIMIENTO_CHOICES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              label="Fecha desde"
              type="date"
              value={filters.fecha_desde}
              onChange={setF('fecha_desde')}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              label="Fecha hasta"
              type="date"
              value={filters.fecha_hasta}
              onChange={setF('fecha_hasta')}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SearchIcon />}
                onClick={applyFilters}
                fullWidth
              >
                Buscar
              </Button>
              <Tooltip title="Limpiar filtros">
                <IconButton size="small" onClick={resetFilters}>
                  <FilterListOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
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
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No se encontraron mantenimientos con esos filtros
                </TableCell>
              </TableRow>
            ) : (
              visible.map((m) => (
                <TableRow
                  key={m.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/mantenimientos/${m.id}`)}
                >
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
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => navigate(`/mantenimientos/${m.id}`)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!loading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
          {visible.length} resultado{visible.length !== 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
}
