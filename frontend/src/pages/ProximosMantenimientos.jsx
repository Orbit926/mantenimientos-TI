import { useState, useEffect } from 'react';
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
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboard';
import { mantenimientosService } from '../services/mantenimientos';
import { formatDate, daysFromToday } from '../utils/formatters';
import { TIPO_EQUIPO_MAP } from '../utils/constants';

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
  const [registrando, setRegistrando] = useState(null);

  useEffect(() => {
    dashboardService
      .proximos()
      .then((data) => setEquipos(data.results ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                      onClick={async () => {
                        setRegistrando(eq.id);
                        try {
                          const borrador = await mantenimientosService.getBorradorByEquipo(eq.id);
                          if (borrador) {
                            navigate(`/mantenimientos/${borrador.id}/editar`);
                          } else {
                            navigate(`/mantenimientos/nuevo?equipoId=${eq.id}`);
                          }
                        } catch {
                          navigate(`/mantenimientos/nuevo?equipoId=${eq.id}`);
                        } finally {
                          setRegistrando(null);
                        }
                      }}
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
    </Box>
  );
}
