import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ComputerIcon from '@mui/icons-material/Computer';
import BuildIcon from '@mui/icons-material/Build';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useNavigate, useLocation } from 'react-router-dom';
import { SIDEBAR_WIDTH } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

const BASE_NAV = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Equipos', icon: <ComputerIcon />, path: '/equipos' },
  { label: 'Mantenimientos', icon: <BuildIcon />, path: '/mantenimientos' },
  { label: 'Próximos', icon: <ScheduleIcon />, path: '/proximos-mantenimientos' },
  { label: 'Historial', icon: <HistoryIcon />, path: '/historial' },
  { label: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
];

const ADMIN_NAV = [
  { label: 'Técnicos', icon: <PeopleIcon />, path: '/tecnicos' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const navItems = user?.is_staff ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          background: '#0d2f52',
          border: 'none',
        },
      }}
    >
      <Box sx={{ px: 3, py: 2.5 }}>
        <Typography
          variant="subtitle1"
          sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5 }}
        >
          TI — Mantenimientos
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Panel Administrativo
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ px: 1, pt: 1 }}>
        {navItems.map(({ label, icon, path }) => {
          const active = isActive(path);
          return (
            <ListItemButton
              key={path}
              onClick={() => navigate(path)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.12)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', color: '#fff' },
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  minWidth: 36,
                  '& .MuiSvgIcon-root': { fontSize: 20 },
                }}
              >
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}
