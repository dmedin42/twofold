import React, { useRef, useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

export interface CameraScannerProps {
onCapture: (imageBase64: string) => Promise<void>;
onCancel?: () => void;
captureLabel?: string;
}

const CameraScanner: React.FC<CameraScannerProps> = ({
onCapture,
onCancel,
}) => {
const { 
    videoRef, 
    canvasRef, 
    isStreaming, 
    error, 
    startCamera, 
    stopCamera, 
    capturePhoto, 
    switchCamera,
    facingMode 
} = useCamera();

const fileInputRef = useRef<HTMLInputElement>(null);
const [isLoading, setIsLoading] = useState(false);
const { toast } = useToast();

// Auto-stop camera on unmount to release hardware
useEffect(() => {
    return () => stopCamera();
}, [stopCamera]);

// Handle hook-level hardware errors
useEffect(() => {
    if (error) {
    toast({ title: "Camera Error", description: error, variant: "destructive" });
    }
}, [error, toast]);

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            await onCapture(base64);
            setIsLoading(false);
        };
        reader.readAsDataURL(file);
    } catch (err) {
        toast({ title: "Upload Error", description: "Failed to process image", variant: "destructive" });
        setIsLoading(false);
    }
};

const handleCapture = async () => {
    if (isLoading) return;
    
    console.log("Capture initiated...");
    setIsLoading(true);
    
    try {
        const photo = capturePhoto();
        if (photo) {
            console.log("Photo captured, proceeding to processing...");
            await onCapture(photo);
            stopCamera();
        } else {
            toast({ 
                title: "Capture Failed", 
                description: "The camera stream wasn't ready. Please try again in a second.", 
                variant: "destructive" 
            });
        }
    } catch (err) {
        console.error("Capture process error:", err);
        toast({ title: "Error", description: "An unexpected error occurred during capture.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
};

return (
    <div className="flex flex-col items-center w-full h-full min-h-[300px]">
        {/* 1. MANDATORY: Canvas must always be in the DOM for the hook to work */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        
        <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            className="hidden" 
        />

        {!isStreaming ? (
            /* INITIAL UI: Gallery or Open Camera */
            <div className="w-full flex-1 flex flex-col items-center justify-center p-6 gap-4 bg-background/60 backdrop-blur-xl rounded-2xl border border-border">
                <Button onClick={startCamera} size="lg" className="h-12 w-full max-w-xs gap-2">
                    <Camera className="w-5 h-5" /> Open Camera
                </Button>
                <div className="flex items-center gap-3 w-full max-w-xs">
                    <div className="h-px bg-border flex-1"/>
                    <span className="text-muted-foreground text-xs uppercase font-bold">OR</span>
                    <div className="h-px bg-border flex-1"/>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-12 w-full max-w-xs gap-2">
                    <ImageIcon className="w-5 h-5" /> Choose from Gallery
                </Button>
            </div>
        ) : (
            /* ACTIVE CAMERA UI: Fixed Fullscreen for Mobile */
            <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
                <div className="relative flex-1 bg-black">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute inset-0 w-full h-full object-cover" 
                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                    />
                    
                    {/* Top Controls */}
                    <div className="absolute top-6 right-6 z-[10000]">
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className="rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 h-12 w-12" 
                            onClick={() => {
                            stopCamera();
                            if (onCancel) onCancel();
                            }}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
                
                {/* Bottom Controls Bar */}
                <div className="bg-black/95 px-8 py-10 flex justify-between items-center gap-4 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white hover:bg-white/10 h-14 w-14 rounded-full" 
                        onClick={switchCamera}
                    >
                        <RotateCcw className="w-8 h-8" />
                    </Button>

                    <button 
                        onClick={handleCapture}
                        disabled={isLoading}
                        className="h-24 w-24 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-90 transition-all touch-none"
                    >
                        <div className={`w-20 h-20 rounded-full bg-white shadow-xl transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`} />
                    </button>

                    <div className="w-14" /> {/* Symmetry Spacer */}
                </div>
            </div>
        )}
        
        {/* Fullscreen Loader for AI Processing */}
        {isLoading && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10001]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin w-12 h-12 text-white" />
                <p className="text-white font-medium animate-pulse">Analyzing items...</p>
            </div>
            </div>
        )}
    </div>
);
};

export default CameraScanner;