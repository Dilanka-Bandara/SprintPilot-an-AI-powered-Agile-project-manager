import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './styles.css';
import { AuthProvider, Protected } from './features/auth/AuthProvider';
import { Login } from './features/auth/Login';
import { Workspaces, WorkspacePage } from './features/workspaces/Workspaces';
import { firebaseConfigured } from './lib/firebase';
const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/workspaces"
              element={
                <Protected>
                  <Workspaces />
                </Protected>
              }
            />
            <Route
              path="/w/:workspaceId"
              element={
                <Protected>
                  <WorkspacePage />
                </Protected>
              }
            />
            <Route
              path="/"
              element={
                firebaseConfigured ? (
                  <Navigate to="/workspaces" replace />
                ) : (
                  <App />
                )
              }
            />
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
