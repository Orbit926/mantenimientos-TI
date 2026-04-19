import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import PageHeader from '../../components/common/PageHeader';
import TecnicoForm from './TecnicoForm';
import { tecnicosService } from '../../services/tecnicos';

export default function TecnicosList() {
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    tecnicosService
      .list()
      .then((d) => setTecnicos(d.results ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (t) => {
    setEditing(t);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleToggle = async (t) => {
    try {
      await tecnicosService.update(t.id, { activo: !t.activo, is_active: !t.activo });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    load();
  };

  return (
    <Box>
      <PageHeader
        title="Técnicos"
        subtitle="Gestión de cuentas de técnicos de TI"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>
            Nuevo técnico
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <CircularProgress sx={{ mt: 3, ml: 2 }} />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f0f4f8' } }}>
                <TableCell>Usuario</TableCell>
                <TableCell>Nombre completo</TableCell>
                <TableCell>Puesto</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Admin</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tecnicos.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{t.username}</TableCell>
                  <TableCell>{t.full_name || `${t.first_name} ${t.last_name}`}</TableCell>
                  <TableCell>{t.puesto || '—'}</TableCell>
                  <TableCell>{t.email || '—'}</TableCell>
                  <TableCell align="center">
                    {t.is_staff ? (
                      <Chip label="Admin" size="small" color="warning" />
                    ) : (
                      <Chip label="Técnico" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={t.activo ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={t.activo ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleEdit(t)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t.activo ? 'Desactivar' : 'Activar'}>
                      <IconButton size="small" onClick={() => handleToggle(t)} color={t.activo ? 'error' : 'success'}>
                        {t.activo ? <BlockIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {tecnicos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No hay técnicos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TecnicoForm
        open={formOpen}
        tecnico={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />
    </Box>
  );
}
