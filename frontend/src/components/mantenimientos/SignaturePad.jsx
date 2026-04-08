import { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import { Box, Typography, Button, TextField, Divider, Stack } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { dataUrlToFile } from '../../utils/formatters';

const SignaturePad = forwardRef(function SignaturePad({ label, tipoFirma, defaultNombre = '' }, ref) {
  const sigRef = useRef(null);
  const [nombre, setNombre] = useState(defaultNombre);
  const [cargo, setCargo] = useState('');

  useImperativeHandle(ref, () => ({
    getData() {
      if (!sigRef.current || sigRef.current.isEmpty()) return null;
      const dataUrl = sigRef.current.toDataURL('image/png');
      return {
        tipo_firma: tipoFirma,
        nombre_firmante: nombre,
        cargo_firmante: cargo,
        file: dataUrlToFile(dataUrl, `firma_${tipoFirma.toLowerCase()}.png`),
      };
    },
    clear() {
      sigRef.current?.clear();
    },
    isEmpty() {
      return !sigRef.current || sigRef.current.isEmpty();
    },
  }));

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack spacing={1.5}>
        <TextField
          label="Nombre del firmante *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          size="small"
          fullWidth
        />
        <TextField
          label="Cargo / Puesto"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          size="small"
          fullWidth
        />
        <Box>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: '#fafafa',
              cursor: 'crosshair',
            }}
          >
            <ReactSignatureCanvas
              ref={sigRef}
              penColor="#1a1a2e"
              canvasProps={{ width: 420, height: 140, style: { display: 'block' } }}
            />
          </Box>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={() => sigRef.current?.clear()}
            sx={{ mt: 0.5 }}
            color="inherit"
          >
            Limpiar
          </Button>
        </Box>
      </Stack>
    </Box>
  );
});

export default SignaturePad;
