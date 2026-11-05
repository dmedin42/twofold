import React from 'react';
import { Navigate } from 'react-router-dom';
import { useHousehold } from '@/contexts/HouseholdContext';

const Index: React.FC = () => {
  const { activeUser } = useHousehold();
  
  // Redirect to profile selection if no active user, otherwise to dashboard
  return activeUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />;
};

export default Index;
