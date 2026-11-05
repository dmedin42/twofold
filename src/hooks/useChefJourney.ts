import { useChefData } from './useChefData';
import { useChefProgress } from './useChefProgress';
import { useAuthContext } from '@/contexts/AuthContext';

export type { MilestoneData } from './useChefData';
export type { ChefPhase } from './useChefProgress';

export function useChefJourney() {
  const { user } = useAuthContext();
  const { data, isLoading, refetch, recordMilestone } = useChefData();
  const { currentPhase, showConfetti, phaseName, phaseGoal, visibleWidgets } = useChefProgress(data, isLoading, user?.id);

  const progressPercent = (currentPhase / 4) * 100;

  return {
    data,
    currentPhase,
    phaseName,
    phaseGoal,
    progressPercent,
    isLoading,
    showConfetti,
    recordMilestone, // Dashboard needs this
    visibleWidgets,  // Dashboard needs this (this fixes the red error!)
    refetch
  };
}