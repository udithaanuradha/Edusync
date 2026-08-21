import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; 
import { SocketV2Provider } from './context/SocketV2Context';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider> 
      <SocketV2Provider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SocketV2Provider>
    </AuthProvider>
  </StrictMode>
);