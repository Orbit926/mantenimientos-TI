import { Box, Button, CircularProgress } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import AutorenewIcon from '@mui/icons-material/Autorenew';

export default function FileActionButtons({ pdfUrl, onGenerate, generating }) {
  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {onGenerate && (
        <Button
          variant={pdfUrl ? 'outlined' : 'contained'}
          size="small"
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AutorenewIcon />}
          onClick={onGenerate}
          disabled={generating}
          color="primary"
        >
          {pdfUrl ? 'Regenerar PDF' : 'Generar PDF'}
        </Button>
      )}
      {pdfUrl && (
        <>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            Ver PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Descargar
          </Button>
        </>
      )}
    </Box>
  );
}
