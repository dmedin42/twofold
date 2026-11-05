import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { MilestoneData } from './useChefData';

export type ChefPhase = 1 | 2 | 3 | 4;

const PHASE_NAMES: Record<ChefPhase, string> = { 1: 'Kitchen Novice', 2: 'Sous Chef', 3: 'Executive Chef', 4: 'Social Chef' };
const PHASE_GOALS: Record<ChefPhase, string> = { 
1: 'Add 3 items to your pantry to unlock Recipes', 
2: 'Save a recipe and cook it to unlock Household features', 
3: 'Invite a household member to unlock Social features', 
4: "You've unlocked everything! 🎉" 
};

export function useChefProgress(data: MilestoneData, isLoading: boolean, userId?: string, unlockAll = false) {
const [showConfetti, setShowConfetti] = useState(false);

const currentPhase = useMemo(() => {
if (unlockAll) return 4;
if (data.householdMemberCount >= 2 && data.firstCookingModeAt) return 4;
if (data.firstRecipeSavedAt && data.firstCookingModeAt) return 3;
if (data.itemsAddedCount >= 3) return 2;
return 1;
}, [data, unlockAll]);

const visibleWidgets = useMemo(() => {
const widgets: string[] = ['priorities'];
if (currentPhase >= 2) widgets.push('dailyBriefing', 'quickRecipe');
if (currentPhase >= 3) widgets.push('financial', 'wasteReport');
if (currentPhase >= 4) widgets.push('dinnerMatch', 'dinnerPoll', 'potlucks');
return widgets;
}, [currentPhase]);

useEffect(() => {
if (isLoading || !userId) return;
const sessionKey = `chef_notified_phase_${userId}`;
const lastNotified = sessionStorage.getItem(sessionKey);

if (lastNotified === null) {
    sessionStorage.setItem(sessionKey, currentPhase.toString());
    return;
}

if (currentPhase > parseInt(lastNotified, 10)) {
    setShowConfetti(true);
    toast.success(`Level Up! You're now a ${PHASE_NAMES[currentPhase as ChefPhase]}`, {
    description: PHASE_GOALS[currentPhase as ChefPhase],
    duration: 5000,
    });
    sessionStorage.setItem(sessionKey, currentPhase.toString());
    setTimeout(() => setShowConfetti(false), 3000);
}
}, [currentPhase, isLoading, userId]);

return { currentPhase, showConfetti, visibleWidgets, phaseName: PHASE_NAMES[currentPhase as ChefPhase], phaseGoal: PHASE_GOALS[currentPhase as ChefPhase] };
}