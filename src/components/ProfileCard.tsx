import React from 'react';
import { UserProfile } from '@/types/household';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface ProfileCardProps {
  profile: UserProfile;
  onClick: () => void;
  isSelected?: boolean;
  size?: 'default' | 'large';
}

const ProfileCard: React.FC<ProfileCardProps> = ({ 
  profile, 
  onClick, 
  isSelected = false,
  size = 'default' 
}) => {
  const initials = profile.name.slice(0, 2).toUpperCase();
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-4 p-6 rounded-3xl",
        "bg-card border-2 transition-all duration-300 touch-highlight",
        "hover:shadow-profile hover:-translate-y-2",
        "focus:outline-none focus:ring-4 focus:ring-primary/20",
        isSelected 
          ? "border-primary shadow-profile -translate-y-2" 
          : "border-transparent shadow-elevated",
        size === 'large' && "p-8 gap-5"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full transition-transform duration-300",
          "group-hover:scale-105",
          size === 'large' ? "w-28 h-28" : "w-20 h-20"
        )}
        style={{ backgroundColor: profile.color }}
      >
        <span 
          className={cn(
            "font-display font-semibold text-white",
            size === 'large' ? "text-3xl" : "text-2xl"
          )}
        >
          {initials}
        </span>
        
        {/* Admin badge */}
        {profile.role === 'admin' && (
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-secondary rounded-full flex items-center justify-center shadow-soft">
            <Crown className="w-4 h-4 text-secondary-foreground" />
          </div>
        )}
        
        {/* Active pulse indicator */}
        {isSelected && (
          <div 
            className="absolute inset-0 rounded-full animate-pulse-soft"
            style={{ 
              backgroundColor: profile.color,
              opacity: 0.3,
            }}
          />
        )}
      </div>
      
      {/* Name */}
      <span 
        className={cn(
          "font-display font-medium text-foreground",
          size === 'large' ? "text-xl" : "text-lg"
        )}
      >
        {profile.name}
      </span>
      
      {/* Role badge */}
      <span className="text-sm text-muted-foreground capitalize">
        {profile.role}
      </span>
    </button>
  );
};

export default ProfileCard;
