import { Chip } from '@mui/material';

const ESTATUS_CONFIG = {
  BORRADOR:                 { label: 'Borrador',                    color: 'default' },
  PENDIENTE_FIRMA_TECNICO:  { label: 'Pend. firma técnico',          color: 'warning' },
  PENDIENTE_FIRMA_USUARIO:  { label: 'Pend. firma usuario',          color: 'warning' },
  COMPLETADO:               { label: 'Completado',                   color: 'success' },
};

const ESTADO_EQUIPO_CONFIG = {
  OPERATIVO:                { label: 'Operativo',                    color: 'success' },
  OPERATIVO_OBSERVACIONES:  { label: 'Operativo c/ obs.',            color: 'warning' },
  NO_OPERATIVO:             { label: 'No operativo',                 color: 'error' },
};

const EQUIPO_ACTIVO_CONFIG = {
  true:  { label: 'Activo',    color: 'success' },
  false: { label: 'Baja',      color: 'error' },
};

export default function StatusChip({ type = 'estatus', value, size = 'small' }) {
  const map =
    type === 'estatus' ? ESTATUS_CONFIG :
    type === 'estado_equipo' ? ESTADO_EQUIPO_CONFIG :
    EQUIPO_ACTIVO_CONFIG;

  const cfg = map[String(value)] ?? { label: value || '—', color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size={size} />;
}
