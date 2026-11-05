import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Users, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface HouseholdSetupProps {
  onComplete: () => void;
}

const HouseholdSetup: React.FC<HouseholdSetupProps> = ({ onComplete }) => {
  const { user, signOut } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim() || !user) return;
    
    setIsLoading(true);
    try {
      // 1. Create the household directly
      const { data: newHousehold, error: householdError } = await (supabase as any)
        .from('households')
        .insert({
          name: householdName.trim(),
          created_by: user.id,
        })
        .select('id')
        .single();

      if (householdError) throw householdError;

      // 2. Update the user's profile to link to the household
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ household_id: newHousehold.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast.success('Household created!', {
        description: `Welcome to ${householdName}`,
      });
      
      onComplete();
    } catch (error: any) {
      console.error('Error creating household:', error);
      toast.error('Failed to create household', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim() || !user) return;
    
    setIsLoading(true);
    try {
      const { data: households, error: findError } = await (supabase as any)
        .from('households')
        .select('id, name')
        .ilike('join_code', joinCode.trim())
        .limit(1);

      if (findError) throw findError;
      
      if (!households || households.length === 0) {
        throw new Error('Invalid join code');
      }

      const household = households[0];

      // 2. Update the user's profile to link to the household
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ household_id: household.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast.success('Joined household!', {
        description: `You are now part of ${household.name}`,
      });

      // Trigger chef journey milestone for joining
      window.dispatchEvent(new CustomEvent('chef-milestone', {
        detail: { type: 'household_member', count: 2 }
      }));
      
      onComplete();
    } catch (error: any) {
      console.error('Error joining household:', error);
      toast.error('Failed to join household', {
        description: error.message === 'Invalid join code' 
          ? 'That code doesn\'t match any household. Check the code and try again.'
          : error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-xl">TF</span>
        </div>
        <div className="flex flex-col">
          <span className="font-display font-semibold text-2xl text-foreground">Twofold</span>
          <span className="text-sm text-muted-foreground">Kitchen OS</span>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Set Up Your Kitchen</CardTitle>
          <CardDescription>
            Create a new household or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create" className="gap-2">
                <Home className="w-4 h-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-2">
                <Users className="w-4 h-4" />
                Join
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Household Name</Label>
                <Input
                  id="householdName"
                  placeholder="e.g., The Smiths Kitchen"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="h-12 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateHousehold()}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  This will be visible to all household members
                </p>
              </div>

              <Button 
                onClick={handleCreateHousehold}
                disabled={!householdName.trim() || isLoading}
                className="w-full h-12 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Create Household
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Join Code</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter 8-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="h-12 rounded-xl font-mono text-center text-lg tracking-widest"
                  maxLength={8}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinHousehold()}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Ask a household member for the join code
                </p>
              </div>

              <Button 
                onClick={handleJoinHousehold}
                disabled={joinCode.length < 8 || isLoading}
                className="w-full h-12 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Join Household
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-6 text-center space-y-4">
        <p className="text-xs text-muted-foreground max-w-sm">
          You can invite others to your household after creating one by sharing your unique join code.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out or log in with different account
        </Button>
      </div>
    </div>
  );
};

export default HouseholdSetup;
