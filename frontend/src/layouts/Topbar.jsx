import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Box, IconButton, Menu, MenuItem, Avatar, Divider, Tooltip,
} from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLocation, useNavigate } from 'react-router-dom';
import { SIDEBAR_WIDTH } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/equipos': 'Equipos',
  '/equipos/nuevo': 'Equipos › Nuevo equipo',
  '/mantenimientos': 'Mantenimientos',
  '/mantenimientos/nuevo': 'Mantenimientos › Nuevo mantenimiento',
  '/proximos-mantenimientos': 'Próximos mantenimientos',
  '/historial': 'Historial',
  '/tecnicos': 'Técnicos',
  '/analytics': 'Analytics',
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
  const navigate = useNavigate();
  const title = resolveTitle(pathname);
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);

  const handleLogout = async () => {
    setAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.username?.[0]?.toUpperCase()
    : '?';

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
          <ComputerIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: '0.95rem' }}>
            {title}
          </Typography>
        </Box>

        {user && (
          <>
            <Tooltip title={`${user.full_name || user.username} · Click para salir`}>
              <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                  {initials}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>{user.full_name || user.username}</Typography>
                <Typography variant="caption" color="text.secondary">{user.puesto || (user.is_staff ? 'Administrador' : 'Técnico')}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Cerrar sesión
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
