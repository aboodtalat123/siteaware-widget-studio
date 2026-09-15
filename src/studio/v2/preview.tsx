import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudioV2PreviewApp } from './components/StudioV2';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioV2PreviewApp />
  </StrictMode>,
);
