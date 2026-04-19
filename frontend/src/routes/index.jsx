import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import EquiposList from '../pages/equipos/EquiposList';
import EquipoNew from '../pages/equipos/EquipoNew';
import EquipoDetail from '../pages/equipos/EquipoDetail';
import EquipoEdit from '../pages/equipos/EquipoEdit';
import MantenimientosList from '../pages/mantenimientos/MantenimientosList';
import MantenimientoNew from '../pages/mantenimientos/MantenimientoNew';
import MantenimientoDetail from '../pages/mantenimientos/MantenimientoDetail';
import MantenimientoEdit from '../pages/mantenimientos/MantenimientoEdit';
import ProximosMantenimientos from '../pages/ProximosMantenimientos';
import Historial from '../pages/Historial';
import TecnicosList from '../pages/tecnicos/TecnicosList';
import Analytics from '../pages/Analytics';

const protect = (element, adminOnly = false) => (
  <ProtectedRoute adminOnly={adminOnly}>
    <AdminLayout>{element}</AdminLayout>
  </ProtectedRoute>
);

const router = createBrowserRouter([
  { path: '/login',                         element: <Login /> },
  { path: '/',                              element: protect(<Dashboard />) },
  { path: '/equipos',                       element: protect(<EquiposList />) },
  { path: '/equipos/nuevo',                 element: protect(<EquipoNew />) },
  { path: '/equipos/:id',                   element: protect(<EquipoDetail />) },
  { path: '/equipos/:id/editar',            element: protect(<EquipoEdit />) },
  { path: '/mantenimientos',                element: protect(<MantenimientosList />) },
  { path: '/mantenimientos/nuevo',          element: protect(<MantenimientoNew />) },
  { path: '/mantenimientos/:id',            element: protect(<MantenimientoDetail />) },
  { path: '/mantenimientos/:id/editar',     element: protect(<MantenimientoEdit />) },
  { path: '/proximos-mantenimientos',       element: protect(<ProximosMantenimientos />) },
  { path: '/historial',                     element: protect(<Historial />) },
  { path: '/tecnicos',                      element: protect(<TecnicosList />, true) },
  { path: '/analytics',                     element: protect(<Analytics />) },
]);

export default router;
