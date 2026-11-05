import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHEF_MESSAGES =[
  "Sharpening the digital knives...",
  "Mise en place in progress...",
  "Consulting the AI Chef...",
  "Firing up the burners...",
  "Sifting through the data...",
  "Analyzing the ingredients...",
  "Organizing the digital pantry...",
  "Measuring twice, cutting once...",
  "Checking for freshness...",
  "Deciphering your input...",
  "Optimizing kitchen logic...",
  "Reducing waste...",
  "Reviewing the archives...",
  "Calibrating the flavors...",
  "Connecting to the culinary cloud...",
  "Gathering the goods...",
  "Processing culinary magic...",
  "Wiping down the counters...",
  "No spoiled food on my watch!",
  "Almost there, Chef!"
  ];

interface ChefLoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ChefLoadingSpinner: React.FC<ChefLoadingSpinnerProps> = ({ 
  className,
  size = 'md' 
}) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % CHEF_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <Loader2 className={cn(sizeClasses[size], "animate-spin text-primary")} />
      <p className={cn(
        textClasses[size],
        "text-muted-foreground text-center animate-pulse font-medium"
      )}>
        {CHEF_MESSAGES[messageIndex]}
      </p>
    </div>
  );
};

export default ChefLoadingSpinner;
