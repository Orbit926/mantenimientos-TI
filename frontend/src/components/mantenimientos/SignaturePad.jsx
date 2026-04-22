import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import GestureIcon from '@mui/icons-material/Gesture';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { dataUrlToFile } from '../../utils/formatters';

const CANVAS_W = 420;
const CANVAS_H = 140;

const CURSIVE_FONTS = [
  { value: "'Dancing Script', cursive", label: 'Dancing Script' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Caveat', cursive", label: 'Caveat' },
];

function renderTypedSignatureToDataUrl(text, fontFamily) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#1a1a2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Ajuste dinámico del tamaño según longitud
  let fontSize = 56;
  ctx.font = `${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > CANVAS_W - 20 && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${fontSize}px ${fontFamily}`;
  }
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
  return canvas.toDataURL('image/png');
}

const SignaturePad = forwardRef(function SignaturePad(
  { label, tipoFirma, defaultNombre = '', defaultCargo = '', firmaGuardada = false },
  ref,
) {
  const sigRef = useRef(null);
  const [mode, setMode] = useState('dibujar'); // 'dibujar' | 'escribir'
  const [nombre, setNombre] = useState(defaultNombre);
  const [cargo, setCargo] = useState(defaultCargo);
  const [font, setFont] = useState(CURSIVE_FONTS[0].value);
  const [touched, setTouched] = useState({ nombre: false, cargo: false, firma: false });

  // Precarga fuentes cursivas para que el canvas las tenga listas al renderizar
  useEffect(() => {
    if (document.fonts?.load) {
      CURSIVE_FONTS.forEach((f) => {
        document.fonts.load(`56px ${f.value}`).catch(() => {});
      });
    }
  }, []);

  const isDibujarVacio = () => !sigRef.current || sigRef.current.isEmpty();
  const isEscribirVacio = () => !nombre.trim();

  useImperativeHandle(ref, () => ({
    getData() {
      if (!nombre.trim() || !cargo.trim()) return null;
      let dataUrl;
      if (mode === 'dibujar') {
        if (isDibujarVacio()) return null;
        dataUrl = sigRef.current.toDataURL('image/png');
      } else {
        dataUrl = renderTypedSignatureToDataUrl(nombre.trim(), font);
      }
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
      if (mode === 'dibujar') return isDibujarVacio();
      return isEscribirVacio();
    },
    isNombreVacio() {
      return !nombre.trim();
    },
    isCargoVacio() {
      return !cargo.trim();
    },
    markAllTouched() {
      setTouched({ nombre: true, cargo: true, firma: true });
    },
  }));

  const nombreError = touched.nombre && !nombre.trim();
  const cargoError = touched.cargo && !cargo.trim();
  const firmaError =
    touched.firma &&
    !firmaGuardada &&
    (mode === 'dibujar' ? isDibujarVacio() : isEscribirVacio());

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack spacing={1.5}>
        <TextField
          label="Nombre del firmante *"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setTouched((p) => ({ ...p, nombre: true, firma: true })); }}
          size="small"
          fullWidth
          error={nombreError}
          helperText={nombreError ? 'El nombre es obligatorio' : ''}
        />
        <TextField
          label="Cargo / Puesto *"
          value={cargo}
          onChange={(e) => { setCargo(e.target.value); setTouched((p) => ({ ...p, cargo: true })); }}
          size="small"
          fullWidth
          error={cargoError}
          helperText={cargoError ? 'El puesto es obligatorio' : ''}
        />

        <ToggleButtonGroup
          value={mode}
          exclusive
          size="small"
          onChange={(_, v) => { if (v) { setMode(v); setTouched((p) => ({ ...p, firma: false })); } }}
        >
          <ToggleButton value="dibujar">
            <GestureIcon fontSize="small" sx={{ mr: 0.5 }} /> Dibujar
          </ToggleButton>
          <ToggleButton value="escribir">
            <KeyboardIcon fontSize="small" sx={{ mr: 0.5 }} /> Escribir
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === 'dibujar' ? (
          <Box>
            <Box
              sx={{
                border: '1px solid',
                borderColor: firmaError ? 'error.main' : 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: '#fafafa',
                cursor: 'crosshair',
              }}
            >
              <ReactSignatureCanvas
                ref={sigRef}
                penColor="#1a1a2e"
                canvasProps={{ width: CANVAS_W, height: CANVAS_H, style: { display: 'block' } }}
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
        ) : (
          <Box>
            <TextField
              select
              size="small"
              label="Estilo de firma"
              value={font}
              onChange={(e) => setFont(e.target.value)}
              sx={{ mb: 1, minWidth: 200 }}
            >
              {CURSIVE_FONTS.map((f) => (
                <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value, fontSize: 22 }}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>
            <Box
              sx={{
                border: '1px solid',
                borderColor: firmaError ? 'error.main' : 'divider',
                borderRadius: 1,
                bgcolor: '#fafafa',
                width: CANVAS_W,
                height: CANVAS_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Typography
                sx={{
                  fontFamily: font,
                  fontSize: 48,
                  color: '#1a1a2e',
                  textAlign: 'center',
                  px: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {nombre.trim() || 'Tu firma aparecerá aquí'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Se generará una imagen de firma a partir del nombre escrito.
            </Typography>
          </Box>
        )}

        {firmaError && (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {mode === 'dibujar' ? 'La firma es obligatoria' : 'Escribe el nombre para generar la firma'}
          </Typography>
        )}
      </Stack>
    </Box>
  );
});

export default SignaturePad;
