import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material';

export default function StatCard({ title, value, icon, color = 'primary.main', loading }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={60} height={40} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700, color, mt: 0.5, lineHeight: 1 }}>
                {value ?? '—'}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}18`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '& .MuiSvgIcon-root': { fontSize: 24, color },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
