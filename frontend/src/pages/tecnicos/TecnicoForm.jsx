import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { tecnicosService } from '../../services/tecnicos';

const EMPTY = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  puesto: '',
  password: '',
  is_staff: false,
  activo: true,
};

export default function TecnicoForm({ open, tecnico, onClose, onSaved }) {
  const isEdit = Boolean(tecnico);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tecnico) {
      setForm({
        username: tecnico.username || '',
        first_name: tecnico.first_name || '',
        last_name: tecnico.last_name || '',
        email: tecnico.email || '',
        puesto: tecnico.puesto || '',
        password: '',
        is_staff: tecnico.is_staff || false,
        activo: tecnico.activo !== false,
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [tecnico, open]);

  const f = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => setForm((p) => ({ ...p, [name]: e.target.value })),
    size: 'small',
    fullWidth: true,
  });

  const handleSubmit = async () => {
    if (!form.username || !form.first_name || !form.last_name) {
      setError('Usuario, nombre y apellido son obligatorios.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('La contraseña es obligatoria al crear un técnico.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) {
        await tecnicosService.update(tecnico.id, payload);
      } else {
        await tecnicosService.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? `Editar técnico: ${tecnico?.username}` : 'Nuevo técnico'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Usuario *" {...f('username')} autoComplete="off" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
              {...f('password')}
              type="password"
              autoComplete="new-password"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Nombre *" {...f('first_name')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Apellido(s) *" {...f('last_name')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Email" {...f('email')} type="email" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Puesto" {...f('puesto')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.is_staff)}
                  onChange={(e) => setForm((p) => ({ ...p, is_staff: e.target.checked }))}
                />
              }
              label="Acceso de administrador"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.activo)}
                  onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked, is_active: e.target.checked }))}
                />
              }
              label="Técnico activo"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear técnico'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
