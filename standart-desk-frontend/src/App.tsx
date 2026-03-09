import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authStore';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { MaintenanceWrapper } from './components/MaintenanceWrapper';
import './styles/globals.css';

// Lazy load heavy components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectEditor = lazy(() => import('./pages/ProjectEditor').then(m => ({ default: m.ProjectEditor })));
const TaskManager = lazy(() => import('./pages/TaskManager').then(m => ({ default: m.TaskManager })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const ScenarioTester = lazy(() => import('./pages/ScenarioTester').then(m => ({ default: m.ScenarioTester })));
const SMSAdmin = lazy(() => import('./pages/SMSAdmin').then(m => ({ default: m.default })));

// Loading component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div>Loading...</div>
  </div>
);

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

  return (
    <Layout>
      <MaintenanceWrapper>
        {children as React.ReactElement}
      </MaintenanceWrapper>
    </Layout>
  );
};

const App: React.FC = () => {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with lazy loading */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ProjectEditor />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bot"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ScenarioTester />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <TaskManager />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sms"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <SMSAdmin />
              </Suspense>
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
