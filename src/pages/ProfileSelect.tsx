import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold } from '@/contexts/HouseholdContext';
import ProfileCard from '@/components/ProfileCard';
import { Users, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PROFILE_COLORS = [
  '#7D9082', // Sage
  '#A67C52', // Caramel
  '#4A4A4A', // Charcoal
  '#6B7C8C', // Slate
  '#8B6F6F', // Dusty Rose
  '#5C7C5C', // Forest
];

const ProfileSelect: React.FC = () => {
  const navigate = useNavigate();
  const { household, setActiveUser, addProfile } = useHousehold();
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const handleProfileSelect = (profile: typeof household.profiles[0]) => {
    setActiveUser(profile);
    navigate('/dashboard');
  };

  const handleAddProfile = () => {
    if (newProfileName.trim()) {
      const usedColors = household.profiles.map(p => p.color);
      const availableColor = PROFILE_COLORS.find(c => !usedColors.includes(c)) || PROFILE_COLORS[0];
      
      addProfile({
        name: newProfileName.trim(),
        color: availableColor,
        role: household.profiles.length === 0 ? 'admin' : 'member',
      });
      setNewProfileName('');
      setIsAddingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-8 px-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-xl">TF</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-semibold text-2xl text-foreground">Twofold</span>
            <span className="text-sm text-muted-foreground">Kitchen OS</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Household Name */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{household.name}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-2">
            {household.profiles.length === 0 ? 'Welcome to Twofold' : "Who's cooking?"}
          </h1>
          <p className="text-muted-foreground">
            {household.profiles.length === 0 
              ? 'Create your first profile to get started'
              : 'Select your profile to get started'
            }
          </p>
        </div>

        {/* Profile Grid or Empty State */}
        {household.profiles.length === 0 ? (
          <div className="flex flex-col items-center gap-6 max-w-md w-full">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <UserPlus className="w-12 h-12 text-muted-foreground" />
            </div>
            
            <Dialog open={isAddingProfile} onOpenChange={setIsAddingProfile}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-xl">
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Create Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Enter your name"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="h-12 rounded-xl"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()}
                  />
                  <Button 
                    onClick={handleAddProfile} 
                    className="w-full rounded-xl"
                    disabled={!newProfileName.trim()}
                  >
                    Create Profile
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-2xl w-full">
              {household.profiles.map((profile, index) => (
                <div 
                  key={profile.uid}
                  className="animate-float-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ProfileCard
                    profile={profile}
                    onClick={() => handleProfileSelect(profile)}
                    size="large"
                  />
                </div>
              ))}
              
              {/* Add Profile Button */}
              <Dialog open={isAddingProfile} onOpenChange={setIsAddingProfile}>
                <DialogTrigger asChild>
                  <button
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all min-h-[140px]"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Plus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Add Profile</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Add Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Enter name"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="h-12 rounded-xl"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()}
                    />
                    <Button 
                      onClick={handleAddProfile} 
                      className="w-full rounded-xl"
                      disabled={!newProfileName.trim()}
                    >
                      Add Profile
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Guest Mode */}
            <button 
              onClick={() => {
                setActiveUser(null);
                navigate('/dashboard');
              }}
              className="mt-10 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Continue as Guest
            </button>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          {household.profiles.length === 0 
            ? 'Create profiles for each household member'
            : 'Tap your profile to check in'
          }
        </p>
      </footer>
    </div>
  );
};

export default ProfileSelect;
