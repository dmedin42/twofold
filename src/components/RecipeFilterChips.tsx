import React from 'react';
import { cn } from '@/lib/utils';
import { RecipeFilterType, RECIPE_FILTERS, CHEF_STUDIO_ONLY_FILTERS } from '@/types/recipe';

interface RecipeFilterChipsProps {
  selectedFilters: RecipeFilterType[];
  onToggleFilter: (filter: RecipeFilterType) => void;
  disabled?: boolean;
  className?: string;
  showAllFilters?: boolean; // If true, show Chef Studio-only filters (e.g., Meal Prep)
}

const RecipeFilterChips: React.FC<RecipeFilterChipsProps> = ({
  selectedFilters,
  onToggleFilter,
  disabled = false,
  className,
  showAllFilters = false,
}) => {
  // Filter out Chef Studio-only filters when not in Chef Studio
  const visibleFilters = showAllFilters 
    ? RECIPE_FILTERS 
    : RECIPE_FILTERS.filter(f => !CHEF_STUDIO_ONLY_FILTERS.includes(f.id));

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {visibleFilters.map((filter) => {
        const isSelected = selectedFilters.includes(filter.id);
        
        return (
          <button
            key={filter.id}
            onClick={() => onToggleFilter(filter.id)}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
              "border",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span>{filter.emoji}</span>
            <span>{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default RecipeFilterChips;
