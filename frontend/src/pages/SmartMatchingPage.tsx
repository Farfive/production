import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SmartMatchingDashboard from '../components/smart-matching/SmartMatchingDashboard';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../types';

const SmartMatchingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Convert UserRole enum to expected string values
  const userRoleString = user.role === UserRole.CLIENT ? 'CLIENT' : 
                        user.role === UserRole.MANUFACTURER ? 'MANUFACTURER' : 
                        'CLIENT';

  return (
    <SmartMatchingDashboard
      userId={user.id}
      userRole={userRoleString as 'CLIENT' | 'MANUFACTURER'}
    />
  );
};

export default SmartMatchingPage; 