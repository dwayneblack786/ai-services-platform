import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeSentry } from './utils/sentry';

// Initialize Sentry for error tracking
initializeSentry();

// Note: Axios configuration has been moved to apiClient.ts
// All API calls now use the centralized apiClient with circuit breaker

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
