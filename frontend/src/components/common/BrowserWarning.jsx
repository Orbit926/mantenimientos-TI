import { useState } from 'react';
import { Alert, IconButton, Link } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function isChromium() {
  const ua = navigator.userAgent;
  const isChrome = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const isBrave = navigator.brave !== undefined;
  return isChrome || isBrave;
}

export default function BrowserWarning() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isChromium()) return null;

  return (
    <Alert
      severity="warning"
      sx={{ borderRadius: 0, position: 'sticky', top: 0, zIndex: 9999 }}
      action={
        <IconButton size="small" color="inherit" onClick={() => setDismissed(true)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    >
      Para una mejor experiencia usa{' '}
      <Link href="https://www.google.com/chrome/" target="_blank" rel="noopener noreferrer" color="inherit" fontWeight={700}>
        Google Chrome
      </Link>{' '}
      o{' '}
      <Link href="https://brave.com/download/" target="_blank" rel="noopener noreferrer" color="inherit" fontWeight={700}>
        Brave
      </Link>
      . Algunos navegadores pueden presentar problemas de compatibilidad.
    </Alert>
  );
}
