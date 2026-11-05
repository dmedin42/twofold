import React, { useState } from 'react';
import { Camera, Sparkles, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { copyImagePromptToClipboard, IMAGE_TO_RECIPE_PROMPT } from '@/lib/imageRecipePrompt';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CameraScanner from '@/components/CameraScanner';
import ChefLoadingSpinner from '@/components/ChefLoadingSpinner';

interface ScanRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPasteView: () => void;
  onRecipeScanned?: (recipe: any) => void;
}

type ScanView = 'menu' | 'camera' | 'processing';

const ScanRecipeDialog: React.FC<ScanRecipeDialogProps> = ({
  isOpen,
  onClose,
  onOpenPasteView,
  onRecipeScanned,
}) => {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<ScanView>('menu');

  // Go directly to camera when dialog opens
  React.useEffect(() => {
    if (isOpen) setView('camera');
  }, [isOpen]);

  const handleCopyPrompt = async () => {
    const success = await copyImagePromptToClipboard();
    
    if (success) {
      setCopied(true);
      toast.success('Prompt copied!', {
        description: 'Upload your recipe image to ChatGPT or Claude, then paste the response here.',
      });
      setTimeout(() => setCopied(false), 3000);
      onClose();
      onOpenPasteView();
    } else {
      toast.error('Failed to copy prompt');
    }
  };

  const handleContinueToPaste = () => {
    onClose();
    onOpenPasteView();
  };

  const handleOpenCamera = () => {
    setView('camera');
  };

  const handleCancelCamera = () => {
    setView('menu');
  };

  const handleCaptureAndProcess = async (imageBase64: string) => {
    setView('processing');

    // Use process-recipe for cookbook/recipe scanning (NOT process-vision)
    const functionName = 'process-recipe';
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    try {
      console.log("SENDING TO EDGE FUNCTION:", functionName);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          image: imageBase64,
          mimeType: "image/jpeg"
        },
        headers: {
          'Connection': 'keep-alive'
        }
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error("Edge function error:", error);
        
        if (error.message?.includes('aborted') || error.message?.includes('timeout')) {
          toast.error("Request timed out", {
            description: "The AI took too long to analyze the recipe. Try a clearer photo."
          });
          setView('camera');
          return;
        }

        if (error.message?.includes('404') || error.message?.includes('not found')) {
          toast.error("Function not deployed yet.", {
            description: `Run: 'supabase functions deploy ${functionName}'`
          });
          setView('camera');
          return;
        }
        throw new Error(error.message || "Failed to process image");
      }

      // Check if data is valid
      if (!data || !data.name) {
        console.error("Invalid response format:", data);
        throw new Error("AI couldn't find a recipe in that image.");
      }

      // Transform edge function response to match StagedRecipe format
      const recipe = {
        title: data.name,
        description: data.description,
        servings: data.servings || 4,
        ingredients: (data.ingredients || []).map((ing: any) => ({
          item: ing.item,
          qty: ing.qty,
          unit: ing.unit,
          notes: ing.notes
        })),
        instructions: data.instructions || [],
        metrics: {
          prep_time: data.metrics?.prep_time || 0,
          cook_time: data.metrics?.cook_time || 0
        }
      };
      
      toast.success(`Recipe "${data.name}" extracted!`, {
        description: "Review the details before saving"
      });

      if (onRecipeScanned) {
        onRecipeScanned(recipe);
      }
      
      setView('menu');
      onClose();

    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Recipe scan error:", err);
      const message = err instanceof Error ? err.message : "Failed to process image";
      toast.error("Scan failed", { description: message });
      setView('camera');
    }
  };

  const handleDialogClose = () => {
    setView('menu');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-border/50 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            {view === 'camera' ? (
              <>
                <Camera className="w-5 h-5 text-primary" />
                Capture Recipe
              </>
            ) : view === 'processing' ? (
              <>
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                Processing Image...
              </>
            ) : (
              <>
                <ChefHat className="w-6 h-6 text-primary" />
                Scan Recipe
              </>
            )}
          </DialogTitle>
          {view === 'menu' && (
            <DialogDescription>
              Digitize your cookbooks or handwritten notes instantly.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Menu View - Clean Card Style */}
        {view === 'menu' && (
          <div className="py-4">
            {/* AI Camera Card */}
            <div className="bg-gradient-to-br from-primary/80 to-primary rounded-3xl p-6 text-primary-foreground relative overflow-hidden">
              {/* Soft background glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-bold text-white">AI Recipe Scanner</h3>
                  <p className="text-sm text-white/70 mt-1 leading-relaxed">
                    Snap a photo and we'll extract everything automatically
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleOpenCamera} 
                variant="secondary"
                className="w-full gap-3 bg-white/20 hover:bg-white/30 text-white border-0 h-14 text-base font-semibold rounded-2xl transition-all backdrop-blur-sm"
              >
                <Camera className="w-5 h-5" />
                Open Camera
              </Button>
            </div>
          </div>
        )}

        {/* Camera View */}
        {view === 'camera' && (
          <div className="py-2 -mx-2 sm:mx-0">
            <div className="overflow-hidden rounded-2xl border border-border shadow-lg relative bg-black aspect-[3/4] sm:aspect-[4/5]">
              <CameraScanner
                onCapture={handleCaptureAndProcess}
                onCancel={handleCancelCamera}
                captureLabel="Extract Recipe"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Ensure the text is well-lit and legible.
            </p>
          </div>
        )}

        {/* Processing View */}
        {view === 'processing' && (
          <div className="py-12 px-4">
            <div className="bg-muted/30 backdrop-blur-sm border border-border/30 rounded-3xl p-8 flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
                <ChefLoadingSpinner size="lg" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Analyzing Recipe...</h3>
                <p className="text-sm text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                  Identifying ingredients, steps, and cooking times from your photo.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScanRecipeDialog;