import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuildIcon from '@mui/icons-material/Build';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ComputerIcon from '@mui/icons-material/Computer';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import { analyticsService } from '../services/analytics';

const COLORS = ['#1565c0', '#43a047', '#ef6c00', '#6a1b9a', '#00838f', '#c62828', '#4e342e', '#37474f'];
const PIE_COLORS = ['#1565c0', '#43a047', '#ef6c00', '#6a1b9a'];

function KpiCard({ icon, label, value, sub, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: 2,
            p: 1.2,
            display: 'flex',
            alignItems: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
            {value}
          </Typography>
          <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.3}>
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1.5, fontSize: '0.8rem' }}>
        <Typography variant="caption" fontWeight={700}>{label}</Typography>
        {payload.map((p) => (
          <Box key={p.name} sx={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsService
      .get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  const { kpis, por_mes, por_estado_equipo, por_tipo_equipo, por_tecnico, top_equipos } = data;

  const riesgoData = [
    { name: 'Sin riesgo', value: kpis.sin_riesgo },
    { name: 'Con riesgo', value: kpis.con_riesgo },
  ];

  return (
    <Box>
      <PageHeader
        title="Analytics"
        subtitle="Métricas y estadísticas de mantenimientos"
      />

      {/* ── KPI Cards ────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            icon={<BuildIcon />}
            label="Total mantenimientos"
            value={kpis.total_mantenimientos}
            sub="Todos los registros"
            color="#1565c0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            icon={<CheckCircleIcon />}
            label="Completados"
            value={kpis.completados}
            sub={`${kpis.este_mes} este mes`}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            icon={<CalendarMonthIcon />}
            label="Equipos al día"
            value={`${kpis.pct_a_tiempo}%`}
            sub={`${kpis.equipos_vencidos} vencidos de ${kpis.equipos_activos}`}
            color={kpis.pct_a_tiempo >= 80 ? '#2e7d32' : '#e65100'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            icon={<ReportProblemIcon />}
            label="Con riesgo detectado"
            value={kpis.con_riesgo}
            sub={`de ${kpis.completados} completados`}
            color="#b71c1c"
          />
        </Grid>
      </Grid>

      {/* ── Gráfica por mes + Pie por tipo equipo ─────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Mantenimientos por mes (últimos 12 meses)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={por_mes} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="completados" name="Completados" fill="#1565c0" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="borradores" name="Borradores" fill="#90caf9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Por tipo de equipo
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={por_tipo_equipo}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ label, percent }) =>
                      `${label} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={11}
                  >
                    {por_tipo_equipo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Carga por técnico + Estado equipo post ───── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Carga de trabajo por técnico
              </Typography>
              {por_tecnico.length === 0 ? (
                <Typography color="text.secondary">Sin datos</Typography>
              ) : (
                <Box>
                  {por_tecnico.map((t) => {
                    const pct = kpis.total_mantenimientos
                      ? Math.round((t.total / kpis.total_mantenimientos) * 100)
                      : 0;
                    return (
                      <Box key={t.tecnico} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>{t.tecnico}</Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography variant="caption" color="success.main">
                              ✓ {t.completados}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t.borradores} borr.
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                              {t.total} total
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#e3f2fd',
                            '& .MuiLinearProgress-bar': { bgcolor: '#1565c0', borderRadius: 4 },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                Detalle por técnico
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f0f4f8', fontSize: '0.75rem' } }}>
                      <TableCell>Técnico</TableCell>
                      <TableCell align="center">Total</TableCell>
                      <TableCell align="center">Completados</TableCell>
                      <TableCell align="center">Borradores</TableCell>
                      <TableCell align="center">% completados</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {por_tecnico.map((t) => (
                      <TableRow key={t.tecnico} hover>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.tecnico}</TableCell>
                        <TableCell align="center"><strong>{t.total}</strong></TableCell>
                        <TableCell align="center" sx={{ color: 'success.main' }}>{t.completados}</TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>{t.borradores}</TableCell>
                        <TableCell align="center">
                          {t.total ? `${Math.round((t.completados / t.total) * 100)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Grid container spacing={2} direction="column" sx={{ height: '100%' }}>
            {/* Estado equipo post */}
            <Grid>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    Estado del equipo post-mantenimiento
                  </Typography>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={por_estado_equipo}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        label={({ label, value }) => `${label}: ${value}`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {por_estado_equipo.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Riesgo */}
            <Grid>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                    Riesgos detectados
                  </Typography>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={riesgoData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                        fontSize={11}
                      >
                        <Cell fill="#2e7d32" />
                        <Cell fill="#b71c1c" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* ── Top equipos ──────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            Equipos con más mantenimientos registrados
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f0f4f8' } }}>
                  <TableCell>#</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Marca / Modelo</TableCell>
                  <TableCell align="center">Mantenimientos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {top_equipos.map((e, i) => (
                  <TableRow key={e.codigo} hover>
                    <TableCell sx={{ color: 'text.secondary', width: 32 }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.codigo}</TableCell>
                    <TableCell>{e.marca} {e.modelo}</TableCell>
                    <TableCell align="center"><strong>{e.total}</strong></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
