import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicPoll } from '@/hooks/useDinnerPolls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChefHat, AlertCircle, Check, Users, 
  Vote, Utensils, ChevronRight, Lock, Edit2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PublicPoll: React.FC = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { poll, voteCounts, totalVotes, isLoading, error, vote } = usePublicPoll(shareCode);
  
  const [voterName, setVoterName] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameLocked, setIsNameLocked] = useState(false);

  // Load saved voter identity from localStorage
  useEffect(() => {
    if (!shareCode) return;
    try {
      const saved = localStorage.getItem(`poll-voter-${shareCode}`);
      if (saved) {
        const { name, voted } = JSON.parse(saved);
        setVoterName(name);
        setIsNameLocked(true);
        if (voted) setHasVoted(true);
      }
    } catch (e) {
      // localStorage unavailable, continue without persistence
    }
  }, [shareCode]);

  const handleVote = async () => {
    if (!voterName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (selectedOption === null) {
      toast.error('Please select an option');
      return;
    }

    setIsSubmitting(true);
    const success = await vote(voterName, selectedOption);
    setIsSubmitting(false);

    if (success) {
      setHasVoted(true);
      setIsNameLocked(true);
      // Save to localStorage
      try {
        localStorage.setItem(`poll-voter-${shareCode}`, JSON.stringify({
          name: voterName.trim(),
          voted: true
        }));
      } catch (e) {
        // localStorage unavailable
      }
      toast.success('Vote recorded!');
    } else {
      toast.error('Failed to submit vote');
    }
  };

  const handleUnlockName = () => {
    setIsNameLocked(false);
    setHasVoted(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-md mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-full mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Poll Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This poll may have ended or the link is invalid.
          </p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">
              Go to Twofold Kitchen
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-40">
        <div className="container max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Vote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Twofold Kitchen
              </span>
              <h1 className="font-display text-lg font-semibold text-foreground leading-tight">
                Dinner Poll
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Poll Title */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            {poll.title}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Voting Form */}
        {!hasVoted ? (
          <div className="space-y-4">
            {/* Name Input with Lock */}
            <div>
              <Label htmlFor="voter-name" className="text-sm font-medium">
                Your Name
              </Label>
              {isNameLocked ? (
                <div className="mt-1.5 flex items-center gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="flex-1 font-medium text-foreground">{voterName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlockName}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Change
                  </Button>
                </div>
              ) : (
                <Input
                  id="voter-name"
                  placeholder="Enter your name..."
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose your pick</Label>
              {poll.options.map((option, idx) => {
                const voteCount = voteCounts[idx] || 0;
                const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden",
                      selectedOption === idx
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    {/* Progress background */}
                    <div 
                      className="absolute inset-0 bg-primary/10 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                    
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{option.name}</p>
                        {option.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {option.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {voteCount}
                        </span>
                        {selectedOption === idx && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleVote}
              disabled={isSubmitting || !voterName.trim() || selectedOption === null}
              className="w-full rounded-xl h-12"
            >
              {isSubmitting ? 'Submitting...' : 'Cast My Vote'}
            </Button>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-4">
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardContent className="p-4 text-center">
                <Check className="w-10 h-10 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-foreground">Thanks for voting!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your vote has been recorded
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Results</Label>
              {poll.options.map((option, idx) => {
                const voteCount = voteCounts[idx] || 0;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                
                return (
                  <div
                    key={idx}
                    className="w-full p-4 rounded-xl border border-border bg-card relative overflow-hidden"
                  >
                    <div 
                      className="absolute inset-0 bg-primary/10 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{option.name}</p>
                      <span className="text-sm font-semibold text-primary">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-primary" />
                  Create Your Own Polls
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Join Twofold Kitchen to plan meals with your family
                </p>
              </div>
              <Link to="/auth">
                <Button size="sm" className="rounded-xl shrink-0">
                  Sign Up
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PublicPoll;
