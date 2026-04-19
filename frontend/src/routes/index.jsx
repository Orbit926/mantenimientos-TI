import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';

// Lazy-loaded pages for code-splitting
const EquiposList = lazy(() => import('../pages/equipos/EquiposList'));
const EquipoNew = lazy(() => import('../pages/equipos/EquipoNew'));
const EquipoDetail = lazy(() => import('../pages/equipos/EquipoDetail'));
const EquipoEdit = lazy(() => import('../pages/equipos/EquipoEdit'));
const MantenimientosList = lazy(() => import('../pages/mantenimientos/MantenimientosList'));
const MantenimientoNew = lazy(() => import('../pages/mantenimientos/MantenimientoNew'));
const MantenimientoDetail = lazy(() => import('../pages/mantenimientos/MantenimientoDetail'));
const MantenimientoEdit = lazy(() => import('../pages/mantenimientos/MantenimientoEdit'));
const ProximosMantenimientos = lazy(() => import('../pages/ProximosMantenimientos'));
const Historial = lazy(() => import('../pages/Historial'));
const TecnicosList = lazy(() => import('../pages/tecnicos/TecnicosList'));
const Analytics = lazy(() => import('../pages/Analytics'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <CircularProgress />
  </Box>
);

const protect = (element, adminOnly = false) => (
  <ProtectedRoute adminOnly={adminOnly}>
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        {element}
      </Suspense>
    </AdminLayout>
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
],
{
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

export default router;
