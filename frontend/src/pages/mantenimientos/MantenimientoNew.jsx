import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
  Snackbar,
  Divider,
  Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import ChecklistGroup from '../../components/mantenimientos/ChecklistGroup';
import SignaturePad from '../../components/mantenimientos/SignaturePad';
import FileActionButtons from '../../components/common/FileActionButtons';
import { mantenimientosService } from '../../services/mantenimientos';
import { equiposService } from '../../services/equipos';
import { ESTADO_EQUIPO_CHOICES } from '../../utils/constants';
import { todayISO } from '../../utils/formatters';

const INITIAL_FORM = {
  equipo: '',
  departamento_area: '',
  responsable_area: '',
  tecnico_nombre: '',
  fecha_ejecucion: todayISO(),
  hora_inicio: '',
  hora_fin: '',
  actividades_realizadas: '',
  materiales_utilizados: '',
  estado_equipo_post: '',
  observaciones_tecnico: '',
  riesgo_presentado: false,
  descripcion_riesgo: '',
  acciones_tomadas: '',
  fecha_sugerida_proximo_mantenimiento: '',
};

export default function MantenimientoNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const equipoIdParam = searchParams.get('equipoId');

  const [form, setForm] = useState({ ...INITIAL_FORM, equipo: equipoIdParam || '' });
  const [equipos, setEquipos] = useState([]);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistValues, setChecklistValues] = useState({});
  const [mantenimientoId, setMantenimientoId] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const firmaTecnicoRef = useRef(null);
  const firmaUsuarioRef = useRef(null);

  useEffect(() => {
    equiposService.list({ activo: 'true' }).then((d) => setEquipos(d.results ?? d));
    mantenimientosService.checklistItems().then((d) => {
      const items = d.results ?? d;
      setChecklistItems(items);
      const initial = {};
      items.forEach((item) => { initial[item.id] = { realizado: false, observacion: '' }; });
      setChecklistValues(initial);
    });
  }, []);

  useEffect(() => {
    if (equipoIdParam && equipos.length > 0) {
      const eq = equipos.find((e) => String(e.id) === String(equipoIdParam));
      if (eq) setSelectedEquipo(eq);
    }
  }, [equipoIdParam, equipos]);

  const handleField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (name === 'equipo') {
      const eq = equipos.find((e) => String(e.id) === String(value));
      setSelectedEquipo(eq || null);
    }
  };

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const handleGuardar = async () => {
    if (!form.equipo || !form.fecha_ejecucion || !form.tecnico_nombre) {
      setApiError('Equipo, técnico y fecha son obligatorios.');
      return;
    }
    setSaving(true);
    setApiError('');
    try {
      const payload = { ...form, equipo: parseInt(form.equipo) };
      if (!payload.hora_fin) delete payload.hora_fin;
      if (!payload.fecha_sugerida_proximo_mantenimiento) delete payload.fecha_sugerida_proximo_mantenimiento;

      let mant;
      if (mantenimientoId) {
        mant = await mantenimientosService.update(mantenimientoId, payload);
      } else {
        mant = await mantenimientosService.create(payload);
        setMantenimientoId(mant.id);
      }

      const respuestas = Object.entries(checklistValues).map(([id, v]) => ({
        checklist_item: parseInt(id),
        realizado: v.realizado,
        observacion: v.observacion,
      }));
      if (respuestas.length > 0) {
        await mantenimientosService.saveChecklist(mant.id, respuestas);
      }

      const firmas = [
        { ref: firmaTecnicoRef, tipo: 'TECNICO' },
        { ref: firmaUsuarioRef, tipo: 'USUARIO' },
      ];
      for (const { ref, tipo } of firmas) {
        if (!ref.current?.isEmpty()) {
          const data = ref.current.getData();
          if (data) {
            const fd = new FormData();
            fd.append('tipo_firma', data.tipo_firma);
            fd.append('nombre_firmante', data.nombre_firmante);
            fd.append('cargo_firmante', data.cargo_firmante);
            fd.append('firma_imagen', data.file);
            try {
              await mantenimientosService.saveFirma(mant.id, fd);
            } catch {
            }
          }
        }
      }

      showSnack('Mantenimiento guardado como borrador.');
    } catch (e) {
      setApiError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompletar = async () => {
    if (!mantenimientoId) {
      setApiError('Guarda el mantenimiento primero antes de completarlo.');
      return;
    }
    setCompleting(true);
    try {
      await mantenimientosService.cerrar(mantenimientoId);
      showSnack('Mantenimiento completado correctamente.');
      navigate(`/mantenimientos/${mantenimientoId}`);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!mantenimientoId) {
      setApiError('Guarda el mantenimiento primero antes de generar el PDF.');
      return;
    }
    setGenerating(true);
    try {
      const mant = await mantenimientosService.generarPDF(mantenimientoId);
      const url = mant.documento_pdf_url || '';
      setPdfUrl(url);
      showSnack('PDF generado correctamente.');
    } catch (e) {
      setApiError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const f = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => handleField(name, e.target.value),
    size: 'small',
    fullWidth: true,
  });

  return (
    <Box>
      <PageHeader title="Nuevo mantenimiento" backTo="/mantenimientos" />

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError('')}>
          {apiError}
        </Alert>
      )}

      {/* Sección 1: Datos generales */}
      <SectionCard title="Datos generales">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Equipo *" select {...f('equipo')}>
              {equipos.map((eq) => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.codigo_interno} — {eq.marca} {eq.modelo}
                </MenuItem>
              ))}
            </TextField>
            {selectedEquipo && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {selectedEquipo.colaborador_nombre} · {selectedEquipo.ubicacion}
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Técnico responsable *" {...f('tecnico_nombre')} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Departamento / Área" {...f('departamento_area')} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Responsable del área" {...f('responsable_area')} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Fecha de ejecución *" type="date" {...f('fecha_ejecucion')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Hora inicio" type="time" {...f('hora_inicio')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Hora fin" type="time" {...f('hora_fin')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Sección 2: Actividades */}
      <SectionCard title="Actividades y materiales">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Actividades realizadas" {...f('actividades_realizadas')} multiline rows={4} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Materiales utilizados" {...f('materiales_utilizados')} multiline rows={4} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Sección 3: Estado post-mantenimiento */}
      <SectionCard title="Estado post-mantenimiento">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Estado del equipo" select {...f('estado_equipo_post')}>
              <MenuItem value=""><em>— Seleccionar —</em></MenuItem>
              {ESTADO_EQUIPO_CHOICES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Fecha sugerida próximo mantenimiento"
              type="date"
              {...f('fecha_sugerida_proximo_mantenimiento')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Observaciones del técnico" {...f('observaciones_tecnico')} multiline rows={3} />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Sección 4: Riesgos */}
      <SectionCard title="Riesgos">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.riesgo_presentado}
                  onChange={(e) => handleField('riesgo_presentado', e.target.checked)}
                />
              }
              label="Se presentó algún riesgo durante el mantenimiento"
            />
          </Grid>
          {form.riesgo_presentado && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Descripción del riesgo" {...f('descripcion_riesgo')} multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Acciones tomadas" {...f('acciones_tomadas')} multiline rows={3} />
              </Grid>
            </>
          )}
        </Grid>
      </SectionCard>

      {/* Sección 5: Checklist */}
      <SectionCard title="Checklist técnico">
        {checklistItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Cargando checklist...</Typography>
        ) : (
          <ChecklistGroup
            items={checklistItems}
            values={checklistValues}
            onChange={(id, val) =>
              setChecklistValues((p) => ({ ...p, [id]: val }))
            }
          />
        )}
      </SectionCard>

      {/* Sección 6: Firmas */}
      <SectionCard title="Firmas">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SignaturePad
              ref={firmaTecnicoRef}
              label="Firma del técnico de TI"
              tipoFirma="TECNICO"
              defaultNombre={form.tecnico_nombre}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SignaturePad
              ref={firmaUsuarioRef}
              label="Firma del usuario / colaborador"
              tipoFirma="USUARIO"
              defaultNombre={selectedEquipo?.colaborador_nombre || ''}
            />
          </Grid>
        </Grid>
      </SectionCard>

      {/* Sección 7: Acciones finales */}
      <SectionCard title="Acciones">
        <Stack spacing={2}>
          {pdfUrl && (
            <FileActionButtons pdfUrl={pdfUrl} onGenerate={handleGenerarPDF} generating={generating} />
          )}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleGuardar}
              disabled={saving || completing}
            >
              {mantenimientoId ? 'Guardar cambios' : 'Guardar borrador'}
            </Button>

            {!pdfUrl && (
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} color="inherit" /> : null}
                onClick={handleGenerarPDF}
                disabled={generating || saving || !mantenimientoId}
              >
                Generar PDF
              </Button>
            )}

            <Button
              variant="contained"
              color="success"
              startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              onClick={handleCompletar}
              disabled={completing || saving || !mantenimientoId}
            >
              Completar mantenimiento
            </Button>
          </Stack>
          {!mantenimientoId && (
            <Typography variant="caption" color="text.secondary">
              Guarda el borrador primero para poder completar o generar el PDF.
            </Typography>
          )}
        </Stack>
      </SectionCard>

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
