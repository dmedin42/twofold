import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuthContext } from '@/contexts/AuthContext';

const ActiveUserPulse: React.FC = () => {
  // Keep hooks active to maintain Supabase connection
  useHousehold();
  useAuthContext();


  return (
    <div className="hidden" aria-hidden="true">
      {/* Component kept for Supabase connection - hooks above maintain session */}
    </div>
  );
};

export default ActiveUserPulse;
