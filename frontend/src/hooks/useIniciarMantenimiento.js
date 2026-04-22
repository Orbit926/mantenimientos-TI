import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mantenimientosService } from '../services/mantenimientos';

/**
 * Crea (o reutiliza) un borrador de mantenimiento para el equipo dado
 * y redirige directamente a la vista de edición.
 */
export function useIniciarMantenimiento() {
  const navigate = useNavigate();
  const [registrandoId, setRegistrandoId] = useState(null);
  const [error, setError] = useState('');

  const iniciar = async (equipoId) => {
    setRegistrandoId(equipoId);
    setError('');
    try {
      const mant = await mantenimientosService.iniciarBorrador(equipoId);
      navigate(`/mantenimientos/${mant.id}/editar`);
    } catch (e) {
      setError(e.message || 'No se pudo iniciar el mantenimiento');
      setRegistrandoId(null);
    }
  };

  return { iniciar, registrandoId, error };
}
