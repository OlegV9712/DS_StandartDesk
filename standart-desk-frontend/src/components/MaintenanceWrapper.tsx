import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { MaintenancePage } from './MaintenancePage';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

export const MaintenanceWrapper: React.FC<MaintenanceWrapperProps> = ({ children }) => {
  const location = useLocation();
  const user = useAuth((state) => state.user);
  const maintenanceMode = localStorage.getItem('maintenanceMode') === 'true';

  // If maintenance mode is ON
  if (maintenanceMode) {
    // If user is admin AND on admin panel, allow access
    if (user?.role === 'Admin' && location.pathname.startsWith('/admin')) {
      return <>{children}</>;
    }

    // If on admin panel but not admin, block with maintenance message
    if (location.pathname.startsWith('/admin')) {
      return <MaintenancePage contentOnly={true} />;
    }

    // For all other pages in maintenance mode, show maintenance message
    return <MaintenancePage contentOnly={true} />;
  }

  // Normal operation - maintenance mode is OFF
  return <>{children}</>;
};

export default MaintenanceWrapper;
