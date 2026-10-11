import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

import '@seed-design/css/base.css';
import '@fontsource/anton/latin-400.css';
import './global.css';
import './theme.css';
import './seed-overrides.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
