import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Users, Home, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface HouseholdData {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

interface HouseholdInfoProps {
  onLeaveHousehold?: () => void;
}

const HouseholdInfo: React.FC<HouseholdInfoProps> = ({ onLeaveHousehold }) => {
  const { user } = useAuthContext();
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHouseholdData();
    }
  }, [user]);

  const fetchHouseholdData = async () => {
    if (!user) return;
    
    try {
      // Use type assertion for tables not in generated types
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile?.household_id) {
        setIsLoading(false);
        return;
      }

      // Get household details
      const { data: householdData, error: householdError } = await (supabase as any)
        .from('households')
        .select('*')
        .eq('id', profile.household_id)
        .single();

      if (householdError) throw householdError;
      setHousehold(householdData as HouseholdData);

      // Get household members
      const { data: membersData, error: membersError } = await (supabase as any)
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('household_id', profile.household_id);

      if (membersError) throw membersError;
      setMembers((membersData as HouseholdMember[]) || []);
    } catch (error) {
      console.error('Error fetching household:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!household?.join_code) return;
    
    try {
      await navigator.clipboard.writeText(household.join_code.toUpperCase());
      setCopied(true);
      toast.success('Join code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleLeaveHousehold = async () => {
    if (!user) return;
    
    setIsLeaving(true);
    try {
      // Use type assertion for tables not in generated types
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ household_id: null })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left household');
      onLeaveHousehold?.();
    } catch (error: any) {
      console.error('Error leaving household:', error);
      toast.error('Failed to leave household');
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!household) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No household found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-display">{household.name}</CardTitle>
            <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Join Code */}
        <div className="p-4 bg-muted rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Join Code</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-8 px-2"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="font-mono text-2xl font-bold tracking-widest text-center">
            {household.join_code?.toUpperCase()}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Share this code with others to let them join
          </p>
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Members</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const color = '#7D9082';
              return (
                <Badge
                  key={member.id}
                  variant="secondary"
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  {member.name}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Leave Household */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Leave Household
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Household?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll lose access to shared inventory, recipes, and grocery lists. 
                You can rejoin later with the join code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveHousehold}
                disabled={isLeaving}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLeaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Leave'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default HouseholdInfo;
