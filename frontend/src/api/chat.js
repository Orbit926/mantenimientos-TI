import client from './client';

export const sendMessage = (message, history = []) =>
  client.post('/chat/', { message, history }).then((r) => r.data);
