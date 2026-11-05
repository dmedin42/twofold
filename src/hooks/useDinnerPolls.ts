import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuthContext } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { trackFeatureUse } from '@/lib/operatorTracking';

export interface PollOption {
  name: string;
  description?: string;
}

export interface DinnerPoll {
  id: string;
  household_id: string;
  owner_id: string;
  title: string;
  options: PollOption[];
  closes_at: string | null;
  share_code: string;
  is_active: boolean;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  voter_name: string;
  option_index: number;
  created_at: string;
}

// Hook for fetching poll results with realtime updates (for hosts)
export function usePollResults(pollId: string | null) {
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchVotes = useCallback(async () => {
    if (!pollId) {
      setVotes([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('dinner_poll_votes')
        .select('*')
        .eq('poll_id', pollId);

      if (error) throw error;
      setVotes(data || []);
    } catch (err) {
      console.error('Error fetching poll votes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    fetchVotes();

    // Set up realtime subscription
    if (pollId) {
      channelRef.current = supabase
        .channel(`poll-votes-${pollId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dinner_poll_votes',
            filter: `poll_id=eq.${pollId}`
          },
          () => {
            fetchVotes();
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [pollId, fetchVotes]);

  // Calculate vote counts per option
  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.option_index] = (acc[vote.option_index] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Group voters by option
  const votersByOption = votes.reduce((acc, vote) => {
    if (!acc[vote.option_index]) acc[vote.option_index] = [];
    acc[vote.option_index].push(vote.voter_name);
    return acc;
  }, {} as Record<number, string[]>);

  const totalVotes = votes.length;

  return {
    votes,
    voteCounts,
    votersByOption,
    totalVotes,
    isLoading,
    refetch: fetchVotes,
  };
}

export function useDinnerPolls() {
  const { user } = useAuthContext();
  const { household } = useHousehold();
  const householdId = household?.id || null;
  const [polls, setPolls] = useState<DinnerPoll[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPolls = useCallback(async () => {
    if (!householdId) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('dinner_polls')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const createPoll = useCallback(async (
    title: string, 
    options: PollOption[]
  ): Promise<DinnerPoll | null> => {
    if (!householdId || !user) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('dinner_polls')
        .insert({
          household_id: householdId,
          owner_id: user.id,
          title,
          options,
        })
        .select()
        .single();

      if (error) throw error;
      trackFeatureUse('poll_created', { title });
      await fetchPolls();
      return data;
    } catch (err) {
      console.error('Error creating poll:', err);
      return null;
    }
  }, [householdId, user, fetchPolls]);

  const closePoll = useCallback(async (pollId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('dinner_polls')
        .update({ is_active: false })
        .eq('id', pollId);

      if (error) throw error;
      await fetchPolls();
    } catch (err) {
      console.error('Error closing poll:', err);
    }
  }, [fetchPolls]);

  const deletePoll = useCallback(async (pollId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('dinner_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
      await fetchPolls();
    } catch (err) {
      console.error('Error deleting poll:', err);
    }
  }, [fetchPolls]);

  return {
    polls,
    isLoading,
    createPoll,
    closePoll,
    deletePoll,
    refetch: fetchPolls,
  };
}

// Hook for public poll voting (no auth required)
export function usePublicPoll(shareCode: string | undefined) {
  const [poll, setPoll] = useState<DinnerPoll | null>(null);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoll = useCallback(async () => {
    if (!shareCode) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: pollError } = await (supabase as any)
        .from('dinner_polls')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_active', true)
        .single();

      if (pollError) throw pollError;
      setPoll(data);

      // Fetch votes
      const { data: votesData } = await (supabase as any)
        .from('dinner_poll_votes')
        .select('*')
        .eq('poll_id', data.id);

      setVotes(votesData || []);
    } catch (err: any) {
      console.error('Error fetching poll:', err);
      setError('Poll not found or has ended');
    } finally {
      setIsLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  const vote = useCallback(async (voterName: string, optionIndex: number) => {
    if (!poll) return false;

    try {
      // Upsert vote (update if exists, insert if not)
      const { error } = await (supabase as any)
        .from('dinner_poll_votes')
        .upsert({
          poll_id: poll.id,
          voter_name: voterName.trim(),
          option_index: optionIndex,
        }, {
          onConflict: 'poll_id,voter_name'
        });

      if (error) throw error;
      trackFeatureUse('poll_vote', { optionIndex });
      await fetchPoll();
      return true;
    } catch (err) {
      console.error('Error voting:', err);
      return false;
    }
  }, [poll, fetchPoll]);

  // Calculate vote counts per option
  const voteCounts = poll?.options.map((_, idx) => 
    votes.filter(v => v.option_index === idx).length
  ) || [];

  const totalVotes = votes.length;

  return {
    poll,
    votes,
    voteCounts,
    totalVotes,
    isLoading,
    error,
    vote,
    refetch: fetchPoll,
  };
}
