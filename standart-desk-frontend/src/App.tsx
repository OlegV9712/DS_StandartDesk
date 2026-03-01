import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProjectEditor } from './pages/ProjectEditor';
import { TaskManager } from './pages/TaskManager';
import { AdminDashboard } from './pages/AdminDashboard';
import { Settings } from './pages/Settings';
import { BotAssistant } from './pages/BotAssistant';
import { Layout } from './components/Layout';
import SMSAdmin from './pages/SMSAdmin';
import './styles/globals.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
  children, 
  requiredRole 
}) => {
  const user = useAuth((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children as React.ReactElement}</Layout>;
};

const App: React.FC = () => {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <ProjectEditor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bot"
          element={
            <ProtectedRoute>
              <BotAssistant />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sms"
          element={
            <ProtectedRoute>
              <SMSAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
