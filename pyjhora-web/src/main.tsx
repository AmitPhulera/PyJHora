import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.tsx';
import { HoroscopeProvider } from './contexts/HoroscopeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <HoroscopeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HoroscopeProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
);
