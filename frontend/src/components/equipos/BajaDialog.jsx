import { useState } from 'react';
import { TextField, Alert } from '@mui/material';
import ConfirmDialog from '../common/ConfirmDialog';

export default function BajaDialog({ open, onClose, onConfirm, loading, error }) {
  const [motivo, setMotivo] = useState('');
  const [localError, setLocalError] = useState('');

  const handleConfirm = () => {
    if (motivo.trim().length < 5) {
      setLocalError('El motivo debe tener al menos 5 caracteres.');
      return;
    }
    setLocalError('');
    onConfirm(motivo.trim());
  };

  const handleClose = () => {
    setMotivo('');
    setLocalError('');
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Dar de baja el equipo"
      confirmLabel="Dar de baja"
      confirmColor="error"
      loading={loading}
    >
      {(error || localError) && (
        <Alert severity="error" sx={{ mb: 2 }}>{error || localError}</Alert>
      )}
      <TextField
        label="Motivo de baja *"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        multiline
        rows={3}
        fullWidth
        size="small"
        sx={{ mt: 1 }}
        placeholder="Describe brevemente el motivo de la baja..."
      />
    </ConfirmDialog>
  );
}
