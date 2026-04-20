export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '—';
  const d = new Date(dateTimeStr);
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let target;
  // Evitar el desfase de zona horaria cuando viene como 'YYYY-MM-DD'
  if (typeof dateStr === 'string') {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
  }
  if (!target) target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function dataUrlToFile(dataUrl, filename = 'firma.png') {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}
