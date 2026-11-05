import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const GroceryScanner = ({ onScanComplete }: { onScanComplete: (items: any[]) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // AGGRESSIVE RESIZE: Max 800px ensures < 1MB payload
        const MAX_SIZE = 800;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width *= ratio; height *= ratio;
        }
        
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Low quality JPEG (text is still readable)
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const processImage = async (file: File) => {
    setIsScanning(true);
    try {
      // 1. Resize
      const base64 = await resizeImage(file);
      console.log("Sending image size:", base64.length); // Check console to see size

      // 2. Send
      const { data, error } = await supabase.functions.invoke('process-vision', {
        body: { image: base64 } 
      });

      if (error) {
        // Log the actual error object to console so we can see it
        console.error("Supabase Error:", error);
        throw new Error(error.message || "Connection failed");
      }
      
      if (!data?.items) throw new Error('No items found');

      onScanComplete(data.items);
      setIsOpen(false);
      toast({ title: "Success", description: `Found ${data.items.length} items.` });

    } catch (e: any) {
      console.error("Scan failed:", e);
      toast({ title: "Scan Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Camera className="mr-2 h-4 w-4"/> Scan Receipt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Scan Receipt</DialogTitle></DialogHeader>
        <div 
          onClick={() => fileInputRef.current?.click()} 
          className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted"
        >
          {isScanning ? <Loader2 className="animate-spin h-8 w-8 mb-2"/> : <Upload className="h-8 w-8 mb-2"/>}
          <p>{isScanning ? "Processing..." : "Click to Upload"}</p>
        </div>
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])}/>
      </DialogContent>
    </Dialog>
  );
};
