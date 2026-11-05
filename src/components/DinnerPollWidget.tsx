import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDinnerPolls, usePollResults, PollOption } from '@/hooks/useDinnerPolls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Vote, Plus, Link2, Trash2, X, 
  ChevronDown, ChevronUp, Check, Trophy, Sparkles, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Sub-component for displaying live poll results
const PollResultsView: React.FC<{ 
  pollId: string; 
  options: PollOption[];
}> = ({ pollId, options }) => {
  const { voteCounts, votersByOption, totalVotes, isLoading, refetch } = usePollResults(pollId);

  return (
    <div className="space-y-3">
      {options.map((option, idx) => {
        const count = voteCounts[idx] || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const voters = votersByOption[idx] || [];

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{option.name}</span>
              <span className="text-xs text-muted-foreground">
                {count} vote{count !== 1 ? 's' : ''} ({percentage}%)
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
            {voters.length > 0 && (
              <p className="text-xs text-muted-foreground pl-1">
                → {voters.join(', ')}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <span>Total: {totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
          className="h-6 text-xs"
        >
          <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </div>
  );
};

// Sub-component for closed poll with winner
const ClosedPollCard: React.FC<{
  poll: {
    id: string;
    title: string;
    options: PollOption[];
  };
  onDelete: (id: string) => void;
  onCreateRecipe: (winnerName: string) => void;
}> = ({ poll, onDelete, onCreateRecipe }) => {
  const { voteCounts, totalVotes } = usePollResults(poll.id);

  // Find winner (highest votes, tie-breaker: first alphabetically)
  let winnerIdx = 0;
  let maxVotes = 0;
  let winnerName = poll.options[0]?.name || 'No options';

  poll.options.forEach((option, idx) => {
    const count = voteCounts[idx] || 0;
    if (count > maxVotes || (count === maxVotes && option.name < winnerName)) {
      maxVotes = count;
      winnerIdx = idx;
      winnerName = option.name;
    }
  });

  const hasVotes = totalVotes > 0;

  return (
    <div className="p-3 rounded-xl border border-border bg-card/50">
      <p className="font-medium text-sm text-foreground mb-2">{poll.title}</p>
      
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-500" />
        <span className="text-sm text-foreground font-medium">
          {hasVotes ? `${winnerName} (${maxVotes} votes)` : 'No votes'}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCreateRecipe(winnerName)}
          disabled={!hasVotes}
          className="flex-1"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Create Recipe
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(poll.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const DinnerPollWidget: React.FC = () => {
  const navigate = useNavigate();
  const { polls, isLoading, createPoll, closePoll, deletePoll } = useDinnerPolls();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("What's for dinner?");
  const [newOptions, setNewOptions] = useState<PollOption[]>([
    { name: '' },
    { name: '' },
    { name: '' },
  ]);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (newOptions.length < 5) {
      setNewOptions([...newOptions, { name: '' }]);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx: number, value: string) => {
    const updated = [...newOptions];
    updated[idx] = { name: value };
    setNewOptions(updated);
  };

  const handleCreate = async () => {
    const validOptions = newOptions.filter(o => o.name.trim());
    if (validOptions.length < 2) {
      toast.error('Add at least 2 options');
      return;
    }

    setIsSubmitting(true);
    const poll = await createPoll(newTitle, validOptions);
    setIsSubmitting(false);

    if (poll) {
      toast.success('Poll created!');
      setIsCreating(false);
      setNewTitle("What's for dinner?");
      setNewOptions([{ name: '' }, { name: '' }, { name: '' }]);
      
      // Use production domain for share links
      const shareUrl = `${window.location.origin}/poll/${poll.share_code}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied!');
    } else {
      toast.error('Failed to create poll');
    }
  };

  const handleCopyLink = async (shareCode: string) => {
    const shareUrl = `${window.location.origin}/poll/${shareCode}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const handleClose = async (pollId: string) => {
    await closePoll(pollId);
    toast.success('Poll closed');
  };

  const handleDelete = async (pollId: string) => {
    await deletePoll(pollId);
    toast.success('Poll deleted');
  };

  const handleCreateRecipe = (winnerName: string) => {
    navigate(`/recipes?tab=ai&note=${encodeURIComponent(winnerName)}`);
  };

  const activePolls = polls.filter(p => p.is_active);
  const closedPolls = polls.filter(p => !p.is_active);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Vote className="w-4 h-4 text-secondary" />
            </div>
            <CardTitle className="text-base font-display">Dinner Poll</CardTitle>
          </div>
          {!isCreating && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCreating(true)}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Poll
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Create New Poll Form */}
        {isCreating && (
          <div className="p-4 rounded-xl bg-muted/50 space-y-4">
            <div>
              <Label className="text-xs">Poll Question</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What's for dinner?"
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Options</Label>
              {newOptions.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={option.name}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1"
                  />
                  {newOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemoveOption(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {newOptions.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddOption}
                  className="w-full h-8 border border-dashed border-border"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create & Share'}
              </Button>
            </div>
          </div>
        )}

        {/* Active Polls */}
        {activePolls.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active
            </p>
            {activePolls.map((poll) => (
              <div
                key={poll.id}
                className="p-3 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setExpandedPollId(
                      expandedPollId === poll.id ? null : poll.id
                    )}
                  >
                    <p className="font-medium text-sm text-foreground">
                      {poll.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {poll.options.length} options
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(poll.share_code)}
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedPollId(
                        expandedPollId === poll.id ? null : poll.id
                      )}
                    >
                      {expandedPollId === poll.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded View with Live Results */}
                {expandedPollId === poll.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    <PollResultsView pollId={poll.id} options={poll.options} />
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClose(poll.id)}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Close Poll
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(poll.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isCreating && activePolls.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Vote className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              No active polls
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              Create your first poll
            </Button>
          </div>
        )}

        {/* Closed Polls Section */}
        {closedPolls.length > 0 && (
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Closed ({closedPolls.length})
            </p>
            {closedPolls.map((poll) => (
              <ClosedPollCard
                key={poll.id}
                poll={poll}
                onDelete={handleDelete}
                onCreateRecipe={handleCreateRecipe}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DinnerPollWidget;
