import { createBrowserRouter } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
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

const wrap = (element) => <AdminLayout>{element}</AdminLayout>;

const router = createBrowserRouter([
  { path: '/',                              element: wrap(<Dashboard />) },
  { path: '/equipos',                       element: wrap(<EquiposList />) },
  { path: '/equipos/nuevo',                 element: wrap(<EquipoNew />) },
  { path: '/equipos/:id',                   element: wrap(<EquipoDetail />) },
  { path: '/equipos/:id/editar',            element: wrap(<EquipoEdit />) },
  { path: '/mantenimientos',                element: wrap(<MantenimientosList />) },
  { path: '/mantenimientos/nuevo',          element: wrap(<MantenimientoNew />) },
  { path: '/mantenimientos/:id',            element: wrap(<MantenimientoDetail />) },
  { path: '/mantenimientos/:id/editar',     element: wrap(<MantenimientoEdit />) },
  { path: '/proximos-mantenimientos',       element: wrap(<ProximosMantenimientos />) },
  { path: '/historial',                     element: wrap(<Historial />) },
]);

export default router;
