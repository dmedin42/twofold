import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package, ShoppingCart, ChefHat, ClipboardCheck, Home, Settings, Activity, Lock } from "lucide-react";
import ActiveUserPulse from "./ActiveUserPulse";
import { supabase } from "@/integrations/supabase/client";
import { trackNavigation } from "@/lib/operatorTracking";
import { useChefJourney } from "@/hooks/useChefJourney";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const allNavItems = [
  { path: "/dashboard", icon: Home, label: "Home", phase: 1 },
  { path: "/inventory", icon: Package, label: "Pantry+", phase: 1 },
  { path: "/checkin", icon: ClipboardCheck, label: "Check In", phase: 1 },
  { path: "/recipes", icon: ChefHat, label: "Recipes", phase: 2 },
  { path: "/groceries", icon: ShoppingCart, label: "Shopping List", phase: 4 },
  { path: "/settings", icon: Settings, label: "Settings", phase: 1 },
];

const Navigation: React.FC = () => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentPhase } = useChefJourney();

  useEffect(() => {
    let isMounted = true;
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      try {
        const { data } = await (supabase as any).rpc("has_role", { 
          _user_id: user.id, 
          _role: "admin" 
        });
        if (isMounted) setIsAdmin(!!data);
      } catch (err) {
        console.error("Admin check failed", err);
      }
    };
    
    checkAdmin();
    return () => { isMounted = false; };
  }, []);

  const handleLockedClick = (e: React.MouseEvent, label: string, phase: number) => {
    e.preventDefault();
    const phaseGoals: Record<number, string> = {
      2: "Add 3 pantry items to unlock Recipes",
      3: "Save & cook a recipe to unlock Household features",
      4: "Unlock household sharing for the Shopping List",
    };
    
    toast.info(`🔒 ${label} is locked`, { 
      description: phaseGoals[phase] || "Keep progressing through your Chef Journey!",
      position: "top-center"
    });
  };

  const visibleNavItems = [
    ...allNavItems,
    ...(isAdmin ? [{ path: "/operator", icon: Activity, label: "Ops", phase: 1 }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)] border-b border-border/50">
      <ActiveUserPulse />

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center justify-center gap-1 py-2 px-4">
        {visibleNavItems.map(({ path, icon: Icon, label, phase }) => {
          const isLocked = phase > currentPhase;
          const isActive = location.pathname === path;

          if (isLocked) {
            return (
              <Tooltip key={path} delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleLockedClick(e, label, phase)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground/30 cursor-not-allowed group transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Phase {phase} Required</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              onClick={() => trackNavigation(label, { path })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden flex items-center justify-between py-1 px-3 overflow-x-auto no-scrollbar">
        {visibleNavItems.map(({ path, icon: Icon, label, phase }) => {
          const isLocked = phase > currentPhase;
          const isActive = location.pathname === path;

          if (isLocked) {
            return (
              <button
                key={path}
                onClick={(e) => handleLockedClick(e, label, phase)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl flex-shrink-0 text-muted-foreground/20 cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              onClick={() => trackNavigation(label, { path })}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all flex-shrink-0",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default Navigation;