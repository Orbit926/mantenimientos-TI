import { Card, CardContent, Typography, Divider, Box } from '@mui/material';

export default function SectionCard({ title, subtitle, children, sx = {} }) {
  return (
    <Card sx={{ mb: 3, ...sx }}>
      {title && (
        <>
          <Box sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Divider />
        </>
      )}
      <CardContent sx={{ p: 3 }}>
        {children}
      </CardContent>
    </Card>
  );
}
