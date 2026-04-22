import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Alert,
  Skeleton,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import TableRowsIcon from '@mui/icons-material/TableRows';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboard';
import { useIniciarMantenimiento } from '../hooks/useIniciarMantenimiento';
import { formatDate, daysFromToday } from '../utils/formatters';
import { TIPO_EQUIPO_MAP } from '../utils/constants';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function toLocalDateKey(dateStr) {
  if (!dateStr) return null;
  // Si viene como 'YYYY-MM-DD' (fecha pura), usarlo tal cual para evitar
  // el desfase por zona horaria que aplica new Date() al interpretarlo como UTC.
  if (typeof dateStr === 'string') {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function colorForDays(days) {
  if (days === null || days === undefined) return 'default';
  if (days < 0) return 'error';
  if (days <= 7) return 'warning';
  return 'success';
}

function CalendarView({ equipos, onEquipoClick, onRegistrar, registrando }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const eventosPorDia = useMemo(() => {
    const map = new Map();
    for (const eq of equipos) {
      const key = toLocalDateKey(eq.fecha_proximo_mantenimiento);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(eq);
    }
    return map;
  }, [equipos]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  // lunes=0 ... domingo=6
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const fmtKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = fmtKey(new Date());

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - offset + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const date = inMonth ? new Date(year, month, dayNum) : null;
    const key = date ? fmtKey(date) : null;
    cells.push({ inMonth, dayNum, date, key, eventos: key ? eventosPorDia.get(key) ?? [] : [] });
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton onClick={() => setCursor(new Date(year, month - 1, 1))} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6">{MESES[month]} {year}</Typography>
        <Box>
          <Button size="small" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Hoy
          </Button>
          <IconButton onClick={() => setCursor(new Date(year, month + 1, 1))} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {DIAS_SEMANA.map((d) => (
          <Typography key={d} variant="caption" sx={{ textAlign: 'center', fontWeight: 600, color: 'text.secondary', py: 0.5 }}>
            {d}
          </Typography>
        ))}
        {cells.map((c, i) => {
          const isToday = c.key && c.key === todayKey;
          return (
            <Box
              key={i}
              sx={{
                minHeight: 96,
                p: 0.5,
                border: '1px solid',
                borderColor: isToday ? 'primary.main' : 'divider',
                borderWidth: isToday ? 2 : 1,
                borderRadius: 1,
                bgcolor: c.inMonth ? 'background.paper' : 'action.hover',
                opacity: c.inMonth ? 1 : 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
              }}
            >
              {c.inMonth && (
                <Typography variant="caption" sx={{ fontWeight: isToday ? 700 : 500, color: isToday ? 'primary.main' : 'text.secondary' }}>
                  {c.dayNum}
                </Typography>
              )}
              {c.eventos.slice(0, 3).map((eq) => {
                const days = daysFromToday(eq.fecha_proximo_mantenimiento);
                return (
                  <Tooltip
                    key={eq.id}
                    title={`${eq.codigo_interno} — ${eq.marca} ${eq.modelo} (${eq.colaborador_nombre})`}
                  >
                    <Chip
                      label={eq.codigo_interno}
                      size="small"
                      color={colorForDays(days)}
                      onClick={(e) => { e.stopPropagation(); onEquipoClick(eq); }}
                      onDelete={(e) => { e.stopPropagation(); onRegistrar(eq); }}
                      deleteIcon={
                        <Tooltip title="Registrar mantenimiento">
                          <BuildIcon style={{ fontSize: 14 }} />
                        </Tooltip>
                      }
                      disabled={registrando === eq.id}
                      sx={{ height: 20, fontSize: 10, '& .MuiChip-label': { px: 0.75 } }}
                    />
                  </Tooltip>
                );
              })}
              {c.eventos.length > 3 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                  +{c.eventos.length - 3} más
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

function EstadoMantChip({ dateStr }) {
  const days = daysFromToday(dateStr);
  if (days === null) return <Chip label="Sin fecha" size="small" />;
  if (days < 0) return <Chip label={`Vencido ${Math.abs(days)}d`} color="error" size="small" />;
  if (days === 0) return <Chip label="Hoy" color="warning" size="small" />;
  if (days <= 7) return <Chip label={`En ${days}d`} color="warning" size="small" />;
  return <Chip label={`En ${days}d`} color="success" size="small" />;
}

export default function ProximosMantenimientos() {
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState('tabla');
  const { iniciar, registrandoId: registrando, error: iniciarError } = useIniciarMantenimiento();

  const handleRegistrar = (eq) => iniciar(eq.id);

  useEffect(() => {
    setLoading(true);
    const dias = vista === 'calendario' ? 730 : 30;
    dashboardService
      .proximos(dias)
      .then((data) => setEquipos(data.results ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [vista]);

  const sorted = [...equipos].sort((a, b) => {
    const da = daysFromToday(a.fecha_proximo_mantenimiento) ?? 9999;
    const db = daysFromToday(b.fecha_proximo_mantenimiento) ?? 9999;
    return da - db;
  });

  return (
    <Box>
      <PageHeader
        title="Próximos mantenimientos"
        subtitle="Equipos con mantenimiento próximo o vencido en los próximos 30 días"
      />

      {(error || iniciarError) && <Alert severity="error" sx={{ mb: 2 }}>{error || iniciarError}</Alert>}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleButtonGroup
          value={vista}
          exclusive
          size="small"
          onChange={(_, v) => v && setVista(v)}
        >
          <ToggleButton value="tabla">
            <TableRowsIcon fontSize="small" sx={{ mr: 1 }} /> Tabla
          </ToggleButton>
          <ToggleButton value="calendario">
            <CalendarMonthIcon fontSize="small" sx={{ mr: 1 }} /> Calendario
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {vista === 'calendario' ? (
        <CalendarView
          equipos={sorted}
          onEquipoClick={(eq) => navigate(`/equipos/${eq.id}`)}
          onRegistrar={handleRegistrar}
          registrando={registrando}
        />
      ) : (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Colaborador</TableCell>
              <TableCell>Último mant.</TableCell>
              <TableCell>Próximo mant.</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay mantenimientos próximos en los próximos 30 días
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((eq) => (
                <TableRow
                  key={eq.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/equipos/${eq.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{eq.codigo_interno}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{eq.marca} {eq.modelo}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {TIPO_EQUIPO_MAP[eq.tipo_equipo] ?? eq.tipo_equipo}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{eq.ubicacion}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{eq.colaborador_nombre}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(eq.fecha_ultimo_mantenimiento)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(eq.fecha_proximo_mantenimiento)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <EstadoMantChip dateStr={eq.fecha_proximo_mantenimiento} />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<BuildIcon />}
                      disabled={registrando === eq.id}
                      onClick={() => handleRegistrar(eq)}
                    >
                      Registrar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}
    </Box>
  );
}
