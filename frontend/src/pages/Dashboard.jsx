import { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Alert,
  Skeleton,
} from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import BuildIcon from '@mui/icons-material/Build';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import StatusChip from '../components/common/StatusChip';
import { dashboardService } from '../services/dashboard';
import { useIniciarMantenimiento } from '../hooks/useIniciarMantenimiento';
import { formatDate, daysFromToday } from '../utils/formatters';

function DaysBadge({ dateStr }) {
  const days = daysFromToday(dateStr);
  if (days === null) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const isOverdue = days < 0;
  const isSoon = days >= 0 && days <= 7;
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        color: isOverdue ? 'error.main' : isSoon ? 'warning.main' : 'success.main',
      }}
    >
      {isOverdue ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`}
    </Typography>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [resumen, setResumen] = useState(null);
  const [proximos, setProximos] = useState([]);
  const [realizados, setRealizados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { iniciar, registrandoId } = useIniciarMantenimiento();

  useEffect(() => {
    Promise.all([
      dashboardService.resumen(),
      dashboardService.proximos(),
      dashboardService.realizados(),
    ])
      .then(([r, p, re]) => {
        setResumen(r);
        setProximos(p.results ?? p);
        setRealizados(re.results ?? re);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen del estado actual del parque tecnológico"
        actions={
          <Button variant="contained" onClick={() => navigate('/mantenimientos/nuevo')}>
            + Registrar mantenimiento
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="Equipos activos"
            value={resumen?.total_equipos_activos}
            icon={<ComputerIcon />}
            color="#1a4a7a"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="Equipos de baja"
            value={resumen?.total_equipos_baja}
            icon={<ComputerIcon />}
            color="#6b7280"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <StatCard
            title="Mant. próximos"
            value={resumen?.mantenimientos_proximos}
            icon={<ScheduleIcon />}
            color="#f57c00"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 6, lg: 2.4 }}>
          <StatCard
            title="Vencidos"
            value={resumen?.mantenimientos_vencidos}
            icon={<WarningAmberIcon />}
            color="#d32f2f"
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 6, lg: 2.4 }}>
          <StatCard
            title="Completados este mes"
            value={resumen?.mantenimientos_completados_mes}
            icon={<CheckCircleOutlineIcon />}
            color="#2e7d32"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Próximos mantenimientos</Typography>
              <Button size="small" onClick={() => navigate('/proximos-mantenimientos')}>Ver todos</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Equipo</TableCell>
                    <TableCell>Colaborador</TableCell>
                    <TableCell>Próximo</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : proximos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        No hay mantenimientos próximos
                      </TableCell>
                    </TableRow>
                  ) : (
                    proximos.slice(0, 6).map((eq) => (
                      <TableRow key={eq.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{eq.codigo_interno}</Typography>
                          <Typography variant="caption" color="text.secondary">{eq.marca} {eq.modelo}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{eq.colaborador_nombre}</Typography>
                        </TableCell>
                        <TableCell>
                          <DaysBadge dateStr={eq.fecha_proximo_mantenimiento} />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={registrandoId === eq.id}
                            onClick={() => iniciar(eq.id)}
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
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Mantenimientos recientes</Typography>
              <Button size="small" onClick={() => navigate('/historial')}>Ver historial</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Equipo</TableCell>
                    <TableCell>Técnico</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Estatus</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : realizados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        Sin mantenimientos completados
                      </TableCell>
                    </TableRow>
                  ) : (
                    realizados.slice(0, 6).map((m) => (
                      <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/mantenimientos/${m.id}`)}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{m.equipo_codigo}</Typography>
                          <Typography variant="caption" color="text.secondary">{m.equipo_descripcion}</Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2">{m.tecnico_nombre}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{formatDate(m.fecha_ejecucion)}</Typography></TableCell>
                        <TableCell><StatusChip type="estatus" value={m.estatus} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
