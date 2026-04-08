import {
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { TIPO_EQUIPO_CHOICES } from '../../utils/constants';

export default function EquipoForm({ values, onChange, errors = {} }) {
  const field = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    error: Boolean(errors[name]),
    helperText: errors[name] || '',
    fullWidth: true,
    size: 'small',
  });

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Código interno *" {...field('codigo_interno')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Marca *" {...field('marca')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Modelo *" {...field('modelo')} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Número de serie" {...field('numero_serie')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Tipo de equipo *" select {...field('tipo_equipo')}>
          {TIPO_EQUIPO_CHOICES.map(({ value, label }) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Ubicación *" {...field('ubicacion')} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Nombre del colaborador *" {...field('colaborador_nombre')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Correo del colaborador" type="email" {...field('colaborador_correo')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Puesto" {...field('colaborador_puesto')} />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Fecha próximo mantenimiento"
          type="date"
          {...field('fecha_proximo_mantenimiento')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Grid>
    </Grid>
  );
}
