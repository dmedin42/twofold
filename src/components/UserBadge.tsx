import React from 'react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { cn } from '@/lib/utils';

interface UserBadgeProps {
  uid: string;
  size?: 'sm' | 'md';
  showName?: boolean;
  className?: string;
}

const UserBadge: React.FC<UserBadgeProps> = ({ 
  uid, 
  size = 'sm',
  showName = false,
  className 
}) => {
  const { getUserById } = useHousehold();
  
  if (uid === 'global') {
    return (
      <span 
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
          "bg-muted text-muted-foreground",
          size === 'md' && "px-3 py-1",
          className
        )}
      >
        <span className={cn(
          "w-2 h-2 rounded-full bg-muted-foreground/50",
          size === 'md' && "w-2.5 h-2.5"
        )} />
        {showName && <span className="text-xs">Shared</span>}
      </span>
    );
  }

  const user = getUserById(uid);
  if (!user) return null;

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        size === 'md' && "px-3 py-1",
        className
      )}
      style={{ 
        backgroundColor: `${user.color}20`,
        color: user.color,
      }}
    >
      <span 
        className={cn(
          "w-2 h-2 rounded-full",
          size === 'md' && "w-2.5 h-2.5"
        )}
        style={{ backgroundColor: user.color }}
      />
      {showName && <span className="text-xs font-medium truncate max-w-[80px]">{user.name}</span>}
    </span>
  );
};

export default UserBadge;
