import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { POTLUCK_CATEGORIES, PotluckCategory } from '@/types/potluck';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Plus, RefreshCw, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PotluckSuggestion {
  name: string;
  category: string;
  notes?: string;
}

interface AISuggestionsProps {
  potluckTitle: string;
  potluckDescription?: string | null;
  currentItems: string[];
  onAddItem: (item: { item_name: string; category: string; notes?: string }) => Promise<any>;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({
  potluckTitle,
  potluckDescription,
  currentItems,
  onAddItem,
}) => {
  const [suggestions, setSuggestions] = useState<PotluckSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [eventType, setEventType] = useState('');

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      // Build enhanced description with event type
      const enhancedDescription = eventType.trim() 
        ? `Event type: ${eventType}. ${potluckDescription || ''}`
        : potluckDescription;

      const { data, error } = await supabase.functions.invoke('openai-completion', {
        body: {
          taskType: 'potluck_suggestions',
          potluckTitle,
          potluckDescription: enhancedDescription,
          currentItems,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to get suggestions');

      const newSuggestions = data.data?.suggestions || [];
      setSuggestions(newSuggestions);
      
      if (newSuggestions.length === 0) {
        toast.info('No suggestions available');
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestion = async (suggestion: PotluckSuggestion) => {
    setAddingItem(suggestion.name);
    try {
      // Map AI category to our categories
      const category = POTLUCK_CATEGORIES.find(
        c => c.toLowerCase() === suggestion.category.toLowerCase()
      ) || 'Other';

      await onAddItem({
        item_name: suggestion.name,
        category,
        notes: suggestion.notes,
      });

      // Remove from suggestions list
      setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
      toast.success(`Added "${suggestion.name}" to the list`);
    } catch (err) {
      console.error('Error adding suggestion:', err);
      toast.error('Failed to add item');
    } finally {
      setAddingItem(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Main Dish': 'bg-red-500/10 text-red-600 border-red-200',
      'Side Dish': 'bg-green-500/10 text-green-600 border-green-200',
      'Appetizer': 'bg-orange-500/10 text-orange-600 border-orange-200',
      'Dessert': 'bg-pink-500/10 text-pink-600 border-pink-200',
      'Drinks': 'bg-blue-500/10 text-blue-600 border-blue-200',
      'Utensils': 'bg-gray-500/10 text-gray-600 border-gray-200',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  if (suggestions.length === 0) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="py-6 space-y-4">
          <div className="text-center">
            <Lightbulb className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Need ideas?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered dish suggestions for your potluck
            </p>
          </div>
          
          <Input
            placeholder="Event type (e.g., BBQ, Taco Night, Birthday...)"
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="rounded-xl"
          />
          
          <Button
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="w-full rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get Suggestions
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Suggestions
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="h-8 rounded-lg"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <Card 
            key={`${suggestion.name}-${index}`} 
            className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{suggestion.name}</span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getCategoryColor(suggestion.category))}
                    >
                      {suggestion.category}
                    </Badge>
                  </div>
                  {suggestion.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{suggestion.notes}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg shrink-0"
                  onClick={() => handleAddSuggestion(suggestion)}
                  disabled={addingItem === suggestion.name}
                >
                  {addingItem === suggestion.name ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AISuggestions;
