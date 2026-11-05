import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import { BackgroundTaskProvider } from "@/contexts/BackgroundTaskContext";
import { useHouseholdCheck } from "@/hooks/useHouseholdCheck";
import { Suspense, lazy, memo } from "react";
import OfflineIndicator from "@/components/OfflineIndicator";
import BackgroundTaskIndicator from "@/components/BackgroundTaskIndicator";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Loader2 } from "lucide-react";
import GuestBanner from "@/components/GuestBanner";

// --- Lazy Loads ---
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ProfileSelect = lazy(() => import("./pages/ProfileSelect"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Groceries = lazy(() => import("./pages/Groceries"));
const ChefStudio = lazy(() => import("./pages/ChefStudio"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicPotluck = lazy(() => import("./pages/PublicPotluck"));
const PublicRecipe = lazy(() => import("./pages/PublicRecipe"));
const PublicPoll = lazy(() => import("./pages/PublicPoll"));
const Potlucks = lazy(() => import("./pages/Potlucks"));
const OperatorDashboard = lazy(() => import("./pages/OperatorDashboard"));

// Singleton Query Client to prevent re-instantiation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
        <span className="text-primary-foreground font-display font-bold text-xl">TF</span>
      </div>
      <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
    </div>
  </div>
);

// --- Route Guards ---

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuthContext();
  const { hasHousehold, isLoading: householdLoading } = useHouseholdCheck();
  
  if (authLoading || householdLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (hasHousehold === false) return <Navigate to="/onboarding" replace />;
  
  return (
    <>
      {user.is_anonymous && <GuestBanner />}
      {children}
    </>
  );
};

const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuthContext();
  const { hasHousehold, isLoading: householdLoading } = useHouseholdCheck();
  
  if (authLoading || householdLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (hasHousehold === true) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuthContext();
  const { hasHousehold, isLoading: householdLoading } = useHouseholdCheck();
  
  if (authLoading) return <LoadingScreen />;
  if (user) {
    if (householdLoading) return <LoadingScreen />;
    return hasHousehold === false 
      ? <Navigate to="/onboarding" replace /> 
      : <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// --- Utilities ---

const OfflineStatusWrapper = memo(() => {
  const { isOnline, pendingCount, syncPendingOperations } = useOfflineSync(null);
  return <OfflineIndicator isOnline={isOnline} pendingCount={pendingCount} onSync={syncPendingOperations} />;
});

// Separate Component for Routes to keep the App shell clean
const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
        
        {/* Core App */}
        <Route path="/profiles" element={<ProtectedRoute><ProfileSelect /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/groceries" element={<ProtectedRoute><Groceries /></ProtectedRoute>} />
        <Route path="/recipes" element={<ProtectedRoute><ChefStudio /></ProtectedRoute>} />
        <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/potlucks" element={<ProtectedRoute><Potlucks /></ProtectedRoute>} />
        
        {/* Public Sharing */}
        <Route path="/potluck/:shareCode" element={<PublicPotluck />} />
        <Route path="/poll/:shareCode" element={<PublicPoll />} />
        <Route path="/recipe/:shareCode" element={<PublicRecipe />} />
        <Route path="/:slug/:shareCode" element={<PublicRecipe />} />
        
        {/* Admin */}
        <Route path="/operator" element={<ProtectedRoute><OperatorDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <HouseholdProvider>
            <BackgroundTaskProvider>
              <BrowserRouter>
                <div className="relative min-h-screen">
                  <AppRoutes />
                  <Toaster />
                  <Sonner />
                  <OfflineStatusWrapper />
                  <BackgroundTaskIndicator />
                </div>
              </BrowserRouter>
            </BackgroundTaskProvider>
          </HouseholdProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;