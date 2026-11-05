import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isStreaming: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  switchCamera: () => Promise<void>;
  facingMode: 'user' | 'environment';
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setIsStreaming(true);
          } catch (e) {
            console.error("Autoplay failed:", e);
            setError("Tap to start video preview.");
          }
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message.includes('Permission') ? 'Camera access denied.' : message);
      setIsStreaming(false);
    }
  }, [facingMode]);

  const capturePhoto = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.error("Capture Error: Refs not found", { video: !!video, canvas: !!canvas });
      return null;
    }

    // CRITICAL: Ensure video has enough data to be captured (HAVE_ENOUGH_DATA = 4)
    if (video.readyState < 2) {
      console.error("Capture Error: Video stream not ready");
      return null;
    }

    // --- RESIZING LOGIC ---
    const MAX_SIZE = 800; 
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width === 0 || height === 0) {
      console.error("Capture Error: Video dimensions are 0");
      return null;
    }

    if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
    } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    
    // Draw the image
    ctx.drawImage(video, 0, 0, width, height);
    
    // Export to JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    
    if (dataUrl === 'data:,') {
      console.error("Capture Error: Canvas produced empty image");
      return null;
    }

    return dataUrl;
  }, []);

  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isStreaming) {
      stopCamera();
      setTimeout(() => startCamera(), 350); // Increased delay for mobile hardware release
    }
  }, [isStreaming, facingMode, stopCamera, startCamera]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return { 
    videoRef, 
    canvasRef, 
    isStreaming, 
    error, 
    startCamera, 
    stopCamera, 
    capturePhoto, 
    switchCamera, 
    facingMode 
  };
}