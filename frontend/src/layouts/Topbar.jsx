import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import { useLocation } from 'react-router-dom';
import { SIDEBAR_WIDTH } from '../utils/constants';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/equipos': 'Equipos',
  '/equipos/nuevo': 'Equipos › Nuevo equipo',
  '/mantenimientos': 'Mantenimientos',
  '/mantenimientos/nuevo': 'Mantenimientos › Nuevo mantenimiento',
  '/proximos-mantenimientos': 'Próximos mantenimientos',
  '/historial': 'Historial',
};

function resolveTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.match(/^\/equipos\/\d+\/editar$/)) return 'Equipos › Editar equipo';
  if (pathname.match(/^\/equipos\/\d+/)) return 'Equipos › Detalle';
  if (pathname.match(/^\/mantenimientos\/\d+\/editar$/)) return 'Mantenimientos › Editar';
  if (pathname.match(/^\/mantenimientos\/\d+/)) return 'Mantenimientos › Detalle';
  return '';
}

export default function Topbar() {
  const { pathname } = useLocation();
  const title = resolveTitle(pathname);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
        ml: `${SIDEBAR_WIDTH}px`,
        bgcolor: '#fff',
        borderBottom: '1px solid #e5e7eb',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ComputerIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: '0.95rem' }}>
            {title}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
