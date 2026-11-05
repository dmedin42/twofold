import React from 'react';
import { useNavigate } from 'react-router-dom';
import HouseholdSetup from '@/components/HouseholdSetup';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    // Force a full page reload to refresh auth state
    window.location.href = '/dashboard';
  };

  return <HouseholdSetup onComplete={handleComplete} />;
};

export default Onboarding;
