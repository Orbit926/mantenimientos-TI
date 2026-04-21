import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import BrowserWarning from './components/common/BrowserWarning';
import router from './routes';

export default function App() {
  return (
    <AuthProvider>
      <BrowserWarning />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
