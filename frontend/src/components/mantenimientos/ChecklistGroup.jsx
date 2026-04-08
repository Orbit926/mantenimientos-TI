import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider,
} from '@mui/material';

export default function ChecklistGroup({ items, values, onChange }) {
  const grouped = items.reduce((acc, item) => {
    const cat = item.categoria || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <Box>
      {Object.entries(grouped).map(([categoria, groupItems], gIdx) => (
        <Box key={categoria} sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {categoria}
          </Typography>
          <Divider sx={{ mb: 1.5, mt: 0.5 }} />
          {groupItems.map((item) => {
            const val = values[item.id] ?? { realizado: false, observacion: '' };
            return (
              <Box key={item.id} sx={{ mb: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={val.realizado}
                      onChange={(e) =>
                        onChange(item.id, { ...val, realizado: e.target.checked })
                      }
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{item.nombre}</Typography>}
                />
                <TextField
                  value={val.observacion}
                  onChange={(e) =>
                    onChange(item.id, { ...val, observacion: e.target.value })
                  }
                  placeholder="Observación (opcional)"
                  size="small"
                  fullWidth
                  variant="standard"
                  sx={{ ml: 4, mt: -0.5 }}
                  inputProps={{ style: { fontSize: '0.8rem' } }}
                />
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
