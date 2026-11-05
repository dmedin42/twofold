import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, Lock, User, Check, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PrivacyPolicyDialog from '@/components/PrivacyPolicyDialog';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isStartingGuest, setIsStartingGuest] = useState(false);

  // Guest mode: an anonymous Supabase session. The signup trigger gives it its own
  // sample kitchen, and guest accounts are deleted automatically after 24 hours.
  const handleGuest = async () => {
    setIsStartingGuest(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setIsStartingGuest(false);
      toast.error("Couldn't start a guest session", { description: error.message });
      return;
    }
    toast.success('Welcome to your sample kitchen!');
    navigate('/dashboard');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      // Route will handle redirect based on household status
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!acceptedPrivacy) {
      toast.error('Please accept the Privacy Policy to continue');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password, name);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSignUpSuccess(true);
      toast.success('Check your email to confirm your account');
    }
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to activate your account, then come back here to sign in.
            </p>
            <Button 
              variant="outline" 
              className="w-full rounded-xl"
              onClick={() => setSignUpSuccess(false)}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-display text-2xl">Welcome</CardTitle>
            <CardDescription>
              Try the demo, or sign in to your household's kitchen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="w-full h-12 rounded-xl"
              onClick={handleGuest}
              disabled={isStartingGuest || isSubmitting}
            >
              {isStartingGuest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up your kitchen...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Explore as a guest
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              No account needed. You get a sample kitchen that resets after 24 hours.
            </p>

            <div className="flex items-center gap-3 my-6" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue={searchParams.get('tab') === 'signup' ? 'signup' : 'signin'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="rounded-lg">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl"
                    disabled={isSubmitting || loading}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy-policy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor="privacy-policy" 
                      className="text-sm text-muted-foreground font-normal leading-relaxed cursor-pointer"
                    >
                      I have read and agree to the{' '}
                      <PrivacyPolicyDialog>
                        <button
                          type="button"
                          className="text-primary hover:underline font-medium"
                        >
                          Privacy Policy
                        </button>
                      </PrivacyPolicyDialog>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl"
                    disabled={isSubmitting || loading || !acceptedPrivacy}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
