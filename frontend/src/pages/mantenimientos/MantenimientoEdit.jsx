import { useState, useEffect, useRef } from 'react';
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
  Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import ChecklistGroup from '../../components/mantenimientos/ChecklistGroup';
import SignaturePad from '../../components/mantenimientos/SignaturePad';
import EvidenciaUploader from '../../components/mantenimientos/EvidenciaUploader';
import FileActionButtons from '../../components/common/FileActionButtons';
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
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pdfUrl, setPdfUrl] = useState('');
  const [firmaDefaults, setFirmaDefaults] = useState({ tecnico: { nombre: '', cargo: '' }, usuario: { nombre: '', cargo: '' } });
  const [firmasGuardadas, setFirmasGuardadas] = useState({ TECNICO: false, USUARIO: false });
  const [firmaImagenes, setFirmaImagenes] = useState({ TECNICO: '', USUARIO: '' });

  const firmaTecnicoRef = useRef(null);
  const firmaUsuarioRef = useRef(null);

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => {
    tecnicosService.list({ activo: 'true' }).then((d) => setTecnicos(d.results ?? d));

    mantenimientosService.checklistItems().then((d) => {
      setChecklistItems(d.results ?? d);
    });

    mantenimientosService
      .get(id)
      .then((data) => {
        const v = {};
        EDITABLE.forEach((f) => { v[f] = data[f] ?? ''; });
        setForm(v);

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

        if (data.evidencias && Array.isArray(data.evidencias)) {
          setEvidencias(data.evidencias);
        }

        if (data.documento_pdf_url) {
          setPdfUrl(data.documento_pdf_url);
        }
      })
      .catch((e) => setApiError(e.message))
      .finally(() => setLoading(false));

    mantenimientosService.getFirmas(id).then((firmas) => {
      const firmaTec = firmas.find?.((f) => f.tipo_firma === 'TECNICO');
      const firmaUsr = firmas.find?.((f) => f.tipo_firma === 'USUARIO');
      setFirmaDefaults({
        tecnico: { nombre: firmaTec?.nombre_firmante || '', cargo: firmaTec?.cargo_firmante || '' },
        usuario: { nombre: firmaUsr?.nombre_firmante || '', cargo: firmaUsr?.cargo_firmante || '' },
      });
      setFirmasGuardadas({ TECNICO: !!firmaTec, USUARIO: !!firmaUsr });
      setFirmaImagenes({
        TECNICO: firmaTec?.firma_imagen_url || '',
        USUARIO: firmaUsr?.firma_imagen_url || '',
      });
    }).catch(() => {});
  }, [id]);

  const handleField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: false }));
  };

  const FIELD_LABELS = {
    tecnico: 'Técnico responsable',
    departamento_area: 'Departamento / Área',
    responsable_area: 'Responsable del área',
    fecha_ejecucion: 'Fecha de ejecución',
    hora_inicio: 'Hora inicio',
    hora_fin: 'Hora fin',
    actividades_realizadas: 'Actividades realizadas',
    estado_equipo_post: 'Estado del equipo',
    fecha_sugerida_proximo_mantenimiento: 'Fecha próximo mantenimiento',
  };

  const handleApiFieldErrors = (e) => {
    const data = e.responseData;
    if (data && typeof data === 'object' && !data.detail) {
      const fe = {};
      const msgs = [];
      Object.entries(data).forEach(([field, errs]) => {
        const msg = Array.isArray(errs) ? errs[0] : errs;
        fe[field] = msg;
        const label = FIELD_LABELS[field] || field;
        msgs.push(`${label}: ${msg}`);
      });
      setFieldErrors(fe);
      setApiError(msgs.join(' · '));
      return true;
    }
    return false;
  };

  const handleUploadEvidencia = async (file, tipo, descripcion) => {
    const fd = new FormData();
    fd.append('imagen', file);
    fd.append('tipo', tipo);
    if (descripcion) fd.append('descripcion', descripcion);
    const nueva = await mantenimientosService.uploadEvidencia(id, fd);
    setEvidencias((prev) => [...prev, nueva]);
    showSnack('Evidencia subida correctamente');
  };

  const handleDeleteEvidencia = async (evidenciaId) => {
    await mantenimientosService.deleteEvidencia(id, evidenciaId);
    setEvidencias((prev) => prev.filter((e) => e.id !== evidenciaId));
    showSnack('Evidencia eliminada');
  };

  const f = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => handleField(name, e.target.value),
    size: 'small',
    fullWidth: true,
    error: !!fieldErrors[name],
    helperText: fieldErrors[name] || '',
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

      const respuestas = Object.entries(checklistValues).map(([itemId, val]) => ({
        checklist_item: parseInt(itemId),
        realizado: val.realizado,
        observacion: val.observacion || '',
      }));
      if (respuestas.length > 0) {
        await mantenimientosService.saveChecklist(id, respuestas);
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
              const saved = await mantenimientosService.saveFirma(id, fd);
              setFirmasGuardadas((p) => ({ ...p, [tipo]: true }));
              if (saved?.firma_imagen_url) {
                setFirmaImagenes((p) => ({ ...p, [tipo]: saved.firma_imagen_url }));
              }
            } catch {
            }
          }
        }
      }

      showSnack('Cambios guardados correctamente.');
    } catch (e) {
      if (!handleApiFieldErrors(e)) setApiError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const validarParaCompletar = () => {
    const errores = [];
    const fe = {};
    if (!form.tecnico) { errores.push('Falta el técnico responsable.'); fe.tecnico = 'Obligatorio'; }
    if (!form.fecha_ejecucion) { errores.push('Falta la fecha de ejecución.'); fe.fecha_ejecucion = 'Obligatorio'; }
    if (!form.hora_inicio) { errores.push('Falta la hora de inicio.'); fe.hora_inicio = 'Obligatorio'; }
    if (!form.hora_fin) { errores.push('Falta la hora de fin.'); fe.hora_fin = 'Obligatorio'; }
    if (!(form.departamento_area || '').trim()) { errores.push('Falta el departamento / área.'); fe.departamento_area = 'Obligatorio'; }
    if (!(form.responsable_area || '').trim()) { errores.push('Falta el responsable del área.'); fe.responsable_area = 'Obligatorio'; }
    if (!(form.actividades_realizadas || '').trim()) { errores.push('Falta describir las actividades realizadas.'); fe.actividades_realizadas = 'Obligatorio'; }
    if (!form.estado_equipo_post) { errores.push('Falta el estado del equipo post-mantenimiento.'); fe.estado_equipo_post = 'Obligatorio'; }
    if (!form.fecha_sugerida_proximo_mantenimiento) { errores.push('Falta la fecha sugerida del próximo mantenimiento.'); fe.fecha_sugerida_proximo_mantenimiento = 'Obligatorio'; }
    setFieldErrors(fe);
    const firmaT = firmaTecnicoRef.current;
    const firmaU = firmaUsuarioRef.current;
    firmaT?.markAllTouched();
    firmaU?.markAllTouched();
    const tecCanvasOk = firmaT && !firmaT.isEmpty();
    const usrCanvasOk = firmaU && !firmaU.isEmpty();
    if (!tecCanvasOk && !firmasGuardadas.TECNICO) { errores.push('Falta dibujar la firma del técnico.'); }
    else if (tecCanvasOk && firmaT.isNombreVacio()) { errores.push('Falta el nombre del firmante (técnico).'); }
    else if (tecCanvasOk && firmaT.isCargoVacio()) { errores.push('Falta el puesto del firmante (técnico).'); }
    if (!usrCanvasOk && !firmasGuardadas.USUARIO) { errores.push('Falta dibujar la firma del usuario.'); }
    else if (usrCanvasOk && firmaU.isNombreVacio()) { errores.push('Falta el nombre del firmante (usuario).'); }
    else if (usrCanvasOk && firmaU.isCargoVacio()) { errores.push('Falta el puesto del firmante (usuario).'); }
    return errores;
  };

  const handleCompletar = async () => {
    const errores = validarParaCompletar();
    if (errores.length > 0) {
      showSnack(errores[0], 'error');
      setApiError(errores.join(' · '));
      return;
    }
    setCompleting(true);
    try {
      await handleSubmit();
      await mantenimientosService.cerrar(id);
      showSnack('Mantenimiento completado correctamente.');
      navigate(`/mantenimientos/${id}`);
    } catch (e) {
      const data = e.responseData;
      if (data?.errores) {
        showSnack(data.errores[0], 'error');
        setApiError(data.errores.join(' · '));
      } else if (!handleApiFieldErrors(e)) {
        showSnack(e.message, 'error');
        setApiError(e.message);
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleGenerarPDF = async () => {
    setGenerating(true);
    try {
      const mant = await mantenimientosService.generarPDF(id);
      const url = mant.documento_pdf_url || '';
      setPdfUrl(url);
      showSnack('PDF generado correctamente.');
    } catch (e) {
      setApiError(e.message);
    } finally {
      setGenerating(false);
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

      <SectionCard title="Checklist técnico">
        {checklistItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Cargando checklist...</Typography>
        ) : (
          <ChecklistGroup
            items={checklistItems}
            values={checklistValues}
            onChange={(itemId, val) =>
              setChecklistValues((p) => ({ ...p, [itemId]: val }))
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

      <SectionCard title="Firmas">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SignaturePad
              key={`tec-${firmaDefaults.tecnico.nombre}`}
              ref={firmaTecnicoRef}
              label="Firma del técnico de TI"
              tipoFirma="TECNICO"
              defaultNombre={firmaDefaults.tecnico.nombre || tecnicos.find((t) => t.id === form.tecnico)?.full_name || ''}
              defaultCargo={firmaDefaults.tecnico.cargo}
            />
            {firmasGuardadas.TECNICO && firmaImagenes.TECNICO && (
              <Box sx={{ mt: 1.5, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Firma guardada actualmente (se reemplazará si dibujas una nueva)
                </Typography>
                <Box component="img" src={firmaImagenes.TECNICO} alt="Firma guardada" sx={{ maxHeight: 70, maxWidth: '100%' }} />
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SignaturePad
              key={`usr-${firmaDefaults.usuario.nombre}`}
              ref={firmaUsuarioRef}
              label="Firma del usuario / colaborador"
              tipoFirma="USUARIO"
              defaultNombre={firmaDefaults.usuario.nombre}
              defaultCargo={firmaDefaults.usuario.cargo}
            />
            {firmasGuardadas.USUARIO && firmaImagenes.USUARIO && (
              <Box sx={{ mt: 1.5, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Firma guardada actualmente (se reemplazará si dibujas una nueva)
                </Typography>
                <Box component="img" src={firmaImagenes.USUARIO} alt="Firma guardada" sx={{ maxHeight: 70, maxWidth: '100%' }} />
              </Box>
            )}
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Acciones">
        <Stack spacing={2}>
          {pdfUrl && (
            <FileActionButtons pdfUrl={pdfUrl} onGenerate={handleGenerarPDF} generating={generating} />
          )}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving || completing}
            >
              Guardar cambios
            </Button>

            {!pdfUrl && (
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} color="inherit" /> : null}
                onClick={handleGenerarPDF}
                disabled={generating || saving}
              >
                Generar PDF
              </Button>
            )}

            <Button
              variant="contained"
              color="success"
              startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              onClick={handleCompletar}
              disabled={completing || saving}
            >
              Completar mantenimiento
            </Button>

            <Button onClick={() => navigate(`/mantenimientos/${id}`)} disabled={saving || completing}>
              Cancelar
            </Button>
          </Stack>
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
