import React from 'react';
import './styles.css';
import { createRoot } from 'react-dom/client';
import App from './App';
import { UnifiedSiteAwareExtensionAdapter } from './studio/adapters/UnifiedSiteAwareExtensionAdapter';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App adapter={UnifiedSiteAwareExtensionAdapter} />);
}
