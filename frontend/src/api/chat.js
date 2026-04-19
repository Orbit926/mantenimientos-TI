import client from './client';

export const sendMessage = (message, history = []) =>
  client.post('/chat/', { message, history }).then((r) => r.data);

export const sendImage = (file, prompt = '') => {
  const form = new FormData();
  form.append('image', file);
  if (prompt) form.append('prompt', prompt);
  return client.post('/chat/imagen/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
