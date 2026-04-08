export const TIPO_EQUIPO_CHOICES = [
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'IMPRESORA', label: 'Impresora' },
  { value: 'SERVIDOR', label: 'Servidor' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'OTRO', label: 'Otro' },
];

export const ESTADO_EQUIPO_CHOICES = [
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'OPERATIVO_OBSERVACIONES', label: 'Operativo con observaciones' },
  { value: 'NO_OPERATIVO', label: 'No operativo' },
];

export const ESTATUS_MANTENIMIENTO_CHOICES = [
  { value: 'BORRADOR', label: 'Borrador' },
  { value: 'PENDIENTE_FIRMA_TECNICO', label: 'Pendiente firma técnico' },
  { value: 'PENDIENTE_FIRMA_USUARIO', label: 'Pendiente firma usuario' },
  { value: 'COMPLETADO', label: 'Completado' },
];

export const TIPO_EQUIPO_MAP = Object.fromEntries(
  TIPO_EQUIPO_CHOICES.map(({ value, label }) => [value, label])
);
export const ESTADO_EQUIPO_MAP = Object.fromEntries(
  ESTADO_EQUIPO_CHOICES.map(({ value, label }) => [value, label])
);
export const ESTATUS_MAP = Object.fromEntries(
  ESTATUS_MANTENIMIENTO_CHOICES.map(({ value, label }) => [value, label])
);

export const SIDEBAR_WIDTH = 240;
