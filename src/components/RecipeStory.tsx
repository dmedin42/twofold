import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Send, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { trackFeatureUse } from '@/lib/operatorTracking';

interface Story {
  id: string;
  content: string;
  profile_id: string;
  profile_name?: string;
  created_at: string;
}

interface RecipeStoryProps {
  recipeId: string;
}

const RecipeStory: React.FC<RecipeStoryProps> = ({ recipeId }) => {
  const { activeUser } = useHousehold();
  const [stories, setStories] = useState<Story[]>([]);
  const [newStory, setNewStory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('recipe_stories')
        .select('id, content, profile_id, created_at')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names
      const profileIds = [...new Set((data || []).map((s: any) => s.profile_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      
      if (profileIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, name')
          .in('id', profileIds);
        
        (profiles || []).forEach((p: any) => {
          profileMap[p.id] = p.name;
        });
      }

      setStories((data || []).map((s: any) => ({
        ...s,
        profile_name: profileMap[s.profile_id] || 'Unknown',
      })));
    } catch (err) {
      console.debug('Failed to fetch stories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleSubmit = async () => {
    if (!newStory.trim() || !activeUser) return;
    setIsSubmitting(true);

    try {
      const { error } = await (supabase as any)
        .from('recipe_stories')
        .insert({
          recipe_id: recipeId,
          profile_id: activeUser.uid,
          content: newStory.trim(),
        });

      if (error) throw error;
      setNewStory('');
      fetchStories();
      trackFeatureUse('first_story');
      toast.success('Story added!');
    } catch (err) {
      console.error('Failed to add story:', err);
      toast.error('Failed to add story');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (storyId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('recipe_stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;
      setStories(prev => prev.filter(s => s.id !== storyId));
      toast.success('Story removed');
    } catch (err) {
      toast.error('Failed to delete story');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-secondary" />
        <h3 className="font-semibold text-foreground text-sm">Stories & Memories</h3>
      </div>

      {/* Add Story */}
      <div className="flex gap-2">
        <Textarea
          value={newStory}
          onChange={(e) => setNewStory(e.target.value)}
          placeholder="Share a memory about this recipe..."
          className="min-h-[60px] text-sm resize-none"
          maxLength={500}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleSubmit}
          disabled={!newStory.trim() || isSubmitting}
          className="shrink-0 self-end"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Stories List */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading stories...</span>
        </div>
      ) : stories.length > 0 ? (
        <div className="space-y-3">
          {stories.map((story) => (
            <div key={story.id} className="p-3 rounded-xl bg-muted/50 space-y-1 group">
              <p className="text-sm text-foreground leading-relaxed">{story.content}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {story.profile_name} · {format(new Date(story.created_at), 'MMM d, yyyy')}
                </p>
                {story.profile_id === activeUser?.uid && (
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          No stories yet. Be the first to share!
        </p>
      )}
    </div>
  );
};

export default RecipeStory;
