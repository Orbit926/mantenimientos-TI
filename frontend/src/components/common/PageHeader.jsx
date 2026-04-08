import { Box, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions, backTo }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
      <Box>
        {backTo && (
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(backTo)}
            sx={{ mb: 0.5, ml: -0.5, color: 'text.secondary' }}
          >
            Regresar
          </Button>
        )}
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
