import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              className:
                '!rounded-2xl !border-2 !border-clay-border !bg-clay-surface !text-clay-ink !shadow-clay-lg !px-4 !py-3 !text-sm !font-medium',
              duration: 4000,
              success: {
                iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
