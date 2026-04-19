import { useState, useEffect } from 'react';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import ChecklistGroup from '../../components/mantenimientos/ChecklistGroup';
import EvidenciaUploader from '../../components/mantenimientos/EvidenciaUploader';
import { mantenimientosService } from '../../services/mantenimientos';
import { tecnicosService } from '../../services/tecnicos';
import { ESTADO_EQUIPO_CHOICES } from '../../utils/constants';

const EDITABLE = [
  'departamento_area', 'responsable_area', 'tecnico',
  'fecha_ejecucion', 'hora_inicio', 'hora_fin',
  'actividades_realizadas', 'materiales_utilizados',
  'estado_equipo_post', 'observaciones_tecnico',
  'riesgo_presentado', 'descripcion_riesgo', 'acciones_tomadas',
  'fecha_sugerida_proximo_mantenimiento',
];

export default function MantenimientoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [tecnicos, setTecnicos] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistValues, setChecklistValues] = useState({});
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    // Cargar técnicos activos para el dropdown
    tecnicosService.list({ activo: 'true' }).then((d) => setTecnicos(d.results ?? d));

    // Cargar items de checklist
    mantenimientosService.checklistItems().then((d) => {
      const items = d.results ?? d;
      setChecklistItems(items);
    });

    // Cargar mantenimiento y respuestas de checklist
    mantenimientosService
      .get(id)
      .then((data) => {
        const v = {};
        EDITABLE.forEach((f) => { v[f] = data[f] ?? ''; });
        setForm(v);

        // Cargar respuestas existentes del checklist
        if (data.checklist_respuestas && data.checklist_respuestas.length > 0) {
          const respuestas = {};
          data.checklist_respuestas.forEach((resp) => {
            respuestas[resp.checklist_item] = {
              realizado: resp.realizado,
              observacion: resp.observacion || '',
            };
          });
          setChecklistValues(respuestas);
        }

        // Cargar evidencias existentes
        if (data.evidencias && Array.isArray(data.evidencias)) {
          setEvidencias(data.evidencias);
        }
      })
      .catch((e) => setApiError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleField = (name, value) =>
    setForm((p) => ({ ...p, [name]: value }));

  const handleUploadEvidencia = async (file, tipo, descripcion) => {
    const fd = new FormData();
    fd.append('imagen', file);
    fd.append('tipo', tipo);
    if (descripcion) fd.append('descripcion', descripcion);
    const nueva = await mantenimientosService.uploadEvidencia(id, fd);
    setEvidencias((prev) => [...prev, nueva]);
  };

  const handleDeleteEvidencia = async (evidenciaId) => {
    await mantenimientosService.deleteEvidencia(id, evidenciaId);
    setEvidencias((prev) => prev.filter((e) => e.id !== evidenciaId));
  };

  const f = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => handleField(name, e.target.value),
    size: 'small',
    fullWidth: true,
  });

  const handleSubmit = async () => {
    setSaving(true);
    setApiError('');
    try {
      const payload = { ...form };
      if (!payload.hora_fin) delete payload.hora_fin;
      if (!payload.hora_inicio) delete payload.hora_inicio;
      if (!payload.fecha_sugerida_proximo_mantenimiento) delete payload.fecha_sugerida_proximo_mantenimiento;
      await mantenimientosService.update(id, payload);

      // Guardar respuestas del checklist
      const respuestas = Object.entries(checklistValues).map(([itemId, val]) => ({
        checklist_item: parseInt(itemId),
        realizado: val.realizado,
        observacion: val.observacion || '',
      }));
      if (respuestas.length > 0) {
        await mantenimientosService.saveChecklist(id, respuestas);
      }

      navigate(`/mantenimientos/${id}`);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 4, ml: 4 }} />;

  return (
    <Box>
      <PageHeader title={`Editar mantenimiento #${id}`} backTo={`/mantenimientos/${id}`} />

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError('')}>
          {apiError}
        </Alert>
      )}

      <SectionCard title="Datos generales">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Técnico responsable" select {...f('tecnico')}>
              {tecnicos.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.full_name || `${t.first_name} ${t.last_name}`} — {t.puesto || 'Técnico'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Departamento / Área" {...f('departamento_area')} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Responsable del área" {...f('responsable_area')} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Fecha de ejecución" type="date" {...f('fecha_ejecucion')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Hora inicio" type="time" {...f('hora_inicio')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Hora fin" type="time" {...f('hora_fin')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
      </SectionCard>

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

      <SectionCard title="Evidencias fotográficas">
        <EvidenciaUploader
          evidencias={evidencias}
          onUpload={handleUploadEvidencia}
          onDelete={handleDeleteEvidencia}
        />
      </SectionCard>

      <SectionCard title="Riesgos">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.riesgo_presentado)}
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={() => navigate(`/mantenimientos/${id}`)}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving}
        >
          Guardar cambios
        </Button>
      </Box>
    </Box>
  );
}
