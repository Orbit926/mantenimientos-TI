import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Chip,
  Stack,
  Snackbar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatusChip from '../../components/common/StatusChip';
import FileActionButtons from '../../components/common/FileActionButtons';
import { mantenimientosService } from '../../services/mantenimientos';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { ESTADO_EQUIPO_MAP } from '../../utils/constants';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 220, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function MantenimientoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mant, setMant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const load = useCallback(() => {
    setLoading(true);
    mantenimientosService
      .get(id)
      .then(setMant)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const handleCompletar = async () => {
    setCompleting(true);
    try {
      await mantenimientosService.cerrar(id);
      showSnack('Mantenimiento marcado como completado.');
      load();
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setCompleting(false);
    }
  };

  const handleGenerarPDF = async () => {
    setGenerating(true);
    try {
      const updated = await mantenimientosService.generarPDF(id);
      setMant(updated);
      showSnack('PDF generado correctamente.');
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!mant) return null;

  const isCompleted = mant.estatus === 'COMPLETADO';

  return (
    <Box>
      <PageHeader
        title={`Mantenimiento #${mant.id}`}
        subtitle={`${mant.equipo_codigo ?? ''} · ${formatDate(mant.fecha_ejecucion)}`}
        backTo="/mantenimientos"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            <FileActionButtons
              pdfUrl={mant.documento_pdf_url}
              onGenerate={handleGenerarPDF}
              generating={generating}
            />
            {!isCompleted && (
              <>
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={() => navigate(`/mantenimientos/${id}/editar`)}
                >
                  Editar
                </Button>
                <Button
                  startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                  variant="contained"
                  color="success"
                  onClick={handleCompletar}
                  disabled={completing}
                >
                  Completar
                </Button>
              </>
            )}
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {/* Equipo */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Equipo">
            <InfoRow label="Código interno" value={mant.equipo_codigo} />
            <InfoRow label="Descripción" value={mant.equipo_descripcion} />
          </SectionCard>
        </Grid>

        {/* Estatus */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Estatus">
            <Box sx={{ mb: 1.5 }}>
              <StatusChip type="estatus" value={mant.estatus} size="medium" />
            </Box>
            {mant.estado_equipo_post && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>ESTADO DEL EQUIPO</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusChip type="estado_equipo" value={mant.estado_equipo_post} />
                </Box>
              </Box>
            )}
            {mant.documento_pdf_url && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  PDF generado: {formatDateTime(mant.documento_pdf_generado_en)}
                </Typography>
              </Box>
            )}
          </SectionCard>
        </Grid>

        {/* Datos generales */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Datos generales">
            <InfoRow label="Departamento / Área" value={mant.departamento_area} />
            <InfoRow label="Responsable del área" value={mant.responsable_area} />
            <InfoRow label="Técnico responsable" value={mant.tecnico_nombre} />
            <Divider sx={{ my: 1 }} />
            <InfoRow label="Fecha de ejecución" value={formatDate(mant.fecha_ejecucion)} />
            <InfoRow label="Hora inicio" value={mant.hora_inicio} />
            <InfoRow label="Hora fin" value={mant.hora_fin} />
            <Divider sx={{ my: 1 }} />
            <InfoRow
              label="Próximo mantenimiento sugerido"
              value={formatDate(mant.fecha_sugerida_proximo_mantenimiento)}
            />
          </SectionCard>
        </Grid>

        {/* Actividades */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Actividades y materiales">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>ACTIVIDADES REALIZADAS</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {mant.actividades_realizadas || '—'}
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>MATERIALES UTILIZADOS</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {mant.materiales_utilizados || '—'}
            </Typography>
          </SectionCard>
        </Grid>

        {/* Observaciones y riesgos */}
        <Grid size={{ xs: 12 }}>
          <SectionCard title="Observaciones y riesgos">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>OBSERVACIONES DEL TÉCNICO</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {mant.observaciones_tecnico || '—'}
                </Typography>
              </Grid>
              {mant.riesgo_presentado && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Chip label="Riesgo presentado" color="warning" size="small" sx={{ mb: 1 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">DESCRIPCIÓN</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {mant.descripcion_riesgo || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 1 }}>ACCIONES TOMADAS</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {mant.acciones_tomadas || '—'}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </SectionCard>
        </Grid>

        {/* Checklist */}
        {mant.checklist_respuestas?.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 0 }}>
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e5e7eb' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Checklist técnico
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Actividad</TableCell>
                      <TableCell align="center">Realizado</TableCell>
                      <TableCell>Observación</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mant.checklist_respuestas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.checklist_item_nombre}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={r.realizado ? 'Sí' : 'No'}
                            color={r.realizado ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{r.observacion || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Evidencias fotográficas */}
        {mant.evidencias?.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <SectionCard title="Evidencias fotográficas">
              <Grid container spacing={2}>
                {mant.evidencias.map((ev) => (
                  <Grid key={ev.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Box
                      sx={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                      onClick={() => window.open(ev.imagen_url, '_blank')}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          paddingTop: '75%',
                          position: 'relative',
                          bgcolor: 'grey.100',
                        }}
                      >
                        <Box
                          component="img"
                          src={ev.imagen_url}
                          alt={ev.descripcion || ev.tipo}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Chip label={ev.tipo} size="small" variant="outlined" />
                        {ev.descripcion && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                            {ev.descripcion}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Grid>
        )}

        {/* Firmas */}
        {mant.firmas?.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <SectionCard title="Firmas">
              <Grid container spacing={3}>
                {mant.firmas.map((firma) => (
                  <Grid key={firma.id} size={{ xs: 12, md: 6 }}>
                    <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                        {firma.tipo_firma === 'TECNICO' ? 'TÉCNICO DE TI' : 'USUARIO / COLABORADOR'}
                      </Typography>
                      {firma.firma_imagen_url && (
                        <Box
                          component="img"
                          src={firma.firma_imagen_url}
                          alt="Firma"
                          sx={{ maxHeight: 80, maxWidth: '100%', display: 'block', mb: 1 }}
                        />
                      )}
                      <Divider sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>{firma.nombre_firmante}</Typography>
                      <Typography variant="caption" color="text.secondary">{firma.cargo_firmante}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Grid>
        )}
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
