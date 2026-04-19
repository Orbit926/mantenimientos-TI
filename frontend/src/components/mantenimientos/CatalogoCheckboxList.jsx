import { Box, Checkbox, FormControlLabel, Typography, Skeleton, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';

export default function CatalogoCheckboxList({ label, items, loading, selected, onChange, error, helperText }) {
  const [filtro, setFiltro] = useState('');

  const toggle = (nombre) => {
    const set = new Set(selected);
    if (set.has(nombre)) {
      set.delete(nombre);
    } else {
      set.add(nombre);
    }
    onChange([...set]);
  };

  const filtered = items.filter((item) =>
    item.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="caption" color={error ? 'error' : 'text.secondary'} fontWeight={600} display="block" mb={1}>
        {label}
      </Typography>
      {items.length > 6 && (
        <TextField
          size="small"
          placeholder="Buscar..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      <Box
        sx={{
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          maxHeight: 220,
          overflowY: 'auto',
          px: 1.5,
          py: 0.5,
        }}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={36} sx={{ my: 0.25 }} />
          ))
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Sin resultados
          </Typography>
        ) : (
          filtered.map((item) => (
            <FormControlLabel
              key={item.id}
              control={
                <Checkbox
                  size="small"
                  checked={selected.includes(item.nombre)}
                  onChange={() => toggle(item.nombre)}
                />
              }
              label={<Typography variant="body2">{item.nombre}</Typography>}
              sx={{ display: 'flex', mx: 0, my: 0.25 }}
            />
          ))
        )}
      </Box>
      {helperText && (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
