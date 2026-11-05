import React from 'react';
import { Progress } from '@/components/ui/progress';
import { useChefJourney } from '@/hooks/useChefJourney';
import { cn } from '@/lib/utils';

const CONFETTI_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(45 100% 60%)',
  'hsl(160 70% 50%)',
];

const ChefProgressBar: React.FC = () => {
  const { currentPhase, phaseName, phaseGoal, progressPercent, showConfetti } = useChefJourney();

  if (currentPhase === 4) return null;

  return (
    <div className="relative mb-6">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="absolute animate-confetti-burst"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                width: `${4 + Math.random() * 6}px`,
                height: `${4 + Math.random() * 6}px`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {phaseName}
          </p>
          <span className="text-xs text-muted-foreground">
            Phase {currentPhase} of 4
          </span>
        </div>

        <Progress value={progressPercent} className="h-2 mb-3" />

        {currentPhase < 4 && (
          <p className="text-sm text-muted-foreground">{phaseGoal}</p>
        )}
        {currentPhase === 4 && (
          <p className="text-sm text-primary font-medium">{phaseGoal}</p>
        )}
      </div>
    </div>
  );
};

export default ChefProgressBar;
